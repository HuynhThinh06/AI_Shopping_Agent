import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '../api/client';
import { categoryApi } from '../api/categoryApi';
import { queryCache } from '../utils/queryCache';
import type { ProductDetailDTO } from '../types/product';
import type { PageResponse } from '../types/review';
import type { CategoryFacetDTO } from '../types/search';
import { toggleFavoriteId, isFavoriteId, toggleCompareId, isInCompare, getAuthUser } from '../utils/storage';
import {
  Laptop,
  Smartphone,
  SlidersHorizontal,
  Star,
  Heart,
  Scale,
  Sparkles,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const CategoryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { code: paramCode } = useParams<{ code?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Nguồn chân lý duy nhất từ URL (Single Source of Truth), loại trừ triệt để Stale State
  const rawType = (paramCode || searchParams.get('type') || 'laptop').toLowerCase().trim();
  const activeType = rawType.includes('phone') ? 'phone' : 'laptop';

  const [allCategoryProducts, setAllCategoryProducts] = useState<ProductDetailDTO[]>(() => {
    return queryCache.getPersistent<ProductDetailDTO[]>(`category_products_${activeType}`) || [];
  });
  const [facetGroups, setFacetGroups] = useState<CategoryFacetDTO[]>([]);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(() => {
    return !queryCache.has(`category_products_${activeType}`);
  });
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rating');
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(24);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [compares, setCompares] = useState<number[]>([]);

  // Load facets for current category
  useEffect(() => {
    let isMounted = true;
    categoryApi
      .getCategoryFacets(activeType)
      .then((facets) => {
        if (isMounted) {
          setFacetGroups(facets);
        }
      })
      .catch((err) => {
        console.warn('Failed to load category facets, fallback to data-driven extraction', err);
      });
    return () => {
      isMounted = false;
    };
  }, [activeType]);

  // Tải danh mục sản phẩm có Persistent SWR Cache (0ms khi chuyển lại hoặc mở lại trình duyệt)
  const loadProducts = async (cat: string) => {
    const cacheKey = `category_products_${cat}`;
    const cached = queryCache.getPersistent<ProductDetailDTO[]>(cacheKey);

    if (cached && cached.length > 0) {
      setAllCategoryProducts(cached);
      setLoading(false);
    } else {
      setAllCategoryProducts([]);
      setLoading(true);
    }

    setLoadError(false);
    try {
      const res = await apiClient.get<PageResponse<ProductDetailDTO>>('/products', {
        params: {
          categoryCode: cat,
          page: 0,
          size: 100,
        },
      });

      const list = res.data.content || [];
      queryCache.setPersistent(cacheKey, list, 30 * 60 * 1000); // Lưu cache bền vững 30 phút
      setAllCategoryProducts(list);
    } catch (err) {
      console.error('Failed to load category products:', err);
      if (!cached || cached.length === 0) {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(0);
    setSelectedBrands([]);
    setPriceRange('all');
    loadProducts(activeType);
  }, [activeType]);

  // Dynamic Brand Extraction: Compute real counts from database products
  const dynamicBrands = useMemo(() => {
    const counts: Record<string, number> = {};
    allCategoryProducts.forEach((p) => {
      if (p.brand) {
        const b = p.brand.trim();
        counts[b] = (counts[b] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand));
  }, [allCategoryProducts]);

  // Dynamic Price Options from backend facets or category-aware defaults
  const dynamicPriceOptions = useMemo(() => {
    const priceFacet = facetGroups.find((g) => g.groupKey === 'price');
    if (priceFacet && priceFacet.options && priceFacet.options.length > 0) {
      return [
        { id: 'all', label: 'Tất cả mức giá', min: null, max: null },
        ...priceFacet.options.map((opt) => ({
          id: opt.id,
          label: opt.label,
          min: opt.min,
          max: opt.max,
        })),
      ];
    }

    if (activeType === 'phone') {
      return [
        { id: 'all', label: 'Tất cả mức giá', min: null, max: null },
        { id: 'p1', label: 'Dưới 5 triệu', min: null, max: 5000000 },
        { id: 'p2', label: '5 - 10 triệu', min: 5000000, max: 10000000 },
        { id: 'p3', label: '10 - 15 triệu', min: 10000000, max: 15000000 },
        { id: 'p4', label: '15 - 20 triệu', min: 15000000, max: 20000000 },
        { id: 'p5', label: 'Trên 20 triệu', min: 20000000, max: null },
      ];
    }

    return [
      { id: 'all', label: 'Tất cả mức giá', min: null, max: null },
      { id: 'l1', label: 'Dưới 15 triệu', min: null, max: 15000000 },
      { id: 'l2', label: '15 - 20 triệu', min: 15000000, max: 20000000 },
      { id: 'l3', label: '20 - 25 triệu', min: 20000000, max: 25000000 },
      { id: 'l4', label: '25 - 30 triệu', min: 25000000, max: 30000000 },
      { id: 'l5', label: 'Trên 30 triệu', min: 30000000, max: null },
    ];
  }, [facetGroups, activeType]);

  // Filter & Sort Products
  const filteredProducts = useMemo(() => {
    let list = [...allCategoryProducts];

    // Filter by Brand
    if (selectedBrands.length > 0) {
      const lowerBrands = selectedBrands.map((b) => b.toLowerCase());
      list = list.filter((p) =>
        lowerBrands.some((b) => p.brand.toLowerCase() === b || p.brand.toLowerCase().includes(b))
      );
    }

    // Filter by Price Range
    if (priceRange !== 'all') {
      const activeOption = dynamicPriceOptions.find((opt) => opt.id === priceRange);
      if (activeOption) {
        if (activeOption.min != null) {
          list = list.filter((p) => p.price >= activeOption.min!);
        }
        if (activeOption.max != null) {
          list = list.filter((p) => p.price <= activeOption.max!);
        }
      }
    }

    // Sort
    if (sortBy === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else {
      list.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
    }

    return list;
  }, [allCategoryProducts, selectedBrands, priceRange, sortBy, dynamicPriceOptions]);

  // Paginated Slice
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const handleBrandToggle = (brand: string) => {
    setCurrentPage(0);
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const handlePriceSelect = (id: string) => {
    setCurrentPage(0);
    setPriceRange(id);
  };

  const handleResetFilters = () => {
    setSelectedBrands([]);
    setPriceRange('all');
    setCurrentPage(0);
  };

  const handleFavoriteToggle = (id: number) => {
    const user = getAuthUser();
    if (!user) {
      navigate('/auth?redirect=' + encodeURIComponent(location.pathname + location.search));
      return;
    }
    toggleFavoriteId(id);
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCompareToggle = (id: number) => {
    if (!getAuthUser()) {
      navigate('/auth?mode=login&redirect=' + encodeURIComponent(location.pathname + location.search));
      return;
    }
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
              Tổng số {allCategoryProducts.length} sản phẩm trong CSDL
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
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              activeType === 'laptop'
                ? 'bg-warm-primary text-warm-primary-text border-2 border-warm-text shadow-brutal-xs -translate-y-0.5'
                : 'text-warm-text hover:bg-warm-secondary'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Laptop ({allCategoryProducts.length > 0 && activeType === 'laptop' ? allCategoryProducts.length : '88'})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchParams({ type: 'phone' });
              setSelectedBrands([]);
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              activeType === 'phone'
                ? 'bg-warm-primary text-warm-primary-text border-2 border-warm-text shadow-brutal-xs -translate-y-0.5'
                : 'text-warm-text hover:bg-warm-secondary'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Điện thoại ({allCategoryProducts.length > 0 && activeType === 'phone' ? allCategoryProducts.length : '84'})</span>
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
                  onClick={handleResetFilters}
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            {/* Brand Filter (Dynamic Data-Driven Aggregation) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-warm-text uppercase">Thương hiệu ({dynamicBrands.length})</span>
                {selectedBrands.length > 0 && (
                  <span className="text-[10px] font-bold text-warm-primary-text bg-warm-secondary px-1.5 py-0.2 rounded">
                    Đã chọn {selectedBrands.length}
                  </span>
                )}
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                {dynamicBrands.map(({ brand, count }) => {
                  const isChecked = selectedBrands.includes(brand);
                  return (
                    <label
                      key={brand}
                      className={`flex items-center justify-between p-1.5 rounded-lg text-xs font-bold cursor-pointer select-none transition-colors ${
                        isChecked ? 'bg-amber-100 text-amber-950 font-black' : 'text-warm-text hover:bg-warm-bg'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleBrandToggle(brand)}
                          className="w-4 h-4 rounded border-2 border-warm-text text-warm-primary focus:ring-warm-primary cursor-pointer"
                        />
                        <span>{brand}</span>
                      </span>
                      <span className="text-[11px] text-warm-muted font-mono font-medium">({count})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Price Range Filter (Dynamic Category-Aware Presets) */}
            <div>
              <span className="block text-xs font-black text-warm-text uppercase mb-2">Mức giá</span>
              <div className="space-y-1.5">
                {dynamicPriceOptions.map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-2 p-1.5 rounded-lg text-xs font-bold cursor-pointer select-none transition-colors ${
                      priceRange === item.id ? 'bg-amber-100 text-amber-950 font-black' : 'text-warm-text hover:bg-warm-bg'
                    }`}
                  >
                    <input
                      type="radio"
                      name="priceRange"
                      value={item.id}
                      checked={priceRange === item.id}
                      onChange={() => handlePriceSelect(item.id)}
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
              Hiển thị{' '}
              <strong className="text-warm-text font-black">
                {filteredProducts.length === 0
                  ? 0
                  : `${currentPage * pageSize + 1} - ${Math.min(
                      (currentPage + 1) * pageSize,
                      filteredProducts.length
                    )}`}
              </strong>{' '}
              trên tổng số <strong className="text-warm-text font-black">{filteredProducts.length}</strong> sản phẩm phù hợp
            </span>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-warm-muted">Mỗi trang:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(0);
                  }}
                  className="px-2 py-1 rounded-lg border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                  <option value={100}>Tất cả (100)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-warm-muted" />
                <span className="text-xs font-bold text-warm-muted">Sắp xếp:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="rating">Đánh giá cao nhất</option>
                  <option value="price-asc">Giá thấp đến cao</option>
                  <option value="price-desc">Giá cao đến thấp</option>
                </select>
              </div>
            </div>
          </div>

          {/* Product Grid / Skeleton Loading */}
          {loading && allCategoryProducts.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 shadow-brutal flex flex-col justify-between animate-pulse"
                >
                  <div>
                    {/* Top bar skeleton */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-4 w-16 bg-warm-bg rounded-md border border-warm-text/20"></div>
                      <div className="flex gap-1">
                        <div className="h-7 w-7 bg-warm-bg rounded-lg border border-warm-text/20"></div>
                        <div className="h-7 w-7 bg-warm-bg rounded-lg border border-warm-text/20"></div>
                      </div>
                    </div>
                    {/* Image box skeleton */}
                    <div className="w-full h-40 bg-warm-bg border-2 border-warm-text/20 rounded-xl mb-3 flex items-center justify-center">
                      <div className="w-10 h-10 bg-warm-text/10 rounded-full"></div>
                    </div>
                    {/* Name skeleton */}
                    <div className="space-y-2 mb-2">
                      <div className="h-4 bg-warm-bg rounded w-5/6"></div>
                      <div className="h-4 bg-warm-bg rounded w-3/5"></div>
                    </div>
                    {/* Rating skeleton */}
                    <div className="h-3.5 bg-warm-bg rounded w-24 my-2"></div>
                    {/* Price skeleton */}
                    <div className="h-5 bg-warm-bg rounded w-32 my-2"></div>
                    {/* Specs skeleton */}
                    <div className="flex gap-1.5 mt-2">
                      <div className="h-4 w-14 bg-warm-bg rounded"></div>
                      <div className="h-4 w-16 bg-warm-bg rounded"></div>
                    </div>
                  </div>
                  {/* Footer button skeleton */}
                  <div className="mt-4 pt-3 border-t border-warm-text/10">
                    <div className="h-9 w-full bg-warm-bg rounded-xl border border-warm-text/20"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : loadError && allCategoryProducts.length === 0 ? (
            <div className="p-12 text-center text-warm-muted bg-warm-surface border-2 border-warm-text rounded-2xl shadow-brutal space-y-3">
              <div className="text-4xl">⚠️</div>
              <div className="font-black text-base text-warm-text">Không thể kết nối đến máy chủ</div>
              <p className="text-xs text-warm-muted max-w-sm mx-auto">
                Không thể tải danh sách sản phẩm từ cơ sở dữ liệu. Vui lòng kiểm tra lại dịch vụ Backend.
              </p>
              <button
                type="button"
                onClick={() => loadProducts(activeType)}
                className="px-4 py-2 rounded-xl bg-warm-primary text-warm-primary-text font-black text-xs border-2 border-warm-text shadow-brutal-xs hover:bg-warm-primary-hover cursor-pointer"
              >
                Thử lại ngay
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-warm-muted bg-warm-surface border-2 border-warm-text rounded-2xl shadow-brutal space-y-3">
              <div className="text-4xl">🔍</div>
              <div className="font-black text-base text-warm-text">Không tìm thấy sản phẩm phù hợp với bộ lọc</div>
              <p className="text-xs text-warm-muted max-w-sm mx-auto">
                Hiện không có sản phẩm nào thỏa mãn đồng thời các thương hiệu và mức giá đã chọn.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-warm-primary text-warm-primary-text font-black text-xs border-2 border-warm-text shadow-brutal-xs hover:bg-warm-primary-hover cursor-pointer"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginatedProducts.map((p) => {
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

                        {/* Product Image Thumbnail */}
                        <Link
                          to={`/product/${p.id}`}
                          className="w-full h-40 bg-warm-bg border-2 border-warm-text rounded-xl overflow-hidden mb-3 flex items-center justify-center relative group-hover:border-warm-primary transition-colors block"
                        >
                          {p.imageUrls && p.imageUrls.length > 0 ? (
                            <img
                              src={p.imageUrls[0]}
                              alt={p.name}
                              className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-4xl text-warm-muted">
                              {activeType === 'phone' ? '📱' : '💻'}
                            </span>
                          )}
                        </Link>

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
                                {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
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

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 shadow-brutal flex flex-wrap items-center justify-between gap-3 mt-4">
                  <button
                    type="button"
                    disabled={currentPage === 0}
                    onClick={() => {
                      setCurrentPage((prev) => Math.max(0, prev - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`px-3.5 py-2 rounded-xl border-2 border-warm-text text-xs font-black flex items-center gap-1.5 transition-all ${
                      currentPage === 0
                        ? 'opacity-40 cursor-not-allowed bg-warm-bg text-warm-muted'
                        : 'bg-warm-bg hover:bg-warm-secondary text-warm-text shadow-brutal-xs cursor-pointer'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Trang trước</span>
                  </button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCurrentPage(idx);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`w-8 h-8 rounded-xl border-2 border-warm-text text-xs font-black transition-all cursor-pointer ${
                          currentPage === idx
                            ? 'bg-warm-primary text-warm-primary-text shadow-brutal-xs -translate-y-0.5'
                            : 'bg-warm-bg hover:bg-warm-secondary text-warm-text'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => {
                      setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`px-3.5 py-2 rounded-xl border-2 border-warm-text text-xs font-black flex items-center gap-1.5 transition-all ${
                      currentPage >= totalPages - 1
                        ? 'opacity-40 cursor-not-allowed bg-warm-bg text-warm-muted'
                        : 'bg-warm-bg hover:bg-warm-secondary text-warm-text shadow-brutal-xs cursor-pointer'
                    }`}
                  >
                    <span>Trang sau</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
