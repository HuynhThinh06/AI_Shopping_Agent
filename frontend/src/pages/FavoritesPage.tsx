import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { ProductDetailDTO } from '../types/product';
import {
  getFavoriteIds,
  toggleFavoriteId,
  toggleCompareId,
  isInCompare,
  getCompareIds,
  getAuthUser,
  type AuthUser,
} from '../utils/storage';
import { Heart, Trash2, Scale, Star, Sparkles, ShoppingBag, LogIn, Loader2 } from 'lucide-react';

export const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(() => getAuthUser());
  const [products, setProducts] = useState<ProductDetailDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [compares, setCompares] = useState<number[]>(() => getCompareIds());

  useEffect(() => {
    const handleAuth = () => setUser(getAuthUser());
    const handleComp = () => setCompares(getCompareIds());
    window.addEventListener('auth-updated', handleAuth);
    window.addEventListener('compare-updated', handleComp);
    return () => {
      window.removeEventListener('auth-updated', handleAuth);
      window.removeEventListener('compare-updated', handleComp);
    };
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const ids = getFavoriteIds();
      if (!ids || ids.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const resList = await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await apiClient.get<ProductDetailDTO>(`/products/${id}`);
            return res.data;
          } catch (e) {
            console.warn(`[Favorites] Product #${id} not found or failed to load:`, e);
            return null;
          }
        })
      );

      const validProducts = resList.filter((x): x is ProductDetailDTO => x !== null);
      setProducts(validProducts);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth?redirect=/favorites', { replace: true });
      return;
    }
    loadFavorites();

    const handleFavUpdate = () => {
      loadFavorites();
    };
    window.addEventListener('favorites-updated', handleFavUpdate);
    return () => window.removeEventListener('favorites-updated', handleFavUpdate);
  }, [user?.email]);

  if (!user) {
    return (
      <div className="brutal-card p-10 max-w-lg mx-auto text-center bg-warm-surface space-y-4 my-12">
        <div className="w-16 h-16 rounded-2xl border-2 border-warm-border bg-rose-100 flex items-center justify-center mx-auto shadow-brutal-xs">
          <Heart className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-2xl font-black text-warm-text">Yêu Cầu Đăng Nhập</h2>
        <p className="text-sm text-warm-muted leading-relaxed">
          Chức năng <strong>Sản phẩm đã lưu</strong> yêu cầu đăng nhập tài khoản. Vui lòng đăng nhập để lưu trữ và quản lý bộ sưu tập yêu thích của bạn.
        </p>
        <Link
          to="/auth?redirect=/favorites"
          className="brutal-btn px-6 py-3 text-sm font-black inline-flex items-center gap-2 shadow-brutal"
        >
          <LogIn className="w-4 h-4" />
          <span>Đăng nhập ngay</span>
        </Link>
      </div>
    );
  }

  const handleRemove = (id: number) => {
    toggleFavoriteId(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCompareToggle = (id: number) => {
    toggleCompareId(id);
    setCompares(getCompareIds());
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-warm-surface border-2 border-warm-border rounded-2xl p-5 sm:p-6 shadow-brutal flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 border border-warm-border text-rose-800 text-xs font-black uppercase shadow-brutal-xs">
              Bộ sưu tập cá nhân
            </span>
            <span className="text-xs text-warm-muted font-bold font-mono">
              {products.length} sản phẩm
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-warm-text tracking-tight mt-1 flex items-center gap-2">
            <Heart className="w-7 h-7 text-rose-500 fill-rose-500" />
            Sản Phẩm Yêu Thích &amp; Đã Lưu
          </h1>
          <p className="text-xs sm:text-sm text-warm-muted font-medium mt-1">
            Danh sách các sản phẩm bạn đã đánh dấu để theo dõi biến động giá và đối chiếu cấu hình trước khi mua.
          </p>
        </div>

        <Link
          to="/category?type=laptop"
          className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs border-2 border-warm-border shadow-brutal flex items-center gap-1.5 cursor-pointer shrink-0 transition-transform hover:-translate-y-0.5"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Tiếp tục khám phá</span>
        </Link>
      </div>

      {loading ? (
        <div className="p-12 text-center text-warm-muted bg-warm-surface border-2 border-warm-border rounded-2xl shadow-brutal font-bold flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <span>Đang tải danh sách yêu thích...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-warm-surface border-2 border-warm-border rounded-2xl p-8 sm:p-12 shadow-brutal text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 border-2 border-warm-border mx-auto flex items-center justify-center text-3xl shadow-brutal-xs">
            ❤️
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-lg font-black text-warm-text">Bạn chưa lưu sản phẩm nào</h2>
            <p className="text-xs text-warm-muted mt-1 leading-relaxed">
              Hãy bấm vào biểu tượng trái tim trên các thẻ sản phẩm bạn quan tâm để lưu lại vào danh sách này.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/category?type=laptop"
              className="brutal-btn px-5 py-2.5 text-xs font-black shadow-brutal-xs inline-flex items-center gap-2"
            >
              <span>Xem danh mục sản phẩm hot</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => {
            const comp = isInCompare(p.id) || compares.includes(p.id);
            const primaryImg = p.imageUrls && p.imageUrls.length > 0 ? p.imageUrls[0] : null;

            return (
              <div
                key={p.id}
                className="brutal-card p-5 bg-warm-surface flex flex-col justify-between group hover:-translate-y-1 transition-transform"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-md bg-warm-subtle border border-warm-border text-[11px] font-extrabold uppercase text-warm-muted">
                      {p.brand}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemove(p.id)}
                      className="p-1.5 rounded-lg border border-warm-border text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors shadow-brutal-xs"
                      title="Bỏ khỏi yêu thích"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Thumbnail Image */}
                  <div className="w-full h-44 bg-warm-subtle rounded-xl border border-warm-border/30 mb-3 p-3 flex items-center justify-center overflow-hidden">
                    {primaryImg ? (
                      <img
                        src={primaryImg}
                        alt={p.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as any).src =
                            'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300';
                        }}
                      />
                    ) : (
                      <Sparkles className="w-8 h-8 text-warm-hint" />
                    )}
                  </div>

                  <Link
                    to={`/product/${p.id}`}
                    className="font-extrabold text-base text-warm-text hover:text-amber-700 transition-colors line-clamp-2"
                  >
                    {p.name}
                  </Link>

                  <div className="flex items-center gap-1.5 mt-2 text-xs">
                    <div className="flex items-center gap-0.5 text-amber-600 font-black">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{p.avgRating ? Number(p.avgRating).toFixed(1) : '5.0'}</span>
                    </div>
                    <span className="text-[11px] text-warm-muted font-medium">
                      ({p.reviewCount} đánh giá)
                    </span>
                  </div>

                  <div className="mt-3 text-lg font-black text-amber-700">
                    {formatPrice(p.price)}
                  </div>

                  {p.specs && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {Object.entries(p.specs)
                        .slice(0, 4)
                        .map(([k, v]) => (
                          <span
                            key={k}
                            className="px-2 py-0.5 bg-warm-bg rounded-md border border-warm-border/20 text-[10px] font-mono text-warm-muted font-bold"
                          >
                            {k.toUpperCase()}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </span>
                        ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-warm-border/10 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCompareToggle(p.id)}
                    className={`py-2 px-3 rounded-xl border-2 border-warm-border text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-all shadow-brutal-xs ${
                      comp
                        ? 'bg-emerald-500 text-white'
                        : 'bg-warm-secondary text-warm-secondary-text hover:bg-amber-300'
                    }`}
                    title={comp ? 'Đã thêm so sánh' : 'Thêm vào so sánh'}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>{comp ? '✓ Đang so sánh' : '+ So sánh'}</span>
                  </button>

                  <Link
                    to={`/product/${p.id}`}
                    className="brutal-btn flex-1 py-2 text-xs font-black flex items-center justify-center gap-1.5 shadow-brutal-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Xem chi tiết</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
