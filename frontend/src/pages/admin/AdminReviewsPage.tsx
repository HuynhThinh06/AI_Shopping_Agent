import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AdminNav } from '../../components/admin/AdminNav';
import { BulkActionBar, useBulkSelection } from '../../components/admin/BulkActionBar';
import {
  getAllReviews,
  toggleReviewSpam,
  approveReview,
  deleteReview,
  triggerReSummarize,
  bulkModerateReviews,
} from '../../api/adminApi';
import type { AdminReviewDTO } from '../../types/admin';
import {
  MessageSquare,
  Star,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Trash2,
  RefreshCw,
  ShieldAlert,
  Check,
  EyeOff,
} from 'lucide-react';

export const AdminReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<AdminReviewDTO[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);
  const [summarizingProductId, setSummarizingProductId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const currentPageIds = useMemo(() => reviews.map((r) => r.id), [reviews]);
  const {
    selectedIds,
    selectedArray,
    selectedCount,
    isAllPageSelected,
    toggleOne,
    toggleAllCurrentPage,
    clearSelection,
  } = useBulkSelection(currentPageIds, [page, filter]);

  const loadReviews = async (pageIdx = page, currentFilter = filter) => {
    setLoading(true);
    try {
      const res = await getAllReviews(pageIdx, 15, currentFilter);
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
    loadReviews(page, filter);
  }, [page, filter]);

  const showNotice = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleToggleSpam = async (r: AdminReviewDTO) => {
    setActionLoadingId(r.id);
    try {
      const updated = await toggleReviewSpam(r.id);
      showNotice(
        updated.isSpam
          ? `Đã đánh dấu Review #${r.id} là RÁC (Spam) và ẩn khỏi trang sản phẩm!`
          : `Đã gỡ cờ Spam và khôi phục hiển thị cho Review #${r.id}!`
      );
      loadReviews(page, filter);
    } catch (err) {
      console.error('Failed to toggle spam:', err);
      alert('Không thể đổi trạng thái Spam. Vui lòng thử lại!');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApprove = async (r: AdminReviewDTO) => {
    setActionLoadingId(r.id);
    try {
      await approveReview(r.id);
      showNotice(`Đã phê duyệt và hiển thị hợp lệ Review #${r.id}!`);
      loadReviews(page, filter);
    } catch (err) {
      console.error('Failed to approve review:', err);
      alert('Không thể phê duyệt đánh giá!');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (r: AdminReviewDTO) => {
    if (!window.confirm(`Xác nhận ẩn/xóa đánh giá #${r.id} của "${r.reviewerName}"?`)) return;
    setActionLoadingId(r.id);
    try {
      await deleteReview(r.id);
      showNotice(`Đã ẩn đánh giá #${r.id} khỏi hệ thống và cập nhật lại điểm trung bình sản phẩm!`);
      loadReviews(page, filter);
    } catch (err) {
      console.error('Failed to delete review:', err);
      alert('Không thể xóa đánh giá!');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReSummarize = async (productId: number, productName?: string) => {
    setSummarizingProductId(productId);
    try {
      await triggerReSummarize(productId);
      showNotice(
        `Đã gọi Gemini AI tổng hợp lại bản tóm tắt mới cho sản phẩm "${productName || '#' + productId}"!`
      );
    } catch (err) {
      console.error('Failed to re-summarize:', err);
      alert('Không thể gọi AI tóm tắt lại lúc này. Vui lòng thử lại!');
    } finally {
      setSummarizingProductId(null);
    }
  };

  const handleBulkReviewAction = async (actionId: string) => {
    if (selectedArray.length === 0) return;
    setBulkLoading(true);
    try {
      const act = actionId as 'approve' | 'spam' | 'delete';
      const res = await bulkModerateReviews(selectedArray, act);
      const labelMap = {
        approve: 'phê duyệt hợp lệ',
        spam: 'đánh dấu Spam',
        delete: 'xóa mềm (ẩn)',
      };
      showNotice(
        `Đã ${labelMap[act]} hàng loạt ${res.processed}/${res.requested} đánh giá và cập nhật lại điểm trung bình sản phẩm!`
      );
      clearSelection();
      loadReviews(page, filter);
    } catch (err: any) {
      console.error('Bulk review action failed:', err);
      alert(err?.response?.data?.message || 'Không thể thực hiện thao tác hàng loạt!');
    } finally {
      setBulkLoading(false);
    }
  };

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
            Quản trị đánh giá người dùng, đánh dấu Spam / Khôi phục, xóa đánh giá vi phạm và kích hoạt Gemini AI tóm tắt lại tức thì.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'Tất cả đánh giá' },
            { id: 'spam', label: 'Review Rác (Spam)' },
            { id: 'pending', label: 'Đã ẩn / Vô hiệu hóa' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setFilter(tab.id);
                setPage(0);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black border-2 border-warm-text transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-warm-primary text-warm-primary-text shadow-brutal-xs -translate-y-0.5'
                  : 'bg-warm-bg hover:bg-warm-secondary text-warm-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-500 text-emerald-800 font-bold text-xs flex items-center gap-2 shadow-brutal-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 7 Anti-Spam Criteria Banner */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 shadow-brutal mb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-black text-warm-text uppercase">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Quy trình lọc review rác 7 tiêu chí tự động (ReviewFilterService)</span>
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

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedCount}
        entityLabel="đánh giá"
        loading={bulkLoading}
        onExecute={handleBulkReviewAction}
        onClear={clearSelection}
        actions={[
          {
            id: 'approve',
            label: 'Duyệt hợp lệ',
            variant: 'emerald',
            icon: <Check className="w-3.5 h-3.5" />,
            confirmTitle: 'Xác nhận phê duyệt đánh giá hàng loạt',
            confirmMessage: (count) =>
              `Bạn có chắc chắn muốn phê duyệt và hiển thị hợp lệ ${count} đánh giá đã chọn? Điểm trung bình của các sản phẩm liên quan sẽ được tính lại tự động.`,
          },
          {
            id: 'spam',
            label: 'Đánh dấu Spam',
            variant: 'amber',
            icon: <ShieldAlert className="w-3.5 h-3.5" />,
            confirmTitle: 'Xác nhận đánh dấu Spam hàng loạt',
            confirmMessage: (count) =>
              `Bạn có chắc chắn muốn gắn cờ Spam và ẩn ${count} đánh giá đã chọn khỏi trang sản phẩm?`,
          },
          {
            id: 'delete',
            label: 'Xóa mềm (Ẩn)',
            variant: 'rose',
            icon: <Trash2 className="w-3.5 h-3.5" />,
            confirmTitle: 'Xác nhận xóa mềm đánh giá hàng loạt',
            confirmMessage: (count) =>
              `Bạn có chắc chắn muốn ẩn (xóa mềm) ${count} đánh giá đã chọn khỏi hệ thống?`,
          },
        ]}
      />

      {/* Reviews Table */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl shadow-brutal overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-warm-bg border-b-2 border-warm-text text-warm-text font-black uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3 w-10">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={toggleAllCurrentPage}
                    className="w-4 h-4 accent-warm-primary rounded cursor-pointer"
                    title="Chọn tất cả trong trang hiện tại"
                  />
                </th>
                <th className="py-3 px-3">ID</th>
                <th className="py-3 px-3">Người đánh giá</th>
                <th className="py-3 px-3">Sản phẩm</th>
                <th className="py-3 px-3">Số sao</th>
                <th className="py-3 px-3">Nội dung đánh giá</th>
                <th className="py-3 px-3">Trạng thái</th>
                <th className="py-3 px-3">Thời gian</th>
                <th className="py-3 px-3 text-right">Thao tác kiểm duyệt</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-warm-border-subtle font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-warm-muted">
                    Đang tải danh sách đánh giá...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-warm-muted">
                    Không có đánh giá nào khớp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                reviews.map((r) => {
                  const isBusy = actionLoadingId === r.id;
                  const isSummarizing = summarizingProductId === r.productId;
                  const isSelected = selectedIds.has(r.id);

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-warm-bg/70 transition-colors ${
                        isSelected ? 'bg-warm-pastel-amber/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(r.id)}
                          className="w-4 h-4 accent-warm-primary rounded cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-warm-text">#{r.id}</td>
                      <td className="py-3.5 px-3 font-bold text-warm-text whitespace-nowrap">
                        {r.reviewerName || 'Khách hàng'}
                      </td>
                      <td className="py-3.5 px-3 max-w-[200px]">
                        <Link
                          to={`/product/${r.productId}`}
                          target="_blank"
                          className="group block"
                          title="Mở trang chi tiết sản phẩm"
                        >
                          <div className="font-mono text-[10px] font-bold text-warm-primary-text flex items-center gap-1">
                            <span>SP #{r.productId}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70 group-hover:opacity-100" />
                          </div>
                          <div className="font-extrabold text-warm-text text-xs line-clamp-1 group-hover:text-warm-primary transition-colors">
                            {r.productName || `Sản phẩm #${r.productId}`}
                          </div>
                        </Link>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 font-bold text-amber-600">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{r.rating}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 max-w-sm">
                        <div className="text-xs text-warm-text line-clamp-2" title={r.content}>
                          {r.content}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {r.isSpam ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 font-bold text-[10px] w-max">
                              <AlertTriangle className="w-2.5 h-2.5" /> Review Rác
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] w-max">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Hợp lệ
                            </span>
                          )}
                          {r.isActive === false && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-warm-bg text-warm-muted border border-warm-text/20 font-bold text-[10px] w-max">
                              <EyeOff className="w-2.5 h-2.5" /> Đã ẩn
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-warm-muted whitespace-nowrap">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Toggle Spam */}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleSpam(r)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border font-bold text-[11px] cursor-pointer disabled:opacity-50 ${
                              r.isSpam
                                ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                                : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800'
                            }`}
                            title={r.isSpam ? 'Gỡ đánh dấu Spam' : 'Đánh dấu là Review Rác (Spam)'}
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>{r.isSpam ? 'Bỏ Spam' : 'Báo Spam'}</span>
                          </button>

                          {/* Approve if inactive or spam */}
                          {(r.isSpam || r.isActive === false) && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleApprove(r)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-800 font-bold text-[11px] cursor-pointer disabled:opacity-50"
                              title="Phê duyệt và khôi phục hiển thị đánh giá này"
                            >
                              <Check className="w-3 h-3" />
                              <span>Duyệt</span>
                            </button>
                          )}

                          {/* Trigger AI Re-summarize for this product */}
                          {r.productId && (
                            <button
                              type="button"
                              disabled={isSummarizing}
                              onClick={() => handleReSummarize(r.productId, r.productName)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-warm-bg hover:bg-warm-secondary border border-warm-text text-warm-text font-bold text-[11px] shadow-brutal-xs cursor-pointer disabled:opacity-50"
                              title="Yêu cầu Gemini AI tóm tắt lại đánh giá của sản phẩm này"
                            >
                              <RefreshCw className={`w-3 h-3 text-warm-primary ${isSummarizing ? 'animate-spin' : ''}`} />
                              <span>{isSummarizing ? 'Đang tóm tắt...' : 'Tóm tắt lại AI'}</span>
                            </button>
                          )}

                          {/* Delete / Hide Review */}
                          {r.isActive !== false && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDelete(r)}
                              className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-600 cursor-pointer disabled:opacity-50"
                              title="Ẩn / Xóa đánh giá vi phạm"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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
                className="px-3 py-1 rounded-lg border border-warm-text bg-white disabled:opacity-50 text-xs font-bold cursor-pointer"
              >
                Trước
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 rounded-lg border border-warm-text bg-white disabled:opacity-50 text-xs font-bold cursor-pointer"
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
          Mỗi sản phẩm lưu một bản ghi tóm tắt trong bảng `review_summaries` kèm mã băm `review_hash` của tập đánh giá hợp lệ. Khi người dùng mở trang chi tiết sản phẩm hoặc khi Admin kiểm duyệt đánh giá:
        </p>
        <ul className="list-disc pl-5 space-y-1 font-medium">
          <li><strong>Nếu tập đánh giá không đổi (Cache Hit):</strong> Trả ngay kết quả từ PostgreSQL (~5ms), tiết kiệm 100% token gọi Gemini LLM.</li>
          <li><strong>Khi có review mới hoặc Admin Báo Spam / Xóa / Bấm &quot;Tóm tắt lại AI&quot;:</strong> Tự động vô hiệu hóa cache cũ và gọi Gemini API để tổng hợp lại tóm tắt 3 phần (Ưu điểm, Nhược điểm, Tổng thể).</li>
        </ul>
      </div>
    </div>
  );
};
