import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { productApi } from '../api/productApi';
import { reviewApi } from '../api/reviewApi';
import type { ProductDetailDTO } from '../types/product';
import type { SummaryDTO, ReviewResponseDTO, ReviewCreateRequest } from '../types/review';
import {
  getAuthUser,
  addUserReview,
  toggleFavoriteId,
  isFavoriteId,
  toggleCompareId,
  isInCompare,
  type AuthUser,
} from '../utils/storage';
import {
  Sparkles,
  Star,
  ArrowLeft,
  ExternalLink,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Send,
  Check,
  AlertCircle,
  Loader2,
  Database,
  LogIn,
  Heart,
  Scale,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState<AuthUser | null>(getAuthUser());
  const [product, setProduct] = useState<ProductDetailDTO | null>(null);
  const [summary, setSummary] = useState<SummaryDTO | null>(null);
  const [reviews, setReviews] = useState<ReviewResponseDTO[]>([]);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [isFav, setIsFav] = useState<boolean>(false);
  const [isComp, setIsComp] = useState<boolean>(false);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [refreshingSummary, setRefreshingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gallery & Specs states
  const [selectedImgIndex, setSelectedImgIndex] = useState<number>(0);
  const [relatedProducts, setRelatedProducts] = useState<ProductDetailDTO[]>([]);
  const [specsExpanded, setSpecsExpanded] = useState<boolean>(true);

  // Form review state
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (productId) {
      setSelectedImgIndex(0);
      setIsFav(isFavoriteId(productId));
      setIsComp(isInCompare(productId));
    }
  }, [productId]);

  useEffect(() => {
    const handleStorageUpdate = () => {
      setUser(getAuthUser());
      if (productId) {
        setIsFav(isFavoriteId(productId));
        setIsComp(isInCompare(productId));
      }
    };
    window.addEventListener('auth-updated', handleStorageUpdate);
    window.addEventListener('favorites-updated', handleStorageUpdate);
    window.addEventListener('compare-updated', handleStorageUpdate);
    return () => {
      window.removeEventListener('auth-updated', handleStorageUpdate);
      window.removeEventListener('favorites-updated', handleStorageUpdate);
      window.removeEventListener('compare-updated', handleStorageUpdate);
    };
  }, [productId]);

  const handleFavoriteToggle = () => {
    if (!user) {
      navigate('/auth?redirect=' + encodeURIComponent(location.pathname));
      return;
    }
    const nextState = toggleFavoriteId(productId);
    setIsFav(nextState);
  };

  const handleCompareToggle = () => {
    const nextState = toggleCompareId(productId);
    setIsComp(nextState);
  };

  const loadData = async () => {
    if (!productId) return;
    setLoadingProduct(true);
    setError(null);
    try {
      const prodData = await productApi.getProductById(productId);
      setProduct(prodData);
    } catch (err: any) {
      console.error('Error fetching product:', err);
      setError('Không thể tìm thấy thông tin sản phẩm này.');
    } finally {
      setLoadingProduct(false);
    }

    // Load Summary
    loadSummary();

    // Load Reviews
    loadReviews();

    // Load Related Products
    try {
      const feat = await productApi.getFeaturedProducts(8);
      setRelatedProducts(feat.filter((p) => p.id !== productId).slice(0, 3));
    } catch (e) {
      console.warn('Error fetching related products:', e);
    }
  };

  const loadSummary = async () => {
    setLoadingSummary(true);
    try {
      const sumData = await reviewApi.getSummary(productId);
      setSummary(sumData);
    } catch (err) {
      console.error('Error fetching summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleRefreshSummary = async () => {
    setRefreshingSummary(true);
    try {
      const sumData = await reviewApi.getSummary(productId);
      setSummary(sumData);
    } catch (err) {
      console.error('Error refreshing summary:', err);
    } finally {
      setRefreshingSummary(false);
    }
  };

  const loadReviews = async () => {
    try {
      const revData = await reviewApi.listReviews(productId, 0, 20);
      setReviews(revData.content || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [productId]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!content.trim()) return;

    setSubmittingReview(true);
    setSubmitSuccess(false);
    try {
      const payload: ReviewCreateRequest = {
        reviewerName: user.name,
        rating,
        content: content.trim(),
      };
      await reviewApi.createReview(productId, payload);

      // Lưu vào danh sách đánh giá của tôi
      if (product) {
        addUserReview({
          productId: product.id,
          productName: product.name,
          rating,
          content: content.trim(),
        });
      }

      setSubmitSuccess(true);
      setContent('');
      setRating(5);

      // Reload reviews and product stats
      await loadReviews();
      const updatedProd = await productApi.getProductById(productId);
      setProduct(updatedProd);
    } catch (err: any) {
      console.error('Submit review error:', err);
      alert('Không thể gửi đánh giá. Vui lòng thử lại.');
    } finally {
      setSubmittingReview(false);
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

  const getProductSource = (url?: string, sku?: string) => {
    const safeUrl = (url || '').toLowerCase();
    const safeSku = (sku || '').toUpperCase();
    if (safeUrl.includes('thegioididong.com') || safeSku.includes('TGDD')) {
      return { name: 'Thế Giới Di Động (Hệ thống phân phối toàn quốc)', badge: 'Thế Giới Di Động' };
    }
    if (safeUrl.includes('fptshop.com.vn') || safeSku.includes('FPT')) {
      return { name: 'FPT Shop (Hệ thống bán lẻ ủy quyền)', badge: 'FPT Shop' };
    }
    if (safeUrl.includes('cellphones.com.vn') || safeSku.includes('CPS')) {
      return { name: 'CellphoneS (Hệ thống thiết bị công nghệ)', badge: 'CellphoneS' };
    }
    if (safeUrl.includes('phongvu.vn')) {
      return { name: 'Phong Vũ (Đại lý phân phối)', badge: 'Phong Vũ' };
    }
    return { name: 'Hệ thống đối soát chính hãng', badge: 'Chính Hãng' };
  };

  if (loadingProduct) {
    return (
      <div className="py-20 text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500 mx-auto" />
        <p className="font-bold text-warm-muted">Đang tải thông tin sản phẩm...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="brutal-card p-12 text-center bg-warm-surface max-w-lg mx-auto space-y-4 mt-8">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-extrabold text-warm-text">{error || 'Sản phẩm không tồn tại'}</h2>
        <Link to="/search" className="brutal-btn px-6 py-2.5 text-xs font-bold inline-flex">
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại tìm kiếm</span>
        </Link>
      </div>
    );
  }

  const images = product.imageUrls && product.imageUrls.length > 0
    ? product.imageUrls
    : ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500'];
  const currentImg = images[selectedImgIndex] || images[0];

  const sourceInfo = getProductSource(product.productUrl, product.sku);
  const specs = parseSpecs(product.specs);
  const isPhone = (product.categoryCode || '').toLowerCase().includes('phone');

  // Quick spec highlight cards
  const quickSpecCards = isPhone
    ? [
        {
          title: 'Chipset',
          val: specs.chipset || specs.cpu || 'Tiêu chuẩn',
          desc: specs.os || 'Hệ điều hành tối ưu',
        },
        {
          title: 'RAM & ROM',
          val: specs.ram ? (String(specs.ram).includes('GB') ? specs.ram : `${specs.ram} GB`) : '8 GB',
          desc: specs.storage ? (String(specs.storage).includes('GB') || String(specs.storage).includes('TB') ? specs.storage : `${specs.storage} GB ROM`) : 'Bộ nhớ chuẩn',
        },
        {
          title: 'Màn Hình',
          val: `${specs.screen_size ? specs.screen_size + '"' : '6.7"'} ${specs.panel || 'AMOLED'}`,
          desc: `${specs.refresh_rate ? specs.refresh_rate + ' Hz' : '120 Hz'} ${specs.resolution || ''}`,
        },
        {
          title: 'Pin & Sạc',
          val: specs.battery ? (String(specs.battery).includes('mAh') ? specs.battery : `${specs.battery} mAh`) : '5000 mAh',
          desc: specs.charging ? `Sạc nhanh ${specs.charging}W` : 'Sạc siêu tốc',
        },
      ]
    : [
        {
          title: 'Vi Xử Lý',
          val: specs.cpu || specs.CPU || 'Tiêu chuẩn',
          desc: specs.vga ? `Đồ họa: ${specs.vga}` : 'Xử lý đa nhiệm',
        },
        {
          title: 'Bộ Nhớ RAM',
          val: specs.ram ? (String(specs.ram).toUpperCase().includes('GB') ? specs.ram : `${specs.ram} GB`) : '16 GB',
          desc: specs.bus_ram ? `Bus ${specs.bus_ram} MHz` : (specs.ram_type || 'Đa nhiệm mượt mà'),
        },
        {
          title: 'Ổ Cứng',
          val: specs.storage ? (String(specs.storage).toUpperCase().includes('GB') || String(specs.storage).toUpperCase().includes('TB') ? specs.storage : `SSD ${specs.storage} GB`) : 'SSD 512 GB',
          desc: specs.storage_type || 'Tốc độ đọc ghi cao',
        },
        {
          title: 'Màn Hình',
          val: `${specs.screen_size ? specs.screen_size + '"' : '15.6"'} ${specs.resolution || 'FHD'}`,
          desc: `${specs.refresh_rate ? specs.refresh_rate + ' Hz' : '60 Hz'} ${specs.panel || 'IPS'}`,
        },
      ];

  // Dynamic spec groups
  const laptopGroups = [
    {
      title: '1. Bộ Xử Lý & Đồ Họa',
      fields: [
        { key: 'cpu', label: 'Model CPU / Vi xử lý' },
        { key: 'cpu_cores', label: 'Số nhân & Số luồng' },
        { key: 'cpu_speed', label: 'Tốc độ xung nhịp' },
        { key: 'vga', label: 'Card đồ họa (GPU)' },
        { key: 'npu', label: 'Xử lý AI (NPU)' },
      ],
    },
    {
      title: '2. Bộ Nhớ RAM & Ổ Cứng',
      fields: [
        { key: 'ram', label: 'Dung lượng RAM', format: (v: any) => (String(v).includes('GB') ? v : `${v} GB`) },
        { key: 'bus_ram', label: 'Tốc độ Bus RAM', format: (v: any) => (String(v).includes('MHz') ? v : `${v} MHz`) },
        { key: 'storage', label: 'Ổ cứng lưu trữ', format: (v: any) => (String(v).includes('GB') || String(v).includes('TB') ? v : `SSD ${v} GB`) },
        { key: 'storage_upgrade', label: 'Khả năng nâng cấp' },
      ],
    },
    {
      title: '3. Màn Hình & Hiển Thị',
      fields: [
        { key: 'screen_size', label: 'Kích thước màn hình', format: (v: any) => (String(v).includes('inch') || String(v).includes('"') ? v : `${v} inch`) },
        { key: 'resolution', label: 'Độ phân giải' },
        { key: 'refresh_rate', label: 'Tần số quét', format: (v: any) => (String(v).includes('Hz') ? v : `${v} Hz`) },
        { key: 'panel', label: 'Công nghệ tấm nền' },
        { key: 'color_gamut', label: 'Độ phủ màu & Độ sáng' },
      ],
    },
    {
      title: '4. Pin, Cổng Kết Nối & Trọng Lượng',
      fields: [
        { key: 'battery', label: 'Dung lượng Pin', format: (v: any) => (String(v).includes('Wh') || String(v).includes('cell') ? v : `${v} Wh`) },
        { key: 'charger', label: 'Bộ sạc & Công nghệ sạc' },
        { key: 'weight', label: 'Trọng lượng máy', format: (v: any) => (String(v).includes('kg') ? v : `${v} kg`) },
        { key: 'ports', label: 'Cổng kết nối vật lý' },
        { key: 'os', label: 'Hệ điều hành tích hợp' },
      ],
    },
  ];

  const phoneGroups = [
    {
      title: '1. Vi Xử Lý & Hệ Điều Hành',
      fields: [
        { key: 'chipset', label: 'Chipset / Vi xử lý' },
        { key: 'cpu', label: 'CPU' },
        { key: 'gpu', label: 'GPU' },
        { key: 'os', label: 'Hệ điều hành' },
      ],
    },
    {
      title: '2. Bộ Nhớ RAM & Dung Lượng Lưu Trữ',
      fields: [
        { key: 'ram', label: 'Dung lượng RAM', format: (v: any) => (String(v).includes('GB') ? v : `${v} GB`) },
        { key: 'storage', label: 'Bộ nhớ trong (ROM)', format: (v: any) => (String(v).includes('GB') || String(v).includes('TB') ? v : `${v} GB`) },
        { key: 'sim', label: 'SIM & Khay thẻ' },
      ],
    },
    {
      title: '3. Màn Hình & Camera',
      fields: [
        { key: 'screen_size', label: 'Kích thước màn hình', format: (v: any) => (String(v).includes('inch') || String(v).includes('"') ? v : `${v} inch`) },
        { key: 'resolution', label: 'Độ phân giải màn hình' },
        { key: 'refresh_rate', label: 'Tần số quét màn hình', format: (v: any) => (String(v).includes('Hz') ? v : `${v} Hz`) },
        { key: 'panel', label: 'Công nghệ màn hình' },
        { key: 'rear_camera', label: 'Camera sau' },
        { key: 'front_camera', label: 'Camera trước' },
      ],
    },
    {
      title: '4. Pin, Sạc & Tiện Ích',
      fields: [
        { key: 'battery', label: 'Dung lượng pin', format: (v: any) => (String(v).includes('mAh') ? v : `${v} mAh`) },
        { key: 'charging', label: 'Công nghệ sạc nhanh', format: (v: any) => (String(v).includes('W') ? v : `${v}W`) },
        { key: 'weight', label: 'Trọng lượng máy', format: (v: any) => (String(v).includes('g') ? v : `${v} g`) },
        { key: 'features', label: 'Tính năng đặc biệt' },
      ],
    },
  ];

  const activeGroups = isPhone ? phoneGroups : laptopGroups;
  const renderedKeys = new Set<string>();

  return (
    <div className="space-y-8 py-4">
      {/* Back button */}
      <div>
        <Link
          to="/search"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-warm-muted hover:text-warm-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách tìm kiếm</span>
        </Link>
      </div>

      {/* Main Product Info Card */}
      <section className="brutal-card p-6 sm:p-8 bg-warm-surface grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Product Image Gallery */}
        <div className="lg:col-span-5 space-y-3">
          <div className="w-full aspect-square rounded-2xl border-2 border-warm-border bg-warm-subtle p-6 flex items-center justify-center overflow-hidden shadow-brutal-sm">
            {currentImg ? (
              <img
                src={currentImg}
                alt={product.name}
                className="w-full h-full object-contain transition-all duration-200"
                onError={(e) => {
                  (e.target as any).src = 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500';
                }}
              />
            ) : (
              <Cpu className="w-16 h-16 text-warm-hint" />
            )}
          </div>

          {/* Thumbnails row */}
          {images.length > 1 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-warm-muted font-bold px-1">
                <span>Bộ sưu tập ({images.length} ảnh)</span>
                <span>Click để đổi ảnh hiển thị</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImgIndex(idx)}
                    className={`w-14 h-14 rounded-xl border-2 p-1 overflow-hidden shrink-0 transition-all cursor-pointer ${
                      selectedImgIndex === idx
                        ? 'border-warm-primary bg-warm-secondary/30 shadow-brutal-xs -translate-y-0.5'
                        : 'border-warm-border bg-warm-bg hover:border-warm-text'
                    }`}
                  >
                    <img src={img} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Details & Actions */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg border border-warm-border bg-warm-subtle text-xs font-black uppercase tracking-wider text-warm-muted">
              {product.brand}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg border border-warm-border bg-sky-100 text-sky-900 text-xs font-bold uppercase">
              {product.categoryCode}
            </span>
            {product.sku && (
              <span className="text-xs text-warm-hint font-medium">SKU: {product.sku}</span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-warm-text leading-tight">
            {product.name}
          </h1>

          <div className="flex items-center gap-4 text-sm font-bold text-warm-muted">
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-4 h-4 fill-current" />
              <span>{product.avgRating ? Number(product.avgRating).toFixed(1) : '5.0'}</span>
            </div>
            <span>•</span>
            <span>{product.reviewCount || 0} bài đánh giá từ người dùng</span>
          </div>

          {/* Pricing & Actions */}
          <div className="p-4 rounded-2xl border-2 border-warm-border bg-warm-bg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs text-warm-muted font-bold">Giá bán niêm yết:</div>
              <div className="text-2xl sm:text-3xl font-black text-amber-700">
                {formatVnd(product.price)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFavoriteToggle}
                title={isFav ? 'Bỏ lưu yêu thích' : 'Lưu vào yêu thích'}
                className={`px-3 py-2 rounded-xl border-2 transition-all flex items-center gap-1.5 text-xs font-black shadow-brutal-xs cursor-pointer ${
                  isFav
                    ? 'bg-rose-100 border-rose-600 text-rose-800'
                    : 'bg-warm-surface border-warm-border text-warm-text hover:bg-rose-50'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFav ? 'text-rose-600 fill-rose-600' : 'text-warm-muted'}`} />
                <span>{isFav ? 'Đã lưu' : 'Lưu yêu thích'}</span>
              </button>

              <button
                type="button"
                onClick={handleCompareToggle}
                title={isComp ? 'Đã thêm vào so sánh' : 'Thêm vào so sánh'}
                className={`px-3 py-2 rounded-xl border-2 transition-all flex items-center gap-1.5 text-xs font-black shadow-brutal-xs cursor-pointer ${
                  isComp
                    ? 'bg-amber-400 border-warm-border text-warm-text'
                    : 'bg-warm-surface border-warm-border text-warm-text hover:bg-warm-secondary'
                }`}
              >
                <Scale className="w-4 h-4 text-warm-text" />
                <span>{isComp ? 'Đã thêm so sánh' : 'So sánh'}</span>
              </button>
            </div>
          </div>

          {/* Retailer Source Banner */}
          <div className="p-3.5 rounded-xl border-2 border-warm-border bg-warm-subtle/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-brutal-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-[11px]">
                {sourceInfo.badge}
              </span>
              <span className="text-xs font-bold text-warm-text">
                {sourceInfo.name}
              </span>
            </div>
            {product.productUrl && product.productUrl !== '#' ? (
              <a
                href={product.productUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-black text-amber-800 hover:underline inline-flex items-center gap-1"
              >
                <span>Xem tại đại lý phân phối</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="text-xs text-warm-muted italic">Đã đối soát kho nội bộ</span>
            )}
          </div>
        </div>
      </section>

      {/* Quick Specs Highlights (4 Cards) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {quickSpecCards.map((card, idx) => (
          <div key={idx} className="brutal-card p-4 bg-warm-surface space-y-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-warm-muted">
              {card.title}
            </div>
            <div className="text-sm sm:text-base font-black text-warm-text truncate" title={card.val}>
              {card.val}
            </div>
            <div className="text-[11px] text-warm-muted font-medium truncate" title={card.desc}>
              {card.desc}
            </div>
          </div>
        ))}
      </section>

      {/* Categorized Specifications */}
      {specs && Object.keys(specs).length > 0 && (
        <section className="brutal-card p-6 sm:p-8 bg-warm-surface space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-warm-border/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl border-2 border-warm-border bg-warm-secondary flex items-center justify-center shadow-brutal-xs">
                <Layers className="w-5 h-5 text-warm-secondary-text" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-warm-text">
                  Bảng Thông Số Kỹ Thuật Chi Tiết
                </h2>
                <p className="text-xs text-warm-muted font-medium">
                  Chuẩn hóa theo cấu trúc catalog hỗ trợ truy vấn lọc đa tiêu chí AI.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSpecsExpanded(!specsExpanded)}
              className="text-xs font-black text-warm-text px-3 py-1.5 rounded-xl border border-warm-border bg-warm-bg hover:bg-warm-secondary shadow-brutal-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>{specsExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}</span>
              {specsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="space-y-6">
            {activeGroups.map((grp, gIdx) => {
              const rows = grp.fields
                .filter((f) => {
                  const val = specs[f.key];
                  return val !== null && val !== undefined && val !== '';
                })
                .map((f) => {
                  renderedKeys.add(f.key.toLowerCase());
                  const rawVal = specs[f.key];
                  const formatted = f.format ? f.format(rawVal) : String(rawVal);
                  return (
                    <div key={f.key} className="flex justify-between py-2 border-b border-warm-border/10 text-xs sm:text-sm">
                      <span className="text-warm-muted font-medium">{f.label}</span>
                      <span className="font-bold text-warm-text text-right max-w-[60%] break-words">{formatted}</span>
                    </div>
                  );
                });

              if (rows.length === 0) return null;

              return (
                <div key={gIdx} className="space-y-2">
                  <h3 className="font-black text-sm text-warm-text flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-warm-primary"></span>
                    <span>{grp.title}</span>
                  </h3>
                  {specsExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      {rows}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Extra specifications */}
            {(() => {
              const extraRows = Object.keys(specs)
                .filter((k) => !renderedKeys.has(k.toLowerCase()) && specs[k] !== null && specs[k] !== undefined && specs[k] !== '')
                .map((k) => {
                  const label = k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                  return (
                    <div key={k} className="flex justify-between py-2 border-b border-warm-border/10 text-xs sm:text-sm">
                      <span className="text-warm-muted font-medium">{label}</span>
                      <span className="font-bold text-warm-text text-right max-w-[60%] break-words">{String(specs[k])}</span>
                    </div>
                  );
                });

              if (extraRows.length === 0) return null;

              return (
                <div className="space-y-2">
                  <h3 className="font-black text-sm text-warm-text flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span>Thông Số Bổ Sung</span>
                  </h3>
                  {specsExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      {extraRows}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* =========================================================================
           AI REVIEW SUMMARY SECTION (Trọng tâm Giai đoạn 2)
           ========================================================================= */}
      <section className="brutal-card p-6 sm:p-8 bg-gradient-to-br from-amber-50/60 via-warm-surface to-orange-50/40 border-amber-500 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-warm-border/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl border-2 border-warm-border bg-amber-400 flex items-center justify-center shadow-brutal-xs shrink-0">
              <Sparkles className="w-6 h-6 text-warm-text" />
            </div>
            <div>
              <h2 className="text-xl font-black text-warm-text flex items-center gap-2">
                <span>Tóm Tắt Đánh Giá Bằng Gemini AI</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full border border-warm-border bg-warm-secondary text-warm-secondary-text">
                  3 Phần Chuẩn
                </span>
              </h2>
              <p className="text-xs text-warm-muted font-medium">
                AI tổng hợp từ các đánh giá thực tế đã qua bộ lọc 8 tiêu chí spam.
              </p>
            </div>
          </div>

          {/* Cache status badge & Refresh button */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {summary && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-warm-border text-xs font-black shadow-brutal-xs ${
                summary.cached
                  ? 'bg-emerald-100 text-emerald-950'
                  : 'bg-amber-200 text-amber-950'
              }`}>
                {summary.cached ? (
                  <>
                    <Database className="w-3.5 h-3.5 text-emerald-700" />
                    <span>⚡ Đọc tức thì từ Cache Postgres</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    <span>✨ Vừa tóm tắt mới bằng Gemini</span>
                  </>
                )}
              </span>
            )}

            <button
              type="button"
              onClick={handleRefreshSummary}
              disabled={refreshingSummary}
              title="Kiểm tra hoặc làm mới tóm tắt"
              className="p-2 rounded-xl border-2 border-warm-border bg-warm-surface hover:bg-warm-subtle shadow-brutal-xs text-warm-text disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${refreshingSummary ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Summary Content */}
        {loadingSummary ? (
          <div className="py-8 text-center space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
            <p className="text-xs font-bold text-warm-muted">AI đang đọc và tổng hợp đánh giá...</p>
          </div>
        ) : summary ? (
          <div className="space-y-5">
            {/* General evaluation */}
            <div className="p-4 rounded-2xl border-2 border-warm-border bg-warm-surface shadow-brutal-xs space-y-1">
              <div className="text-xs font-extrabold uppercase text-amber-700">
                1. Đánh giá tổng quan:
              </div>
              <p className="text-sm font-bold text-warm-text leading-relaxed">
                {summary.summaryText}
              </p>
            </div>

            {/* Pros and Cons (2 columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pros */}
              <div className="p-4 rounded-2xl border-2 border-emerald-700 bg-emerald-50/70 shadow-brutal-xs space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>2. Ưu điểm nổi bật:</span>
                </div>
                <div className="text-xs font-bold text-emerald-950 whitespace-pre-line leading-relaxed">
                  {summary.pros || '• Chưa ghi nhận ưu điểm nổi bật.'}
                </div>
              </div>

              {/* Cons */}
              <div className="p-4 rounded-2xl border-2 border-rose-700 bg-rose-50/70 shadow-brutal-xs space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>3. Nhược điểm &amp; Lưu ý:</span>
                </div>
                <div className="text-xs font-bold text-rose-950 whitespace-pre-line leading-relaxed">
                  {summary.cons || '• Chưa ghi nhận nhược điểm đáng kể.'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-warm-muted">
            Chưa có dữ liệu tóm tắt đánh giá cho sản phẩm này.
          </div>
        )}
      </section>

      {/* =========================================================================
           USER REVIEWS SECTION & FORM
           ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Reviews List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-lg font-black text-warm-text flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-600" />
            <span>Đánh Giá Thực Tế Từ Khách Hàng ({reviews.length})</span>
          </h3>

          {reviews.length === 0 ? (
            <div className="brutal-card p-8 text-center bg-warm-surface text-xs text-warm-muted">
              Chưa có bài đánh giá nào. Hãy là người đầu tiên đánh giá sản phẩm này!
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((rev) => (
                <div key={rev.id} className="brutal-card p-4 bg-warm-surface space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-warm-text">{rev.reviewerName}</span>
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-current' : 'text-slate-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-warm-text font-medium leading-relaxed">
                    {rev.content}
                  </p>
                  <div className="text-[10px] text-warm-hint font-medium">
                    {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Review Form (5 cols) */}
        <div className="lg:col-span-5">
          <div className="brutal-card p-6 bg-warm-surface space-y-4">
            <h3 className="text-base font-extrabold text-warm-text flex items-center justify-between">
              <span>Gửi Đánh Giá Của Bạn</span>
              {user && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  Thành viên đã xác thực
                </span>
              )}
            </h3>

            {user ? (
              <>
                {submitSuccess && (
                  <div className="p-3 rounded-xl border border-emerald-600 bg-emerald-50 text-emerald-900 text-xs font-bold flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Gửi đánh giá thành công! Dữ liệu đã được cập nhật.</span>
                  </div>
                )}

                {/* Identity banner showing current logged-in user */}
                <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-warm-border bg-warm-bg shadow-brutal-xs">
                  <div className="w-9 h-9 rounded-xl bg-warm-primary border border-warm-border flex items-center justify-center text-warm-primary-text font-black text-xs shrink-0 shadow-inner">
                    {user.avatarText || user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-warm-text truncate">{user.name}</span>
                      <span className="text-[10px] font-bold text-warm-muted">({user.role || 'Thành viên'})</span>
                    </div>
                    <span className="text-[11px] text-warm-muted truncate">{user.email}</span>
                  </div>
                </div>

                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-warm-muted mb-1">
                      Số Sao Đánh Giá:
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className={`p-2 rounded-xl border-2 transition-all cursor-pointer ${
                            rating >= star
                              ? 'bg-amber-400 border-warm-border text-warm-text shadow-brutal-xs'
                              : 'bg-warm-bg border-warm-border-subtle text-warm-hint hover:border-warm-border'
                          }`}
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                      ))}
                      <span className="text-xs font-extrabold text-amber-700 ml-2">{rating} / 5 Sao</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-warm-muted mb-1">
                      Nhận Xét Chi Tiết:
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Chia sẻ trải nghiệm thực tế về pin, màn hình, hiệu năng..."
                      className="w-full px-3 py-2.5 rounded-xl border-2 border-warm-border bg-warm-bg text-warm-text font-bold text-xs focus:outline-none focus:bg-white focus:border-amber-500 shadow-brutal-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="brutal-btn w-full py-2.5 text-xs font-black shadow-brutal-xs disabled:opacity-50"
                  >
                    {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{submittingReview ? 'Đang gửi...' : 'Gửi Đánh Giá'}</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-6 px-4 bg-warm-bg rounded-2xl border-2 border-warm-border space-y-3">
                <div className="w-12 h-12 rounded-2xl border-2 border-warm-border bg-warm-secondary flex items-center justify-center mx-auto shadow-brutal-xs">
                  <LogIn className="w-6 h-6 text-warm-secondary-text" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-warm-text">Yêu Cầu Đăng Nhập</h4>
                  <p className="text-xs text-warm-muted max-w-xs mx-auto">
                    Chỉ thành viên đã đăng nhập mới có thể gửi đánh giá và nhận xét sản phẩm.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    to={`/auth?redirect=${encodeURIComponent(location.pathname)}`}
                    className="brutal-btn px-5 py-2.5 text-xs font-black shadow-brutal-xs inline-flex items-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Đăng nhập để đánh giá</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
           RELATED PRODUCTS / GỢI Ý TƯƠNG TỰ
           ========================================================================= */}
      {relatedProducts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-warm-text flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Gợi Ý Sản Phẩm Cùng Phân Khúc</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relatedProducts.map((item) => {
              const itemSpecs = parseSpecs(item.specs);
              const sub = [
                itemSpecs.cpu || itemSpecs.chipset || '',
                itemSpecs.ram ? (String(itemSpecs.ram).includes('GB') ? itemSpecs.ram : `${itemSpecs.ram}GB RAM`) : '',
                itemSpecs.storage ? (String(itemSpecs.storage).includes('GB') || String(itemSpecs.storage).includes('TB') ? itemSpecs.storage : `${itemSpecs.storage}GB`) : '',
                itemSpecs.screen_size ? `${itemSpecs.screen_size}"` : '',
              ]
                .filter(Boolean)
                .join(' • ');

              return (
                <div key={item.id} className="brutal-card p-5 bg-warm-surface flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2 py-0.5 rounded-lg border border-warm-border bg-warm-subtle font-extrabold uppercase text-[10px] text-warm-muted">
                        {item.brand || 'CHÍNH HÃNG'}
                      </span>
                      <span className="text-amber-600 font-extrabold flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{item.avgRating ? Number(item.avgRating).toFixed(1) : '5.0'}</span>
                      </span>
                    </div>

                    <div className="w-full aspect-[4/3] rounded-xl border-2 border-warm-border bg-warm-subtle mt-3 p-3 flex items-center justify-center overflow-hidden shadow-brutal-xs">
                      <img
                        src={(item.imageUrls && item.imageUrls[0]) || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300'}
                        alt={item.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as any).src = 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300';
                        }}
                      />
                    </div>

                    <h4 className="font-extrabold text-sm sm:text-base text-warm-text mt-3 line-clamp-2" title={item.name}>
                      {item.name}
                    </h4>
                    <p className="text-xs text-warm-muted mt-1 truncate">{sub || 'Cấu hình tiêu chuẩn chính hãng'}</p>
                    <div className="mt-2 text-lg font-black text-amber-700">
                      {formatVnd(item.price)}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-warm-border/10 flex items-center gap-2">
                    <Link
                      to={`/product/${item.id}`}
                      className="flex-1 text-center py-2 rounded-xl bg-warm-bg hover:bg-warm-secondary text-warm-text font-bold text-xs border border-warm-border"
                    >
                      Chi tiết
                    </Link>
                    <Link
                      to={`/compare?ids=${product.id},${item.id}`}
                      className="flex-1 text-center py-2 rounded-xl bg-warm-primary text-warm-primary-text font-black text-xs border border-warm-border shadow-brutal-xs"
                    >
                      So sánh
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
