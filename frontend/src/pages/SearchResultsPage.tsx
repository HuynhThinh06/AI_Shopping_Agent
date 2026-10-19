import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchApi } from '../api/searchApi';
import type { SearchResponse, RankedProduct } from '../types/search';
import { addSearchHistory, getAuthUser } from '../utils/storage';
import {
  Sparkles,
  Search,
  ArrowRight,
  Star,
  Cpu,
  AlertCircle,
  Loader2,
  Trophy,
  CheckCircle,
  SlidersHorizontal,
  Filter,
  RotateCcw,
  LayoutGrid,
  List,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

type AlgoPreset = 'balance' | 'price' | 'spec' | 'review';
type SortOrder = 'score_desc' | 'price_asc' | 'price_desc' | 'rating_desc';
type LayoutView = 'list' | 'grid';

const LAPTOP_PRICE_PRESETS = [
  { label: '< 15 triệu', min: 0, max: 15000000 },
  { label: '15 - 20 triệu', min: 15000000, max: 20000000 },
  { label: '20 - 25 triệu', min: 20000000, max: 25000000 },
  { label: '25 - 30 triệu', min: 25000000, max: 30000000 },
  { label: 'Trên 30 triệu', min: 30000000, max: null },
];

const PHONE_PRICE_PRESETS = [
  { label: '< 5 triệu', min: 0, max: 5000000 },
  { label: '5 - 10 triệu', min: 5000000, max: 10000000 },
  { label: '10 - 15 triệu', min: 10000000, max: 15000000 },
  { label: '15 - 20 triệu', min: 15000000, max: 20000000 },
  { label: 'Trên 20 triệu', min: 20000000, max: null },
];

const LAPTOP_RAMS = ['8GB', '16GB', '32GB', '64GB'];
const PHONE_RAMS = ['4GB', '6GB', '8GB', '12GB', '16GB'];

const PHONE_CHIP_DEFINITIONS = [
  { id: 'apple_a', label: 'Apple A-Series Bionic', pattern: /apple|bionic|a15|a16|a17|a18/i },
  { id: 'snapdragon', label: 'Snapdragon (Qualcomm)', pattern: /snapdragon|qualcomm|8 gen|7 gen|778|695|870|888/i },
  { id: 'dimensity', label: 'MediaTek Dimensity / Helio', pattern: /dimensity|helio|mediatek|mtk/i },
  { id: 'exynos', label: 'Samsung Exynos', pattern: /exynos/i },
];

const LAPTOP_CHIP_DEFINITIONS = [
  { id: 'intel_ultra', label: 'Intel Core Ultra (Gen 14 / AI Boost)', pattern: /ultra|core ultra|125h|155h|165h/i },
  { id: 'intel_core_i7_i9', label: 'Intel Core i7 / i9 / Core 7', pattern: /i7|i9|core 7|13700|13620|13650|14700|14900|150u/i },
  { id: 'intel_core_i5', label: 'Intel Core i5 / Core 5', pattern: /i5|core 5|13420|13450|13500|12450|12500|1334u/i },
  { id: 'intel_core_i3', label: 'Intel Core i3 / Core 3', pattern: /i3|core 3|1215u|1315u/i },
  { id: 'amd_ryzen', label: 'AMD Ryzen (5 / 7 / 8000 Series)', pattern: /ryzen|amd|7535|7735|7840|8845/i },
  { id: 'snapdragon', label: 'Snapdragon X Elite / Plus (ARM)', pattern: /snapdragon|x1 26|x elite|x plus/i },
  { id: 'apple_m', label: 'Apple Silicon (M1 / M2 / M3 / M4)', pattern: /apple|m1|m2|m3|m4/i },
];

const PHONE_FEATURE_DEFINITIONS = [
  {
    id: 'phone_camera',
    label: 'Camera xịn (≥ 50MP / OIS)',
    test: (item: RankedProduct, specs: Record<string, any>) => {
      const cam = parseFloat(specs.camera) || 0;
      const str = ((item.productName || '') + ' ' + JSON.stringify(specs)).toLowerCase();
      return cam >= 50 || str.includes('50mp') || str.includes('108mp') || str.includes('200mp') || str.includes('ois');
    },
  },
  {
    id: 'phone_battery',
    label: 'Pin trâu (≥ 5000 mAh)',
    test: (_item: RankedProduct, specs: Record<string, any>) => {
      const b = parseFloat(specs.battery) || 0;
      return b >= 5000;
    },
  },
  {
    id: 'phone_amoled',
    label: 'Màn hình AMOLED / 120Hz',
    test: (item: RankedProduct, specs: Record<string, any>) => {
      const str = ((item.productName || '') + ' ' + JSON.stringify(specs)).toLowerCase();
      return str.includes('amoled') || str.includes('120hz') || str.includes('oled');
    },
  },
];

const LAPTOP_FEATURE_DEFINITIONS = [
  {
    id: 'screen_high_hz',
    label: 'Màn hình tần số cao (≥ 90Hz / 120Hz)',
    test: (item: RankedProduct, specs: Record<string, any>) => {
      const hz = parseFloat(specs.refresh_rate) || 0;
      const name = (item.productName || '').toLowerCase();
      return hz >= 90 || name.includes('120hz') || name.includes('144hz') || name.includes('165hz');
    },
  },
  {
    id: 'screen_large',
    label: 'Màn hình lớn (≥ 15.6 inch)',
    test: (_item: RankedProduct, specs: Record<string, any>) => {
      const sz = parseFloat(specs.screen_size) || 0;
      return sz >= 15.6;
    },
  },
  {
    id: 'screen_compact',
    label: 'Màn hình gọn (≤ 14.0 inch)',
    test: (_item: RankedProduct, specs: Record<string, any>) => {
      const sz = parseFloat(specs.screen_size) || 0;
      return sz > 0 && sz <= 14.0;
    },
  },
  {
    id: 'battery_high',
    label: 'Pin dung lượng cao (≥ 50 Wh)',
    test: (_item: RankedProduct, specs: Record<string, any>) => {
      const b = parseFloat(specs.battery) || 0;
      return b >= 50;
    },
  },
  {
    id: 'lightweight',
    label: 'Mỏng nhẹ di động (≤ 1.5 kg)',
    test: (_item: RankedProduct, specs: Record<string, any>) => {
      const w = parseFloat(specs.weight) || 0;
      return w > 0 && w <= 1.5;
    },
  },
  {
    id: 'dedicated_gpu',
    label: 'Có Card đồ họa rời (RTX / GTX)',
    test: (_item: RankedProduct, specs: Record<string, any>) => {
      const vga = (specs.vga || '').toLowerCase();
      return vga.includes('rtx') || vga.includes('gtx') || (vga.includes('geforce') && !vga.includes('tích hợp'));
    },
  },
];

export const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const user = getAuthUser();

  const [queryInput, setQueryInput] = useState(queryParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);

  // Algorithm & View State
  const [algoPreset, setAlgoPreset] = useState<AlgoPreset>('balance');
  const [sortOrder, setSortOrder] = useState<SortOrder>('score_desc');
  const [layoutView, setLayoutView] = useState<LayoutView>('list');
  const [displayedCount, setDisplayedCount] = useState<number>(6);
  const [showMobileFilter, setShowMobileFilter] = useState<boolean>(false);

  // Facet Filter States
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedRams, setSelectedRams] = useState<string[]>([]);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [customMinPrice, setCustomMinPrice] = useState<number | null>(null);
  const [customMaxPrice, setCustomMaxPrice] = useState<number | null>(null);
  const [activePricePresetIdx, setActivePricePresetIdx] = useState<number | null>(null);

  const lastSearchedQueryRef = React.useRef<string>('');

  const fetchResults = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchApi.searchProducts(text.trim(), 20);
      setResult(data);
      setDisplayedCount(6);

      // Tự động ghi vào lịch sử tư vấn AI của người dùng
      addSearchHistory(
        text.trim(),
        data.extractedCriteria?.categoryCode,
        data.extractedCriteria?.target,
        data.extractedCriteria?.budgetMax,
        data.totalMatched
      );
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err?.response?.data?.detail || 'Không thể kết nối đến máy chủ hoặc dịch vụ AI. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedBrands([]);
    setSelectedRams([]);
    setSelectedChips([]);
    setSelectedFeatures([]);
    setCustomMinPrice(null);
    setCustomMaxPrice(null);
    setActivePricePresetIdx(null);
    setDisplayedCount(6);
  };

  useEffect(() => {
    const cleanQ = queryParam.trim();
    if (cleanQ && lastSearchedQueryRef.current !== cleanQ) {
      lastSearchedQueryRef.current = cleanQ;
      setQueryInput(cleanQ);
      handleResetFilters();
      fetchResults(cleanQ);
    }
  }, [queryParam]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim()) return;
    const nextQ = queryInput.trim();
    if (nextQ === queryParam.trim()) {
      handleResetFilters();
      fetchResults(nextQ);
    } else {
      setSearchParams({ q: nextQ });
    }
  };

  const formatVnd = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ';
  };

  const parseSpecs = (specs: any): Record<string, any> => {
    if (!specs) return {};
    if (typeof specs === 'object') return specs;
    try {
      return JSON.parse(specs);
    } catch {
      return {};
    }
  };

  const getRankBadge = (pos: number) => {
    if (pos === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-400 text-amber-950 font-black text-xs border border-warm-border shadow-brutal-xs">
          <Trophy className="w-3.5 h-3.5 fill-current" />
          <span>Top 1 Phù Hợp Nhất</span>
        </span>
      );
    }
    if (pos === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-200 text-slate-800 font-bold text-xs border border-warm-border shadow-brutal-xs">
          <span>Top 2</span>
        </span>
      );
    }
    if (pos === 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-200 text-amber-900 font-bold text-xs border border-warm-border shadow-brutal-xs">
          <span>Top 3</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-warm-subtle text-warm-muted font-bold text-xs border border-warm-border">
        Hạng #{pos}
      </span>
    );
  };

  // Determine Category (Phone vs Laptop)
  const isPhone = useMemo(() => {
    const code = (result?.extractedCriteria?.categoryCode || '').toLowerCase();
    if (code.includes('phone') || code.includes('điện thoại')) return true;
    if (code.includes('laptop')) return false;
    if (result && result.results.length > 0) {
      const phoneCount = result.results.filter(
        (r) =>
          r.specs?.chipset ||
          ((r.brand && ['apple', 'samsung', 'xiaomi', 'oppo'].includes(r.brand.toLowerCase())) && !r.specs?.vga)
      ).length;
      return phoneCount > result.results.length / 2;
    }
    return false;
  }, [result]);

  const activePricePresets = isPhone ? PHONE_PRICE_PRESETS : LAPTOP_PRICE_PRESETS;
  const activeRams = isPhone ? PHONE_RAMS : LAPTOP_RAMS;
  const activeChipDefs = isPhone ? PHONE_CHIP_DEFINITIONS : LAPTOP_CHIP_DEFINITIONS;
  const activeFeatureDefs = isPhone ? PHONE_FEATURE_DEFINITIONS : LAPTOP_FEATURE_DEFINITIONS;

  // Aggregate Brands and Chip Counts from current search results
  const brandFacetCounts = useMemo(() => {
    if (!result?.results) return {};
    const counts: Record<string, number> = {};
    result.results.forEach((item) => {
      if (item.brand) {
        const b = item.brand.trim();
        counts[b] = (counts[b] || 0) + 1;
      }
    });
    return counts;
  }, [result]);

  const chipFacetCounts = useMemo(() => {
    if (!result?.results) return {};
    const counts: Record<string, number> = {};
    result.results.forEach((item) => {
      const specs = parseSpecs(item.specs);
      const cpuStr = ((specs.cpu || specs.chipset || '') + ' ' + (item.productName || '')).toLowerCase();
      activeChipDefs.forEach((fam) => {
        if (fam.pattern.test(cpuStr)) {
          counts[fam.id] = (counts[fam.id] || 0) + 1;
        }
      });
    });
    return counts;
  }, [result, activeChipDefs]);

  // SAW / MCDM Calculation Engine
  const calculateScore = (
    item: RankedProduct,
    preset: AlgoPreset,
    minP: number,
    maxP: number
  ) => {
    const rawSpecScore = item.specMatchScore ?? item.score ?? 0.85;
    const sSpec = Math.max(0.1, Math.min(1.0, rawSpecScore));

    let sPrice = 0.5;
    const p = item.price || 0;
    if (maxP > minP) {
      const rawNorm = (maxP - p) / (maxP - minP);
      sPrice = preset === 'price' ? rawNorm : 0.25 + 0.75 * rawNorm;
      sPrice = Math.max(0.0, Math.min(1.0, sPrice));
    } else {
      sPrice = 1.0;
    }

    const rating = item.avgRating ? Number(item.avgRating) : 5.0;
    const sRating = Math.max(0.0, Math.min(1.0, rating / 5.0));

    let wSpec = 0.4,
      wPrice = 0.35,
      wRating = 0.25;
    if (preset === 'spec') {
      wSpec = 0.6;
      wPrice = 0.2;
      wRating = 0.2;
    } else if (preset === 'price') {
      wSpec = 0.2;
      wPrice = 0.6;
      wRating = 0.2;
    } else if (preset === 'review') {
      wSpec = 0.25;
      wPrice = 0.25;
      wRating = 0.5;
    }

    const composite = wSpec * sSpec + wPrice * sPrice + wRating * sRating;
    const score100 = Math.min(99, Math.max(65, Math.round(composite * 100)));

    let reasoning = '';
    if (preset === 'price') {
      if (sPrice >= 0.95 && rating < 4.2) {
        reasoning = `Mức giá ${formatVnd(p)} tiết kiệm chi phí hàng đầu (tối ưu giá ${Math.round(sPrice * 100)}%). Cân đối với đánh giá ${rating.toFixed(1)}/5 sao để tránh đánh đổi chất lượng chỉ vì rẻ hơn.`;
      } else if (sPrice >= 0.85) {
        reasoning = `Mức giá ${formatVnd(p)} cực kỳ mềm và tiết kiệm ngân sách, đạt điểm tối ưu giá ${Math.round(sPrice * 100)}% trong nhóm đề xuất.`;
      } else {
        reasoning = `Mức giá ${formatVnd(p)} hợp lý trong phân khúc, đạt điểm tương thích giá ${Math.round(sPrice * 100)}% cùng độ hài lòng ${rating.toFixed(1)}/5 sao.`;
      }
    } else if (preset === 'spec') {
      reasoning = `Cấu hình phần cứng vượt trội với điểm tương thích kỹ thuật ${Math.round(sSpec * 100)}%, đáp ứng tối đa hiệu năng cho các tác vụ chuyên sâu.`;
    } else if (preset === 'review') {
      reasoning = `Đánh giá thực tế từ người dùng đạt ${rating.toFixed(1)}/5 sao, thể hiện độ tin cậy và sự hài lòng vượt bậc trong quá trình sử dụng lâu dài.`;
    } else {
      reasoning = 'Cân bằng xuất sắc giữa cấu hình phần cứng mạnh mẽ, tầm giá hợp lý và độ hài lòng người dùng.';
    }

    return { composite, score100, reasoning, sSpec, sPrice, sRating };
  };

  // Processed, Filtered & Sorted Products
  const processedProducts = useMemo(() => {
    if (!result?.results || result.results.length === 0) return [];

    let minP = Infinity;
    let maxP = -Infinity;
    result.results.forEach((item) => {
      if (item.price != null) {
        if (item.price < minP) minP = item.price;
        if (item.price > maxP) maxP = item.price;
      }
    });
    if (minP === Infinity) minP = 0;
    if (maxP === -Infinity) maxP = 50000000;

    // Filter
    const filtered = result.results.filter((item) => {
      const p = item.price || 0;
      if (customMinPrice != null && p < customMinPrice) return false;
      if (customMaxPrice != null && p > customMaxPrice) return false;

      if (selectedBrands.length > 0) {
        const itemBrand = (item.brand || '').toLowerCase().trim();
        if (!selectedBrands.some((b) => b.toLowerCase() === itemBrand)) return false;
      }

      const specs = parseSpecs(item.specs);

      // RAM filter
      if (selectedRams.length > 0) {
        const itemRam = String(specs.ram || '').toUpperCase();
        const matchesRam = selectedRams.some((r) => {
          const num = r.replace(/\D/g, '');
          return itemRam.includes(num);
        });
        if (!matchesRam) return false;
      }

      // Chip filter
      if (selectedChips.length > 0) {
        const cpuStr = ((specs.cpu || specs.chipset || '') + ' ' + (item.productName || '')).toLowerCase();
        const matchesChip = selectedChips.some((chipId) => {
          const fam = activeChipDefs.find((f) => f.id === chipId);
          return fam ? fam.pattern.test(cpuStr) : false;
        });
        if (!matchesChip) return false;
      }

      // Feature highlights filter
      if (selectedFeatures.length > 0) {
        const matchesFeatures = selectedFeatures.every((featId) => {
          const feat = activeFeatureDefs.find((f) => f.id === featId);
          return feat ? feat.test(item, specs) : true;
        });
        if (!matchesFeatures) return false;
      }

      return true;
    });

    // Score & Sort
    const scoredList = filtered.map((item) => {
      const scoreData = calculateScore(item, algoPreset, minP, maxP);
      return { ...item, calculated: scoreData };
    });

    scoredList.sort((a, b) => {
      if (sortOrder === 'price_asc') return a.price - b.price;
      if (sortOrder === 'price_desc') return b.price - a.price;
      if (sortOrder === 'rating_desc') return (b.avgRating || 0) - (a.avgRating || 0);
      return b.calculated.composite - a.calculated.composite;
    });

    return scoredList;
  }, [
    result,
    algoPreset,
    sortOrder,
    customMinPrice,
    customMaxPrice,
    selectedBrands,
    selectedRams,
    selectedChips,
    selectedFeatures,
    activeChipDefs,
    activeFeatureDefs,
  ]);

  const visibleProducts = processedProducts.slice(0, displayedCount);

  const toggleBrand = (b: string) => {
    setSelectedBrands((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
    );
  };

  const toggleRam = (r: string) => {
    setSelectedRams((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  const toggleChip = (c: string) => {
    setSelectedChips((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const toggleFeature = (f: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  };

  const handlePricePreset = (idx: number) => {
    if (activePricePresetIdx === idx) {
      setActivePricePresetIdx(null);
      setCustomMinPrice(null);
      setCustomMaxPrice(null);
    } else {
      setActivePricePresetIdx(idx);
      const preset = activePricePresets[idx];
      setCustomMinPrice(preset.min);
      setCustomMaxPrice(preset.max);
    }
  };

  const activeFilterCount =
    (activePricePresetIdx !== null || customMinPrice != null || customMaxPrice != null ? 1 : 0) +
    selectedBrands.length +
    selectedRams.length +
    selectedChips.length +
    selectedFeatures.length;

  return (
    <div className="space-y-6 py-4">
      {/* Search Input Bar */}
      <section className="brutal-card p-4 bg-warm-surface">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 relative flex items-center">
            <Search className="w-5 h-5 text-warm-hint absolute left-3.5" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Nhập câu hỏi tìm kiếm tự nhiên (VD: Laptop sinh viên 15 củ học IT pin trâu)..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border-2 border-warm-border bg-warm-bg text-warm-text font-bold text-sm sm:text-base focus:outline-none focus:bg-white focus:border-amber-500 shadow-brutal-xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="brutal-btn px-6 py-2.5 text-sm font-bold shadow-brutal shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{loading ? 'Đang phân tích...' : 'Phân tích & Tìm'}</span>
          </button>
        </form>
      </section>

      {/* Loading State */}
      {loading && (
        <div className="brutal-card p-12 text-center bg-warm-surface space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl border-2 border-warm-border bg-amber-200 flex items-center justify-center shadow-brutal-sm animate-bounce">
            <Sparkles className="w-7 h-7 text-amber-900 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-lg text-warm-text">Gemini AI đang phân tích truy vấn...</h3>
            <p className="text-xs text-warm-muted">
              Đang trích xuất ràng buộc ngôn ngữ tự nhiên $\rightarrow$ Lọc qua CSDL PostgreSQL GIN Index $\rightarrow$ Tính điểm xếp hạng Weighted Scoring.
            </p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && !loading && (
        <div className="p-4 rounded-xl border-2 border-rose-600 bg-rose-50 text-rose-900 shadow-brutal-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-extrabold text-sm">Có lỗi xảy ra khi gọi AI Search:</div>
            <div className="text-xs mt-1">{error}</div>
          </div>
        </div>
      )}

      {/* Criteria Extraction Banner */}
      {result && !loading && (
        <section className="brutal-card p-5 sm:p-6 bg-warm-surface space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-warm-border/10">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-warm-border bg-amber-100 text-amber-950 font-extrabold text-xs shadow-brutal-xs">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Trích xuất tiêu chí thành công</span>
              </span>
              <span className="text-xs text-warm-muted font-medium">
                Tìm thấy <strong>{result.totalMatched}</strong> sản phẩm ứng viên
              </span>
            </div>

            {user && user.role?.toLowerCase().includes('admin') && (
              <Link
                to="/admin/llm-logs"
                className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1"
              >
                <span>Xem log &amp; token tiêu thụ</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-warm-muted">Câu truy vấn:</div>
            <div className="text-lg font-extrabold text-warm-text mt-0.5">
              “{queryParam}”
            </div>
          </div>

          {/* Extracted pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
            {result.extractedCriteria?.categoryCode && (
              <span className="px-3 py-1.5 rounded-xl border border-warm-border bg-sky-100 text-sky-950 font-bold shadow-brutal-xs">
                Ngành hàng: <strong className="uppercase">{result.extractedCriteria.categoryCode}</strong>
              </span>
            )}

            {(result.extractedCriteria?.budgetMin || result.extractedCriteria?.budgetMax) && (
              <span className="px-3 py-1.5 rounded-xl border border-warm-border bg-emerald-100 text-emerald-950 font-bold shadow-brutal-xs">
                Ngân sách: <strong>
                  {result.extractedCriteria.budgetMin ? formatVnd(result.extractedCriteria.budgetMin) : '0'} 
                  {' — '}
                  {result.extractedCriteria.budgetMax ? formatVnd(result.extractedCriteria.budgetMax) : 'Không giới hạn'}
                </strong>
              </span>
            )}

            {result.extractedCriteria?.target && (
              <span className="px-3 py-1.5 rounded-xl border border-warm-border bg-purple-100 text-purple-950 font-bold shadow-brutal-xs">
                Đối tượng: <strong className="capitalize">{result.extractedCriteria.target}</strong>
              </span>
            )}

            {result.extractedCriteria?.requiredSpecs &&
              Object.entries(result.extractedCriteria.requiredSpecs).map(([key, val]) => (
                <span key={key} className="px-3 py-1.5 rounded-xl border border-warm-border bg-amber-100 text-amber-950 font-bold shadow-brutal-xs">
                  {key.toUpperCase()}: <strong>{val}</strong>
                </span>
              ))}
          </div>
        </section>
      )}

      {/* Main Results Area with Facet Sidebar */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowMobileFilter(!showMobileFilter)}
              className="brutal-btn px-4 py-2 text-xs font-bold shadow-brutal-xs flex items-center gap-2 cursor-pointer"
            >
              <Filter className="w-4 h-4" />
              <span>Bộ lọc tìm kiếm ({activeFilterCount})</span>
              {showMobileFilter ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-rose-700 font-extrabold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại ({activeFilterCount})</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Dynamic Faceted Filters Sidebar */}
            <aside
              className={`lg:col-span-4 xl:col-span-3 space-y-5 brutal-card p-5 bg-warm-surface ${
                showMobileFilter ? 'block' : 'hidden lg:block'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-warm-border/10">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-warm-primary" />
                  <h3 className="font-black text-sm text-warm-text uppercase tracking-wide">
                    Bộ Lọc {isPhone ? 'Điện Thoại' : 'Laptop'}
                  </h3>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-[11px] text-warm-muted hover:text-rose-700 font-extrabold flex items-center gap-1 cursor-pointer"
                    title="Xóa tất cả bộ lọc đang chọn"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Đặt lại</span>
                  </button>
                )}
              </div>

              {/* Price Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-warm-text">Khoảng giá mong muốn:</span>
                  {activePricePresetIdx !== null && (
                    <span className="text-[11px] font-bold text-amber-700">
                      ({activePricePresets[activePricePresetIdx].label})
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {activePricePresets.map((p, idx) => {
                    const isActive = activePricePresetIdx === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePricePreset(idx)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold shadow-brutal-xs transition-all cursor-pointer ${
                          isActive
                            ? 'border-warm-border bg-warm-secondary text-warm-secondary-text font-black'
                            : 'border-warm-border bg-warm-bg text-warm-text hover:bg-warm-secondary/50'
                        }`}
                      >
                        {p.label} {isActive ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5 text-xs pt-1">
                  <input
                    type="number"
                    value={customMinPrice ?? ''}
                    onChange={(e) => {
                      setActivePricePresetIdx(null);
                      setCustomMinPrice(e.target.value ? Number(e.target.value) : null);
                    }}
                    placeholder="Từ (đ)"
                    className="w-full bg-warm-bg border border-warm-border rounded-lg px-2 py-1 text-center font-bold text-xs focus:outline-none focus:border-amber-500"
                  />
                  <span>–</span>
                  <input
                    type="number"
                    value={customMaxPrice ?? ''}
                    onChange={(e) => {
                      setActivePricePresetIdx(null);
                      setCustomMaxPrice(e.target.value ? Number(e.target.value) : null);
                    }}
                    placeholder="Đến (đ)"
                    className="w-full bg-warm-bg border border-warm-border rounded-lg px-2 py-1 text-center font-bold text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Brands Filter */}
              <div className="pt-3 border-t border-warm-border/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-warm-text">Thương hiệu:</span>
                  <span className="text-[11px] text-warm-muted font-bold">
                    {Object.keys(brandFacetCounts).length} hãng
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1 text-xs">
                  {Object.entries(brandFacetCounts).map(([brand, count]) => {
                    const checked = selectedBrands.includes(brand);
                    return (
                      <label
                        key={brand}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-warm-subtle/50 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleBrand(brand)}
                            className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                          />
                          <span className={checked ? 'font-black text-amber-900' : 'font-bold text-warm-text'}>
                            {brand}
                          </span>
                        </span>
                        <span className="text-warm-muted text-[11px] font-bold">{count} máy</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* RAM Filter */}
              <div className="pt-3 border-t border-warm-border/10 space-y-2">
                <span className="text-xs font-extrabold text-warm-text block">Dung lượng RAM:</span>
                <div className="flex flex-wrap gap-1.5">
                  {activeRams.map((ram) => {
                    const checked = selectedRams.includes(ram);
                    return (
                      <button
                        key={ram}
                        type="button"
                        onClick={() => toggleRam(ram)}
                        className={`px-3 py-1 rounded-xl border text-xs font-bold shadow-brutal-xs transition-all cursor-pointer ${
                          checked
                            ? 'border-warm-border bg-warm-secondary text-warm-secondary-text font-black'
                            : 'border-warm-border bg-warm-bg text-warm-text hover:bg-warm-secondary/50'
                        }`}
                      >
                        {ram} {checked ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Processor / Chipset */}
              <div className="pt-3 border-t border-warm-border/10 space-y-2">
                <span className="text-xs font-extrabold text-warm-text block">
                  {isPhone ? 'Chipset / Vi xử lý:' : 'Dòng Vi Xử Lý:'}
                </span>
                <div className="space-y-1 text-xs max-h-40 overflow-y-auto pr-1">
                  {activeChipDefs.map((chip) => {
                    const checked = selectedChips.includes(chip.id);
                    const count = chipFacetCounts[chip.id] || 0;
                    return (
                      <label
                        key={chip.id}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-warm-subtle/50 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleChip(chip.id)}
                            className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                          />
                          <span className={checked ? 'font-black text-amber-900' : 'font-bold text-warm-text'}>
                            {chip.label}
                          </span>
                        </span>
                        {count > 0 && (
                          <span className="text-warm-muted text-[11px] font-bold">{count} máy</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="pt-3 border-t border-warm-border/10 space-y-2">
                <span className="text-xs font-extrabold text-warm-text block">Tính năng nổi bật:</span>
                <div className="space-y-1 text-xs">
                  {activeFeatureDefs.map((feat) => {
                    const checked = selectedFeatures.includes(feat.id);
                    return (
                      <label
                        key={feat.id}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-warm-subtle/50 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleFeature(feat.id)}
                            className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                          />
                          <span className={checked ? 'font-black text-amber-900' : 'font-bold text-warm-text'}>
                            {feat.label}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Right: Results Content Area */}
            <main className="lg:col-span-8 xl:col-span-9 space-y-4">
              {/* Top Control Bar: MCDM Presets & Toolbar */}
              <div className="brutal-card p-4 bg-warm-surface space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* MCDM Algorithm Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-extrabold text-warm-muted uppercase tracking-wider mr-1">
                      Chiến lược:
                    </span>
                    {(
                      [
                        { id: 'balance', label: 'Cân bằng' },
                        { id: 'price', label: 'Giá mềm' },
                        { id: 'spec', label: 'Cấu hình' },
                        { id: 'review', label: 'Đánh giá' },
                      ] as const
                    ).map((preset) => {
                      const isActive = algoPreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setAlgoPreset(preset.id)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer shadow-brutal-xs ${
                            isActive
                              ? 'bg-warm-primary text-warm-primary-text border-warm-border'
                              : 'bg-warm-bg text-warm-text border-warm-border hover:bg-warm-secondary/50'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Layout View & Sort dropdown */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                      className="px-2.5 py-1.5 rounded-xl border border-warm-border bg-warm-bg text-warm-text font-bold text-xs shadow-brutal-xs focus:outline-none"
                    >
                      <option value="score_desc">Điểm tổng hợp cao nhất</option>
                      <option value="price_asc">Giá: Thấp đến cao</option>
                      <option value="price_desc">Giá: Cao đến thấp</option>
                      <option value="rating_desc">Đánh giá cao nhất</option>
                    </select>

                    <div className="flex items-center border border-warm-border rounded-xl bg-warm-bg p-0.5 shadow-brutal-xs">
                      <button
                        type="button"
                        onClick={() => setLayoutView('list')}
                        title="Dạng danh sách"
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          layoutView === 'list'
                            ? 'bg-warm-primary text-warm-primary-text font-black'
                            : 'text-warm-muted hover:text-warm-text'
                        }`}
                      >
                        <List className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLayoutView('grid')}
                        title="Dạng lưới thẻ"
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          layoutView === 'grid'
                            ? 'bg-warm-primary text-warm-primary-text font-black'
                            : 'text-warm-muted hover:text-warm-text'
                        }`}
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Strategy Explanation Hint */}
                <div className="text-[11px] text-warm-muted font-medium pt-1 border-t border-warm-border/10 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  {algoPreset === 'price' && (
                    <span>
                      <strong className="text-amber-800">Ưu tiên giá mềm:</strong> Phân bổ 60% Giá + 20% Đánh giá + 20% Cấu hình phần cứng.
                    </span>
                  )}
                  {algoPreset === 'spec' && (
                    <span>
                      <strong className="text-amber-800">Ưu tiên cấu hình:</strong> Trọng số 60% Phần cứng kỹ thuật + 20% Giá + 20% Đánh giá.
                    </span>
                  )}
                  {algoPreset === 'review' && (
                    <span>
                      <strong className="text-amber-800">Ưu tiên đánh giá:</strong> Trọng số 50% Trải nghiệm người dùng thực tế + 25% Giá + 25% Cấu hình.
                    </span>
                  )}
                  {algoPreset === 'balance' && (
                    <span>
                      Được xếp hạng tự động theo thuật toán chấm điểm đa tiêu chí cân bằng (40% Cấu hình + 35% Giá + 25% Đánh giá).
                    </span>
                  )}
                </div>
              </div>

              {/* Empty search results state */}
              {processedProducts.length === 0 ? (
                <div className="brutal-card p-12 text-center bg-warm-surface space-y-3">
                  <AlertCircle className="w-10 h-10 text-warm-muted mx-auto" />
                  <h3 className="font-extrabold text-base text-warm-text">Không tìm thấy sản phẩm phù hợp</h3>
                  <p className="text-xs text-warm-muted max-w-md mx-auto">
                    Các bộ lọc hiện tại quá chặt. Bạn có thể nhấn &quot;Đặt lại bộ lọc&quot; hoặc mở rộng khoảng ngân sách.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="brutal-btn px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Xóa bộ lọc</span>
                  </button>
                </div>
              ) : (
                /* Ranked Product Cards */
                <div className={layoutView === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
                  {visibleProducts.map((product, idx) => {
                    const specs = parseSpecs(product.specs);
                    const rankPos = idx + 1;

                    return (
                      <div
                        key={product.productId}
                        className={`brutal-card p-5 bg-warm-surface transition-all flex flex-col justify-between ${
                          rankPos === 1 ? 'border-amber-500 ring-2 ring-amber-300' : ''
                        }`}
                      >
                        <div className={layoutView === 'list' ? 'flex flex-col md:flex-row items-start gap-5' : 'space-y-3'}>
                          {/* Image & Rank */}
                          <div className={layoutView === 'list' ? 'w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-warm-border bg-warm-subtle shrink-0 p-2 flex items-center justify-center overflow-hidden shadow-brutal-xs' : 'w-full aspect-[4/3] rounded-2xl border-2 border-warm-border bg-warm-subtle p-3 flex items-center justify-center overflow-hidden shadow-brutal-xs'}>
                            {product.primaryImageUrl ? (
                              <img
                                src={product.primaryImageUrl}
                                alt={product.productName}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as any).src = 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300';
                                }}
                              />
                            ) : (
                              <Cpu className="w-8 h-8 text-warm-hint" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {getRankBadge(rankPos)}
                              {product.brand && (
                                <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-warm-subtle text-warm-muted border border-warm-border">
                                  {product.brand}
                                </span>
                              )}
                            </div>

                            <h3 className="font-extrabold text-base text-warm-text hover:text-amber-700 transition-colors line-clamp-2">
                              <Link to={`/product/${product.productId}`}>
                                {product.productName}
                              </Link>
                            </h3>

                            <div className="flex items-center gap-3 text-xs font-bold text-warm-muted">
                              <div className="flex items-center gap-1 text-amber-600">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span>{product.avgRating ? Number(product.avgRating).toFixed(1) : '4.8'}</span>
                              </div>
                              <span>•</span>
                              <span>{product.reviewCount || 0} đánh giá</span>
                            </div>

                            {/* Specs Pills */}
                            {specs && Object.keys(specs).length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1 text-[11px] font-semibold text-warm-muted">
                                {Object.entries(specs).slice(0, 4).map(([k, v]) => (
                                  <span key={k} className="px-2 py-0.5 rounded bg-warm-bg border border-warm-border-subtle truncate max-w-[180px]">
                                    {k}: {String(v)}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Trade-off reasoning explanation pill */}
                            {product.calculated?.reasoning && (
                              <div className="p-2 rounded-xl border border-warm-border/30 bg-warm-subtle/50 text-[11px] font-semibold text-warm-text flex items-start gap-1.5 mt-2">
                                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <span className="leading-snug">{product.calculated.reasoning}</span>
                              </div>
                            )}
                          </div>

                          {/* Pricing & Score Box (Right on List view) */}
                          <div
                            className={
                              layoutView === 'list'
                                ? 'w-full md:w-56 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-warm-border/10 md:pl-5 flex flex-col justify-between shrink-0'
                                : 'pt-3 border-t border-warm-border/10 space-y-3'
                            }
                          >
                            <div>
                              <div className="text-[11px] text-warm-muted font-bold">Giá tham khảo:</div>
                              <div className="text-xl font-black text-amber-700">
                                {formatVnd(product.price)}
                              </div>

                              <div className="mt-2 p-2 rounded-xl border border-warm-border bg-warm-subtle space-y-1 text-xs font-bold">
                                <div className="flex items-center justify-between text-warm-text">
                                  <span>Điểm Tổng Hợp:</span>
                                  <span className="px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 font-black text-xs">
                                    {product.calculated.score100} / 100
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-warm-muted">
                                  <span>Tương thích cấu hình:</span>
                                  <span className="text-emerald-700 font-extrabold">
                                    {Math.round(product.calculated.sSpec * 100)}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            <Link
                              to={`/product/${product.productId}`}
                              className="brutal-btn mt-3 w-full py-2 text-xs font-black shadow-brutal-xs flex items-center justify-center gap-1.5"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Xem Chi Tiết &amp; Review AI</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Progressive Pagination */}
              {processedProducts.length > displayedCount && (
                <div className="pt-4 text-center space-y-2">
                  <button
                    type="button"
                    onClick={() => setDisplayedCount((prev) => prev + 6)}
                    className="brutal-btn px-6 py-2.5 text-xs font-black shadow-brutal mx-auto cursor-pointer"
                  >
                    <span>Xem Thêm Sản Phẩm (Còn {processedProducts.length - displayedCount} máy)</span>
                    <ChevronDown className="w-4 h-4 ml-1 inline" />
                  </button>
                  <p className="text-[11px] text-warm-muted font-bold">
                    Đang hiển thị {visibleProducts.length} / {processedProducts.length} sản phẩm phù hợp
                  </p>
                </div>
              )}
            </main>
          </div>
        </div>
      )}

      {/* Empty State / Welcome Guide when no query yet */}
      {!queryParam && !loading && !result && (
        <div className="space-y-6">
          <div className="brutal-card p-6 sm:p-8 bg-warm-surface text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 border-warm-border bg-warm-secondary text-warm-secondary-text font-black text-xs shadow-brutal-xs">
              <Sparkles className="w-4 h-4 text-warm-primary animate-pulse" />
              <span>Khám Phá Sức Mạnh Trợ Lý Mua Sắm Bằng AI</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-warm-text tracking-tight">
              Tìm Thiết Bị Công Nghệ Theo Ngôn Ngữ Tự Nhiên
            </h2>

            <p className="text-xs sm:text-sm text-warm-muted max-w-2xl mx-auto font-medium">
              Bạn có thể gõ bất kỳ câu hỏi nào bằng văn phong đời thường, tiếng lóng hay yêu cầu kỹ thuật chi tiết.
              Mô hình <strong>Gemini AI</strong> sẽ tự động nhận diện thiết bị, phân tách tiêu chí cấu hình &amp; mức giá để đề xuất sản phẩm tốt nhất.
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
                        “{item.query}”
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
