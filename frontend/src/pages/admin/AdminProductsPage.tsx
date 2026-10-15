import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminNav } from '../../components/admin/AdminNav';
import { apiClient } from '../../api/client';
import type { ProductDetailDTO } from '../../types/product';
import type { PageResponse } from '../../types/review';
import { Package, Search, ExternalLink, Star } from 'lucide-react';

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<ProductDetailDTO[]>([]);
  const [categoryCode, setCategoryCode] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const loadProducts = async (pageIdx = page) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: pageIdx, size: 10 };
      if (categoryCode) params.categoryCode = categoryCode;
      if (keyword.trim()) params.keyword = keyword.trim();

      const res = await apiClient.get<PageResponse<ProductDetailDTO>>('/products', { params });
      setProducts(res.data.content);
      setTotalPages(res.data.totalPages);
      setTotalElements(res.data.totalElements);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts(page);
  }, [page, categoryCode]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadProducts(0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div>
      <AdminNav />

      {/* Page Header */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-warm-text tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-warm-primary" />
              Quản Lý Kho Dữ Liệu Sản Phẩm
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-warm-secondary border border-warm-text text-warm-secondary-text text-xs font-black">
              {totalElements} sản phẩm
            </span>
          </div>
          <p className="text-xs sm:text-sm text-warm-muted font-medium mt-1">
            Danh sách tất cả sản phẩm được đồng bộ trong PostgreSQL với trường `specs` JSONB đã được đánh chỉ mục GIN.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 shadow-brutal mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên sản phẩm hoặc thương hiệu (Dell, Asus, iPhone...)"
              className="w-full pl-9 pr-4 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
            />
            <Search className="w-4 h-4 text-warm-muted absolute left-3 top-2.5" />
          </div>

          <div className="w-44">
            <select
              value={categoryCode}
              onChange={(e) => {
                setCategoryCode(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
            >
              <option value="">Tất cả ngành hàng</option>
              <option value="laptop">Laptop (laptop)</option>
              <option value="phone">Điện thoại (phone)</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-warm-primary text-warm-primary-text font-black text-xs border border-warm-text shadow-brutal-xs cursor-pointer hover:bg-warm-primary-hover"
          >
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Products Table */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl shadow-brutal overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-warm-bg border-b-2 border-warm-text text-warm-text font-black uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">ID / SKU</th>
                <th className="py-3 px-3">Tên sản phẩm</th>
                <th className="py-3 px-3">Ngành hàng</th>
                <th className="py-3 px-3">Thương hiệu</th>
                <th className="py-3 px-3">Giá bán</th>
                <th className="py-3 px-3">Đánh giá</th>
                <th className="py-3 px-3">Thông số Specs (JSONB)</th>
                <th className="py-3 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-warm-border-subtle font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-warm-muted">
                    Đang tải dữ liệu sản phẩm...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-warm-muted">
                    Không tìm thấy sản phẩm nào phù hợp.
                  </td>
                </tr>
              ) : (
                products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-warm-bg/70 transition-colors">
                    <td className="py-3.5 px-3 font-mono font-bold text-warm-text">
                      #{prod.id}
                      {prod.sku && <div className="text-[10px] text-warm-muted">{prod.sku}</div>}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-extrabold text-warm-text text-xs line-clamp-2">
                        {prod.name}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-warm-pastel-amber border border-warm-text text-warm-secondary-text">
                        {prod.categoryCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-bold">{prod.brand}</td>
                    <td className="py-3.5 px-3 font-mono font-bold text-warm-primary-text whitespace-nowrap">
                      {formatPrice(prod.price)}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-bold text-warm-text">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>{prod.avgRating ? prod.avgRating.toFixed(1) : '5.0'}</span>
                        <span className="text-[10px] text-warm-muted">({prod.reviewCount})</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {prod.specs &&
                          Object.entries(prod.specs).slice(0, 3).map(([k, v]) => (
                            <span
                              key={k}
                              className="px-1.5 py-0.5 bg-warm-bg rounded border border-warm-text/20 text-[10px] font-mono text-warm-muted"
                            >
                              {k}: {String(v)}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <Link
                        to={`/product/${prod.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-warm-bg hover:bg-warm-secondary border border-warm-text text-warm-text font-bold text-[11px] shadow-brutal-xs"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Xem chi tiết</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 bg-warm-bg border-t-2 border-warm-text flex items-center justify-between">
            <span className="text-xs font-bold text-warm-muted">
              Trang {page + 1} / {totalPages} (Tổng {totalElements} sản phẩm)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 rounded-lg border border-warm-text bg-white disabled:opacity-50 text-xs font-bold"
              >
                Trước
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 rounded-lg border border-warm-text bg-white disabled:opacity-50 text-xs font-bold"
              >
                Tiếp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
