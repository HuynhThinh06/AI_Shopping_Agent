import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchApi } from '../api/searchApi';
import { categoryApi } from '../api/categoryApi';
import type { SearchResponse, RankedProduct, CategoryFacetDTO, FacetOptionDTO } from '../types/search';
import {
  addSearchHistory,
  getAuthUser,
  toggleCompareId,
  getCompareIds,
} from '../utils/storage';
import {
  Sparkles,
  Search,
  ArrowRight,
  Star,
  Cpu,
  AlertCircle,
  Loader2,
  Trophy,
  SlidersHorizontal,
  Filter,
  RefreshCw,
  Scale,
  Edit3,
  LayoutGrid,
  LayoutList,
} from 'lucide-react';

type AlgoPreset = 'balanced' | 'spec' | 'price' | 'review';
type SortOrder = 'score' | 'price_asc' | 'price_desc' | 'rating';

export const getProductName = (item?: { productName?: string; name?: string } | null): string => {
  return item?.productName || item?.name || 'Sản phẩm';
};

export const getSpecs = (item?: { specs?: any } | null): Record<string, any> => {
  if (!item || !item.specs) return {};
  if (typeof item.specs === 'string') {
    try {
      return JSON.parse(item.specs);
    } catch {
      return {};
    }
  }
  return typeof item.specs === 'object' ? item.specs : {};
};

/**
 * Hàm kiểm tra sự phù hợp của sản phẩm với một tiêu chí bộ lọc động.
 * Phục vụ Metadata-Driven Faceted Search:
 * 1. Khớp theo queryPattern (Regex) cho dòng CPU / Chipset / Tính năng chuỗi
 * 2. Khớp theo specKey và toán tử (>=, <=, ==) cho các thông số số liệu (Hz, MP, Wh, kg, inch)
 */
export const testFacetOptionMatch = (
  item: RankedProduct,
  specs: Record<string, any>,
  opt: FacetOptionDTO
): boolean => {
  const pName = getProductName(item);

  // 1. Kiểm tra qua queryPattern (Regex)
  if (opt.queryPattern) {
    try {
      const reg = new RegExp(opt.queryPattern, 'i');
      const cpuStr = ((specs.cpu || specs.chipset || '') + ' ' + pName).toLowerCase();
      const specsStr = (JSON.stringify(specs) + ' ' + pName).toLowerCase();
      if (reg.test(cpuStr) || reg.test(specsStr)) {
        return true;
      }
    } catch {
      // bỏ qua nếu pattern không hợp lệ
    }
  }

  // 2. Kiểm tra qua SpecKey và Toán tử
  if (opt.specKey) {
    const rawVal = specs[opt.specKey];
    if (rawVal != null) {
      if (opt.operator === '>=' || opt.operator === '<=') {
        const numVal = parseFloat(String(rawVal));
        const targetNum = typeof opt.value === 'number' ? opt.value : parseFloat(String(opt.value || 0));
        if (!isNaN(numVal) && !isNaN(targetNum)) {
          if (opt.operator === '>=') return numVal >= targetNum;
          if (opt.operator === '<=') return numVal > 0 && numVal <= targetNum;
        }
      }
      if (opt.operator === '==') {
        return String(rawVal).toLowerCase() === String(opt.value).toLowerCase();
      }
    }
  }

  return false;
};

/**
 * Dữ liệu bộ lọc dự phòng (Graceful Degradation / Progressive Enhancement)
 * Tự động kích hoạt khi Backend chưa hoàn tất hoặc offline
 */
export const getDefaultFacets = (categoryCode: string): CategoryFacetDTO[] => {
  const isPhone = categoryCode.includes('phone') || categoryCode.includes('thoai');
  if (isPhone) {
    return [
      {
        groupKey: 'price',
        groupLabel: 'Mức giá',
        filterType: 'preset',
        options: [
          { id: 'p1', label: '< 5 triệu', min: 0, max: 5000000 },
          { id: 'p2', label: '5 - 10 triệu', min: 5000000, max: 10000000 },
          { id: 'p3', label: '10 - 15 triệu', min: 10000000, max: 15000000 },
          { id: 'p4', label: '15 - 20 triệu', min: 15000000, max: 20000000 },
          { id: 'p5', label: 'Trên 20 triệu', min: 20000000, max: null },
        ],
      },
      {
        groupKey: 'chipset',
        groupLabel: 'Thế hệ Chip xử lý',
        filterType: 'multiselect',
        options: [
          { id: 'apple_a', label: 'Apple A-Series Bionic', queryPattern: 'apple|bionic|a15|a16|a17|a18' },
          { id: 'snapdragon', label: 'Snapdragon (Qualcomm)', queryPattern: 'snapdragon|qualcomm|8 gen|7 gen|778|695|870|888' },
          { id: 'dimensity', label: 'MediaTek Dimensity / Helio', queryPattern: 'dimensity|helio|mediatek|mtk' },
          { id: 'exynos', label: 'Samsung Exynos', queryPattern: 'exynos' },
        ],
      },
      {
        groupKey: 'ram',
        groupLabel: 'Dung lượng RAM',
        filterType: 'multiselect',
        options: ['4GB', '6GB', '8GB', '12GB', '16GB'].map((r) => ({
          id: r.toLowerCase(),
          label: r,
          queryPattern: r,
        })),
      },
      {
        groupKey: 'feature',
        groupLabel: 'Tính năng & Tiện ích nổi bật',
        filterType: 'multiselect',
        options: [
          { id: 'phone_camera', label: 'Camera xịn (≥ 50MP / OIS)', specKey: 'camera', operator: '>=', value: 50, queryPattern: '50mp|108mp|200mp|ois' },
          { id: 'phone_battery', label: 'Pin trâu (≥ 5000 mAh)', specKey: 'battery', operator: '>=', value: 5000 },
          { id: 'phone_amoled', label: 'Màn hình AMOLED / 120Hz', queryPattern: 'amoled|120hz|oled' },
        ],
      },
    ];
  }

  // Laptop default
  return [
    {
      groupKey: 'price',
      groupLabel: 'Mức giá',
      filterType: 'preset',
      options: [
        { id: 'p1', label: '< 15 triệu', min: 0, max: 15000000 },
        { id: 'p2', label: '15 - 20 triệu', min: 15000000, max: 20000000 },
        { id: 'p3', label: '20 - 25 triệu', min: 20000000, max: 25000000 },
        { id: 'p4', label: '25 - 30 triệu', min: 25000000, max: 30000000 },
        { id: 'p5', label: 'Trên 30 triệu', min: 30000000, max: null },
      ],
    },
    {
      groupKey: 'chipset',
      groupLabel: 'Thế hệ Chip xử lý',
      filterType: 'multiselect',
      options: [
        { id: 'intel_ultra', label: 'Intel Core Ultra (AI Boost)', queryPattern: 'ultra|core ultra|125h|155h|165h' },
        { id: 'intel_core_i7_i9', label: 'Intel Core i7 / i9 / Core 7', queryPattern: 'i7|i9|core 7|13700|13620|13650|14700|14900|150u' },
        { id: 'intel_core_i5', label: 'Intel Core i5 / Core 5', queryPattern: 'i5|core 5|13420|13450|13500|12450|12500|1334u' },
        { id: 'intel_core_i3', label: 'Intel Core i3 / Core 3', queryPattern: 'i3|core 3|1215u|1315u' },
        { id: 'amd_ryzen', label: 'AMD Ryzen (5 / 7 / 8000 Series)', queryPattern: 'ryzen|amd|7535|7735|7840|8845' },
        { id: 'apple_m', label: 'Apple Silicon (M1 / M2 / M3 / M4)', queryPattern: 'apple|m1|m2|m3|m4' },
        { id: 'snapdragon', label: 'Snapdragon X Elite / Plus', queryPattern: 'snapdragon|x elite|x plus' },
      ],
    },
    {
      groupKey: 'ram',
      groupLabel: 'Dung lượng RAM',
      filterType: 'multiselect',
      options: ['8GB', '16GB', '32GB', '64GB'].map((r) => ({
        id: r.toLowerCase(),
        label: r,
        queryPattern: r,
      })),
    },
    {
      groupKey: 'feature',
      groupLabel: 'Tính năng & Tiện ích nổi bật',
      filterType: 'multiselect',
      options: [
        { id: 'screen_high_hz', label: 'Màn hình tần số cao (≥ 90Hz / 120Hz)', specKey: 'refresh_rate', operator: '>=', value: 90, queryPattern: '90hz|120hz|144hz|165hz' },
        { id: 'screen_large', label: 'Màn hình lớn (≥ 15.6 inch)', specKey: 'screen_size', operator: '>=', value: 15.6 },
        { id: 'screen_compact', label: 'Màn hình gọn nhẹ (≤ 14.0 inch)', specKey: 'screen_size', operator: '<=', value: 14.0 },
        { id: 'pin_high', label: 'Pin dung lượng cao (≥ 50 Wh)', specKey: 'battery', operator: '>=', value: 50 },
        { id: 'ultra_light', label: 'Mỏng nhẹ di động (≤ 1.5 kg)', specKey: 'weight', operator: '<=', value: 1.5 },
        { id: 'discrete_gpu', label: 'Có Card đồ họa rời (RTX / GTX)', specKey: 'gpu', queryPattern: 'rtx|gtx|geforce|radeon rx|dedicated' },
      ],
    },
  ];
};

export const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const user = getAuthUser();

  const [queryInput, setQueryInput] = useState(queryParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);

  // Progressive loading & Display layout
  const [displayedCount, setDisplayedCount] = useState<number>(6);
  const [layoutView, setLayoutView] = useState<'list' | 'grid'>('list');

  // Algorithm MCDM Presets & Sorting
  const [algoPreset, setAlgoPreset] = useState<AlgoPreset>('balanced');
  const [sortOrder, setSortOrder] = useState<SortOrder>('score');

  // Sidebar Facet Filters
  const [activePricePresetIndex, setActivePricePresetIndex] = useState<number | null>(null);
  const [customMinPrice, setCustomMinPrice] = useState<number | null>(null);
  const [customMaxPrice, setCustomMaxPrice] = useState<number | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [selectedRams, setSelectedRams] = useState<Set<string>>(new Set());
  const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set());
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());

  // Compare IDs list
  const [compareIds, setCompareIds] = useState<number[]>(getCompareIds());

  // Edit Criteria Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBudgetMax, setEditBudgetMax] = useState<string>('');
  const [editRam, setEditRam] = useState<string>('');
  const [editTarget, setEditTarget] = useState<string>('');
  const [editScreenHz, setEditScreenHz] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Deduplication guard against React 18 StrictMode duplicate invocations
  const lastSearchedQueryRef = useRef<string>('');

  useEffect(() => {
    const handleCompareUpdate = () => {
      setCompareIds(getCompareIds());
    };
    window.addEventListener('compare-updated', handleCompareUpdate);
    return () => window.removeEventListener('compare-updated', handleCompareUpdate);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchResults = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchApi.searchProducts(text.trim());
      setResult(data);
      setDisplayedCount(6);

      // Populate edit criteria modal values from extractedCriteria
      if (data.extractedCriteria) {
        setEditBudgetMax(data.extractedCriteria.budgetMax ? String(data.extractedCriteria.budgetMax) : '');
        setEditRam(data.extractedCriteria.requiredSpecs?.ram || '');
        setEditTarget(data.extractedCriteria.target || '');
        setEditScreenHz(data.extractedCriteria.requiredSpecs?.refresh_rate || '');
      }

      // Add to search history
      addSearchHistory(
        text.trim(),
        data.extractedCriteria?.categoryCode,
        data.extractedCriteria?.target,
        data.extractedCriteria?.budgetMax,
        data.totalMatched ?? (data.results ? data.results.length : 0)
      );
    } catch (err: any) {
      console.error('Search error:', err);
      setError('Đã có lỗi xảy ra trong quá trình phân tích truy vấn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cleanQ = queryParam.trim();
    if (cleanQ && lastSearchedQueryRef.current !== cleanQ) {
      lastSearchedQueryRef.current = cleanQ;
      setQueryInput(cleanQ);
      resetAllFilters();
      fetchResults(cleanQ);
    }
  }, [queryParam]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextQ = queryInput.trim();
    if (!nextQ) return;
    if (nextQ === queryParam.trim()) {
      resetAllFilters();
      fetchResults(nextQ);
    } else {
      lastSearchedQueryRef.current = nextQ;
      resetAllFilters();
      setSearchParams({ q: nextQ });
    }
  };

  const formatVnd = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ';
  };

  // Category Detection
  const category = useMemo<'laptop' | 'phone'>(() => {
    const catCode = (result?.extractedCriteria?.categoryCode || '').toLowerCase();
    if (catCode.includes('phone') || catCode.includes('thoai') || catCode.includes('mobile')) {
      return 'phone';
    }
    if (catCode.includes('laptop') || catCode.includes('may tinh') || catCode.includes('macbook')) {
      return 'laptop';
    }
    const q = queryParam.toLowerCase();
    if (q.includes('điện thoại') || q.includes('dien thoai') || q.includes('phone') || q.includes('iphone') || q.includes('smartphone')) {
      return 'phone';
    }
    if (q.includes('laptop') || q.includes('máy tính xách tay') || q.includes('may tinh') || q.includes('macbook')) {
      return 'laptop';
    }
    if (result?.results && result.results.length > 0) {
      const firstName = getProductName(result.results[0]).toLowerCase();
      if (firstName.includes('điện thoại') || firstName.includes('phone') || firstName.includes('galaxy') || firstName.includes('iphone') || firstName.includes('redmi')) {
        return 'phone';
      }
    }
    return 'laptop';
  }, [result, queryParam]);

  // Dynamic Facets loaded from Backend API (with Metadata Fallback)
  const [facetGroups, setFacetGroups] = useState<CategoryFacetDTO[]>(() => getDefaultFacets(category));

  useEffect(() => {
    let isMounted = true;
    categoryApi
      .getCategoryFacets(category)
      .then((res) => {
        if (isMounted && res && res.length > 0) {
          setFacetGroups(res);
        }
      })
      .catch(() => {
        if (isMounted) {
          setFacetGroups(getDefaultFacets(category));
        }
      });
    return () => {
      isMounted = false;
    };
  }, [category]);

  const priceGroup = useMemo(() => facetGroups.find((g) => g.groupKey === 'price'), [facetGroups]);
  const chipGroup = useMemo(() => facetGroups.find((g) => g.groupKey === 'chipset'), [facetGroups]);
  const ramGroup = useMemo(() => facetGroups.find((g) => g.groupKey === 'ram'), [facetGroups]);
  const featureGroup = useMemo(() => facetGroups.find((g) => g.groupKey === 'feature'), [facetGroups]);

  // Dynamic brand extraction & counts
  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!result?.results) return counts;
    result.results.forEach((p) => {
      if (p.brand) {
        const b = p.brand.trim();
        counts[b] = (counts[b] || 0) + 1;
      }
    });
    return counts;
  }, [result]);

  const sortedBrands = useMemo(() => {
    return Object.keys(brandCounts).sort((a, b) => brandCounts[b] - brandCounts[a]);
  }, [brandCounts]);

  // Dynamic chip family counts
  const chipCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!result?.results || !chipGroup) return counts;
    result.results.forEach((p) => {
      const specs = getSpecs(p);
      chipGroup.options.forEach((opt) => {
        if (testFacetOptionMatch(p, specs, opt)) {
          counts[opt.id] = (counts[opt.id] || 0) + 1;
        }
      });
    });
    return counts;
  }, [result, chipGroup]);

  // Dynamic feature counts
  const featureCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!result?.results || !featureGroup) return counts;
    result.results.forEach((p) => {
      const specs = getSpecs(p);
      featureGroup.options.forEach((opt) => {
        if (testFacetOptionMatch(p, specs, opt)) {
          counts[opt.id] = (counts[opt.id] || 0) + 1;
        }
      });
    });
    return counts;
  }, [result, featureGroup]);

  // Reset all filters
  const resetAllFilters = () => {
    setActivePricePresetIndex(null);
    setCustomMinPrice(null);
    setCustomMaxPrice(null);
    setSelectedBrands(new Set());
    setSelectedRams(new Set());
    setSelectedChips(new Set());
    setSelectedFeatures(new Set());
    setDisplayedCount(6);
    showToast('Đã thiết lập lại bộ lọc!');
  };

  // Toggle filter helpers
  const handlePricePresetSelect = (idx: number) => {
    if (activePricePresetIndex === idx) {
      setActivePricePresetIndex(null);
      setCustomMinPrice(null);
      setCustomMaxPrice(null);
    } else {
      const presets = priceGroup?.options || [];
      const preset = presets[idx];
      if (preset) {
        setActivePricePresetIndex(idx);
        setCustomMinPrice(preset.min != null ? preset.min : null);
        setCustomMaxPrice(preset.max != null ? preset.max : null);
      }
    }
    setDisplayedCount(6);
  };

  const toggleBrand = (b: string) => {
    const bLower = b.toLowerCase();
    const next = new Set(selectedBrands);
    if (next.has(bLower)) next.delete(bLower);
    else next.add(bLower);
    setSelectedBrands(next);
    setDisplayedCount(6);
  };

  const toggleRam = (r: string) => {
    const next = new Set(selectedRams);
    if (next.has(r)) next.delete(r);
    else next.add(r);
    setSelectedRams(next);
    setDisplayedCount(6);
  };

  const toggleChip = (id: string) => {
    const next = new Set(selectedChips);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedChips(next);
    setDisplayedCount(6);
  };

  const toggleFeature = (id: string) => {
    const next = new Set(selectedFeatures);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedFeatures(next);
    setDisplayedCount(6);
  };

  // MCDM / SAW Multi-Criteria Decision Making scoring & filtering pipeline
  const processedProducts = useMemo(() => {
    if (!result?.results || result.results.length === 0) return [];

    // 1. Min / Max price across all items for normalization
    let allMinPrice = Infinity;
    let allMaxPrice = -Infinity;
    result.results.forEach((item) => {
      if (item.price != null) {
        if (item.price < allMinPrice) allMinPrice = item.price;
        if (item.price > allMaxPrice) allMaxPrice = item.price;
      }
    });
    if (allMinPrice === Infinity) allMinPrice = 0;
    if (allMaxPrice === -Infinity) allMaxPrice = 50000000;

    // 2. Filter items by facets
    const filtered = result.results.filter((item) => {
      const p = item.price || 0;
      if (customMinPrice != null && p < customMinPrice) return false;
      if (customMaxPrice != null && p > customMaxPrice) return false;

      // Brand
      if (selectedBrands.size > 0) {
        const b = (item.brand || '').toLowerCase().trim();
        if (!selectedBrands.has(b)) return false;
      }

      const specs = getSpecs(item);
      const nameLower = getProductName(item).toLowerCase();

      // RAM
      if (selectedRams.size > 0) {
        const ramVal = (specs.ram || specs.RAM || '').toString();
        let ramMatched = false;
        for (const selRam of selectedRams) {
          const num = selRam.replace(/\D/g, '');
          if (ramVal.includes(num) || nameLower.includes(selRam.toLowerCase()) || nameLower.includes(num + 'gb')) {
            ramMatched = true;
            break;
          }
        }
        if (!ramMatched) return false;
      }

      // Chip (Dynamic Metadata Match)
      if (selectedChips.size > 0 && chipGroup) {
        let chipMatched = false;
        for (const chipId of selectedChips) {
          const opt = chipGroup.options.find((c) => c.id === chipId);
          if (opt && testFacetOptionMatch(item, specs, opt)) {
            chipMatched = true;
            break;
          }
        }
        if (!chipMatched) return false;
      }

      // Feature (Dynamic Metadata Match)
      if (selectedFeatures.size > 0 && featureGroup) {
        let featMatched = false;
        for (const featId of selectedFeatures) {
          const opt = featureGroup.options.find((f) => f.id === featId);
          if (opt && testFacetOptionMatch(item, specs, opt)) {
            featMatched = true;
            break;
          }
        }
        if (!featMatched) return false;
      }

      return true;
    });

    // 3. Score items with SAW / MCDM
    const scored = filtered.map((item) => {
      const rawSpecScore = item.specMatchScore != null ? item.specMatchScore : (item.score || 0.85);
      const sSpec = Math.max(0.1, Math.min(1.0, rawSpecScore));

      let sPrice = 0.5;
      const price = item.price || 0;
      if (allMaxPrice > allMinPrice) {
        const rawNorm = (allMaxPrice - price) / (allMaxPrice - allMinPrice);
        sPrice = algoPreset === 'price' ? rawNorm : (0.25 + 0.75 * rawNorm);
        sPrice = Math.max(0.0, Math.min(1.0, sPrice));
      } else {
        sPrice = 1.0;
      }

      const rating = item.avgRating ? Number(item.avgRating) : 5.0;
      const sRating = Math.max(0.0, Math.min(1.0, rating / 5.0));

      let wSpec = 0.40, wPrice = 0.35, wRating = 0.25;
      if (algoPreset === 'spec') {
        wSpec = 0.60; wPrice = 0.20; wRating = 0.20;
      } else if (algoPreset === 'price') {
        wSpec = 0.20; wPrice = 0.60; wRating = 0.20;
      } else if (algoPreset === 'review') {
        wSpec = 0.25; wPrice = 0.25; wRating = 0.50;
      }

      const composite = (wSpec * sSpec) + (wPrice * sPrice) + (wRating * sRating);
      const score100 = Math.min(99, Math.max(65, Math.round(composite * 100)));

      let reasoning = item.reasoning;
      if (algoPreset === 'price') {
        if (sPrice >= 0.95 && rating < 4.2) {
          reasoning = `Mức giá ${formatVnd(price)} tiết kiệm chi phí hàng đầu (tối ưu giá ${Math.round(sPrice * 100)}%). Xếp sau top 1 do điểm đánh giá thực tế đạt ${rating.toFixed(1)}/5 sao, thuật toán cân đối để tránh đánh đổi độ bền.`;
        } else if (sPrice >= 0.85) {
          reasoning = `Mức giá ${formatVnd(price)} cực kỳ mềm và tối ưu chi phí, đạt điểm tương thích giá ${Math.round(sPrice * 100)}% trong phân khúc.`;
        } else {
          reasoning = `Mức giá ${formatVnd(price)} hợp lý, đạt điểm giá ${Math.round(sPrice * 100)}% cùng độ hài lòng ${rating.toFixed(1)}/5 sao.`;
        }
      } else if (algoPreset === 'spec') {
        reasoning = `Cấu hình phần cứng tối ưu hiệu năng với điểm kỹ thuật ${Math.round(sSpec * 100)}%, đáp ứng tác vụ chuyên sâu.`;
      } else if (algoPreset === 'review') {
        reasoning = `Đánh giá thực tế từ người dùng đạt ${rating.toFixed(1)}/5 sao, bảo đảm độ tin cậy và trải nghiệm ổn định.`;
      } else {
        reasoning = reasoning || 'Cân bằng xuất sắc giữa cấu hình phần cứng, tầm giá đầu tư và mức độ hài lòng của cộng đồng.';
      }

      return {
        ...item,
        calculatedComposite: composite,
        calculatedScorePercent: score100,
        calculatedReasoning: reasoning,
        sSpec,
        sPrice,
        sRating,
      };
    });

    // 4. Sort
    if (sortOrder === 'score') {
      scored.sort((a, b) => b.calculatedComposite - a.calculatedComposite);
    } else if (sortOrder === 'price_asc') {
      scored.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortOrder === 'price_desc') {
      scored.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortOrder === 'rating') {
      scored.sort((a, b) => (Number(b.avgRating) || 0) - (Number(a.avgRating) || 0));
    }

    return scored;
  }, [result, customMinPrice, customMaxPrice, selectedBrands, selectedRams, selectedChips, selectedFeatures, algoPreset, sortOrder, chipGroup, featureGroup]);

  const visibleProducts = useMemo(() => {
    return processedProducts.slice(0, displayedCount);
  }, [processedProducts, displayedCount]);

  const getRankBadge = (pos: number) => {
    if (pos === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-400 text-amber-950 font-black text-xs border-2 border-warm-border shadow-brutal-xs">
          <Trophy className="w-3.5 h-3.5 fill-current" />
          <span>Top 1 Phù Hợp Nhất</span>
        </span>
      );
    }
    if (pos === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-200 text-slate-800 font-extrabold text-xs border border-warm-border">
          <span>Top 2 Cân Nhắc</span>
        </span>
      );
    }
    if (pos === 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 font-bold text-xs border border-warm-border">
          <span>Top 3</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-warm-bg text-warm-muted font-bold text-xs border border-warm-border">
        <span>#{pos}</span>
      </span>
    );
  };

  const handleApplyCriteriaEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!result) return;

    const newQueryTerms: string[] = [];
    if (category === 'phone') newQueryTerms.push('điện thoại');
    else newQueryTerms.push('laptop');

    if (editTarget) newQueryTerms.push(editTarget);
    if (editBudgetMax) {
      const budgetNum = parseInt(editBudgetMax.replace(/\D/g, ''), 10);
      if (!isNaN(budgetNum)) {
        newQueryTerms.push(`tầm ${Math.round(budgetNum / 1000000)} triệu`);
      }
    }
    if (editRam) newQueryTerms.push(`RAM ${editRam}`);
    if (editScreenHz) newQueryTerms.push(editScreenHz);

    const generatedQuery = newQueryTerms.join(', ');
    setIsEditModalOpen(false);
    showToast('Đang cập nhật tìm kiếm theo tiêu chí mới...');
    lastSearchedQueryRef.current = generatedQuery;
    resetAllFilters();
    setSearchParams({ q: generatedQuery });
  };

  return (
    <div className="space-y-6 py-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-xl border-2 border-warm-border shadow-brutal-md text-xs sm:text-sm animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* 1. Search Omnibox */}
      <section className="brutal-card p-4 bg-warm-surface">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="hidden sm:flex w-10 h-10 rounded-xl bg-amber-200 border-2 border-warm-border items-center justify-center text-warm-text shadow-brutal-xs shrink-0">
            <Search className="w-5 h-5 text-amber-900" />
          </div>

          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Nhập câu hỏi tìm kiếm tự nhiên, ví dụ: 'Laptop lập trình web tầm 20 đến 25 triệu, RAM 16GB'..."
              className="w-full pl-4 pr-4 py-2.5 rounded-xl border-2 border-warm-border bg-warm-bg text-warm-text font-bold text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-amber-500 shadow-brutal-xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="brutal-btn px-6 py-2.5 text-xs sm:text-sm font-extrabold shadow-brutal shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{loading ? 'Đang phân tích...' : 'Phân tích & Tìm'}</span>
          </button>
        </form>
      </section>

      {/* Loading Skeleton Banner */}
      {loading && (
        <div className="brutal-card p-8 bg-warm-surface text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-200 border-2 border-warm-border flex items-center justify-center text-amber-900 mx-auto shadow-brutal-xs">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-lg text-warm-text">Google Gemini đang phân tích truy vấn...</h3>
            <p className="text-xs text-warm-muted">
              Đang trích xuất ràng buộc ngôn ngữ tự nhiên → Lọc qua CSDL PostgreSQL GIN Index → Tính điểm xếp hạng Weighted Scoring.
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && !loading && (
        <div className="brutal-card p-4 bg-rose-50 border-rose-500 text-rose-900 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-xs font-bold">{error}</p>
        </div>
      )}

      {/* 2. LLM Intent Extraction Banner */}
      {result && !loading && (
        <section className="brutal-card p-5 sm:p-6 bg-warm-surface space-y-4">
          {/* Top Meta */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-warm-border/10">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-warm-border bg-amber-100 text-amber-950 font-extrabold text-xs shadow-brutal-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Google Gemini • Tiêu chí đã trích xuất
              </span>
              <span className="text-xs text-warm-muted font-semibold hidden md:inline">
                Tìm thấy <strong>{result.totalMatched}</strong> sản phẩm ứng viên
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              {user && user.role?.toLowerCase().includes('admin') && (
                <Link
                  to="/admin/llm-logs"
                  className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1"
                >
                  <span>Xem log LLM</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
              <div className="flex items-center gap-2">
                <span className="text-warm-muted font-medium">Độ khớp nhu cầu:</span>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-400 font-extrabold text-xs">
                  {processedProducts.length > 0 ? `${processedProducts[0]?.calculatedScorePercent || 98}% Tự tin` : '0% Trùng khớp'}
                </span>
              </div>
            </div>
          </div>

          {/* Current Query Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-warm-muted block mb-0.5">
                Câu hỏi gốc từ bạn:
              </span>
              <h1 className="text-base sm:text-lg font-extrabold text-warm-text tracking-tight flex items-center gap-1">
                <span className="text-amber-600 font-serif text-xl">&ldquo;</span>
                <span>{queryParam}</span>
                <span className="text-amber-600 font-serif text-xl">&rdquo;</span>
              </h1>
            </div>

            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="brutal-btn self-start md:self-auto px-3.5 py-1.5 text-xs font-bold shadow-brutal-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Sửa tiêu chí AI</span>
            </button>
          </div>

          {/* Extracted Pills Row */}
          <div className="pt-3 border-t border-warm-border/10">
            <div className="text-[11px] font-extrabold text-warm-muted uppercase tracking-wider mb-2">
              Các ràng buộc hệ thống đã trích xuất &amp; áp dụng xếp hạng:
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-100 border-2 border-warm-border font-extrabold text-sky-950 shadow-brutal-xs">
                <span className="text-warm-muted font-medium">Ngành hàng:</span>
                <span className="uppercase">{category === 'phone' ? 'Điện thoại' : 'Laptop'}</span>
              </div>

              {(result.extractedCriteria?.budgetMin || result.extractedCriteria?.budgetMax) && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 border-2 border-warm-border font-extrabold text-emerald-950 shadow-brutal-xs">
                  <span className="text-warm-muted font-medium">Ngân sách:</span>
                  <span>
                    {result.extractedCriteria.budgetMin ? formatVnd(result.extractedCriteria.budgetMin) : '0'}
                    {' — '}
                    {result.extractedCriteria.budgetMax ? formatVnd(result.extractedCriteria.budgetMax) : 'Không giới hạn'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="hover:text-amber-700 ml-1 font-bold cursor-pointer"
                    title="Chỉnh sửa"
                  >
                    ✎
                  </button>
                </div>
              )}

              {result.extractedCriteria?.target && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100 border-2 border-warm-border font-extrabold text-purple-950 shadow-brutal-xs">
                  <span className="text-warm-muted font-medium">Đối tượng:</span>
                  <span className="capitalize">{result.extractedCriteria.target}</span>
                </div>
              )}

              {result.extractedCriteria?.requiredSpecs &&
                Object.entries(result.extractedCriteria.requiredSpecs).map(([k, v]) => (
                  <div
                    key={k}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 border-2 border-warm-border font-extrabold text-amber-950 shadow-brutal-xs"
                  >
                    <span className="text-warm-muted font-medium">{k.toUpperCase()}:</span>
                    <span>{String(v)}</span>
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(true)}
                      className="hover:text-amber-700 ml-1 font-bold cursor-pointer"
                      title="Chỉnh sửa"
                    >
                      ✎
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* 3. Weighted Scoring Preset Bar */}
          <div className="pt-3 border-t-2 border-warm-border/10 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-warm-text flex items-center gap-1">
                <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                Thuật toán Weighted Scoring:
              </span>
              <span className="text-warm-muted hidden sm:inline">Chọn chiến lược ưu tiên:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setAlgoPreset('balanced');
                  setDisplayedCount(6);
                }}
                className={`px-3 py-1.5 rounded-xl border-2 border-warm-border font-extrabold text-xs shadow-brutal-xs cursor-pointer transition-all ${
                  algoPreset === 'balanced'
                    ? 'bg-amber-400 text-amber-950 font-black'
                    : 'bg-warm-surface text-warm-text hover:bg-warm-secondary'
                }`}
              >
                ⚖️ Cân bằng AI (Mặc định)
              </button>

              <button
                type="button"
                onClick={() => {
                  setAlgoPreset('spec');
                  setDisplayedCount(6);
                }}
                className={`px-3 py-1.5 rounded-xl border-2 border-warm-border font-extrabold text-xs shadow-brutal-xs cursor-pointer transition-all ${
                  algoPreset === 'spec'
                    ? 'bg-amber-400 text-amber-950 font-black'
                    : 'bg-warm-surface text-warm-text hover:bg-warm-secondary'
                }`}
              >
                🚀 Ưu tiên Cấu hình (60%)
              </button>

              <button
                type="button"
                onClick={() => {
                  setAlgoPreset('price');
                  setDisplayedCount(6);
                }}
                className={`px-3 py-1.5 rounded-xl border-2 border-warm-border font-extrabold text-xs shadow-brutal-xs cursor-pointer transition-all ${
                  algoPreset === 'price'
                    ? 'bg-amber-400 text-amber-950 font-black'
                    : 'bg-warm-surface text-warm-text hover:bg-warm-secondary'
                }`}
              >
                💰 Ưu tiên Giá mềm (60%)
              </button>

              <button
                type="button"
                onClick={() => {
                  setAlgoPreset('review');
                  setDisplayedCount(6);
                }}
                className={`px-3 py-1.5 rounded-xl border-2 border-warm-border font-extrabold text-xs shadow-brutal-xs cursor-pointer transition-all ${
                  algoPreset === 'review'
                    ? 'bg-amber-400 text-amber-950 font-black'
                    : 'bg-warm-surface text-warm-text hover:bg-warm-secondary'
                }`}
              >
                ⭐ Ưu tiên Review tốt (50%)
              </button>
            </div>
          </div>

          {/* Strategy Hint */}
          <div className="text-[11px] text-warm-muted bg-warm-bg p-2 rounded-lg border border-warm-border/10">
            {algoPreset === 'price' && (
              <span>
                <strong className="text-amber-800">⚡ Đang ưu tiên giá mềm:</strong> Cân bằng 60% Giá + 20% Đánh giá + 20% Cấu hình (Các sản phẩm giá rẻ nhất sẽ vươn lên dẫn đầu bảng xếp hạng).
              </span>
            )}
            {algoPreset === 'spec' && (
              <span>
                <strong className="text-amber-800">⚡ Đang ưu tiên cấu hình:</strong> Trọng số 60% Phần cứng kỹ thuật + 20% Giá + 20% Đánh giá người dùng.
              </span>
            )}
            {algoPreset === 'review' && (
              <span>
                <strong className="text-amber-800">⚡ Đang ưu tiên đánh giá:</strong> Trọng số 50% Đánh giá thực tế + 25% Giá + 25% Phần cứng.
              </span>
            )}
            {algoPreset === 'balanced' && (
              <span>
                Được sắp xếp tự động theo thuật toán chấm điểm đa tiêu chí SAW cân bằng (40% Cấu hình + 35% Giá + 25% Đánh giá).
              </span>
            )}
          </div>
        </section>
      )}

      {/* 4. Main Layout: Sidebar Filters + Results */}
      {result && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sidebar: Faceted Filters */}
          <aside className="lg:col-span-4 brutal-card p-5 bg-warm-surface space-y-6">
            <div className="flex items-center justify-between pb-3 border-b-2 border-warm-border/10">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-warm-text flex items-center gap-2">
                <Filter className="w-4 h-4 text-amber-600" />
                <span>Bộ Lọc Nâng Cao</span>
              </h2>
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Thiết lập lại</span>
              </button>
            </div>

            {/* Filter 1: Price Range */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-extrabold text-warm-text">Khoảng giá mong muốn:</label>
                {activePricePresetIndex !== null && (
                  <span className="text-[11px] font-bold text-amber-700">
                    ({priceGroup?.options[activePricePresetIndex]?.label})
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                {(priceGroup?.options || []).map((p, idx) => {
                  const isActive = activePricePresetIndex === idx;
                  return (
                    <button
                      key={p.id || p.label}
                      type="button"
                      onClick={() => handlePricePresetSelect(idx)}
                      className={`px-2.5 py-1.5 rounded-xl border-2 text-xs font-bold transition-all shadow-brutal-xs cursor-pointer ${
                        isActive
                          ? 'border-warm-border bg-amber-400 text-amber-950 font-black'
                          : 'border-warm-border bg-warm-bg text-warm-text hover:bg-amber-100'
                      }`}
                    >
                      {p.label} {isActive ? '✓' : ''}
                    </button>
                  );
                })}
              </div>

              {/* Custom Min / Max Inputs */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <input
                  type="number"
                  placeholder="Từ (đ)"
                  value={customMinPrice != null ? customMinPrice : ''}
                  onChange={(e) => {
                    setActivePricePresetIndex(null);
                    setCustomMinPrice(e.target.value ? Number(e.target.value) : null);
                    setDisplayedCount(6);
                  }}
                  className="w-full bg-warm-bg border border-warm-border rounded-lg px-2.5 py-1.5 text-center font-bold text-warm-text text-xs"
                />
                <span>–</span>
                <input
                  type="number"
                  placeholder="Đến (đ)"
                  value={customMaxPrice != null ? customMaxPrice : ''}
                  onChange={(e) => {
                    setActivePricePresetIndex(null);
                    setCustomMaxPrice(e.target.value ? Number(e.target.value) : null);
                    setDisplayedCount(6);
                  }}
                  className="w-full bg-warm-bg border border-warm-border rounded-lg px-2.5 py-1.5 text-center font-bold text-warm-text text-xs"
                />
              </div>
            </div>

            {/* Filter 2: Brands (Dynamic from search results) */}
            <div className="pt-4 border-t border-warm-border/10">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-extrabold text-warm-text">Thương hiệu:</label>
                <span className="text-[11px] text-warm-muted font-bold">{sortedBrands.length} thương hiệu</span>
              </div>
              <div className="space-y-1 text-xs font-medium max-h-52 overflow-y-auto pr-1">
                {sortedBrands.length === 0 ? (
                  <p className="text-xs text-warm-muted">Không có dữ liệu thương hiệu</p>
                ) : (
                  sortedBrands.map((b) => {
                    const isChecked = selectedBrands.has(b.toLowerCase());
                    const count = brandCounts[b] || 0;
                    return (
                      <label
                        key={b}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-warm-subtle/50 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleBrand(b)}
                            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                          />
                          <span className={isChecked ? 'font-black text-amber-900' : 'font-bold text-warm-text'}>
                            {b}
                          </span>
                        </span>
                        <span className="text-warm-muted text-[11px] font-bold">{count} máy</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Filter 3: RAM Capacity (Dynamic Metadata) */}
            {ramGroup && ramGroup.options.length > 0 && (
              <div className="pt-4 border-t border-warm-border/10">
                <label className="block text-xs font-extrabold text-warm-text mb-2">
                  {ramGroup.groupLabel}:
                </label>
                <div className="flex flex-wrap gap-2 text-xs">
                  {ramGroup.options.map((opt) => {
                    const isChecked = selectedRams.has(opt.label);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleRam(opt.label)}
                        className={`px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all shadow-brutal-xs cursor-pointer ${
                          isChecked
                            ? 'border-warm-border bg-amber-400 text-amber-950 font-black'
                            : 'border-warm-border bg-warm-bg text-warm-text hover:bg-amber-100'
                        }`}
                      >
                        {opt.label} {isChecked ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter 4: Processor / Chip family (Dynamic Metadata) */}
            {chipGroup && chipGroup.options.length > 0 && (
              <div className="pt-4 border-t border-warm-border/10">
                <label className="block text-xs font-extrabold text-warm-text mb-2">
                  {chipGroup.groupLabel}:
                </label>
                <div className="space-y-1.5 text-xs">
                  {chipGroup.options.map((chip) => {
                    const isChecked = selectedChips.has(chip.id);
                    const count = chipCounts[chip.id] || 0;
                    return (
                      <label
                        key={chip.id}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-warm-subtle/40 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleChip(chip.id)}
                            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                          />
                          <span className={isChecked ? 'font-black text-amber-900' : 'font-bold text-warm-text'}>
                            {chip.label}
                          </span>
                        </span>
                        {count > 0 && <span className="text-warm-muted text-[11px] font-bold">{count} máy</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter 5: Dynamic Features (Dynamic Metadata) */}
            {featureGroup && featureGroup.options.length > 0 && (
              <div className="pt-4 border-t border-warm-border/10">
                <label className="block text-xs font-extrabold text-warm-text mb-2">
                  {featureGroup.groupLabel}:
                </label>
                <div className="space-y-1.5 text-xs">
                  {featureGroup.options.map((feat) => {
                    const isChecked = selectedFeatures.has(feat.id);
                    const count = featureCounts[feat.id] || 0;
                    return (
                      <label
                        key={feat.id}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-warm-subtle/40 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleFeature(feat.id)}
                            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                          />
                          <span className={isChecked ? 'font-black text-amber-900' : 'font-bold text-warm-text'}>
                            {feat.label}
                          </span>
                        </span>
                        {count > 0 && <span className="text-warm-muted text-[11px] font-bold">{count} máy</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>

          {/* Right Area: Results List & Toolbar */}
          <main className="lg:col-span-8 space-y-5">
            {/* Toolbar */}
            <div className="brutal-card p-4 bg-warm-surface flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs text-warm-muted font-bold block">Tổng số sản phẩm phù hợp:</span>
                <span className="text-base sm:text-lg font-black text-warm-text">
                  {processedProducts.length} thiết bị
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Sort Order Selector */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-warm-muted font-bold">Sắp xếp:</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                    className="bg-warm-bg border-2 border-warm-border rounded-xl px-2.5 py-1.5 font-bold text-xs text-warm-text focus:outline-none"
                  >
                    <option value="score">Điểm số đa tiêu chí (MCDM)</option>
                    <option value="price_asc">Giá: Thấp đến cao</option>
                    <option value="price_desc">Giá: Cao đến thấp</option>
                    <option value="rating">Đánh giá sao cao nhất</option>
                  </select>
                </div>

                {/* Layout View Toggle */}
                <div className="flex items-center border-2 border-warm-border rounded-xl overflow-hidden shadow-brutal-xs">
                  <button
                    type="button"
                    onClick={() => setLayoutView('list')}
                    className={`p-1.5 cursor-pointer ${layoutView === 'list' ? 'bg-amber-400 text-amber-950' : 'bg-warm-bg text-warm-text'}`}
                    title="Dạng danh sách"
                  >
                    <LayoutList className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutView('grid')}
                    className={`p-1.5 cursor-pointer ${layoutView === 'grid' ? 'bg-amber-400 text-amber-950' : 'bg-warm-bg text-warm-text'}`}
                    title="Dạng lưới"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {processedProducts.length === 0 ? (
              <div className="brutal-card p-12 text-center bg-warm-surface space-y-3">
                <AlertCircle className="w-10 h-10 text-warm-muted mx-auto" />
                <h3 className="font-extrabold text-base text-warm-text">Không tìm thấy sản phẩm phù hợp</h3>
                <p className="text-xs text-warm-muted max-w-md mx-auto">
                  Hãy thử mở rộng khoảng ngân sách hoặc nhấn &quot;Thiết lập lại&quot; để gỡ bỏ bớt các bộ lọc tiêu chí.
                </p>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="brutal-btn px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5 mt-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Xóa bộ lọc</span>
                </button>
              </div>
            ) : (
              /* Product List or Grid */
              <div className={layoutView === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-5' : 'grid grid-cols-1 gap-5'}>
                {visibleProducts.map((product: any, idx: number) => {
                  const isTopOne = idx === 0 && algoPreset !== 'price';
                  const isComp = compareIds.includes(product.productId);

                  return (
                    <div
                      key={product.productId}
                      className={`brutal-card p-5 bg-warm-surface flex flex-col ${
                        layoutView === 'list' ? 'md:flex-row' : ''
                      } items-start justify-between gap-5 transition-all ${
                        isTopOne ? 'border-amber-500 ring-2 ring-amber-300' : ''
                      }`}
                    >
                      {/* Left: Image & Info */}
                      <div className="flex items-start gap-4 flex-1 w-full">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-warm-border bg-warm-subtle shrink-0 p-2 flex items-center justify-center overflow-hidden shadow-brutal-xs">
                          {product.primaryImageUrl ? (
                            <img
                              src={product.primaryImageUrl}
                              alt={getProductName(product)}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.target as any).src = 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300';
                              }}
                            />
                          ) : (
                            <Cpu className="w-8 h-8 text-warm-hint" />
                          )}
                        </div>

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {getRankBadge(idx + 1)}
                            {product.brand && (
                              <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-warm-subtle text-warm-muted border border-warm-border">
                                {product.brand}
                              </span>
                            )}
                          </div>

                          <h3 className="font-extrabold text-base text-warm-text hover:text-amber-700 transition-colors">
                            <Link to={`/product/${product.productId}`}>
                              {getProductName(product)}
                            </Link>
                          </h3>

                          <div className="flex items-center gap-3 text-xs font-bold text-warm-muted">
                            <div className="flex items-center gap-1 text-amber-600">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span>{product.avgRating ? Number(product.avgRating).toFixed(1) : '4.5'}</span>
                            </div>
                            <span>•</span>
                            <span>{product.reviewCount || 0} đánh giá</span>
                          </div>

                          {/* Reasoning Badge */}
                          {product.calculatedReasoning && (
                            <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 p-2 rounded-lg font-medium leading-relaxed">
                              {product.calculatedReasoning}
                            </p>
                          )}

                          {/* Specs Badges */}
                          {Object.keys(getSpecs(product)).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-semibold text-warm-muted">
                              {Object.entries(getSpecs(product)).slice(0, 4).map(([k, v]) => (
                                <span key={k} className="px-2 py-0.5 rounded bg-warm-bg border border-warm-border/20">
                                  {k.toUpperCase()}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Scores & Actions */}
                      <div
                        className={`w-full ${
                          layoutView === 'list'
                            ? 'md:w-64 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-warm-border/10 md:pl-5'
                            : 'pt-4 border-t border-warm-border/10'
                        } flex flex-col justify-between shrink-0 space-y-3`}
                      >
                        <div>
                          <div className="text-xs text-warm-muted font-bold">Giá bán tham khảo:</div>
                          <div className="text-xl sm:text-2xl font-black text-amber-700">
                            {formatVnd(product.price)}
                          </div>

                          {/* Score metrics box */}
                          <div className="mt-2.5 p-2.5 rounded-xl border border-warm-border bg-warm-subtle space-y-1.5 text-xs font-bold">
                            <div className="flex items-center justify-between text-warm-text">
                              <span>Điểm Đa Tiêu Chí:</span>
                              <span className="px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 font-black">
                                {product.calculatedScorePercent} / 100
                              </span>
                            </div>

                            {product.specMatchScore !== undefined && (
                              <div className="flex items-center justify-between text-[11px] text-warm-muted">
                                <span>Khớp cấu hình:</span>
                                <span className="text-emerald-700 font-extrabold">
                                  {(product.specMatchScore * 100).toFixed(0)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              toggleCompareId(product.productId);
                              setCompareIds(getCompareIds());
                            }}
                            className={`flex-1 py-2 rounded-xl border-2 border-warm-border text-xs font-extrabold shadow-brutal-xs flex items-center justify-center gap-1 cursor-pointer transition-all ${
                              isComp
                                ? 'bg-emerald-500 text-white'
                                : 'bg-warm-secondary text-warm-secondary-text hover:bg-amber-300'
                            }`}
                          >
                            <Scale className="w-3.5 h-3.5" />
                            <span>{isComp ? '✓ Đang so sánh' : '+ So sánh'}</span>
                          </button>

                          <Link
                            to={`/product/${product.productId}`}
                            className="brutal-btn flex-1 py-2 text-xs font-extrabold shadow-brutal-xs flex items-center justify-center gap-1"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Chi tiết</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 5. Progressive Pagination */}
            {processedProducts.length > displayedCount && (
              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => setDisplayedCount((prev) => prev + 3)}
                  className="brutal-btn px-8 py-3 text-sm font-black shadow-brutal inline-flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>
                    Tải thêm 3 sản phẩm tiếp theo (Còn {processedProducts.length - displayedCount} máy)
                  </span>
                </button>
              </div>
            )}

            {processedProducts.length > 0 && processedProducts.length <= displayedCount && (
              <div className="text-center py-4 text-xs font-bold text-warm-muted">
                ✓ Đã hiển thị toàn bộ {processedProducts.length} sản phẩm phù hợp
              </div>
            )}
          </main>
        </div>
      )}

      {/* Floating Compare Bar */}
      {compareIds.length > 0 && (
        <aside
          aria-label="Thanh so sánh nổi"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-2xl bg-warm-surface border-2 border-warm-border rounded-2xl p-3 shadow-brutal-md flex items-center justify-between gap-3 animate-fade-in"
        >
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-400 text-amber-950 font-black flex items-center justify-center text-xs border border-warm-border shadow-brutal-xs">
              {compareIds.length}
            </span>
            <div className="text-xs">
              <strong className="text-warm-text block">Đã chọn {compareIds.length} / 4 sản phẩm</strong>
              <span className="text-warm-muted text-[11px]">Sẵn sàng so sánh thông số đối đầu</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('shopping_agent_compare', JSON.stringify([]));
                setCompareIds([]);
              }}
              className="text-xs font-bold text-warm-muted hover:text-rose-600 px-2.5 py-1.5 cursor-pointer"
            >
              Xóa hết
            </button>
            <Link
              to={`/compare?ids=${compareIds.join(',')}`}
              className="brutal-btn px-4 py-2 text-xs font-black shadow-brutal-xs flex items-center gap-1.5"
            >
              <span>So sánh ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </aside>
      )}

      {/* 6. Edit Criteria Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="brutal-card p-6 bg-warm-surface w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-warm-border/10">
              <h3 className="text-base font-extrabold text-warm-text flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-600" />
                <span>Chỉnh Sửa Tiêu Chí Phân Tích AI</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-warm-muted hover:text-warm-text font-black text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyCriteriaEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-warm-text mb-1">
                  Mức ngân sách tối đa (VNĐ):
                </label>
                <input
                  type="text"
                  value={editBudgetMax}
                  onChange={(e) => setEditBudgetMax(e.target.value)}
                  placeholder="Ví dụ: 25000000"
                  className="w-full bg-warm-bg border-2 border-warm-border rounded-xl px-3 py-2 font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-warm-text mb-1">
                  Dung lượng RAM tối thiểu:
                </label>
                <input
                  type="text"
                  value={editRam}
                  onChange={(e) => setEditRam(e.target.value)}
                  placeholder="Ví dụ: 16GB"
                  className="w-full bg-warm-bg border-2 border-warm-border rounded-xl px-3 py-2 font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-warm-text mb-1">
                  Nhu cầu trọng tâm:
                </label>
                <input
                  type="text"
                  value={editTarget}
                  onChange={(e) => setEditTarget(e.target.value)}
                  placeholder="Ví dụ: Lập trình web, đồ họa, chơi game nhẹ..."
                  className="w-full bg-warm-bg border-2 border-warm-border rounded-xl px-3 py-2 font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-warm-text mb-1">
                  Màn hình / Tần số quét:
                </label>
                <input
                  type="text"
                  value={editScreenHz}
                  onChange={(e) => setEditScreenHz(e.target.value)}
                  placeholder="Ví dụ: 120Hz, 100% sRGB..."
                  className="w-full bg-warm-bg border-2 border-warm-border rounded-xl px-3 py-2 font-bold text-xs"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-warm-border/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-warm-border bg-warm-bg font-bold text-warm-text cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="brutal-btn px-5 py-2 text-xs font-black shadow-brutal-xs cursor-pointer"
                >
                  Áp dụng &amp; Chạy lại AI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Initial / Empty State with Suggestion Chips */}
      {!result && !loading && (
        <div className="brutal-card p-8 sm:p-12 text-center bg-warm-surface space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-200 border-2 border-warm-border flex items-center justify-center text-warm-text mx-auto shadow-brutal-xs">
            <Sparkles className="w-8 h-8 text-amber-900" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-warm-text">
              Tìm Kiếm Mua Sắm Bằng Trợ Lý Google Gemini
            </h2>

            <p className="text-xs sm:text-sm text-warm-muted max-w-2xl mx-auto font-medium">
              Không cần lọc thông số phức tạp thủ công. Hãy diễn tả nhu cầu và ngân sách của bạn,
              Google Gemini sẽ trích xuất tiêu chí và xếp hạng sản phẩm tối ưu nhất.
            </p>

            {/* Prompt Suggestion Chips */}
            <div className="pt-4 max-w-3xl mx-auto text-left">
              <div className="text-xs font-black uppercase tracking-wider text-warm-muted mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Gợi ý câu hỏi tìm kiếm nhanh (Click để thử ngay):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    title: 'Laptop sinh viên IT pin trâu',
                    query: 'Laptop sinh viên 15 củ học IT pin trâu RAM 16GB',
                  },
                  {
                    title: 'Điện thoại chụp ảnh đẹp < 10 triệu',
                    query: 'Điện thoại chụp ảnh đẹp RAM 8GB dưới 10 triệu pin trâu',
                  },
                  {
                    title: 'Laptop Gaming đồ họa mượt',
                    query: 'Laptop gaming i7 RAM 16GB SSD 512 tầm 25 củ',
                  },
                  {
                    title: 'MacBook mỏng nhẹ văn phòng',
                    query: 'MacBook mỏng nhẹ cho dân văn phòng pin dùng cả ngày dưới 22 triệu',
                  },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQueryInput(item.query);
                      setSearchParams({ q: item.query });
                    }}
                    className="p-3 rounded-xl border-2 border-warm-border bg-warm-bg hover:bg-warm-secondary hover:-translate-y-0.5 text-warm-text shadow-brutal-xs transition-all text-left flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-extrabold group-hover:text-warm-primary transition-colors">
                        {item.title}
                      </span>
                      <span className="text-[11px] text-warm-muted truncate mt-0.5">
                        &ldquo;{item.query}&rdquo;
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-warm-primary group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
