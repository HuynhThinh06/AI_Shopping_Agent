import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { ProductDetailDTO } from '../types/product';
import type { SummaryDTO } from '../types/review';
import {
  getCompareBuckets,
  setCompareCategoryIds,
  toggleCompareId,
  clearCompare,
  getAuthUser,
  type AuthUser,
  type CompareCategory,
} from '../utils/storage';
import {
  Scale,
  Trash2,
  Star,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Sparkles,
  Trophy,
  Target,
  ArrowRight,
  SlidersHorizontal,
  AlertTriangle,
  Lightbulb,
  Laptop,
  Smartphone,
  Check,
  LogIn,
} from 'lucide-react';

interface CompareItem {
  product: ProductDetailDTO;
  summary: SummaryDTO | undefined;
}

interface ProductRecommendation {
  productId: number;
  productName: string;
  badge: string;
  badgeColor: string;
  idealFor: string;
  highlights: string[];
}

interface ComparisonVerdict {
  winnerId: number;
  winnerName: string;
  winnerReason: string;
  tradeOffSummary: string;
  intentLabel: string;
  recommendations: ProductRecommendation[];
}

interface IntentOption {
  id: string;
  label: string;
  icon: string;
  description: string;
}

const LAPTOP_INTENTS: IntentOption[] = [
  {
    id: 'all',
    label: 'Cân bằng Đa dụng',
    icon: '⚖️',
    description: 'Đánh giá tổng hòa giữa P/P, chất lượng hoàn thiện và độ hài lòng của cộng đồng.',
  },
  {
    id: 'developer_it',
    label: 'Lập trình & Kỹ thuật IT',
    icon: '💻',
    description: 'Ưu tiên tối đa RAM (≥ 16GB), CPU đa luồng mạnh và SSD rộng để chạy Docker, IDE, máy ảo.',
  },
  {
    id: 'student_office',
    label: 'Học tập & Văn phòng',
    icon: '🎓',
    description: 'Ưu tiên tối ưu chi phí (giá mềm), gọn nhẹ, đáp ứng mượt Word, Excel, lướt web và pin bền.',
  },
  {
    id: 'designer_creator',
    label: 'Đồ họa & Sáng tạo',
    icon: '🎨',
    description: 'Ưu tiên màn hình chuẩn màu (OLED, 100% sRGB, độ phân giải cao) và GPU xử lý đồ họa.',
  },
  {
    id: 'business_mobility',
    label: 'Mỏng nhẹ Di động',
    icon: '✈️',
    description: 'Ưu tiên trọng lượng siêu nhẹ (≤ 1.4kg), thiết kế sang trọng và thời lượng pin làm việc cả ngày.',
  },
];

const PHONE_INTENTS: IntentOption[] = [
  {
    id: 'all',
    label: 'Cân bằng Đa dụng',
    icon: '⚖️',
    description: 'Đánh giá tổng hòa các tiêu chí camera, hiệu năng, pin và mức giá.',
  },
  {
    id: 'camera_photo',
    label: 'Chụp ảnh & Quay video',
    icon: '📸',
    description: 'Ưu tiên cụm camera độ phân giải cao, chống rung OIS, chụp đêm và quay phim 4K sắc nét.',
  },
  {
    id: 'gaming_perf',
    label: 'Gaming & Hiệu năng cao',
    icon: '🎮',
    description: 'Ưu tiên vi xử lý đồ họa mạnh, màn hình tần số quét 120Hz/144Hz mượt mà và tản nhiệt tốt.',
  },
  {
    id: 'battery_durability',
    label: 'Pin trâu & Bền bỉ',
    icon: '🔋',
    description: 'Ưu tiên dung lượng pin lớn (≥ 5000mAh), sạc nhanh và độ bền kháng nước kháng bụi.',
  },
  {
    id: 'budget_daily',
    label: 'Phổ thông Tiết kiệm',
    icon: '💰',
    description: 'Ưu tiên giá thành hợp lý nhất cho tác vụ nghe gọi, nhắn tin, mạng xã hội hàng ngày.',
  },
];

export const ComparePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState<AuthUser | null>(() => getAuthUser());
  const [buckets, setBuckets] = useState(() => getCompareBuckets());

  // Tự động phát hiện tab ban đầu từ URL hoặc dựa trên khoang có sản phẩm
  const initialCategory = useMemo(() => {
    const paramCat = searchParams.get('category')?.toLowerCase();
    if (paramCat === 'phone' || paramCat === 'laptop') return paramCat;
    const b = getCompareBuckets();
    if (b.laptop.length === 0 && b.phone.length > 0) return 'phone';
    return 'laptop';
  }, []);

  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [items, setItems] = useState<CompareItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showOnlyDifferences, setShowOnlyDifferences] = useState<boolean>(false);
  const [selectedIntent, setSelectedIntent] = useState<string>('all');

  const loadComparedProducts = async (categoryOverride?: string) => {
    const currentUser = getAuthUser();
    if (!currentUser) {
      setItems([]);
      setLoading(false);
      return;
    }

    const currentBuckets = getCompareBuckets();
    setBuckets(currentBuckets);

    const targetCat = (categoryOverride || activeCategory || 'laptop').toLowerCase();
    const idsParam = searchParams.get('ids');
    let ids: number[] = [];

    if (idsParam) {
      ids = idsParam.split(',').map((x) => parseInt(x.trim(), 10)).filter(Boolean);
    } else {
      ids = targetCat === 'phone' ? currentBuckets.phone : currentBuckets.laptop;
    }

    if (ids.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Batch fetch products (1 SQL query duy nhất)
      const pRes = await apiClient.get<ProductDetailDTO[]>('/products/by-ids', {
        params: { ids: ids.join(',') },
      });
      const prodList = pRes.data || [];

      // 2. Fetch AI summaries song song
      const validItems: CompareItem[] = await Promise.all(
        prodList.map(async (prod) => {
          let sData: SummaryDTO | undefined;
          try {
            const sRes = await apiClient.get<SummaryDTO>(`/products/${prod.id}/summary`);
            sData = sRes.data;
          } catch {
            // Ignore summary failure
          }
          return { product: prod, summary: sData };
        })
      );

      setItems(validItems);

      // Nếu truyền idsParam qua URL, cập nhật activeCategory đồng bộ
      if (idsParam && validItems.length > 0) {
        const firstCat = (validItems[0].product.categoryCode || 'laptop').toLowerCase();
        if (firstCat === 'phone' || firstCat === 'laptop') {
          setActiveCategory(firstCat);
        }
      }
    } catch (err) {
      console.error('Failed to load compare items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComparedProducts();
  }, [searchParams, activeCategory]);

  useEffect(() => {
    const handleUpdate = () => {
      setUser(getAuthUser());
      const b = getCompareBuckets();
      setBuckets(b);
      loadComparedProducts();
    };
    window.addEventListener('auth-updated', handleUpdate);
    window.addEventListener('compare-updated', handleUpdate);
    return () => {
      window.removeEventListener('auth-updated', handleUpdate);
      window.removeEventListener('compare-updated', handleUpdate);
    };
  }, [activeCategory]);

  // Phát hiện danh mục chéo nếu có URL params can thiệp
  const distinctCategories = useMemo(() => {
    const cats = new Set(items.map((x) => (x.product.categoryCode || 'laptop').toLowerCase()));
    return Array.from(cats);
  }, [items]);

  const hasCategoryConflict = distinctCategories.length > 1;

  // Lọc sản phẩm theo danh mục đang chọn để bảo vệ tính nhất quán dữ liệu
  const activeItems = useMemo(() => {
    if (!hasCategoryConflict) return items;
    return items.filter(
      (x) => (x.product.categoryCode || 'laptop').toLowerCase() === activeCategory
    );
  }, [items, hasCategoryConflict, activeCategory]);

  const handleRemove = (id: number) => {
    toggleCompareId(id, activeCategory);
    const remaining = items.filter((x) => x.product.id !== id);
    setItems(remaining);
    setBuckets(getCompareBuckets());
    if (searchParams.get('ids')) {
      setSearchParams({ ids: remaining.map((x) => x.product.id).join(','), category: activeCategory });
    }
  };

  const handleClearCategory = () => {
    clearCompare(activeCategory as CompareCategory);
    setItems([]);
    setBuckets(getCompareBuckets());
    setSearchParams({ category: activeCategory });
  };

  const handleClearAll = () => {
    clearCompare('all');
    setItems([]);
    setBuckets({ laptop: [], phone: [] });
    setSearchParams({});
  };

  const handleKeepOnlyCategory = (catToKeep: string) => {
    const keepList = items.filter(
      (x) => (x.product.categoryCode || 'laptop').toLowerCase() === catToKeep.toLowerCase()
    );
    setItems(keepList);
    setActiveCategory(catToKeep);
    setSearchParams({ ids: keepList.map((x) => x.product.id).join(','), category: catToKeep });
    setCompareCategoryIds(catToKeep, keepList.map((x) => x.product.id));
  };

  const handleAddSample = (ids: number[], cat: string) => {
    setCompareCategoryIds(cat, ids);
    setActiveCategory(cat);
    setSearchParams({ category: cat });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Collect unique spec keys for active items
  const allSpecKeys = useMemo(() => {
    return Array.from(
      new Set(activeItems.flatMap((item) => Object.keys(item.product.specs || {})))
    );
  }, [activeItems]);

  const isSpecDifferent = (key: string) => {
    if (activeItems.length <= 1) return false;
    const firstVal = String(activeItems[0]?.product.specs?.[key] ?? '').trim().toLowerCase();
    return activeItems.some(
      (item) => String(item.product.specs?.[key] ?? '').trim().toLowerCase() !== firstVal
    );
  };

  const visibleSpecKeys = useMemo(() => {
    if (!showOnlyDifferences) return allSpecKeys;
    return allSpecKeys.filter(isSpecDifferent);
  }, [allSpecKeys, showOnlyDifferences, activeItems]);

  const minPrice = useMemo(() => {
    if (activeItems.length === 0) return 0;
    return Math.min(...activeItems.map((x) => x.product.price));
  }, [activeItems]);

  const maxRating = useMemo(() => {
    if (activeItems.length === 0) return 0;
    return Math.max(...activeItems.map((x) => x.product.avgRating || 0));
  }, [activeItems]);

  // Current intent options based on category
  const currentIntentOptions = activeCategory === 'phone' ? PHONE_INTENTS : LAPTOP_INTENTS;
  const currentIntentObj =
    currentIntentOptions.find((i) => i.id === selectedIntent) || currentIntentOptions[0];

  // AI Context-Aware Verdict & Synthesis Generator
  const verdict = useMemo<ComparisonVerdict | null>(() => {
    if (activeItems.length < 2) return null;

    const scores = activeItems.map((item) => {
      const p = item.product;
      const specs = p.specs || {};
      const specsStr = JSON.stringify(specs).toLowerCase();
      const nameStr = p.name.toLowerCase();

      let score = 50;

      // Base price score
      const priceRatio = minPrice / (p.price || 1);
      const rating = p.avgRating || 4.5;

      // Context-aware scoring weights based on user intent
      if (selectedIntent === 'developer_it') {
        // High RAM & CPU priority
        if (specsStr.includes('32gb') || nameStr.includes('32gb')) score += 35;
        else if (specsStr.includes('16gb') || nameStr.includes('16gb')) score += 25;
        else if (specsStr.includes('8gb')) score -= 15;

        if (specsStr.includes('i7') || specsStr.includes('ultra 7') || specsStr.includes('ryzen 7')) score += 20;
        else if (specsStr.includes('i5') || specsStr.includes('ultra 5') || specsStr.includes('ryzen 5')) score += 12;

        if (specsStr.includes('1tb')) score += 15;
        else if (specsStr.includes('512gb')) score += 10;

        score += priceRatio * 10; // lower price weight
        score += (rating / 5) * 10;
      } else if (selectedIntent === 'student_office' || selectedIntent === 'budget_daily') {
        // Maximum budget / savings priority
        score += priceRatio * 45;
        score += (rating / 5) * 20;

        const weightMatch = specsStr.match(/(\d+\.?\d*)\s*(kg|g)/);
        if (weightMatch && weightMatch[2] === 'kg' && parseFloat(weightMatch[1]) <= 1.5) score += 15;
        if (specsStr.includes('512gb')) score += 10;
      } else if (selectedIntent === 'designer_creator') {
        // Display & GPU priority
        if (specsStr.includes('oled') || specsStr.includes('amoled') || specsStr.includes('retina')) score += 35;
        if (specsStr.includes('100% srgb') || specsStr.includes('dci-p3')) score += 20;
        if (specsStr.includes('rtx') || specsStr.includes('gtx') || specsStr.includes('geforce')) score += 25;
        if (specsStr.includes('16gb') || specsStr.includes('32gb')) score += 15;

        score += priceRatio * 10;
        score += (rating / 5) * 10;
      } else if (selectedIntent === 'business_mobility') {
        // Portability & Battery priority
        const weightMatch = specsStr.match(/(\d+\.?\d*)\s*(kg|g)/);
        if (weightMatch && weightMatch[2] === 'kg') {
          const w = parseFloat(weightMatch[1]);
          if (w <= 1.3) score += 35;
          else if (w <= 1.5) score += 20;
        }
        if (specsStr.includes('wh') || specsStr.includes('pin')) score += 15;
        if (p.brand === 'Apple' || p.brand === 'Lenovo' || p.brand === 'HP') score += 10;

        score += priceRatio * 15;
        score += (rating / 5) * 15;
      } else if (selectedIntent === 'camera_photo') {
        // Phone Camera priority
        if (specsStr.includes('200 mp') || specsStr.includes('108 mp') || specsStr.includes('50 mp')) score += 35;
        if (specsStr.includes('ois') || specsStr.includes('chống rung')) score += 20;
        if (specsStr.includes('4k') || specsStr.includes('8k')) score += 15;
        score += priceRatio * 15;
        score += (rating / 5) * 15;
      } else if (selectedIntent === 'gaming_perf') {
        // Phone Gaming priority
        if (specsStr.includes('144hz') || specsStr.includes('165hz') || specsStr.includes('120hz')) score += 25;
        if (specsStr.includes('snapdragon 8') || specsStr.includes('dimensity 9') || specsStr.includes('bionic')) score += 35;
        if (specsStr.includes('12gb') || specsStr.includes('16gb')) score += 15;
        score += priceRatio * 15;
        score += (rating / 5) * 10;
      } else if (selectedIntent === 'battery_durability') {
        // Phone Battery priority
        if (specsStr.includes('6000 mah') || specsStr.includes('5000 mah')) score += 30;
        if (specsStr.includes('67w') || specsStr.includes('120w') || specsStr.includes('68w')) score += 20;
        if (specsStr.includes('ip68') || specsStr.includes('ip65')) score += 20;
        score += priceRatio * 15;
        score += (rating / 5) * 15;
      } else {
        // Default Balanced
        score += priceRatio * 25;
        score += (rating / 5) * 15;
        if (specsStr.includes('16gb') || specsStr.includes('32gb')) score += 8;
        if (specsStr.includes('1tb')) score += 10;
        else if (specsStr.includes('512gb')) score += 6;
        if (specsStr.includes('oled') || specsStr.includes('amoled')) score += 8;
      }

      return { item, score };
    });

    scores.sort((a, b) => b.score - a.score);
    const topScorer = scores[0];

    // Build context-specific trade-off summary
    const sortedByPrice = [...activeItems].sort((a, b) => a.product.price - b.product.price);
    const cheapest = sortedByPrice[0];
    const mostExpensive = sortedByPrice[sortedByPrice.length - 1];
    const priceDiff = mostExpensive.product.price - cheapest.product.price;

    let tradeOff = '';
    let winnerReason = '';

    if (selectedIntent === 'developer_it') {
      winnerReason = `${topScorer.item.product.name} là lựa chọn số 1 cho Lập trình viên & IT nhờ cấu hình RAM và vi xử lý vượt trội, hạn chế tối đa nghẽn bộ nhớ khi chạy Docker/IDE.`;
      tradeOff =
        priceDiff > 0
          ? `Mức chênh lệch ${formatPrice(priceDiff)} là khoản đầu tư hoàn toàn xứng đáng cho công việc lập trình: đổi lấy dung lượng RAM lớn hơn và chip xử lý đa nhiệm khỏe hơn, tiết kiệm thời gian chờ biên dịch code mỗi ngày.`
          : `Các máy có mức giá tương đương nhau, nhưng ${topScorer.item.product.name} dẫn đầu về sự tối ưu cho môi trường phát triển phần mềm.`;
    } else if (selectedIntent === 'student_office' || selectedIntent === 'budget_daily') {
      winnerReason = `${topScorer.item.product.name} tối ưu chi phí tuyệt đối cho Học tập & Văn phòng, đáp ứng mượt mà nhu cầu soạn thảo, học tập online với mức giá tiết kiệm nhất.`;
      tradeOff = `Lựa chọn ${cheapest.product.name} giúp bạn giữ lại được ${formatPrice(priceDiff)} ngân sách để chi tiêu cho các mục đích khác, trong khi hiệu năng văn phòng hoàn toàn đáp ứng trọn vẹn.`;
    } else if (selectedIntent === 'designer_creator') {
      winnerReason = `${topScorer.item.product.name} dẫn đầu cho tác vụ Đồ họa & Sáng tạo nhờ màn hình hiển thị xuất sắc, độ chuẩn màu cao và năng lực xử lý hình ảnh ổn định.`;
      tradeOff = `Đối với công việc sáng tạo hình ảnh/video, chất lượng tấm nền màn hình và độ chuẩn màu quan trọng hơn vài triệu đồng chênh lệch ban đầu.`;
    } else if (selectedIntent === 'business_mobility') {
      winnerReason = `${topScorer.item.product.name} tối ưu nhất cho người hay di chuyển nhờ trọng lượng mỏng nhẹ, pin làm việc bền bỉ và độ hoàn thiện cao cấp.`;
      tradeOff = `Sự gọn nhẹ và tính cơ động linh hoạt mang lại trải nghiệm làm việc thoải mái khi công tác, cà phê hay di chuyển liên tục.`;
    } else if (selectedIntent === 'camera_photo') {
      winnerReason = `${topScorer.item.product.name} là lựa chọn xuất sắc cho nhu cầu quay chụp nhờ cụm camera sắc nét, chống rung và khả năng xử lý thuật toán hình ảnh tốt.`;
      tradeOff = `Chất lượng camera vượt trội giúp bạn có được những bức ảnh và video sắc nét, hạn chế rung nhòe trong mọi điều kiện ánh sáng.`;
    } else {
      winnerReason = `Sản phẩm dẫn đầu với sự cân đối xuất sắc giữa chi phí (${formatPrice(topScorer.item.product.price)}), thông số kỹ thuật và độ hài lòng của cộng đồng (${topScorer.item.product.avgRating?.toFixed(1) || '5.0'}★).`;
      tradeOff =
        priceDiff > 0
          ? `Mức chênh lệch ngân sách giữa các tùy chọn là ${formatPrice(priceDiff)}. Nếu chọn ${cheapest.product.name}, bạn tiết kiệm được chi phí ban đầu; chi thêm cho ${mostExpensive.product.name} sẽ giúp bạn có phần cứng dồi dào hơn và vòng đời sử dụng lâu dài hơn.`
          : `Các sản phẩm có mức giá tương đương nhau. Điểm quyết định nằm ở sự khác biệt về cấu hình cụ thể và đánh giá thực tế từ người dùng.`;
    }

    // Build Recommendations
    const recommendations: ProductRecommendation[] = activeItems.map((item) => {
      const p = item.product;
      const specsStr = JSON.stringify(p.specs || {}).toLowerCase();
      const isCheapest = p.price === minPrice;
      const isWinner = p.id === topScorer.item.product.id;

      const highlights: string[] = [];
      let idealFor = '';
      let badge = 'Cân bằng tốt';
      let badgeColor = 'bg-warm-secondary text-warm-secondary-text';

      if (isWinner) {
        badge = `Top 1 cho ${currentIntentObj.label}`;
        badgeColor = 'bg-amber-100 text-amber-900 border-amber-400';
        idealFor = `Lý tưởng nhất cho nhu cầu ${currentIntentObj.label.toLowerCase()} của bạn theo phân tích thuật toán.`;
      } else if (isCheapest) {
        badge = 'Tối ưu ngân sách (Best Budget)';
        badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-400';
        idealFor = 'Người dùng ưu tiên tối đa việc tiết kiệm chi phí ban đầu.';
        highlights.push(`Mức giá mềm nhất trong nhóm so sánh (${formatPrice(p.price)})`);
      } else {
        badge = 'Phương án dự phòng';
        badgeColor = 'bg-stone-100 text-stone-800 border-stone-300';
        idealFor = 'Người dùng có cảm tình với thương hiệu hoặc kiểu dáng riêng của máy này.';
      }

      if (specsStr.includes('oled') || specsStr.includes('amoled')) {
        highlights.push('Màn hình OLED màu sắc sống động, độ tương phản cao');
      }
      if (specsStr.includes('16gb') || specsStr.includes('32gb')) {
        highlights.push('RAM dồi dào (16GB+), đa nhiệm mượt không giật lag');
      }
      if (specsStr.includes('1tb')) {
        highlights.push('Ổ cứng 1TB rộng rãi, lưu dữ liệu thoải mái');
      }
      if (p.avgRating && p.avgRating >= 4.7 && (p.reviewCount || 0) > 0) {
        highlights.push(`Đánh giá thực tế rất cao (${p.avgRating.toFixed(1)}/5★ từ cộng đồng)`);
      }

      if (highlights.length === 0) {
        highlights.push('Cấu hình ổn định, độ bền chính hãng được bảo đảm');
      }

      return {
        productId: p.id,
        productName: p.name,
        badge,
        badgeColor,
        idealFor,
        highlights,
      };
    });

    return {
      winnerId: topScorer.item.product.id,
      winnerName: topScorer.item.product.name,
      winnerReason,
      tradeOffSummary: tradeOff,
      intentLabel: currentIntentObj.label,
      recommendations,
    };
  }, [activeItems, selectedIntent, minPrice, maxRating, currentIntentObj]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto my-8 sm:my-14 space-y-6">
        <div className="bg-warm-surface border-2 border-warm-text rounded-3xl p-6 sm:p-10 shadow-brutal text-center space-y-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-400 border-2 border-warm-text mx-auto flex items-center justify-center text-3xl sm:text-4xl shadow-brutal-xs">
            ⚖️
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-warm-secondary border border-warm-text text-[11px] font-black uppercase text-warm-secondary-text inline-block">
              Tính năng Đặc quyền Thành viên
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-warm-text tracking-tight">
              Ma Trận So Sánh & Phán Quyết Tư Vấn AI
            </h1>
            <p className="text-xs sm:text-sm text-warm-muted font-medium max-w-lg mx-auto leading-relaxed">
              Bạn cần đăng nhập tài khoản để mở khóa không gian đối chiếu thông số phần cứng đa chiều và nhận phán quyết mua sắm may đo từ mô hình AI.
            </p>
          </div>

          {/* 3 Value Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
            <div className="p-3.5 rounded-xl border-2 border-warm-text bg-warm-bg shadow-brutal-xs space-y-1.5">
              <div className="text-lg">⚡</div>
              <h3 className="font-black text-xs text-warm-text">Bóc Tách Khác Biệt</h3>
              <p className="text-[11px] text-warm-muted leading-snug">
                Tự động so kè từng thông số CPU, RAM, GPU, màn hình và tô sáng điểm chênh lệch.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border-2 border-warm-text bg-warm-bg shadow-brutal-xs space-y-1.5">
              <div className="text-lg">🧠</div>
              <h3 className="font-black text-xs text-warm-text">Tổng Hợp Ưu/Nhược AI</h3>
              <p className="text-[11px] text-warm-muted leading-snug">
                Mô hình ngôn ngữ lớn đọc hàng trăm đánh giá thực tế để trích xuất điểm khen/chê chân thực.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border-2 border-warm-text bg-warm-bg shadow-brutal-xs space-y-1.5">
              <div className="text-lg">🏆</div>
              <h3 className="font-black text-xs text-warm-text">Phán Quyết May Đo</h3>
              <p className="text-[11px] text-warm-muted leading-snug">
                Hệ thống DSS phân tích mục đích (Lập trình, Đồ họa, Pin, Giá rẻ) để chọn Top Pick chuẩn nhất.
              </p>
            </div>
          </div>

          {/* Action CTA Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/auth?mode=login&redirect=/compare"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-warm-primary hover:bg-warm-primary-hover text-warm-primary-text font-black text-xs sm:text-sm border-2 border-warm-text shadow-brutal-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập để Mở khóa</span>
            </Link>

            <Link
              to="/auth?mode=register&redirect=/compare"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-warm-bg hover:bg-warm-secondary text-warm-text font-black text-xs sm:text-sm border-2 border-warm-text shadow-brutal-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Đăng ký Tài khoản Mới</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-warm-secondary border border-warm-text text-warm-secondary-text text-xs font-black uppercase">
              So sánh đa chiều theo ngành hàng
            </span>
            <span className="text-xs text-warm-muted font-bold font-mono">
              {activeItems.length} / 3 sản phẩm ({activeCategory === 'phone' ? 'Điện thoại' : 'Laptop'})
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-warm-text tracking-tight mt-1 flex items-center gap-2">
            <Scale className="w-7 h-7 text-warm-primary" />
            Ma Trận So Sánh Sản Phẩm & Phán Quyết AI
          </h1>
          <p className="text-xs sm:text-sm text-warm-muted font-medium mt-1">
            Đặt cạnh nhau các thông số phần cứng cùng hệ quy chiếu, đánh giá theo mục đích sử dụng cụ thể của bạn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {activeItems.length > 0 && (
            <button
              type="button"
              onClick={() => setShowOnlyDifferences(!showOnlyDifferences)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black border border-warm-text shadow-brutal-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                showOnlyDifferences
                  ? 'bg-amber-400 text-stone-900 border-stone-900 ring-2 ring-amber-400/50'
                  : 'bg-warm-bg text-warm-text hover:bg-warm-secondary'
              }`}
              title="Ẩn những thông số giống nhau giữa các sản phẩm"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showOnlyDifferences ? 'Hiển thị tất cả' : 'Chỉ xem khác biệt'}</span>
            </button>
          )}

          {activeItems.length > 0 && (
            <button
              type="button"
              onClick={handleClearCategory}
              className="px-3.5 py-2 rounded-xl bg-warm-bg hover:bg-rose-100 text-rose-700 font-black text-xs border border-warm-text shadow-brutal-xs flex items-center gap-1.5 cursor-pointer"
              title={`Xóa danh sách so sánh ${activeCategory === 'phone' ? 'Điện thoại' : 'Laptop'}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa {activeCategory === 'phone' ? 'Điện thoại' : 'Laptop'}</span>
            </button>
          )}

          {(buckets.laptop.length > 0 || buckets.phone.length > 0) && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-2 rounded-xl bg-warm-bg hover:bg-stone-200 text-stone-600 font-bold text-xs border border-warm-text/30 flex items-center gap-1 cursor-pointer"
              title="Xóa toàn bộ cả 2 ngành hàng"
            >
              <span>Xóa tất cả (cả 2)</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Buckets Tab Switcher */}
      <div className="flex border-b-2 border-warm-text gap-3 pt-1">
        <button
          type="button"
          onClick={() => {
            setActiveCategory('laptop');
            setSearchParams((prev) => {
              const p = new URLSearchParams(prev);
              p.set('category', 'laptop');
              p.delete('ids');
              return p;
            });
          }}
          className={`px-5 py-3 font-black text-xs sm:text-sm border-2 border-b-0 border-warm-text rounded-t-xl flex items-center gap-2 cursor-pointer transition-all ${
            activeCategory === 'laptop'
              ? 'bg-amber-400 text-stone-950 shadow-brutal-xs -translate-y-1'
              : 'bg-warm-surface text-warm-muted hover:text-warm-text hover:bg-warm-secondary'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>So sánh Laptop</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
              activeCategory === 'laptop' ? 'bg-stone-950 text-amber-300' : 'bg-warm-bg text-warm-muted'
            }`}
          >
            {buckets.laptop.length}/3
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveCategory('phone');
            setSearchParams((prev) => {
              const p = new URLSearchParams(prev);
              p.set('category', 'phone');
              p.delete('ids');
              return p;
            });
          }}
          className={`px-5 py-3 font-black text-xs sm:text-sm border-2 border-b-0 border-warm-text rounded-t-xl flex items-center gap-2 cursor-pointer transition-all ${
            activeCategory === 'phone'
              ? 'bg-amber-400 text-stone-950 shadow-brutal-xs -translate-y-1'
              : 'bg-warm-surface text-warm-muted hover:text-warm-text hover:bg-warm-secondary'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>So sánh Điện thoại</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
              activeCategory === 'phone' ? 'bg-stone-950 text-amber-300' : 'bg-warm-bg text-warm-muted'
            }`}
          >
            {buckets.phone.length}/3
          </span>
        </button>
      </div>

      {/* Category Mismatch Warning Banner */}
      {hasCategoryConflict && (
        <div className="bg-amber-50 border-2 border-amber-500 rounded-2xl p-4 shadow-brutal space-y-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 border border-amber-600 flex items-center justify-center shrink-0 text-stone-950 font-black">
              <AlertTriangle className="w-5 h-5 text-amber-950" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-amber-950">
                Phát hiện sản phẩm khác ngành hàng trong danh sách (Không cùng hệ quy chiếu kỹ thuật)
              </h3>
              <p className="text-xs text-amber-900 font-medium mt-0.5 leading-relaxed">
                Về mặt nguyên lý so sánh, không thể đối đầu trực tiếp giữa <strong>Điện thoại</strong> và{' '}
                <strong>Laptop</strong> (khác biệt hoàn toàn về công năng, kích thước, hệ điều hành và giá trị sử dụng). Hệ thống đã tự động tách riêng để kết luận AI không bị sai lệch:
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-2.5">
                <span className="text-xs font-black text-amber-950">Chọn ngành hàng để so sánh:</span>
                {distinctCategories.map((cat) => {
                  const count = items.filter(
                    (x) => (x.product.categoryCode || 'laptop').toLowerCase() === cat
                  ).length;
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleKeepOnlyCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 border-warm-text shadow-brutal-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                        isActive
                          ? 'bg-amber-400 text-stone-950 -translate-y-0.5'
                          : 'bg-warm-bg text-warm-text hover:bg-warm-secondary'
                      }`}
                    >
                      {cat === 'phone' ? <Smartphone className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
                      <span>
                        Chỉ so sánh {cat === 'phone' ? 'Điện thoại' : 'Laptop'} ({count} máy)
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-6 shadow-brutal space-y-6 animate-pulse">
          <div className="h-6 w-64 bg-warm-bg rounded-md"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="bg-warm-bg border-2 border-warm-text/20 rounded-xl p-4 space-y-4">
                <div className="w-full h-40 bg-warm-surface rounded-lg"></div>
                <div className="h-4 bg-warm-surface rounded w-3/4"></div>
                <div className="h-5 bg-warm-surface rounded w-1/2"></div>
                <div className="space-y-2 pt-2 border-t border-warm-text/10">
                  <div className="h-3 bg-warm-surface rounded w-full"></div>
                  <div className="h-3 bg-warm-surface rounded w-5/6"></div>
                  <div className="h-3 bg-warm-surface rounded w-4/6"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeItems.length === 0 ? (
        <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-8 sm:p-12 shadow-brutal text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-warm-secondary border-2 border-warm-text mx-auto flex items-center justify-center text-3xl shadow-brutal-xs">
            {activeCategory === 'phone' ? '📱' : '💻'}
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-lg font-black text-warm-text">
              Chưa có {activeCategory === 'phone' ? 'điện thoại' : 'laptop'} nào trong bảng so sánh (Tối đa 3 máy)
            </h2>
            <p className="text-xs text-warm-muted mt-1 leading-relaxed">
              Bạn có thể bấm vào biểu tượng cán cân (⚖️) trên bất kỳ thẻ sản phẩm nào ở trang Tìm kiếm hoặc Danh mục để đưa vào khoang {activeCategory === 'phone' ? 'Điện thoại' : 'Laptop'}.
            </p>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            {activeCategory === 'laptop' ? (
              <button
                type="button"
                onClick={() => handleAddSample([169, 171], 'laptop')}
                className="px-4 py-2 rounded-xl bg-warm-primary text-warm-primary-text font-black text-xs border-2 border-warm-text shadow-brutal-xs hover:bg-warm-primary-hover cursor-pointer"
              >
                Thử so sánh mẫu Laptop: MacBook Air M5 vs Vivobook 16
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleAddSample([192, 193], 'phone')}
                className="px-4 py-2 rounded-xl bg-warm-primary text-warm-primary-text font-black text-xs border-2 border-warm-text shadow-brutal-xs hover:bg-warm-primary-hover cursor-pointer"
              >
                Thử so sánh mẫu Điện thoại: Nothing Phone (4a) vs Galaxy A37
              </button>
            )}
            <Link
              to={`/category?type=${activeCategory}`}
              className="px-4 py-2 rounded-xl bg-warm-bg text-warm-text font-bold text-xs border border-warm-text shadow-brutal-xs hover:bg-warm-secondary"
            >
              Duyệt danh mục {activeCategory === 'phone' ? 'Điện thoại' : 'Laptop'}
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* USER INTENT / GOAL SELECTOR BAR */}
          <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 sm:p-5 shadow-brutal space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-warm-primary" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-warm-text">
                  Bạn đang tìm {activeCategory === 'phone' ? 'điện thoại' : 'laptop'} phục vụ cho nhu cầu gì?
                </h3>
              </div>
              <span className="text-[11px] text-warm-muted font-bold">
                (AI sẽ đổi trọng số phán quyết may đo theo mục đích này)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
              {currentIntentOptions.map((intent) => {
                const isSelected = selectedIntent === intent.id;
                return (
                  <button
                    key={intent.id}
                    type="button"
                    onClick={() => setSelectedIntent(intent.id)}
                    className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-stone-900 bg-amber-400 text-stone-950 shadow-brutal-xs -translate-y-0.5'
                        : 'border-warm-border-subtle bg-warm-bg hover:bg-warm-secondary text-warm-text'
                    }`}
                  >
                    <div>
                      <div className="text-base mb-1">{intent.icon}</div>
                      <div className="font-black text-xs leading-snug">{intent.label}</div>
                    </div>
                    <div className="text-[10px] text-stone-700 font-medium line-clamp-2 mt-1 opacity-80">
                      {intent.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Final Verdict & Recommendation Section */}
          {verdict && (
            <div className="bg-gradient-to-br from-amber-50 via-warm-surface to-emerald-50/40 border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-warm-text pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-400 border-2 border-warm-text flex items-center justify-center shadow-brutal-xs">
                    <Sparkles className="w-5 h-5 text-stone-900" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-warm-text tracking-tight flex items-center gap-2">
                      Phán Quyết & Tư Vấn May Đo Cho: {verdict.intentLabel}
                    </h2>
                    <p className="text-xs text-warm-muted font-bold">
                      Hệ thống DSS phân tích đa thuộc tính (MADM) theo ngữ cảnh thực tế của người dùng
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-emerald-100 border border-emerald-400 rounded-xl px-3 py-1.5 shadow-brutal-xs">
                  <Trophy className="w-4 h-4 text-emerald-800 shrink-0" />
                  <div className="text-xs">
                    <span className="font-medium text-emerald-900">Chiến thắng: </span>
                    <strong className="font-black text-emerald-950">{verdict.winnerName}</strong>
                  </div>
                </div>
              </div>

              {/* Core Trade-off Narrative */}
              <div className="bg-warm-bg/90 border border-warm-text rounded-xl p-4 shadow-brutal-xs">
                <div className="flex items-start gap-2.5">
                  <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-xs font-black uppercase tracking-wider text-warm-text">
                      Góc nhìn tư vấn cho nhu cầu [{verdict.intentLabel}]:
                    </h3>
                    <p className="text-xs text-warm-text leading-relaxed font-semibold">
                      {verdict.winnerReason}
                    </p>
                    <p className="text-[11px] text-warm-muted font-medium pt-1">
                      ⚖️ {verdict.tradeOffSummary}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actionable Recommendations Cards */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-warm-muted mb-3 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-warm-text" />
                  <span>Lời khuyên chi tiết cho từng máy:</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {verdict.recommendations.map((rec) => (
                    <div
                      key={rec.productId}
                      className={`rounded-xl border-2 border-warm-text p-4 shadow-brutal-xs bg-warm-surface flex flex-col justify-between ${
                        rec.productId === verdict.winnerId ? 'ring-2 ring-emerald-500' : ''
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${rec.badgeColor}`}
                          >
                            {rec.badge}
                          </span>
                          {rec.productId === verdict.winnerId && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-400 text-stone-900 text-[10px] font-black border border-warm-text">
                              Khuyên dùng 🏆
                            </span>
                          )}
                        </div>

                        <h4 className="font-black text-sm text-warm-text line-clamp-1">
                          {rec.productName}
                        </h4>

                        <div className="text-xs text-warm-text bg-warm-bg rounded-lg p-2.5 border border-warm-border-subtle">
                          <span className="font-black text-[11px] text-warm-primary-text block mb-1">
                            🎯 Đánh giá theo nhu cầu:
                          </span>
                          <p className="font-medium text-[11px] leading-relaxed text-warm-text">
                            {rec.idealFor}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase text-warm-muted">
                            Ưu thế nổi trội:
                          </span>
                          <ul className="space-y-1 text-xs">
                            {rec.highlights.map((h, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 text-[11px] text-warm-text font-medium">
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{h}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="pt-3 mt-3 border-t border-warm-border-subtle">
                        <Link
                          to={`/product/${rec.productId}`}
                          className="w-full py-1.5 px-3 rounded-lg bg-warm-secondary hover:bg-warm-secondary-hover text-warm-secondary-text font-black text-xs border border-warm-text shadow-brutal-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <span>Xem chi tiết máy</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Comparison Matrix Table */}
          <div className="bg-warm-surface border-2 border-warm-text rounded-2xl shadow-brutal overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-warm-bg border-b-2 border-warm-text">
                    <th className="p-4 w-48 font-black uppercase text-[11px] text-warm-muted align-middle">
                      <div>
                        <span>Tiêu chí đối chiếu</span>
                        {showOnlyDifferences && (
                          <span className="block text-[10px] text-amber-700 font-bold mt-0.5 normal-case">
                            (Đang lọc chỉ hiện thuộc tính khác biệt)
                          </span>
                        )}
                      </div>
                    </th>
                    {activeItems.map((item) => {
                      const isCheapest = item.product.price === minPrice;
                      const isTopRated = (item.product.avgRating || 0) === maxRating;
                      const isWinner = item.product.id === verdict?.winnerId;

                      return (
                        <th key={item.product.id} className="p-4 min-w-[280px] align-top bg-warm-surface">
                          <div className="space-y-3">
                            {/* Product Image Thumbnail */}
                            <div className="w-full h-36 bg-warm-bg border-2 border-warm-text rounded-xl overflow-hidden relative group flex items-center justify-center shadow-brutal-xs">
                              {item.product.imageUrls && item.product.imageUrls.length > 0 ? (
                                <img
                                  src={item.product.imageUrls[0]}
                                  alt={item.product.name}
                                  className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="text-4xl text-warm-muted">
                                  {activeCategory === 'phone' ? '📱' : '💻'}
                                </span>
                              )}

                              {isWinner && (
                                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-400 text-stone-900 font-black text-[10px] border border-warm-text shadow-brutal-xs flex items-center gap-1">
                                  <Trophy className="w-3 h-3" />
                                  Top Pick
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemove(item.product.id)}
                                className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-warm-surface/90 hover:bg-rose-100 text-rose-700 font-black text-xs border border-warm-text shadow-brutal-xs flex items-center justify-center cursor-pointer"
                                title="Xóa sản phẩm này"
                              >
                                ✕
                              </button>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded bg-warm-secondary border border-warm-text text-[10px] font-black uppercase text-warm-secondary-text">
                                  {item.product.brand}
                                </span>
                                {isCheapest && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-400 text-emerald-900 text-[10px] font-black">
                                    Giá tốt nhất
                                  </span>
                                )}
                                {isTopRated && (item.product.reviewCount || 0) > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-400 text-amber-900 text-[10px] font-black">
                                    Đánh giá cao
                                  </span>
                                )}
                              </div>

                              <Link
                                to={`/product/${item.product.id}`}
                                className="font-extrabold text-sm text-warm-text hover:text-warm-primary block line-clamp-2 leading-snug"
                              >
                                {item.product.name}
                              </Link>

                              <div className="text-base font-black font-mono text-warm-primary-text flex items-center gap-2">
                                <span>{formatPrice(item.product.price)}</span>
                              </div>

                              <div className="flex items-center gap-1 text-xs">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                <span className="font-bold">
                                  {item.product.avgRating ? item.product.avgRating.toFixed(1) : '5.0'}
                                </span>
                                <span className="text-[10px] text-warm-muted">
                                  ({item.product.reviewCount} đánh giá)
                                </span>
                              </div>

                              <Link
                                to={`/product/${item.product.id}`}
                                className="inline-flex items-center gap-1 text-[11px] font-black text-warm-primary-text hover:underline pt-1"
                              >
                                <span>Xem trang chi tiết</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y-2 divide-warm-border-subtle font-medium">
                  {/* AI Review Summary Pros */}
                  <tr className="bg-emerald-50/50">
                    <td className="p-4 font-black text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Ưu điểm AI tóm tắt</span>
                    </td>
                    {activeItems.map((item) => (
                      <td key={item.product.id} className="p-4 align-top text-xs text-warm-text leading-relaxed">
                        {item.summary?.pros ? (
                          <div className="whitespace-pre-line text-emerald-950 font-semibold bg-emerald-100/60 p-2.5 rounded-lg border border-emerald-300">
                            {item.summary.pros}
                          </div>
                        ) : (
                          <span className="text-warm-muted italic">Đang tổng hợp đánh giá người dùng...</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* AI Review Summary Cons */}
                  <tr className="bg-rose-50/50">
                    <td className="p-4 font-black text-rose-900 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-700 shrink-0" />
                      <span>Nhược điểm AI tóm tắt</span>
                    </td>
                    {activeItems.map((item) => (
                      <td key={item.product.id} className="p-4 align-top text-xs text-warm-text leading-relaxed">
                        {item.summary?.cons ? (
                          <div className="whitespace-pre-line text-rose-950 font-semibold bg-rose-100/60 p-2.5 rounded-lg border border-rose-300">
                            {item.summary.cons}
                          </div>
                        ) : (
                          <span className="text-warm-muted italic">Chưa ghi nhận điểm trừ đáng kể.</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Specs Rows */}
                  {visibleSpecKeys.length === 0 ? (
                    <tr>
                      <td colSpan={activeItems.length + 1} className="p-6 text-center text-warm-muted font-bold italic">
                        Không có thuộc tính nào khác biệt trong các sản phẩm đã chọn.
                      </td>
                    </tr>
                  ) : (
                    visibleSpecKeys.map((key) => {
                      const isDiff = isSpecDifferent(key);
                      return (
                        <tr
                          key={key}
                          className={`transition-colors ${
                            isDiff ? 'bg-amber-50/20 hover:bg-amber-50/40' : 'hover:bg-warm-bg/60'
                          }`}
                        >
                          <td className="p-4 font-mono font-bold text-xs text-warm-muted uppercase">
                            <div className="flex items-center gap-1.5">
                              {isDiff && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Thông số khác nhau" />}
                              <span>{key}</span>
                            </div>
                          </td>
                          {activeItems.map((item) => {
                            const val = item.product.specs?.[key];
                            return (
                              <td
                                key={item.product.id}
                                className={`p-4 font-bold text-xs ${
                                  isDiff ? 'text-warm-text font-black' : 'text-warm-muted'
                                }`}
                              >
                                {val !== undefined && val !== null && String(val).trim() !== '' ? (
                                  String(val)
                                ) : (
                                  <span className="text-warm-muted font-normal">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
