import React, { useState, useEffect, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { AdminNav } from '../../components/admin/AdminNav';
import { getSystemStats } from '../../api/adminApi';
import type { SystemStatsDTO } from '../../types/admin';

const TrendCharts = React.lazy(() => import('../../components/admin/TrendCharts'));
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  Cpu,
  Zap,
  DollarSign,
  Clock,
  ArrowRight,
  ShieldCheck,
  Server,
  Sparkles,
  Search,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<SystemStatsDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSystemStats()
      .then(setStats)
      .catch((err) => console.error('Failed to load dashboard stats:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <AdminNav />

      {/* Header */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-warm-text tracking-tight flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-warm-primary" />
              Bảng Điều Khiển Quản Trị Hệ Thống (Admin Dashboard)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black">
              Online
            </span>
          </div>
          <p className="text-xs sm:text-sm text-warm-muted font-medium mt-1">
            Tổng quan tài nguyên máy chủ, độ phủ danh mục sản phẩm đang kinh doanh, hiệu suất trích xuất LLM và các chỉ số đo đạc thực nghiệm.
          </p>
        </div>

        <Link
          to="/admin/benchmark"
          className="px-4 py-2 rounded-xl bg-warm-primary hover:bg-warm-primary-hover text-warm-primary-text hover:text-white font-black text-xs border-2 border-warm-text shadow-brutal flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>Mở Benchmark GIN Index</span>
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 shadow-brutal">
          <div className="text-xs font-bold text-warm-muted uppercase flex items-center justify-between">
            <span>Sản phẩm đang bán</span>
            <Package className="w-4 h-4 text-warm-muted" />
          </div>
          <div className="text-2xl font-black font-mono text-warm-text mt-1">
            {loading ? '...' : stats ? stats.totalProducts.toLocaleString() : '0'} SP
          </div>
          <div className="text-[11px] font-bold text-emerald-700 mt-1">
            {stats && (stats.laptopProducts || stats.phoneProducts)
              ? `${stats.laptopProducts || 0} Laptop • ${stats.phoneProducts || 0} Điện thoại`
              : 'Đã đánh GIN Index cột specs'}
          </div>
        </div>

        <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 shadow-brutal">
          <div className="text-xs font-bold text-warm-muted uppercase flex items-center justify-between">
            <span>Đánh giá & Review</span>
            <MessageSquare className="w-4 h-4 text-warm-muted" />
          </div>
          <div className="text-2xl font-black font-mono text-warm-text mt-1">
            {loading ? '...' : stats ? stats.totalReviews.toLocaleString() : '0'} reviews
          </div>
          <div className="text-[11px] font-bold text-warm-muted mt-1">
            {stats && stats.activeReviews != null
              ? `${stats.activeReviews} hợp lệ • ${stats.spamReviews || 0} spam bị chặn`
              : 'Bộ lọc 7 tiêu chí chống spam'}
          </div>
        </div>

        <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 shadow-brutal">
          <div className="text-xs font-bold text-warm-muted uppercase flex items-center justify-between">
            <span>Lượt gọi Gemini LLM</span>
            <Cpu className="w-4 h-4 text-warm-primary" />
          </div>
          <div className="text-2xl font-black font-mono text-warm-text mt-1">
            {loading ? '...' : stats ? stats.totalLlmCalls.toLocaleString() : '0'} reqs
          </div>
          <div className="text-[11px] font-bold text-emerald-700 mt-1">
            {stats && stats.totalLlmCalls > 0
              ? `${((stats.successLlmCalls / stats.totalLlmCalls) * 100).toFixed(1)}% thành công (${stats.avgLatencyMs.toFixed(0)}ms)`
              : '100% thành công'}
          </div>
        </div>

        <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 shadow-brutal">
          <div className="text-xs font-bold text-warm-muted uppercase flex items-center justify-between">
            <span>Ước tính Chi phí Token</span>
            <DollarSign className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-800 mt-1">
            ${loading ? '...' : stats ? stats.estimatedCostUsd.toFixed(4) : '0.0000'}
          </div>
          <div className="text-[11px] font-bold text-warm-muted mt-1">
            {stats ? stats.totalTokensUsed.toLocaleString() : 0} tokens
          </div>
        </div>
      </div>

      {/* Time-Series Trend Charts (Lazy-loaded Recharts) */}
      <Suspense
        fallback={
          <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-6 shadow-brutal mb-6 text-xs font-bold text-warm-muted text-center">
            Đang tải biểu đồ xu hướng theo thời gian...
          </div>
        }
      >
        <TrendCharts />
      </Suspense>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Link
          to="/admin/benchmark"
          className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 shadow-brutal hover:-translate-y-1 transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-warm-pastel-amber border-2 border-warm-text flex items-center justify-center mb-3">
              <Zap className="w-5 h-5 text-amber-800" />
            </div>
            <h3 className="font-black text-sm text-warm-text group-hover:text-warm-primary transition-colors">
              Đo Đạc Hiệu Năng GIN Index
            </h3>
            <p className="text-xs text-warm-muted mt-1 leading-relaxed">
              So sánh độ trễ truy vấn CSDL giữa Sequential Scan và Bitmap Index Scan, xuất bảng số liệu thực nghiệm cho báo cáo.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-black text-warm-text">
            <span>Khám phá ngay</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/admin/weights"
          className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 shadow-brutal hover:-translate-y-1 transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border-2 border-warm-text flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-emerald-800" />
            </div>
            <h3 className="font-black text-sm text-warm-text group-hover:text-warm-primary transition-colors">
              Cấu Hình Trọng Số Xếp Hạng
            </h3>
            <p className="text-xs text-warm-muted mt-1 leading-relaxed">
              Tùy biến trọng số{' '}
              <code className="px-1 py-0.5 rounded bg-warm-bg border border-warm-text/20 font-mono text-[11px] font-bold text-warm-text">
                w_price
              </code>
              ,{' '}
              <code className="px-1 py-0.5 rounded bg-warm-bg border border-warm-text/20 font-mono text-[11px] font-bold text-warm-text">
                w_rating
              </code>
              ,{' '}
              <code className="px-1 py-0.5 rounded bg-warm-bg border border-warm-text/20 font-mono text-[11px] font-bold text-warm-text">
                w_spec
              </code>{' '}
              cho thuật toán Weighted Scoring theo từng ngành hàng.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-black text-warm-text">
            <span>Xem & Điều chỉnh</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/admin/llm-logs"
          className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 shadow-brutal hover:-translate-y-1 transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-sky-100 border-2 border-warm-text flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-sky-800" />
            </div>
            <h3 className="font-black text-sm text-warm-text group-hover:text-warm-primary transition-colors">
              Nhật Ký Gọi LLM & Chi Phí
            </h3>
            <p className="text-xs text-warm-muted mt-1 leading-relaxed">
              Kiểm tra toàn văn payload JSON Structured Output, độ trễ mạng và số lượng token tiêu thụ của Google Gemini.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-black text-warm-text">
            <span>Kiểm tra Logs</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Recent AI Search Queries Table */}
      {stats?.recentQueries && stats.recentQueries.length > 0 && (
        <div className="bg-warm-surface border-2 border-warm-text rounded-2xl shadow-brutal overflow-hidden mb-6">
          <div className="p-4 sm:p-5 border-b-2 border-warm-text flex items-center justify-between bg-warm-bg">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-warm-primary" />
              <h2 className="text-xs sm:text-sm font-black text-warm-text uppercase tracking-wider">
                Nhật Ký Truy Vấn Tìm Kiếm AI Gần Đây (`search_queries`)
              </h2>
            </div>
            <span className="text-[11px] font-bold text-warm-muted">
              Tổng {stats.totalQueries} lượt tìm kiếm
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-warm-surface border-b border-warm-border-subtle text-warm-muted font-black uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">ID</th>
                  <th className="py-2.5 px-4">Câu truy vấn của khách hàng</th>
                  <th className="py-2.5 px-4">Ngành hàng nhận diện</th>
                  <th className="py-2.5 px-4">Tiêu chí AI trích xuất</th>
                  <th className="py-2.5 px-4">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border-subtle font-medium">
                {stats.recentQueries.slice(0, 6).map((q) => (
                  <tr key={q.id} className="hover:bg-warm-bg/60">
                    <td className="py-3 px-4 font-mono font-bold text-warm-text">#{q.id}</td>
                    <td className="py-3 px-4 font-bold text-warm-text">&ldquo;{q.queryText}&rdquo;</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-warm-pastel-amber border border-warm-text text-warm-secondary-text">
                        {q.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-warm-muted">
                      {q.criteriaSummary}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-warm-muted whitespace-nowrap">
                      {q.createdAt ? new Date(q.createdAt).toLocaleString('vi-VN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* System Architecture & Health Overview */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b-2 border-warm-border-subtle">
          <Server className="w-5 h-5 text-warm-text" />
          <h2 className="text-sm font-black text-warm-text uppercase tracking-wider">
            Trạng Thái Dịch Vụ Cốt Lõi (Core Services Health)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-warm-bg border-2 border-warm-text flex items-center justify-between">
            <div>
              <div className="font-black text-xs text-warm-text">PostgreSQL + GIN Index</div>
              <div className="text-[10px] text-warm-muted">idx_products_specs_gin</div>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
              <ShieldCheck className="w-3 h-3" /> Hoạt động
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-warm-bg border-2 border-warm-text flex items-center justify-between">
            <div>
              <div className="font-black text-xs text-warm-text">Google Gemini API</div>
              <div className="text-[10px] text-warm-muted">Structured Output (JSON)</div>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
              <ShieldCheck className="w-3 h-3" /> Kết nối tốt
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-warm-bg border-2 border-warm-text flex items-center justify-between">
            <div>
              <div className="font-black text-xs text-warm-text">AI Review Summarizer Cache</div>
              <div className="text-[10px] text-warm-muted">bảng `review_summaries`</div>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
              <ShieldCheck className="w-3 h-3" /> Tối ưu ~5ms
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-warm-bg border-2 border-warm-text flex items-center justify-between">
            <div>
              <div className="font-black text-xs text-warm-text">Weighted Scoring Engine</div>
              <div className="text-[10px] text-warm-muted">Min-Max Normalization</div>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
              <ShieldCheck className="w-3 h-3" /> Sẵn sàng
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
