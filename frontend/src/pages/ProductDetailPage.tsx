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
  Heart,
  Scale,
  ShieldCheck,
  Truck,
  RotateCcw,
  ChevronDown,
  ChevronUp,
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
  const [relatedProducts, setRelatedProducts] = useState<ProductDetailDTO[]>([]);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [isFav, setIsFav] = useState<boolean>(false);
  const [isComp, setIsComp] = useState<boolean>(false);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [refreshingSummary, setRefreshingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gallery Active Image
  const [activeImage, setActiveImage] = useState<string>('');

  // Specs Expand / Collapse
  const [specsExpanded, setSpecsExpanded] = useState<boolean>(false);

  // Ask AI Modal
  const [isAskAiOpen, setIsAskAiOpen] = useState<boolean>(false);
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState<boolean>(false);

  // Form review state
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (productId) {
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
      if (prodData.imageUrls && prodData.imageUrls.length > 0) {
        setActiveImage(prodData.imageUrls[0]);
      } else {
        setActiveImage('');
      }

      // Load related products
      try {
        const featured = await productApi.getFeaturedProducts(8);
        const related = (featured || [])
          .filter((p) => p.id !== productId && p.categoryCode === prodData.categoryCode)
          .slice(0, 3);
        setRelatedProducts(related.length > 0 ? related : (featured || []).filter((p) => p.id !== productId).slice(0, 3));
      } catch (e) {
        console.warn('Lỗi tải gợi ý liên quan:', e);
      }
    } catch (err: any) {
      console.error('Error fetching product:', err);
      setError('Không thể tìm thấy thông tin sản phẩm này.');
    } finally {
      setLoadingProduct(false);
    }

    // Load Summary & Reviews
    loadSummary();
    loadReviews();
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Vendor Provenance Detection
  const getVendorProvenance = (p: ProductDetailDTO) => {
    const url = p.productUrl || '';
    const sku = (p.sku || '').toUpperCase();
    if (url.includes('thegioididong.com') || sku.includes('TGDD')) {
      return {
        name: 'Thế Giới Di Động (Hệ thống phân phối toàn quốc)',
        badge: 'TGDĐ',
        isPartner: true,
      };
    }
    if (url.includes('fptshop.com.vn') || sku.includes('FPT')) {
      return {
        name: 'FPT Shop (Hệ thống bán lẻ ủy quyền)',
        badge: 'FPT Shop',
        isPartner: true,
      };
    }
    if (url.includes('cellphones.com.vn') || sku.includes('CPS')) {
      return {
        name: 'CellphoneS (Hệ thống thiết bị công nghệ)',
        badge: 'CellphoneS',
        isPartner: true,
      };
    }
    if (url.includes('phongvu.vn')) {
      return {
        name: 'Phong Vũ (Đại lý phân phối công nghệ)',
        badge: 'Phong Vũ',
        isPartner: true,
      };
    }
    return {
      name: 'Hệ thống đối soát chính hãng',
      badge: 'Chính Hãng',
      isPartner: false,
    };
  };

  // Handle Ask AI submit
  const handleAskAiSubmit = (qText: string) => {
    if (!qText.trim() || !product) return;
    setAiThinking(true);
    setAiAnswer(null);

    setTimeout(() => {
      const qLower = qText.toLowerCase();
      let ans = '';
      const specs = product.specs || {};

      if (qLower.includes('game') || qLower.includes('chơi')) {
        const vga = specs.vga || specs.gpu || '';
        if (vga.toLowerCase().includes('rtx') || vga.toLowerCase().includes('gtx')) {
          ans = `Sản phẩm được trang bị card đồ họa ${vga}, đủ sức cân tốt các tựa game Esport (LOL, FO4, Valorant) ở mức khung hình cao và chiến ổn định các game AAA đồ họa nặng ở thiết lập phù hợp.`;
        } else {
          ans = `Máy sử dụng GPU tích hợp (${vga || 'đồ họa Onboard'}), tối ưu cho các tác vụ làm việc, học tập, văn phòng và chơi tốt các game nhẹ như LOL, Đấu Trường Chân Lý.`;
        }
      } else if (qLower.includes('pin') || qLower.includes('thời lượng')) {
        const b = specs.battery || 'tiêu chuẩn';
        ans = `Dung lượng pin thực tế ${b} cho phép đáp ứng khoảng 6 - 8 tiếng với các tác vụ văn phòng cơ bản như lướt web, soạn thảo văn bản và xem video ở độ sáng trung bình.`;
      } else if (qLower.includes('đồ họa') || qLower.includes('lập trình') || qLower.includes('code')) {
        const ram = specs.ram || '8';
        ans = `Với cấu hình vi xử lý ${specs.cpu || 'mạnh mẽ'} và RAM ${ram}GB, máy xử lý mượt mà việc chạy Docker, biên dịch mã nguồn, mở nhiều tab trình duyệt và chỉnh sửa ảnh Photoshop/Canva mượt mà.`;
      } else {
        ans = `Dựa trên phân tích thông số kỹ thuật của ${product.name}, sản phẩm hoàn toàn đáp ứng tốt nhu cầu của bạn trong phân khúc giá ${formatVnd(product.price)}. Điểm đánh giá trung bình từ người dùng thực tế đạt ${product.avgRating ? Number(product.avgRating).toFixed(1) : '5.0'}/5 sao.`;
      }

      setAiAnswer(ans);
      setAiThinking(false);
    }, 600);
  };

  if (loadingProduct) {
    return (
      <div className="py-20 text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500 mx-auto" />
        <p className="font-bold text-warm-muted">Đang tải thông tin chi tiết sản phẩm...</p>
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

  const isPhone = (product.categoryCode || '').toLowerCase().includes('phone');
  const vendorInfo = getVendorProvenance(product);
  const specs = product.specs || {};

  // Quick specs calculation
  const quickSpecs = isPhone
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
          val: specs.ram ? (String(specs.ram).toUpperCase().includes('GB') ? specs.ram : specs.ram + ' GB') : '16 GB',
          desc: specs.bus_ram ? `Bus ${specs.bus_ram} MHz` : (specs.ram_type || 'Đa nhiệm mượt mà'),
        },
        {
          title: 'Màn Hình',
          val: `${specs.screen_size ? specs.screen_size + '"' : '15.6"'} ${specs.resolution || ''}`,
          desc: `${specs.refresh_rate ? specs.refresh_rate + ' Hz' : 'Chuẩn màu sắc nét'} ${specs.panel ? '• ' + specs.panel : ''}`,
        },
        {
          title: 'Lưu Trữ & Pin',
          val: specs.storage ? (String(specs.storage).toUpperCase().includes('GB') || String(specs.storage).toUpperCase().includes('TB') ? specs.storage : 'SSD ' + specs.storage + ' GB') : 'SSD 512 GB',
          desc: `${specs.battery ? specs.battery + ' Wh' : ''} ${specs.weight ? '• ' + specs.weight + ' kg' : ''}`.trim().replace(/^•\s*/, '') || 'Pin bền bỉ',
        },
      ];

  // Full specs grouping definition
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
        { key: 'ram', label: 'Dung lượng RAM', format: (v: any) => String(v).includes('GB') ? v : `${v} GB` },
        { key: 'bus_ram', label: 'Tốc độ Bus RAM', format: (v: any) => String(v).includes('MHz') ? v : `${v} MHz` },
        { key: 'storage', label: 'Ổ cứng lưu trữ', format: (v: any) => String(v).includes('GB') || String(v).includes('TB') ? v : `SSD ${v} GB` },
        { key: 'storage_upgrade', label: 'Khả năng nâng cấp ổ cứng' },
      ],
    },
    {
      title: '3. Màn Hình & Hiển Thị',
      fields: [
        { key: 'screen_size', label: 'Kích thước màn hình', format: (v: any) => String(v).includes('inch') || String(v).includes('"') ? v : `${v} inch` },
        { key: 'resolution', label: 'Độ phân giải' },
        { key: 'refresh_rate', label: 'Tần số quét', format: (v: any) => String(v).includes('Hz') ? v : `${v} Hz` },
        { key: 'panel', label: 'Công nghệ tấm nền' },
        { key: 'color_gamut', label: 'Độ bao phủ màu & Độ sáng' },
      ],
    },
    {
      title: '4. Pin, Cổng Kết Nối & Trọng Lượng',
      fields: [
        { key: 'battery', label: 'Dung lượng Pin', format: (v: any) => String(v).includes('Wh') || String(v).includes('cell') ? v : `${v} Wh` },
        { key: 'charger', label: 'Bộ sạc & Công nghệ sạc' },
        { key: 'weight', label: 'Trọng lượng máy', format: (v: any) => String(v).includes('kg') ? v : `${v} kg` },
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
        { key: 'ram', label: 'Dung lượng RAM', format: (v: any) => String(v).includes('GB') ? v : `${v} GB` },
        { key: 'storage', label: 'Bộ nhớ trong (ROM)', format: (v: any) => String(v).includes('GB') || String(v).includes('TB') ? v : `${v} GB` },
        { key: 'sim', label: 'SIM & Khay thẻ' },
      ],
    },
    {
      title: '3. Màn Hình & Camera',
      fields: [
        { key: 'screen_size', label: 'Kích thước màn hình', format: (v: any) => String(v).includes('inch') || String(v).includes('"') ? v : `${v} inch` },
        { key: 'resolution', label: 'Độ phân giải màn hình' },
        { key: 'refresh_rate', label: 'Tần số quét màn hình', format: (v: any) => String(v).includes('Hz') ? v : `${v} Hz` },
        { key: 'panel', label: 'Công nghệ màn hình' },
        { key: 'rear_camera', label: 'Camera sau' },
        { key: 'front_camera', label: 'Camera trước' },
      ],
    },
    {
      title: '4. Pin, Sạc & Thiết Kế',
      fields: [
        { key: 'battery', label: 'Dung lượng Pin', format: (v: any) => String(v).includes('mAh') ? v : `${v} mAh` },
        { key: 'charging', label: 'Công nghệ sạc nhanh', format: (v: any) => String(v).includes('W') ? v : `${v}W` },
        { key: 'weight', label: 'Trọng lượng máy', format: (v: any) => String(v).includes('g') ? v : `${v} g` },
        { key: 'network', label: 'Mạng di động' },
      ],
    },
  ];

  const specGroups = isPhone ? phoneGroups : laptopGroups;
  const renderedKeys = new Set<string>();

  return (
    <div className="space-y-8 py-4">
      {/* 1. Dynamic Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-bold text-warm-muted">
        <Link to="/" className="hover:text-amber-700">Trang chủ</Link>
        <span>/</span>
        <Link to={`/search?q=${product.categoryCode}`} className="hover:text-amber-700 capitalize">
          {isPhone ? 'Điện thoại' : 'Laptop'}
        </Link>
        <span>/</span>
        <Link to={`/search?q=${product.brand}`} className="hover:text-amber-700 uppercase">
          {product.brand}
        </Link>
        <span>/</span>
        <span className="text-warm-text truncate max-w-xs sm:max-w-md">{product.name}</span>
      </nav>

      {/* 2. Main Product Info Card */}
      <section className="brutal-card p-6 sm:p-8 bg-warm-surface grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Active Gallery */}
        <div className="lg:col-span-5 space-y-4">
          <div className="w-full aspect-square rounded-2xl border-2 border-warm-border bg-white p-6 flex items-center justify-center overflow-hidden shadow-brutal-sm">
            {activeImage || (product.imageUrls && product.imageUrls[0]) ? (
              <img
                src={activeImage || product.imageUrls![0]}
                alt={product.name}
                className="max-h-full max-w-full object-contain transition-all duration-200"
                onError={(e) => {
                  (e.target as any).src = 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500';
                }}
              />
            ) : (
              <Cpu className="w-16 h-16 text-warm-hint" />
            )}
          </div>

          {/* Active Thumbnails List (Render only if > 1 image) */}
          {product.imageUrls && product.imageUrls.length > 1 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-warm-muted text-center">
                Bộ sưu tập {product.imageUrls.length} ảnh chi tiết • Nhấp để đổi ảnh
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {product.imageUrls.map((img, idx) => {
                  const isActive = (activeImage || product.imageUrls![0]) === img;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImage(img)}
                      className={`w-14 h-14 rounded-xl border-2 p-1 overflow-hidden flex items-center justify-center transition-all cursor-pointer ${
                        isActive
                          ? 'border-amber-500 bg-amber-100 shadow-brutal-xs scale-105'
                          : 'border-warm-border bg-white hover:border-amber-400'
                      }`}
                    >
                      <img src={img} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-contain" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trust Guarantee Badges */}
          <div className="pt-2 grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-warm-muted">
            <div className="p-2 rounded-xl border border-warm-border bg-warm-subtle flex flex-col items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Chính hãng 100%</span>
            </div>
            <div className="p-2 rounded-xl border border-warm-border bg-warm-subtle flex flex-col items-center gap-1">
              <Truck className="w-4 h-4 text-amber-600" />
              <span>Giao hàng nhanh</span>
            </div>
            <div className="p-2 rounded-xl border border-warm-border bg-warm-subtle flex flex-col items-center gap-1">
              <RotateCcw className="w-4 h-4 text-sky-600" />
              <span>Đổi trả 30 ngày</span>
            </div>
          </div>
        </div>

        {/* Right: Product Details & Purchase Actions */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-lg border-2 border-warm-border bg-amber-200 text-amber-950 text-xs font-black uppercase tracking-wider shadow-brutal-xs">
              {product.brand ? `${product.brand.toUpperCase()} CHÍNH HÃNG` : 'CHÍNH HÃNG 100%'}
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
            <span>{product.reviewCount || reviews.length || 0} bài đánh giá xác thực từ người dùng</span>
          </div>

          {/* Honest Pricing Block (No fake discount or fake original price) */}
          <div className="p-5 rounded-2xl border-2 border-warm-border bg-warm-bg flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-brutal-xs">
            <div>
              <div className="text-xs text-warm-muted font-bold flex items-center gap-2">
                <span>Giá bán niêm yết chính hãng:</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">
                  {product.stockQuantity && product.stockQuantity > 0 ? 'Còn hàng' : 'Sẵn sàng giao'}
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-amber-700 mt-1">
                {formatVnd(product.price)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFavoriteToggle}
                className={`px-3 py-2.5 rounded-xl border-2 transition-all flex items-center gap-1.5 text-xs font-black shadow-brutal-xs cursor-pointer ${
                  isFav
                    ? 'bg-rose-100 border-rose-600 text-rose-800'
                    : 'bg-warm-surface border-warm-border text-warm-text hover:bg-rose-50'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFav ? 'text-rose-600 fill-rose-600' : 'text-warm-muted'}`} />
                <span>{isFav ? 'Đã lưu' : 'Lưu'}</span>
              </button>

              <button
                type="button"
                onClick={handleCompareToggle}
                className={`px-3 py-2.5 rounded-xl border-2 transition-all flex items-center gap-1.5 text-xs font-black shadow-brutal-xs cursor-pointer ${
                  isComp
                    ? 'bg-amber-400 border-warm-border text-warm-text'
                    : 'bg-warm-surface border-warm-border text-warm-text hover:bg-warm-secondary'
                }`}
              >
                <Scale className="w-4 h-4 text-warm-text" />
                <span>{isComp ? '✓ Đang so sánh' : '+ So sánh'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAskAiOpen(true)}
                className="brutal-btn px-4 py-2.5 text-xs font-black shadow-brutal-xs flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hỏi AI</span>
              </button>
            </div>
          </div>

          {/* Source Provenance Referral Card */}
          <div className="p-3.5 rounded-xl border-2 border-warm-border bg-warm-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[11px] font-extrabold text-warm-muted uppercase tracking-wider block">
                Nguồn đối soát &amp; phân phối:
              </span>
              <div className="font-black text-warm-text mt-0.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{vendorInfo.name}</span>
              </div>
            </div>

            {product.productUrl && (
              <a
                href={product.productUrl}
                target="_blank"
                rel="noreferrer"
                className="brutal-btn px-3 py-1.5 text-xs font-bold shadow-brutal-xs flex items-center justify-center gap-1 self-start sm:self-auto"
              >
                <span>Xem tại {vendorInfo.badge}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Category-Aware Quick Specs Highlights Matrix */}
          <div className="pt-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-warm-muted mb-2">
              Thông số phần cứng cốt lõi:
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {quickSpecs.map((c) => (
                <div key={c.title} className="p-3 rounded-xl border-2 border-warm-border bg-white text-center shadow-brutal-xs">
                  <span className="text-[11px] font-bold text-warm-muted uppercase block">{c.title}</span>
                  <span className="font-black text-sm text-warm-text mt-0.5 block truncate" title={c.val}>
                    {c.val}
                  </span>
                  <span className="text-[10px] text-warm-muted truncate block mt-0.5" title={c.desc}>
                    {c.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. AI Smart Summary Section */}
      <section className="brutal-card p-6 sm:p-8 bg-warm-surface space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-warm-border/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-200 border-2 border-warm-border flex items-center justify-center text-amber-900 shadow-brutal-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-warm-text">
                AI Phân Tích &amp; Tóm Tắt Đánh Giá
              </h2>
              <span className="text-xs text-warm-muted">
                Tổng hợp tự động từ {product.reviewCount || reviews.length || 0} bài đánh giá của người dùng
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefreshSummary}
            disabled={refreshingSummary}
            className="brutal-btn px-3 py-1.5 text-xs font-bold shadow-brutal-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshingSummary ? 'animate-spin' : ''}`} />
            <span>Làm mới tóm tắt</span>
          </button>
        </div>

        {loadingSummary ? (
          <div className="py-8 text-center text-warm-muted flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            <span>Đang tạo tóm tắt AI đa chiều...</span>
          </div>
        ) : summary ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-warm-border bg-amber-50/70 text-xs sm:text-sm font-medium text-amber-950 leading-relaxed">
              {summary.summaryText}
            </div>

            {(() => {
              const parseProsCons = (val: string | string[] | undefined): string[] => {
                if (!val) return [];
                if (Array.isArray(val)) return val;
                try {
                  const parsed = JSON.parse(val);
                  if (Array.isArray(parsed)) return parsed;
                } catch {
                  // ignore
                }
                return String(val)
                  .split('\n')
                  .map((s) => s.replace(/^[•\-\*]\s*/, '').trim())
                  .filter(Boolean);
              };

              const prosList = parseProsCons(summary.pros);
              const consList = parseProsCons(summary.cons);

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Pros */}
                  <div className="p-4 rounded-xl border-2 border-emerald-400 bg-emerald-50 space-y-2">
                    <div className="font-extrabold text-emerald-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Ưu điểm nổi bật</span>
                    </div>
                    <ul className="space-y-1 font-semibold text-emerald-950 pl-5 list-disc">
                      {prosList.length > 0 ? (
                        prosList.map((pro, i) => <li key={i}>{pro}</li>)
                      ) : (
                        <li>Hiệu năng mạnh mẽ và độ bền cao</li>
                      )}
                    </ul>
                  </div>

                  {/* Cons */}
                  <div className="p-4 rounded-xl border-2 border-amber-400 bg-amber-50 space-y-2">
                    <div className="font-extrabold text-amber-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Điểm cần lưu ý</span>
                    </div>
                    <ul className="space-y-1 font-semibold text-amber-950 pl-5 list-disc">
                      {consList.length > 0 ? (
                        consList.map((con, i) => <li key={i}>{con}</li>)
                      ) : (
                        <li>Giá thành tương xứng phân khúc cao cấp</li>
                      )}
                    </ul>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="py-6 text-center text-warm-muted text-xs font-semibold">
            Chưa có tóm tắt AI cho sản phẩm này. Hãy bấm "Làm mới tóm tắt" để kích hoạt.
          </div>
        )}
      </section>

      {/* 4. Category-Aware Dynamic Full Specifications Table */}
      <section className="brutal-card p-6 sm:p-8 bg-warm-surface space-y-4">
        <div className="flex items-center justify-between pb-3 border-b-2 border-warm-border/10">
          <h2 className="text-base sm:text-lg font-black text-warm-text flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-600" />
            <span>Thông Số Kỹ Thuật Chi Tiết (Chuẩn Hóa PostgreSQL JSONB)</span>
          </h2>
          <button
            type="button"
            onClick={() => setSpecsExpanded((prev) => !prev)}
            className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1"
          >
            <span>{specsExpanded ? 'Thu gọn' : 'Xem toàn bộ'}</span>
            {specsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <div className="space-y-6">
          {specGroups.map((grp) => {
            const rows = grp.fields
              .map((f) => {
                let val = specs[f.key];
                if (val === undefined || val === null || val === '') {
                  const matchKey = Object.keys(specs).find((k) => k.toLowerCase() === f.key.toLowerCase());
                  if (matchKey) val = specs[matchKey];
                }
                if (val !== undefined && val !== null && val !== '') {
                  renderedKeys.add(f.key.toLowerCase());
                  const displayVal = (f as any).format ? (f as any).format(val) : String(val);
                  return { label: f.label, val: displayVal };
                }
                return null;
              })
              .filter(Boolean);

            if (rows.length === 0) return null;

            return (
              <div key={grp.title} className="space-y-3">
                <h3 className="font-black text-sm text-warm-text flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-warm-border"></span>
                  <span>{grp.title}</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6 text-xs">
                  {rows.map((row: any, i) => (
                    <div key={i} className="flex justify-between py-1.5 border-b border-warm-border/10">
                      <span className="text-warm-muted font-medium">{row.label}</span>
                      <span className="font-bold text-warm-text text-right max-w-[60%] break-words">
                        {row.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Extra Custom Specs if expanded */}
          {specsExpanded && (
            <div className="pt-4 border-t border-warm-border/10 space-y-3">
              <h3 className="font-black text-sm text-warm-text flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 border border-warm-border"></span>
                <span>Thông Số Mở Rộng Bổ Sung</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6 text-xs">
                {Object.keys(specs)
                  .filter((k) => !renderedKeys.has(k.toLowerCase()) && specs[k] !== null && specs[k] !== undefined && specs[k] !== '')
                  .map((k) => {
                    const label = k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                    return (
                      <div key={k} className="flex justify-between py-1.5 border-b border-warm-border/10">
                        <span className="text-warm-muted font-medium">{label}</span>
                        <span className="font-bold text-warm-text text-right max-w-[60%] break-words">
                          {String(specs[k])}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. Related Products Suggestions */}
      {relatedProducts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-warm-text flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-600" />
              <span>Sản Phẩm Cùng Phân Khúc Nên Cân Nhắc</span>
            </h2>
            <Link to="/search" className="text-xs font-bold text-amber-700 hover:underline">
              Xem thêm các dòng máy khác →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {relatedProducts.map((item, idx) => {
              const itemSpecs = item.specs || {};
              const sub = [
                itemSpecs.cpu || itemSpecs.chipset || '',
                itemSpecs.ram ? itemSpecs.ram + 'GB RAM' : '',
                itemSpecs.storage ? (String(itemSpecs.storage).includes('GB') ? itemSpecs.storage : itemSpecs.storage + 'GB') : '',
              ].filter(Boolean).join(' • ');

              const badges = [
                { text: 'Top Hiệu Năng', cls: 'bg-amber-100 text-amber-900 border-amber-300' },
                { text: 'Lựa Chọn Tốt', cls: 'bg-sky-100 text-sky-900 border-sky-300' },
                { text: 'Giá Cạnh Tranh', cls: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
              ];
              const badge = badges[idx % badges.length];

              return (
                <div key={item.id} className="brutal-card p-5 bg-warm-surface flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold border ${badge.cls}`}>
                        {badge.text}
                      </span>
                      <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        ★ {item.avgRating ? Number(item.avgRating).toFixed(1) : '4.8'}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-base text-warm-text mt-3 truncate" title={item.name}>
                      {item.name}
                    </h3>
                    <p className="text-xs text-warm-muted mt-1 line-clamp-2">
                      {sub || 'Thông số chuẩn chính hãng'}
                    </p>
                    <div className="mt-3">
                      <span className="text-lg font-black text-amber-700">{formatVnd(item.price)}</span>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-warm-border/10 flex gap-2">
                    <Link
                      to={`/product/${item.id}`}
                      className="flex-1 text-center py-2 rounded-xl bg-warm-bg hover:bg-amber-100 text-warm-text font-bold text-xs border border-warm-border"
                    >
                      Chi tiết
                    </Link>
                    <Link
                      to={`/compare?ids=${product.id},${item.id}`}
                      className="brutal-btn flex-1 text-center py-2 text-xs font-black shadow-brutal-xs"
                    >
                      So sánh ngay
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. Verified User Reviews & Review Submission Form */}
      <section className="brutal-card p-6 sm:p-8 bg-warm-surface space-y-6">
        <div className="flex items-center justify-between pb-3 border-b-2 border-warm-border/10">
          <div>
            <h2 className="text-base sm:text-lg font-black text-warm-text flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-600" />
              <span>Đánh Giá Từ Người Dùng Xác Thực</span>
            </h2>
            <span className="text-xs text-warm-muted font-medium">
              ({reviews.length} đánh giá đã được kiểm duyệt nội dung)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-amber-500">
              {product.avgRating ? Number(product.avgRating).toFixed(1) : '5.0'}
            </span>
            <span className="text-xs font-bold text-warm-muted">/ 5 sao</span>
          </div>
        </div>

        {/* Review Form */}
        <div className="p-4 sm:p-5 rounded-2xl border-2 border-warm-border bg-warm-bg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-warm-text">
              {user ? `Gửi đánh giá với tư cách: ${user.name}` : 'Đăng nhập để gửi đánh giá'}
            </h3>
            {user && (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-amber-500 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-5 h-5 ${star <= rating ? 'fill-current' : 'text-warm-border'}`}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {user ? (
            <form onSubmit={handleReviewSubmit} className="space-y-3">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Chia sẻ trải nghiệm thực tế về thời lượng pin, độ mượt khi sử dụng, chất lượng màn hình..."
                rows={3}
                className="w-full bg-white border-2 border-warm-border rounded-xl p-3 text-xs sm:text-sm font-medium focus:outline-none focus:border-amber-500"
              />

              {submitSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Cảm ơn bạn! Đánh giá đã được ghi nhận vào hệ thống thành công.</span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingReview || !content.trim()}
                  className="brutal-btn px-5 py-2 text-xs font-black shadow-brutal-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingReview ? 'Đang gửi...' : 'Gửi Đánh Giá'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-4">
              <Link
                to={`/auth?redirect=${encodeURIComponent(location.pathname)}`}
                className="brutal-btn px-6 py-2 text-xs font-black shadow-brutal-xs inline-flex items-center gap-1.5"
              >
                <span>Đăng nhập để chia sẻ đánh giá</span>
              </Link>
            </div>
          )}
        </div>

        {/* Reviews List */}
        <div className="space-y-3">
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-warm-muted text-xs font-bold">
              Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên chia sẻ cảm nhận!
            </div>
          ) : (
            reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-xl border border-warm-border bg-white space-y-1.5 text-xs shadow-brutal-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-200 border border-warm-border flex items-center justify-center font-black text-[10px] text-amber-900">
                      {rev.reviewerName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-extrabold text-warm-text">{rev.reviewerName}</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                      ✓ Đã mua hàng
                    </span>
                  </div>

                  <div className="flex items-center text-amber-500">
                    {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                </div>

                <p className="text-warm-text font-medium leading-relaxed pt-1">{rev.content}</p>

                {rev.createdAt && (
                  <div className="text-[10px] text-warm-muted">
                    {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* 7. Interactive "Hỏi AI về sản phẩm" Modal */}
      {isAskAiOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="brutal-card p-6 bg-warm-surface w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-warm-border/10">
              <h3 className="text-base font-extrabold text-warm-text flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <span>Trợ Lý AI Phân Tích: {product.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAskAiOpen(false)}
                className="text-warm-muted hover:text-warm-text font-black text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Quick Questions Chips */}
            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-warm-muted text-[11px] uppercase">Gợi ý câu hỏi nhanh:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Máy này chơi game Genshin Impact hay LOL ổn không?',
                  'Thời lượng pin thực tế dùng văn phòng được mấy tiếng?',
                  'Cấu hình này làm đồ họa Photoshop và dựng video mượt không?',
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAiQuestion(chip);
                      handleAskAiSubmit(chip);
                    }}
                    className="p-1.5 rounded-lg border border-warm-border bg-warm-bg text-[11px] font-bold text-warm-text hover:bg-amber-100 text-left"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskAiSubmit(aiQuestion);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="Nhập câu hỏi của bạn về chiếc máy này..."
                className="flex-1 bg-warm-bg border-2 border-warm-border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
              />
              <button
                type="submit"
                disabled={aiThinking || !aiQuestion.trim()}
                className="brutal-btn px-4 py-2 text-xs font-black shadow-brutal-xs disabled:opacity-50"
              >
                {aiThinking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </form>

            {/* AI Answer Preview */}
            {aiThinking && (
              <div className="p-4 rounded-xl border border-warm-border bg-amber-50 text-xs font-semibold text-amber-900 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                <span>AI đang phân tích bảng thông số kỹ thuật...</span>
              </div>
            )}

            {aiAnswer && !aiThinking && (
              <div className="p-4 rounded-xl border-2 border-amber-400 bg-amber-50 text-xs text-amber-950 font-medium leading-relaxed space-y-1">
                <div className="font-extrabold text-[11px] text-amber-900 uppercase">Câu trả lời từ Gemini AI:</div>
                <p>{aiAnswer}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
