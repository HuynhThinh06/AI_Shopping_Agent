import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { ProductDetailDTO } from '../types/product';
import type { PageResponse } from '../types/review';
import { toggleFavoriteId, isFavoriteId, toggleCompareId, isInCompare } from '../utils/storage';
import {
  Laptop,
  Smartphone,
  SlidersHorizontal,
  Star,
  Heart,
  Scale,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';

export const CategoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get('type') || 'laptop';

  const [activeType, setActiveType] = useState<string>(typeParam);
  const [products, setProducts] = useState<ProductDetailDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rating');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [compares, setCompares] = useState<number[]>([]);

  useEffect(() => {
    setActiveType(typeParam);
  }, [typeParam]);

  const laptopBrands = ['Apple', 'Dell', 'Asus', 'Lenovo', 'HP', 'Acer'];
  const phoneBrands = ['Apple', 'Samsung', 'Xiaomi', 'OPPO', 'Google'];
  const availableBrands = activeType === 'phone' ? phoneBrands : laptopBrands;

  const loadProducts = async () => {
    setLoading(true);
    try {
      let minPrice: number | undefined;
      let maxPrice: number | undefined;

      if (priceRange === 'under-10') maxPrice = 10000000;
      else if (priceRange === '10-15') { minPrice = 10000000; maxPrice = 15000000; }
      else if (priceRange === '15-20') { minPrice = 15000000; maxPrice = 20000000; }
      else if (priceRange === '20-30') { minPrice = 20000000; maxPrice = 30000000; }
      else if (priceRange === 'above-30') minPrice = 30000000;

      const res = await apiClient.get<PageResponse<ProductDetailDTO>>('/products', {
        params: {
          categoryCode: activeType,
          minPrice,
          maxPrice,
          size: 40,
        },
      });

      let list = res.data.content;

      // Filter by brands
      if (selectedBrands.length > 0) {
        list = list.filter((p) =>
          selectedBrands.some((b) => p.brand.toLowerCase().includes(b.toLowerCase()))
        );
      }

      // Sort
      if (sortBy === 'price-asc') {
        list.sort((a, b) => a.price - b.price);
      } else if (sortBy === 'price-desc') {
        list.sort((a, b) => b.price - a.price);
      } else {
        list.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
      }

      setProducts(list);
    } catch (err) {
      console.error('Failed to load category products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [activeType, selectedBrands, priceRange, sortBy]);

  const handleBrandToggle = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const handleFavoriteToggle = (id: number) => {
    toggleFavoriteId(id);
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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
      {/* Category Hero & Switcher */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-warm-secondary border border-warm-text text-warm-secondary-text text-xs font-black uppercase">
              Danh mục sản phẩm
            </span>
            <span className="text-xs text-warm-muted font-bold font-mono">
              {products.length} sản phẩm
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-warm-text tracking-tight mt-1 flex items-center gap-2">
            {activeType === 'phone' ? (
              <>
                <Smartphone className="w-7 h-7 text-warm-primary" />
                Điện Thoại Thông Minh (Smartphones)
              </>
            ) : (
              <>
                <Laptop className="w-7 h-7 text-warm-primary" />
                Máy Tính Xách Tay (Laptops)
              </>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-warm-muted font-medium mt-1">
            Duyệt sản phẩm chính hãng với thông số kỹ thuật chi tiết và phân tích đánh giá bằng AI.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-warm-bg p-1.5 rounded-2xl border-2 border-warm-text shadow-brutal-xs shrink-0">
          <button
            type="button"
            onClick={() => {
              setSearchParams({ type: 'laptop' });
              setSelectedBrands([]);
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition-all ${
              activeType === 'laptop'
                ? 'bg-warm-primary text-warm-primary-text border-2 border-warm-text shadow-brutal-xs -translate-y-0.5'
                : 'text-warm-text hover:bg-warm-secondary'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Laptop</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchParams({ type: 'phone' });
              setSelectedBrands([]);
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition-all ${
              activeType === 'phone'
                ? 'bg-warm-primary text-warm-primary-text border-2 border-warm-text shadow-brutal-xs -translate-y-0.5'
                : 'text-warm-text hover:bg-warm-secondary'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Điện thoại</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar Filters (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 sm:p-5 shadow-brutal space-y-5">
            <div className="flex items-center justify-between pb-3 border-b-2 border-warm-border-subtle">
              <span className="font-black text-xs uppercase tracking-wider flex items-center gap-2 text-warm-text">
                <SlidersHorizontal className="w-4 h-4" />
                Bộ lọc tìm kiếm
              </span>
              {(selectedBrands.length > 0 || priceRange !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBrands([]);
                    setPriceRange('all');
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            {/* Brand Filter */}
            <div>
              <span className="block text-xs font-black text-warm-text uppercase mb-2">Thương hiệu</span>
              <div className="space-y-1.5">
                {availableBrands.map((b) => (
                  <label
                    key={b}
                    className="flex items-center gap-2 text-xs font-bold text-warm-text cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(b)}
                      onChange={() => handleBrandToggle(b)}
                      className="w-4 h-4 rounded border-2 border-warm-text text-warm-primary focus:ring-warm-primary cursor-pointer"
                    />
                    <span>{b}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div>
              <span className="block text-xs font-black text-warm-text uppercase mb-2">Mức giá</span>
              <div className="space-y-1.5">
                {[
                  { id: 'all', label: 'Tất cả mức giá' },
                  { id: 'under-10', label: 'Dưới 10 triệu' },
                  { id: '10-15', label: '10 - 15 triệu' },
                  { id: '15-20', label: '15 - 20 triệu' },
                  { id: '20-30', label: '20 - 30 triệu' },
                  { id: 'above-30', label: 'Trên 30 triệu' },
                ].map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 text-xs font-bold text-warm-text cursor-pointer select-none"
                  >
                    <input
                      type="radio"
                      name="priceRange"
                      value={item.id}
                      checked={priceRange === item.id}
                      onChange={(e) => setPriceRange(e.target.value)}
                      className="w-4 h-4 text-warm-primary border-2 border-warm-text focus:ring-warm-primary cursor-pointer"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Content: Products Grid (9 Cols) */}
        <div className="lg:col-span-9 space-y-4">
          {/* Toolbar */}
          <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-3.5 shadow-brutal flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-warm-muted">
              Hiển thị <strong className="text-warm-text">{products.length}</strong> kết quả
            </span>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-warm-muted" />
              <span className="text-xs font-bold text-warm-muted">Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
              >
                <option value="rating">Đánh giá cao nhất</option>
                <option value="price-asc">Giá thấp đến cao</option>
                <option value="price-desc">Giá cao đến thấp</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="p-12 text-center text-warm-muted bg-warm-surface border-2 border-warm-text rounded-2xl shadow-brutal font-bold">
              Đang tải danh sách sản phẩm...
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center text-warm-muted bg-warm-surface border-2 border-warm-text rounded-2xl shadow-brutal">
              <div className="text-3xl mb-2">🔍</div>
              <div className="font-black text-sm text-warm-text">Không tìm thấy sản phẩm phù hợp</div>
              <div className="text-xs text-warm-muted mt-1">
                Hãy thử nới lỏng bộ lọc thương hiệu hoặc khoảng giá để xem thêm sản phẩm.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map((p) => {
                const fav = isFavoriteId(p.id) || favorites.includes(p.id);
                const comp = isInCompare(p.id) || compares.includes(p.id);

                return (
                  <div
                    key={p.id}
                    className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 shadow-brutal hover:-translate-y-1 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Bar: Brand & Action Icons */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded-md bg-warm-bg border border-warm-text text-[10px] font-black uppercase text-warm-muted">
                          {p.brand}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleFavoriteToggle(p.id)}
                            title={fav ? 'Bỏ thích' : 'Lưu vào yêu thích'}
                            className="p-1.5 rounded-lg border border-warm-text hover:bg-warm-bg cursor-pointer transition-colors"
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                fav ? 'text-red-500 fill-red-500' : 'text-warm-muted'
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCompareToggle(p.id)}
                            title={comp ? 'Đã thêm so sánh' : 'Thêm vào so sánh'}
                            className={`p-1.5 rounded-lg border border-warm-text cursor-pointer transition-colors ${
                              comp ? 'bg-amber-400 text-warm-text' : 'hover:bg-warm-bg text-warm-muted'
                            }`}
                          >
                            <Scale className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Product Name */}
                      <Link
                        to={`/product/${p.id}`}
                        className="font-extrabold text-sm text-warm-text group-hover:text-warm-primary transition-colors line-clamp-2"
                      >
                        {p.name}
                      </Link>

                      {/* Rating & Review Count */}
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                        <div className="flex items-center gap-0.5 text-amber-500 font-black">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{p.avgRating ? p.avgRating.toFixed(1) : '5.0'}</span>
                        </div>
                        <span className="text-[11px] text-warm-muted font-medium">
                          ({p.reviewCount} đánh giá)
                        </span>
                      </div>

                      {/* Price */}
                      <div className="mt-2 text-base font-black font-mono text-warm-primary-text">
                        {formatPrice(p.price)}
                      </div>

                      {/* Specs Tags */}
                      {p.specs && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {Object.entries(p.specs).slice(0, 3).map(([k, v]) => (
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

                    {/* Bottom Action */}
                    <div className="mt-4 pt-3 border-t border-warm-border-subtle flex items-center justify-between">
                      <Link
                        to={`/product/${p.id}`}
                        className="w-full py-2 rounded-xl bg-warm-bg hover:bg-warm-secondary border border-warm-text text-warm-text font-black text-xs flex items-center justify-center gap-1.5 shadow-brutal-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-warm-primary" />
                        <span>Xem Chi Tiết & Tóm Tắt AI</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
