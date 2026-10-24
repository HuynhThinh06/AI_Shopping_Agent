import React, { useState, useEffect } from 'react';
import { AdminNav } from '../../components/admin/AdminNav';
import { getAuditLogs } from '../../api/adminApi';
import type { AuditLogDTO } from '../../types/admin';
import {
  ScrollText,
  Search,
  Filter,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  RefreshCw,
  Globe,
  Calendar,
} from 'lucide-react';

const ENTITY_OPTIONS = [
  { value: 'ALL', label: 'Tất cả đối tượng' },
  { value: 'PRODUCT', label: 'Sản phẩm (PRODUCT)' },
  { value: 'CATEGORY', label: 'Ngành hàng (CATEGORY)' },
  { value: 'WEIGHT', label: 'Trọng số (WEIGHT)' },
  { value: 'REVIEW', label: 'Đánh giá (REVIEW)' },
  { value: 'USER', label: 'Người dùng (USER)' },
];

const ACTION_OPTIONS = [
  { value: 'ALL', label: 'Tất cả hành động' },
  { value: 'PRODUCT_CREATE', label: 'Thêm sản phẩm' },
  { value: 'PRODUCT_UPDATE', label: 'Cập nhật sản phẩm' },
  { value: 'PRODUCT_DELETE', label: 'Xóa mềm sản phẩm' },
  { value: 'PRODUCT_IMPORT_EXCEL', label: 'Nhập sản phẩm Excel' },
  { value: 'PRODUCT_BULK_ACTIVATE', label: 'Kích hoạt sản phẩm hàng loạt' },
  { value: 'PRODUCT_BULK_DEACTIVATE', label: 'Ngừng bán sản phẩm hàng loạt' },
  { value: 'CATEGORY_CREATE', label: 'Tạo ngành hàng' },
  { value: 'CATEGORY_UPDATE', label: 'Cập nhật ngành hàng' },
  { value: 'CATEGORY_DELETE', label: 'Vô hiệu hóa ngành hàng' },
  { value: 'CATEGORY_ATTRIBUTE_ADD', label: 'Thêm/sửa thuộc tính GIN' },
  { value: 'CATEGORY_ATTRIBUTE_DELETE', label: 'Xóa thuộc tính GIN' },
  { value: 'WEIGHT_UPDATE', label: 'Cập nhật trọng số xếp hạng' },
  { value: 'REVIEW_APPROVE', label: 'Phê duyệt review' },
  { value: 'REVIEW_SPAM', label: 'Đánh dấu spam review' },
  { value: 'REVIEW_DELETE', label: 'Xóa mềm review' },
  { value: 'REVIEW_BULK_APPROVE', label: 'Duyệt review hàng loạt' },
  { value: 'REVIEW_BULK_SPAM', label: 'Báo spam review hàng loạt' },
  { value: 'REVIEW_BULK_DELETE', label: 'Xóa review hàng loạt' },
  { value: 'USER_ROLE_CHANGE', label: 'Đổi vai trò người dùng' },
  { value: 'USER_LOCK', label: 'Khóa tài khoản' },
  { value: 'USER_UNLOCK', label: 'Mở khóa tài khoản' },
  { value: 'USER_DELETE', label: 'Vô hiệu hóa tài khoản' },
];

function getActionBadgeStyle(action: string): string {
  if (action.includes('DELETE') || action.includes('DEACTIVATE') || action.includes('LOCK') || action.includes('SPAM')) {
    return 'bg-rose-100 text-rose-800 border-rose-300';
  }
  if (action.includes('CREATE') || action.includes('APPROVE') || action.includes('ACTIVATE') || action.includes('UNLOCK')) {
    return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  }
  if (action.includes('BULK') || action.includes('IMPORT')) {
    return 'bg-indigo-100 text-indigo-800 border-indigo-300';
  }
  return 'bg-amber-100 text-amber-900 border-amber-300';
}

function getEntityBadgeStyle(entityType: string): string {
  switch (entityType) {
    case 'PRODUCT':
      return 'bg-warm-pastel-amber text-warm-secondary-text border-warm-text';
    case 'REVIEW':
      return 'bg-sky-100 text-sky-900 border-sky-300';
    case 'USER':
      return 'bg-purple-100 text-purple-900 border-purple-300';
    case 'WEIGHT':
      return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    case 'CATEGORY':
      return 'bg-orange-100 text-orange-900 border-orange-300';
    default:
      return 'bg-warm-bg text-warm-text border-warm-text/30';
  }
}

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogDTO[]>([]);
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Filters
  const [entityType, setEntityType] = useState<string>('ALL');
  const [action, setAction] = useState<string>('ALL');
  const [admin, setAdmin] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');

  const fetchLogs = async (pageIdx = page) => {
    setLoading(true);
    try {
      const res = await getAuditLogs({
        page: pageIdx,
        size: 20,
        entityType,
        action,
        admin,
        from: fromDate || undefined,
        to: toDate || undefined,
        keyword,
      });
      setLogs(res.content || []);
      setTotalPages(Math.max(1, res.totalPages || 1));
      setTotalElements(res.totalElements || 0);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page, entityType, action]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchLogs(0);
  };

  const handleResetFilters = () => {
    setEntityType('ALL');
    setAction('ALL');
    setAdmin('');
    setFromDate('');
    setToDate('');
    setKeyword('');
    setPage(0);
    setTimeout(() => fetchLogs(0), 0);
  };

  return (
    <div>
      <AdminNav />

      {/* Header */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-warm-text tracking-tight flex items-center gap-2">
              <ScrollText className="w-6 h-6 text-warm-primary" />
              Nhật Ký Thao Tác Quản Trị Viên (Audit Log)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-warm-secondary border border-warm-text text-warm-secondary-text text-xs font-black">
              {totalElements} bản ghi
            </span>
          </div>
          <p className="text-xs sm:text-sm text-warm-muted font-medium mt-1">
            Truy vết mọi thao tác thay đổi dữ liệu của Admin (Sản phẩm, Ngành hàng, Trọng số, Kiểm duyệt Review, Người dùng).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-400 text-emerald-800 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Tự động dọn log &gt; 180 ngày (03:00 mỗi ngày)</span>
          </span>
          <button
            type="button"
            onClick={() => fetchLogs(page)}
            className="px-3.5 py-2 rounded-xl bg-warm-bg hover:bg-warm-secondary border-2 border-warm-text font-black text-xs flex items-center gap-1.5 shadow-brutal-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 shadow-brutal mb-6">
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm trong mô tả thao tác, ID đối tượng..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
            />
            <Search className="w-4 h-4 text-warm-muted absolute left-3 top-2.5" />
          </div>

          <div>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
            >
              {ENTITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <input
              type="text"
              value={admin}
              onChange={(e) => setAdmin(e.target.value)}
              placeholder="Tài khoản Admin..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
            />
            <User className="w-3.5 h-3.5 text-warm-muted absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 px-3 py-2 rounded-xl bg-warm-primary hover:bg-warm-primary-hover text-warm-primary-text font-black text-xs border-2 border-warm-text shadow-brutal-xs cursor-pointer flex items-center justify-center gap-1"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Lọc</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 rounded-xl bg-warm-bg hover:bg-warm-secondary text-warm-text font-bold text-xs border border-warm-text cursor-pointer"
            >
              Xóa lọc
            </button>
          </div>

          {/* Date Range Row */}
          <div className="sm:col-span-2 lg:col-span-6 flex flex-wrap items-center gap-3 pt-2 border-t border-warm-border-subtle text-xs">
            <span className="font-bold text-warm-muted flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Khoảng ngày:</span>
            </span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-warm-text bg-warm-bg font-mono text-xs font-bold"
            />
            <span className="text-warm-muted font-bold">đến</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-warm-text bg-warm-bg font-mono text-xs font-bold"
            />
          </div>
        </form>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl shadow-brutal overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-warm-bg border-b-2 border-warm-text text-warm-text font-black uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">ID / Thời gian</th>
                <th className="py-3 px-3">Quản trị viên</th>
                <th className="py-3 px-3">Đối tượng</th>
                <th className="py-3 px-3">Hành động</th>
                <th className="py-3 px-3">Mô tả thao tác</th>
                <th className="py-3 px-3 text-right">Chi tiết JSON</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-warm-border-subtle font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-warm-muted">
                    Đang tải nhật ký thao tác quản trị...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-warm-muted">
                    Chưa có bản ghi nhật ký thao tác nào khớp với bộ lọc.
                  </td>
                </tr>
              ) : (
                logs.map((item) => {
                  const isExpanded = expandedId === item.id;
                  const hasDetails = item.details && Object.keys(item.details).length > 0;

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        className="hover:bg-warm-bg/70 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      >
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="font-mono font-bold text-warm-text">#{item.id}</div>
                          <div className="text-[11px] font-mono text-warm-muted flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>
                              {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '—'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="font-black text-warm-text flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-warm-primary" />
                            <span>@{item.adminUsername}</span>
                          </div>
                          {item.ipAddress && (
                            <div className="text-[10px] font-mono text-warm-muted flex items-center gap-1 mt-0.5">
                              <Globe className="w-2.5 h-2.5" />
                              <span>{item.ipAddress}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${getEntityBadgeStyle(
                              item.entityType
                            )}`}
                          >
                            {item.entityType}
                            {item.entityId ? ` #${item.entityId}` : ''}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-black border ${getActionBadgeStyle(
                              item.action
                            )}`}
                          >
                            {item.action}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 max-w-md">
                          <div className="font-bold text-warm-text">{item.summary}</div>
                        </td>

                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          {hasDetails ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-warm-bg hover:bg-warm-secondary border border-warm-text text-warm-text font-bold text-[11px] cursor-pointer"
                            >
                              <span>{isExpanded ? 'Thu gọn' : 'Before / After'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            <span className="text-warm-muted text-[11px]">—</span>
                          )}
                        </td>
                      </tr>

                      {isExpanded && hasDetails && (
                        <tr className="bg-warm-bg/90">
                          <td colSpan={6} className="p-4 border-t border-warm-border-subtle">
                            <div className="text-[11px] font-black text-warm-muted uppercase mb-1.5">
                              Chi tiết thay đổi (`details` JSONB):
                            </div>
                            <pre className="p-3 rounded-xl bg-warm-surface border-2 border-warm-text font-mono text-[11px] text-warm-text overflow-x-auto max-h-64">
                              {JSON.stringify(item.details, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
              Trang {page + 1} / {totalPages} (Tổng {totalElements} bản ghi)
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
    </div>
  );
};
