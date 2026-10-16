import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { ProductDetailDTO } from '../types/product';
import type { SummaryDTO } from '../types/review';
import { getCompareIds, toggleCompareId, clearCompare } from '../utils/storage';
import {
  Scale,
  Trash2,
  Star,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface CompareItem {
  product: ProductDetailDTO;
  summary: SummaryDTO | undefined;
}

export const ComparePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<CompareItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadComparedProducts = async () => {
    setLoading(true);
    try {
      const idsParam = searchParams.get('ids');
      let ids: number[] = [];
      if (idsParam) {
        ids = idsParam.split(',').map((x) => parseInt(x.trim(), 10)).filter(Boolean);
      } else {
        ids = getCompareIds();
      }

      if (ids.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const pRes = await apiClient.get<ProductDetailDTO>(`/products/${id}`);
            let sData: SummaryDTO | undefined;
            try {
              const sRes = await apiClient.get<SummaryDTO>(`/products/${id}/summary`);
              sData = sRes.data;
            } catch {
              // Ignore summary failure
            }
            return { product: pRes.data, summary: sData };
          } catch {
            return null;
          }
        })
      );

      setItems(results.filter((x): x is CompareItem => x !== null));
    } catch (err) {
      console.error('Failed to load compare items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComparedProducts();
  }, [searchParams]);

  const handleRemove = (id: number) => {
    toggleCompareId(id);
    const remaining = items.filter((x) => x.product.id !== id);
    setItems(remaining);
    setSearchParams({ ids: remaining.map((x) => x.product.id).join(',') });
  };

  const handleClear = () => {
    clearCompare();
    setItems([]);
    setSearchParams({});
  };

  const handleAddSample = (ids: number[]) => {
    ids.forEach((id) => toggleCompareId(id));
    setSearchParams({ ids: ids.join(',') });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Collect all unique spec keys across the products
  const allSpecKeys = Array.from(
    new Set(items.flatMap((item) => Object.keys(item.product.specs || {})))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-warm-secondary border border-warm-text text-warm-secondary-text text-xs font-black uppercase">
              So sánh đa chiều
            </span>
            <span className="text-xs text-warm-muted font-bold font-mono">
              {items.length} / 3 sản phẩm
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-warm-text tracking-tight mt-1 flex items-center gap-2">
            <Scale className="w-7 h-7 text-warm-primary" />
            Ma Trận So Sánh Sản Phẩm & Tóm Tắt AI
          </h1>
          <p className="text-xs sm:text-sm text-warm-muted font-medium mt-1">
            Đặt cạnh nhau các thông số phần cứng, mức giá và những điểm khen/chê từ đánh giá người dùng thực tế.
          </p>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="px-3.5 py-2 rounded-xl bg-warm-bg hover:bg-rose-100 text-rose-700 font-black text-xs border border-warm-text shadow-brutal-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa danh sách so sánh</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-warm-muted bg-warm-surface border-2 border-warm-text rounded-2xl shadow-brutal font-bold">
          Đang tải dữ liệu so sánh...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-8 sm:p-12 shadow-brutal text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-warm-secondary border-2 border-warm-text mx-auto flex items-center justify-center text-3xl shadow-brutal-xs">
            ⚖️
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-lg font-black text-warm-text">Chưa có sản phẩm nào trong bảng so sánh</h2>
            <p className="text-xs text-warm-muted mt-1 leading-relaxed">
              Bạn có thể bấm vào biểu tượng cán cân (⚖️) trên bất kỳ thẻ sản phẩm nào ở trang Tìm kiếm hoặc Danh mục để đưa vào đây đối chiếu.
            </p>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleAddSample([1, 2])}
              className="px-4 py-2 rounded-xl bg-warm-primary text-warm-primary-text font-black text-xs border-2 border-warm-text shadow-brutal-xs hover:bg-warm-primary-hover cursor-pointer"
            >
              Thử so sánh mẫu: Asus Vivobook vs ThinkPad E16
            </button>
            <Link
              to="/category?type=laptop"
              className="px-4 py-2 rounded-xl bg-warm-bg text-warm-text font-bold text-xs border border-warm-text shadow-brutal-xs hover:bg-warm-secondary"
            >
              Duyệt danh mục sản phẩm
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-warm-surface border-2 border-warm-text rounded-2xl shadow-brutal overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-warm-bg border-b-2 border-warm-text">
                  <th className="p-4 w-44 font-black uppercase text-[11px] text-warm-muted">
                    Tiêu chí đối chiếu
                  </th>
                  {items.map((item) => (
                    <th key={item.product.id} className="p-4 min-w-[260px] align-top">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-warm-secondary border border-warm-text text-[10px] font-black uppercase text-warm-secondary-text">
                            {item.product.brand}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemove(item.product.id)}
                            className="p-1 rounded hover:bg-warm-bg text-rose-600 font-bold text-xs"
                            title="Xóa sản phẩm này"
                          >
                            ✕
                          </button>
                        </div>

                        <Link
                          to={`/product/${item.product.id}`}
                          className="font-extrabold text-sm text-warm-text hover:text-warm-primary block line-clamp-2"
                        >
                          {item.product.name}
                        </Link>

                        <div className="text-base font-black font-mono text-warm-primary-text">
                          {formatPrice(item.product.price)}
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
                          className="inline-flex items-center gap-1 text-[11px] font-black text-warm-primary-text hover:underline"
                        >
                          <span>Xem chi tiết</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y-2 divide-warm-border-subtle font-medium">
                {/* AI Review Summary Pros */}
                <tr className="bg-emerald-50/50">
                  <td className="p-4 font-black text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Ưu điểm AI tóm tắt</span>
                  </td>
                  {items.map((item) => (
                    <td key={item.product.id} className="p-4 align-top text-xs text-warm-text leading-relaxed">
                      {item.summary?.pros ? (
                        <div className="whitespace-pre-line text-emerald-950 font-semibold">
                          {item.summary.pros}
                        </div>
                      ) : (
                        <span className="text-warm-muted italic">Đang tổng hợp đánh giá...</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* AI Review Summary Cons */}
                <tr className="bg-rose-50/50">
                  <td className="p-4 font-black text-rose-900 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-700" />
                    <span>Nhược điểm AI tóm tắt</span>
                  </td>
                  {items.map((item) => (
                    <td key={item.product.id} className="p-4 align-top text-xs text-warm-text leading-relaxed">
                      {item.summary?.cons ? (
                        <div className="whitespace-pre-line text-rose-950 font-semibold">
                          {item.summary.cons}
                        </div>
                      ) : (
                        <span className="text-warm-muted italic">Chưa ghi nhận nhược điểm nổi bật.</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Specs Rows */}
                {allSpecKeys.map((key) => (
                  <tr key={key} className="hover:bg-warm-bg/60 transition-colors">
                    <td className="p-4 font-mono font-bold text-xs text-warm-muted uppercase">
                      {key}
                    </td>
                    {items.map((item) => {
                      const val = item.product.specs?.[key];
                      return (
                        <td key={item.product.id} className="p-4 font-bold text-warm-text text-xs">
                          {val !== undefined ? String(val) : <span className="text-warm-muted">-</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
