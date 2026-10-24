import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { getDashboardTrends } from '../../api/adminApi';
import type { DashboardTrendsDTO } from '../../types/admin';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Activity,
  Cpu,
  DollarSign,
  Users,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

const DAY_OPTIONS: Array<7 | 14 | 30 | 90> = [7, 14, 30, 90];

function formatDeltaBadge(current = 0, previous = 0) {
  if (previous === 0) {
    if (current === 0) {
      return (
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-warm-bg text-warm-muted border border-warm-text/20">
          <Minus className="w-2.5 h-2.5" /> 0%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
        <TrendingUp className="w-2.5 h-2.5" /> +{current} mới
      </span>
    );
  }

  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct * 10) / 10;
  if (Math.abs(rounded) < 0.1) {
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-warm-bg text-warm-muted border border-warm-text/20">
        <Minus className="w-2.5 h-2.5" /> 0%
      </span>
    );
  }
  if (rounded > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
        <TrendingUp className="w-2.5 h-2.5" /> +{rounded}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
      <TrendingDown className="w-2.5 h-2.5" /> {rounded}%
    </span>
  );
}

function formatShortDate(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

export const TrendCharts: React.FC = () => {
  const [days, setDays] = useState<7 | 14 | 30 | 90>(14);
  const [data, setData] = useState<DashboardTrendsDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrends = async (selectedDays = days) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDashboardTrends(selectedDays);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load dashboard trends:', err);
      setError(err?.response?.data?.message || 'Không thể tải dữ liệu biểu đồ xu hướng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrends(days);
  }, [days]);

  const chartData = (data?.series || []).map((pt) => ({
    ...pt,
    shortDate: formatShortDate(pt.date),
    costUsd: Number((pt.tokens * 0.00000015).toFixed(5)),
  }));

  const curTotals = data?.totals || {};
  const prevTotals = data?.previousTotals || {};
  const totalEstimatedCost = ((curTotals.tokens || 0) * 0.00000015).toFixed(4);

  return (
    <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal mb-6 space-y-5">
      {/* Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-warm-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-warm-primary" />
            <h2 className="text-sm sm:text-base font-black text-warm-text uppercase tracking-wider">
              Biểu Đồ Xu Hướng Hoạt Động Theo Thời Gian
            </h2>
            {data && (
              <span className="text-[11px] font-mono font-bold text-warm-muted">
                ({data.from} → {data.to})
              </span>
            )}
          </div>
          <p className="text-xs text-warm-muted font-medium mt-0.5">
            Chuỗi thời gian liên tục theo ngày (tự động điền 0 cho ngày không phát sinh giao dịch), so sánh tăng trưởng với kỳ liền trước.
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Calendar className="w-4 h-4 text-warm-muted mr-1" />
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 border-warm-text transition-all cursor-pointer ${
                days === d
                  ? 'bg-warm-primary text-warm-primary-text shadow-brutal-xs -translate-y-0.5'
                  : 'bg-warm-bg hover:bg-warm-secondary text-warm-text'
              }`}
            >
              {d} ngày
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs font-bold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadTrends(days)}
            className="px-3 py-1.5 rounded-lg bg-white border border-rose-400 text-rose-800 font-black text-xs inline-flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Thử lại</span>
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="h-64 rounded-2xl bg-warm-bg border-2 border-warm-text/20 animate-pulse flex items-center justify-center text-xs font-bold text-warm-muted"
            >
              Đang dựng biểu đồ xu hướng #{idx}...
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Chart 1: Searches & LLM Calls */}
          <div className="p-4 rounded-2xl bg-warm-bg border-2 border-warm-text space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-xs font-black text-warm-text flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-warm-primary" />
                  <span>1. Lượt Tìm Kiếm AI & Lượt Gọi LLM</span>
                </div>
                <div className="text-[11px] font-bold text-warm-muted mt-0.5">
                  Tổng kỳ này: {(curTotals.searches || 0).toLocaleString()} tìm kiếm •{' '}
                  {(curTotals.llmCalls || 0).toLocaleString()} lượt gọi LLM
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {formatDeltaBadge(curTotals.searches, prevTotals.searches)}
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6cfc2" />
                  <XAxis dataKey="shortDate" tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fffdf9',
                      border: '2px solid #1c1917',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                  <Area
                    type="monotone"
                    dataKey="searches"
                    name="Lượt tìm kiếm"
                    stroke="#d97706"
                    fill="#fde68a"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="llmCalls"
                    name="Lượt gọi LLM"
                    stroke="#0284c7"
                    fill="#bae6fd"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: LLM Avg Latency & Failed Calls */}
          <div className="p-4 rounded-2xl bg-warm-bg border-2 border-warm-text space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-xs font-black text-warm-text flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-sky-700" />
                  <span>2. Độ Trễ LLM Trung Bình (ms) & Lượt Lỗi</span>
                </div>
                <div className="text-[11px] font-bold text-warm-muted mt-0.5">
                  Tổng lượt lỗi kỳ này: {(curTotals.llmFailed || 0).toLocaleString()} lỗi
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {formatDeltaBadge(curTotals.llmCalls, prevTotals.llmCalls)}
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6cfc2" />
                  <XAxis dataKey="shortDate" tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    allowDecimals={false}
                    tick={{ fontSize: 10, fontWeight: 700 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fffdf9',
                      border: '2px solid #1c1917',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avgLatencyMs"
                    name="Độ trễ TB (ms)"
                    stroke="#7c3aed"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="llmFailed"
                    name="Số lượt lỗi"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Tokens & Estimated Cost */}
          <div className="p-4 rounded-2xl bg-warm-bg border-2 border-warm-text space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-xs font-black text-warm-text flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-700" />
                  <span>3. Lượng Token Tiêu Thụ & Chi Phí Ước Tính</span>
                </div>
                <div className="text-[11px] font-bold text-warm-muted mt-0.5">
                  Tổng: {(curTotals.tokens || 0).toLocaleString()} tokens (~${totalEstimatedCost} USD)
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {formatDeltaBadge(curTotals.tokens, prevTotals.tokens)}
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6cfc2" />
                  <XAxis dataKey="shortDate" tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 10, fontWeight: 700 }} />
                  <Tooltip
                    formatter={(value: any, name: any) => {
                      if (name === 'Tokens tiêu thụ') {
                        const cost = ((Number(value) || 0) * 0.00000015).toFixed(5);
                        return [`${Number(value).toLocaleString()} tokens (~$${cost})`, name];
                      }
                      return [value, name];
                    }}
                    contentStyle={{
                      backgroundColor: '#fffdf9',
                      border: '2px solid #1c1917',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                  <Area
                    type="monotone"
                    dataKey="tokens"
                    name="Tokens tiêu thụ"
                    stroke="#059669"
                    fill="#a7f3d0"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: New Reviews & New Users */}
          <div className="p-4 rounded-2xl bg-warm-bg border-2 border-warm-text space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-xs font-black text-warm-text flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-800" />
                  <span>4. Đánh Giá Mới & Người Dùng Đăng Ký Mới</span>
                </div>
                <div className="text-[11px] font-bold text-warm-muted mt-0.5">
                  Tổng kỳ này: {(curTotals.newReviews || 0).toLocaleString()} đánh giá •{' '}
                  {(curTotals.newUsers || 0).toLocaleString()} người dùng mới
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {formatDeltaBadge(curTotals.newReviews, prevTotals.newReviews)}
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6cfc2" />
                  <XAxis dataKey="shortDate" tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fffdf9',
                      border: '2px solid #1c1917',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                  <Bar
                    dataKey="newReviews"
                    name="Review mới"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="newUsers"
                    name="User mới"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendCharts;
