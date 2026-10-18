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
        {/* Left: Product Image */}
        <div className="lg:col-span-5 space-y-4">
          <div className="w-full aspect-square rounded-2xl border-2 border-warm-border bg-warm-subtle p-6 flex items-center justify-center overflow-hidden shadow-brutal-sm">
            {product.imageUrls && product.imageUrls.length > 0 ? (
              <img
                src={product.imageUrls[0]}
                alt={product.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as any).src = 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500';
                }}
              />
            ) : (
              <Cpu className="w-16 h-16 text-warm-hint" />
            )}
          </div>
        </div>

        {/* Right: Details & Specs */}
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

              {product.productUrl && (
                <a
                  href={product.productUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="brutal-btn px-4 py-2 text-xs font-black shadow-brutal-xs flex items-center gap-1.5"
                >
                  <span>TGDĐ</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Technical specs table */}
          {product.specs && Object.keys(product.specs).length > 0 && (
            <div className="pt-2 space-y-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-warm-muted">
                Thông số kỹ thuật (PostgreSQL JSONB):
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(product.specs).map(([key, value]) => (
                  <div key={key} className="p-2 rounded-xl border border-warm-border bg-warm-subtle flex flex-col">
                    <span className="font-extrabold uppercase text-[10px] text-warm-muted">{key}</span>
                    <span className="font-bold text-warm-text mt-0.5 truncate">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

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
    </div>
  );
};
