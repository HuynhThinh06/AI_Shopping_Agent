import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminNav } from '../../components/admin/AdminNav';
import { getAllReviews } from '../../api/adminApi';
import type { ReviewResponseDTO } from '../../types/review';
import { MessageSquare, Star, CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';

export const AdminReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewResponseDTO[]>([]);
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const loadReviews = async (pageIdx = page) => {
    setLoading(true);
    try {
      const res = await getAllReviews(pageIdx, 15);
      setReviews(res.content);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews(page);
  }, [page]);

  return (
    <div>
      <AdminNav />

      {/* Page Header */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-warm-text tracking-tight flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-warm-primary" />
              Kiểm Duyệt Review & Cơ Chế AI Cache
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-warm-secondary border border-warm-text text-warm-secondary-text text-xs font-black">
              {totalElements} đánh giá
            </span>
          </div>
          <p className="text-xs sm:text-sm text-warm-muted font-medium mt-1">
            Quản trị đánh giá người dùng, bộ lọc rác (7 tiêu chí) và tự động làm mới bộ đệm tóm tắt AI (Gemini Cache) khi có review mới.
          </p>
        </div>
      </div>

      {/* 7 Anti-Spam Criteria Banner */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 shadow-brutal mb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-black text-warm-text uppercase">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Quy trình lọc review rác 7 tiêu chí (ReviewFilterService)</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1 text-[11px] font-medium text-warm-muted">
          <div className="p-2 rounded-lg bg-warm-bg border border-warm-text/20">1. Quá ngắn &lt; 15 ký tự</div>
          <div className="p-2 rounded-lg bg-warm-bg border border-warm-text/20">2. Ký tự lặp vô nghĩa</div>
          <div className="p-2 rounded-lg bg-warm-bg border border-warm-text/20">3. Chứa link / URL ngoài</div>
          <div className="p-2 rounded-lg bg-warm-bg border border-warm-text/20">4. Lộ số điện thoại</div>
          <div className="p-2 rounded-lg bg-warm-bg border border-warm-text/20">5. Toàn bộ là emoji</div>
          <div className="p-2 rounded-lg bg-warm-bg border border-warm-text/20">6. Chứa từ nhạy cảm</div>
          <div className="p-2 rounded-lg bg-warm-bg border border-warm-text/20">7. Nội dung trùng lặp</div>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl shadow-brutal overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-warm-bg border-b-2 border-warm-text text-warm-text font-black uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">ID</th>
                <th className="py-3 px-3">Người đánh giá</th>
                <th className="py-3 px-3">Sản phẩm</th>
                <th className="py-3 px-3">Số sao</th>
                <th className="py-3 px-3">Nội dung đánh giá</th>
                <th className="py-3 px-3">Lọc rác (is_spam)</th>
                <th className="py-3 px-3">Thời gian</th>
                <th className="py-3 px-3 text-right">Xem SP</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-warm-border-subtle font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-warm-muted">
                    Đang tải danh sách đánh giá...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-warm-muted">
                    Chưa có đánh giá nào trong hệ thống.
                  </td>
                </tr>
              ) : (
                reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-warm-bg/70 transition-colors">
                    <td className="py-3.5 px-3 font-mono font-bold text-warm-text">#{r.id}</td>
                    <td className="py-3.5 px-3 font-bold text-warm-text whitespace-nowrap">
                      {r.reviewerName || 'Khách hàng'}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-warm-primary-text">
                      SP #{r.productId}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-bold text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{r.rating}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 max-w-sm">
                      <div className="text-xs text-warm-text line-clamp-2">{r.content}</div>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {r.isSpam ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 font-bold text-[10px]">
                          <AlertTriangle className="w-2.5 h-2.5" /> Review Rác
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px]">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Hợp lệ
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-warm-muted whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <Link
                        to={`/product/${r.productId}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-warm-bg hover:bg-warm-secondary border border-warm-text text-warm-text font-bold text-[11px] shadow-brutal-xs"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Xem AI Tóm tắt</span>
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
              Trang {page + 1} / {totalPages} (Tổng {totalElements} đánh giá)
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

      {/* AI Cache Architecture Note */}
      <div className="p-4 rounded-xl bg-amber-50 border-2 border-warm-text shadow-brutal text-warm-text text-xs space-y-2">
        <div className="font-black flex items-center gap-1.5 uppercase text-amber-900">
          <Sparkles className="w-4 h-4 text-warm-primary" />
          <span>Cơ chế Cache Thông Minh 2 Tầng (`review_summaries` PostgreSQL):</span>
        </div>
        <p className="leading-relaxed font-medium">
          Mỗi sản phẩm lưu một bản ghi tóm tắt trong bảng `review_summaries` kèm cột `cached_review_count`. Khi người dùng mở trang chi tiết sản phẩm, hệ thống so sánh `product.review_count` với `cached_review_count`:
        </p>
        <ul className="list-disc pl-5 space-y-1 font-medium">
          <li><strong>Nếu bằng nhau (Cache Hit):</strong> Trả ngay kết quả từ PostgreSQL (~5ms), tiết kiệm 100% token gọi Gemini LLM.</li>
          <li><strong>Nếu có review mới (Cache Miss / Invalidation):</strong> Tự động gọi Gemini API để tổng hợp lại tóm tắt 3 phần (Ưu điểm, Nhược điểm, Tổng thể) và ghi đè vào bảng cache.</li>
        </ul>
      </div>
    </div>
  );
};
