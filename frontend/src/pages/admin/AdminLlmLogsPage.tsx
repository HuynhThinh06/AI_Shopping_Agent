import React, { useState, useEffect } from 'react';
import { AdminNav } from '../../components/admin/AdminNav';
import { getLlmLogs, getSystemStats } from '../../api/adminApi';
import type { LlmLogItem, SystemStatsDTO } from '../../types/admin';
import { Activity, RefreshCw, Eye, CheckCircle2, AlertTriangle, XCircle, DollarSign, Clock, Cpu } from 'lucide-react';

export const AdminLlmLogsPage: React.FC = () => {
  const [stats, setStats] = useState<SystemStatsDTO | null>(null);
  const [logs, setLogs] = useState<LlmLogItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<LlmLogItem | null>(null);

  const loadData = async (pageIdx = page) => {
    setLoading(true);
    try {
      const [statsData, logsData] = await Promise.all([
        getSystemStats(),
        getLlmLogs(pageIdx, 15)
      ]);
      setStats(statsData);
      setLogs(logsData.content);
      setTotalPages(logsData.totalPages);
    } catch (err) {
      console.error('Failed to load LLM logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(page);
  }, [page]);

  const filteredLogs = logs.filter((l) => {
    if (filterType === 'ALL') return true;
    return l.requestType.toLowerCase().includes(filterType.toLowerCase());
  });

  return (
    <div>
      <AdminNav />

      {/* Page Header */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-warm-text tracking-tight flex items-center gap-2">
              <Activity className="w-6 h-6 text-warm-primary" />
              Giám Sát Nhật Ký LLM & Chi Phí Token
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-warm-secondary border border-warm-text text-warm-secondary-text text-xs font-black">
              Bảng `llm_request_logs`
            </span>
          </div>
          <p className="text-xs sm:text-sm text-warm-muted font-medium mt-1">
            Theo dõi chi tiết các cuộc gọi Google Gemini 1.5 Flash / Flash Lite (Độ trễ, Token tiêu thụ, Prompt trích xuất và JSON phản hồi).
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadData(page)}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-warm-surface hover:bg-warm-bg text-warm-text font-bold text-xs border-2 border-warm-text shadow-brutal-xs flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới Logs</span>
        </button>
      </div>

      {/* 4 Token & Cost KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 shadow-brutal">
          <div className="text-xs font-bold text-warm-muted uppercase flex items-center justify-between">
            <span>Tổng lượt gọi LLM</span>
            <Cpu className="w-4 h-4 text-warm-muted" />
          </div>
          <div className="text-2xl font-black font-mono text-warm-text mt-1">
            {stats ? stats.totalLlmCalls.toLocaleString() : '0'} reqs
          </div>
          <div className="text-[11px] font-bold text-emerald-700 mt-1">
            {stats && stats.totalLlmCalls > 0
              ? `${((stats.successLlmCalls / stats.totalLlmCalls) * 100).toFixed(1)}% thành công`
              : '100% thành công'}
          </div>
        </div>

        <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 shadow-brutal">
          <div className="text-xs font-bold text-warm-muted uppercase flex items-center justify-between">
            <span>Tổng Token Tiêu Thụ</span>
            <Activity className="w-4 h-4 text-warm-muted" />
          </div>
          <div className="text-2xl font-black font-mono text-warm-text mt-1">
            {stats ? stats.totalTokensUsed.toLocaleString() : '0'} tokens
          </div>
          <div className="text-[11px] font-bold text-warm-muted mt-1">
            Usage metadata từ Gemini API
          </div>
        </div>

        <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 shadow-brutal">
          <div className="text-xs font-bold text-warm-muted uppercase flex items-center justify-between">
            <span>Chi Phí Ước Tính</span>
            <DollarSign className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-800 mt-1">
            ${stats ? stats.estimatedCostUsd.toFixed(4) : '0.0000'}
          </div>
          <div className="text-[11px] font-bold text-warm-muted mt-1">
            Tiết kiệm nhờ Gemini Flash Lite
          </div>
        </div>

        <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 shadow-brutal">
          <div className="text-xs font-bold text-warm-muted uppercase flex items-center justify-between">
            <span>Độ trễ trung bình</span>
            <Clock className="w-4 h-4 text-warm-primary" />
          </div>
          <div className="text-2xl font-black font-mono text-warm-primary mt-1">
            {stats ? stats.avgLatencyMs.toFixed(0) : '0'} ms
          </div>
          <div className="text-[11px] font-bold text-warm-muted mt-1">
            Gồm trích xuất & tóm tắt review
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 shadow-brutal mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-warm-muted">Loại Request:</span>
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'extract', label: 'extract_query' },
            { id: 'summarize', label: 'summarize_review' },
            { id: 'rerank', label: 'RERANK' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterType(item.id)}
              className={`px-3 py-1 rounded-xl text-xs font-black border border-warm-text transition-all ${
                filterType === item.id
                  ? 'bg-warm-primary text-warm-primary-text shadow-brutal-xs'
                  : 'bg-white hover:bg-warm-secondary text-warm-text'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl shadow-brutal overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-warm-bg border-b-2 border-warm-text text-warm-text font-black uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">Log ID</th>
                <th className="py-3 px-3">Thời gian</th>
                <th className="py-3 px-3">Loại Request</th>
                <th className="py-3 px-3">Trạng thái</th>
                <th className="py-3 px-3">Latency</th>
                <th className="py-3 px-3">Tokens</th>
                <th className="py-3 px-3">Prompt tóm tắt</th>
                <th className="py-3 px-3 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-warm-border-subtle font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-warm-muted">
                    Chưa có bản ghi log nào hoặc không khớp bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-warm-bg/70 transition-colors">
                    <td className="py-3.5 px-3 font-mono font-bold text-warm-text">#{log.id}</td>
                    <td className="py-3.5 px-3 font-mono text-warm-muted whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString('vi-VN')}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-warm-pastel-amber border border-warm-text text-warm-secondary-text">
                        {log.requestType}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      {log.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px]">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Thành công
                        </span>
                      ) : log.status === 'retried' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px]">
                          <AlertTriangle className="w-2.5 h-2.5" /> Retry ({log.retryCount})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 font-bold text-[10px]">
                          <XCircle className="w-2.5 h-2.5" /> Thất bại
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-emerald-700 whitespace-nowrap">
                      {log.latencyMs != null ? `${log.latencyMs} ms` : '-'}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-warm-muted whitespace-nowrap">
                      {log.tokensUsed != null ? log.tokensUsed.toLocaleString() : '-'}
                    </td>
                    <td className="py-3.5 px-3 max-w-xs truncate text-warm-muted">
                      {log.promptExcerpt || '-'}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 rounded-lg bg-warm-bg hover:bg-warm-secondary border border-warm-text text-warm-text font-bold text-[11px] shadow-brutal-xs flex items-center gap-1 ml-auto cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Xem Payload</span>
                      </button>
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
              Trang {page + 1} / {totalPages}
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

      {/* Payload Modal / Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-warm-text/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-6 shadow-brutal max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-warm-border-subtle">
              <div>
                <h3 className="text-sm font-black text-warm-text uppercase tracking-wider flex items-center gap-2">
                  <span>📄</span> Chi tiết Payload LLM Log #{selectedLog.id}
                </h3>
                <span className="text-[11px] text-warm-muted font-mono">
                  {selectedLog.requestType} • {selectedLog.latencyMs}ms • {selectedLog.tokensUsed} tokens
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-lg border-2 border-warm-text bg-warm-bg hover:bg-warm-secondary flex items-center justify-center font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <div className="text-xs font-black text-warm-text uppercase mb-1">Prompt gửi đến Gemini:</div>
              <pre className="text-xs font-mono bg-warm-bg p-3 rounded-xl border-2 border-warm-text overflow-x-auto whitespace-pre-wrap max-h-48">
                {selectedLog.promptExcerpt}
              </pre>
            </div>

            <div>
              <div className="text-xs font-black text-warm-text uppercase mb-1">JSON Phản Hồi:</div>
              <pre className="text-xs font-mono bg-warm-bg p-3 rounded-xl border-2 border-warm-text overflow-x-auto whitespace-pre-wrap max-h-48 text-emerald-800 font-semibold">
                {selectedLog.responseExcerpt}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-warm-primary text-warm-primary-text font-black text-xs border border-warm-text shadow-brutal-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
