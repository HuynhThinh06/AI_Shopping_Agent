import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { ProductDetailDTO } from '../types/product';
import { getFavoriteIds, toggleFavoriteId, toggleCompareId, isInCompare, getAuthUser } from '../utils/storage';
import { Heart, Trash2, Scale, Star, Sparkles, ShoppingBag, LogIn } from 'lucide-react';

export const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const user = getAuthUser();
  const [products, setProducts] = useState<ProductDetailDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [compares, setCompares] = useState<number[]>([]);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const ids = getFavoriteIds();
      if (ids.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const resList = await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await apiClient.get<ProductDetailDTO>(`/products/${id}`);
            return res.data;
          } catch {
            return null;
          }
        })
      );

      setProducts(resList.filter((x): x is ProductDetailDTO => x !== null));
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
  }, [user]);

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
    setCompares((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 border border-warm-text text-rose-800 text-xs font-black uppercase">
              Bộ sưu tập cá nhân
            </span>
            <span className="text-xs text-warm-muted font-bold font-mono">
              {products.length} sản phẩm
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-warm-text tracking-tight mt-1 flex items-center gap-2">
            <Heart className="w-7 h-7 text-rose-500 fill-rose-500" />
            Sản Phẩm Yêu Thích & Đã Lưu
          </h1>
          <p className="text-xs sm:text-sm text-warm-muted font-medium mt-1">
            Danh sách các sản phẩm bạn đã đánh dấu để theo dõi biến động giá và đối chiếu cấu hình trước khi mua.
          </p>
        </div>

        <Link
          to="/category?type=laptop"
          className="px-4 py-2 rounded-xl bg-warm-primary hover:bg-warm-primary-hover text-warm-primary-text hover:text-white font-black text-xs border-2 border-warm-text shadow-brutal flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Tiếp tục khám phá</span>
        </Link>
      </div>

      {loading ? (
        <div className="p-12 text-center text-warm-muted bg-warm-surface border-2 border-warm-text rounded-2xl shadow-brutal font-bold">
          Đang tải danh sách yêu thích...
        </div>
      ) : products.length === 0 ? (
        <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-8 sm:p-12 shadow-brutal text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 border-2 border-warm-text mx-auto flex items-center justify-center text-3xl shadow-brutal-xs">
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
              className="px-5 py-2.5 rounded-xl bg-warm-primary text-warm-primary-text font-black text-xs border-2 border-warm-text shadow-brutal-xs inline-flex items-center gap-2 hover:bg-warm-primary-hover"
            >
              <span>Xem danh mục sản phẩm hot</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => {
            const comp = isInCompare(p.id) || compares.includes(p.id);

            return (
              <div
                key={p.id}
                className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 shadow-brutal hover:-translate-y-1 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-md bg-warm-bg border border-warm-text text-[10px] font-black uppercase text-warm-muted">
                      {p.brand}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemove(p.id)}
                      className="p-1.5 rounded-lg border border-warm-text text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Bỏ khỏi yêu thích"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <Link
                    to={`/product/${p.id}`}
                    className="font-extrabold text-base text-warm-text group-hover:text-warm-primary transition-colors line-clamp-2"
                  >
                    {p.name}
                  </Link>

                  <div className="flex items-center gap-1.5 mt-2 text-xs">
                    <div className="flex items-center gap-0.5 text-amber-500 font-black">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{p.avgRating ? p.avgRating.toFixed(1) : '5.0'}</span>
                    </div>
                    <span className="text-[11px] text-warm-muted font-medium">
                      ({p.reviewCount} đánh giá)
                    </span>
                  </div>

                  <div className="mt-3 text-lg font-black font-mono text-warm-primary-text">
                    {formatPrice(p.price)}
                  </div>

                  {p.specs && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {Object.entries(p.specs).slice(0, 4).map(([k, v]) => (
                        <span
                          key={k}
                          className="px-2 py-0.5 bg-warm-bg rounded-md border border-warm-text/20 text-[10px] font-mono text-warm-muted font-bold"
                        >
                          {k}: {String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-warm-border-subtle flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCompareToggle(p.id)}
                    className={`p-2 rounded-xl border border-warm-text text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                      comp ? 'bg-amber-400 text-warm-text shadow-brutal-xs' : 'bg-warm-bg hover:bg-warm-secondary text-warm-muted'
                    }`}
                    title={comp ? 'Đã thêm so sánh' : 'Thêm vào so sánh'}
                  >
                    <Scale className="w-4 h-4" />
                  </button>

                  <Link
                    to={`/product/${p.id}`}
                    className="flex-1 py-2 rounded-xl bg-warm-primary hover:bg-warm-primary-hover text-warm-primary-text hover:text-white font-black text-xs flex items-center justify-center gap-1.5 border border-warm-text shadow-brutal-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Xem Chi Tiết & AI Cache</span>
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
