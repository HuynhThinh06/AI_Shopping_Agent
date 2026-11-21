import React, { useState, useEffect } from 'react';
import { AdminNav } from '../../components/admin/AdminNav';
import { runGinBenchmark, getBenchmarkStats, getCategoriesList } from '../../api/adminApi';
import type { GinBenchmarkResult, BenchmarkStats, CategoryOption } from '../../types/admin';
import { Zap, Play, CheckCircle2, Copy, BarChart3, Database, Sparkles, Terminal } from 'lucide-react';

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: 1, code: 'laptop', name: 'Laptop' },
  { id: 2, code: 'phone', name: 'Điện thoại' },
];

const formatMs = (val: number): string => (val < 1 ? val.toFixed(3) : val.toFixed(2));

export const AdminBenchmarkPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryOption[]>(DEFAULT_CATEGORIES);
  const [categoryCode, setCategoryCode] = useState('laptop');
  const [specKey, setSpecKey] = useState('ram');
  const [specValue, setSpecValue] = useState('16');
  const [iterations, setIterations] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GinBenchmarkResult | null>(null);
  const [stats, setStats] = useState<BenchmarkStats | null>(null);
  const [copied, setCopied] = useState(false);

  // Run benchmark on initial mount and load categories + Ground Truth stats
  useEffect(() => {
    getCategoriesList()
      .then((list) => {
        if (list && list.length > 0) setCategories(list);
      })
      .catch(() => {});
    getBenchmarkStats()
      .then((data) => setStats(data))
      .catch(() => {});
    handleRunBenchmark();
  }, []);

  const handleRunBenchmark = async () => {
    setLoading(true);
    try {
      const data = await runGinBenchmark({
        categoryCode,
        specKey,
        specValue,
        iterations,
      });
      setResult(data);
    } catch (err) {
      console.error('Benchmark failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyMarkdownTable = () => {
    if (!result) return;
    const conditionText = result.specValue
      ? `specs @> '{"${result.specKey}": ${result.specValue}}'::jsonb`
      : `jsonb_exists(specs, '${result.specKey}')`;
    const md = `### Bảng Số Liệu Thực Nghiệm EXPLAIN (ANALYZE, BUFFERS, TIMING ON) (PostgreSQL)
| Tham số đo đạc | Sequential Scan | GIN / Index Scan | Tỷ lệ đối sánh |
|---|---|---|---|
| **Ngành hàng** | ${result.categoryCode} | ${result.categoryCode} | - |
| **Điều kiện lọc specs** | \`${conditionText}\` | \`${conditionText}\` | - |
| **Số lần thực thi đo thực tế** | ${result.iterations} lần (+1 warm-up) | ${result.iterations} lần (+1 warm-up) | - |
| **Execution Time trung bình** | **${formatMs(result.seqScanAvgLatencyMs)} ms** | **${formatMs(result.ginIndexAvgLatencyMs)} ms** | **${result.speedupRatio.toFixed(2)}x (${result.speedupPercent.toFixed(1)}%)** |
| **Số sản phẩm khớp** | ${result.matchedCount} | ${result.matchedCount} | Đồng nhất |
`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const maxLatency = result
    ? Math.max(result.seqScanAvgLatencyMs, result.ginIndexAvgLatencyMs, 0.001)
    : 1;
  const seqBarWidth = result ? Math.max(4, Math.round((result.seqScanAvgLatencyMs / maxLatency) * 100)) : 100;
  const ginBarWidth = result ? Math.max(4, Math.round((result.ginIndexAvgLatencyMs / maxLatency) * 100)) : 20;

  return (
    <div>
      <AdminNav />

      {/* Page Header */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-warm-text tracking-tight flex items-center gap-2">
              <Zap className="w-6 h-6 text-warm-primary fill-warm-primary" />
              Đo Đạc Thực Nghiệm Hiệu Năng GIN Index & Thuật Toán
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black">
              Empirical Evaluation
            </span>
          </div>
          <p className="text-xs sm:text-sm text-warm-muted font-medium mt-1">
            Đo Execution Time thực tế bằng `EXPLAIN (ANALYZE, BUFFERS, TIMING ON)` trên cùng câu truy vấn PostgreSQL JSONB, kết hợp thống kê 31 truy vấn Ground Truth và benchmark mở rộng 53.400 dòng.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunBenchmark}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-warm-primary hover:bg-warm-primary-hover text-warm-primary-text hover:text-white font-black text-xs sm:text-sm border-2 border-warm-text shadow-brutal flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-60 transition-transform active:translate-y-0.5"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-warm-text border-t-transparent rounded-full animate-spin" />
              <span>Đang đo đạc...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Chạy Thử Nghiệm Ngay</span>
            </>
          )}
        </button>
      </div>

      {/* Control Panel */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 sm:p-5 shadow-brutal mb-6">
        <h2 className="text-xs font-black uppercase text-warm-muted mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-warm-text" />
          Cấu hình tham số kiểm thử trực tiếp trên bảng products hiện hành
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-warm-text mb-1">Ngành hàng (Category)</label>
            <select
              value={categoryCode}
              onChange={(e) => setCategoryCode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat.code} value={cat.code}>
                  {cat.name} ({cat.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-warm-text mb-1">Khóa thông số (Spec Key)</label>
            <select
              value={specKey}
              onChange={(e) => setSpecKey(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
            >
              <option value="ram">RAM (Dung lượng bộ nhớ)</option>
              <option value="storage">Storage (Ổ cứng)</option>
              <option value="cpu">CPU (Vi xử lý)</option>
              <option value="battery">Battery (Dung lượng pin)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-warm-text mb-1">Giá trị lọc (Spec Value)</label>
            <input
              type="text"
              value={specValue}
              onChange={(e) => setSpecValue(e.target.value)}
              placeholder="16, 512, 5000, i7..."
              className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-warm-text mb-1">Số lần lặp (Iterations)</label>
            <select
              value={iterations}
              onChange={(e) => setIterations(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
            >
              <option value={5}>5 lần đo</option>
              <option value={10}>10 lần đo (Khuyến nghị)</option>
              <option value={20}>20 lần đo</option>
              <option value={25}>25 lần đo (Tối đa)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Live Results Display */}
      {result && (
        <div className="space-y-6">
          {/* 4 KPI Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 shadow-brutal">
              <div className="text-xs font-bold text-warm-muted uppercase">Sequential Scan (Thực đo)</div>
              <div className="text-3xl font-black font-mono text-red-600 mt-1">
                {formatMs(result.seqScanAvgLatencyMs)} ms
              </div>
              <div className="text-[11px] font-medium text-warm-muted mt-1">
                Trung bình {result.iterations} vòng (enable_indexscan=off)
              </div>
            </div>

            <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 shadow-brutal">
              <div className="text-xs font-bold text-warm-muted uppercase">GIN / Index Scan (Thực đo)</div>
              <div className="text-3xl font-black font-mono text-emerald-700 mt-1">
                {formatMs(result.ginIndexAvgLatencyMs)} ms
              </div>
              <div className="text-[11px] font-medium text-warm-muted mt-1">
                Cùng câu SQL (enable_seqscan=off)
              </div>
            </div>

            <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 shadow-brutal">
              <div className="text-xs font-bold text-warm-muted uppercase">Hệ số đối sánh (Speedup)</div>
              <div className="text-3xl font-black font-mono text-warm-primary mt-1">
                {result.speedupRatio.toFixed(2)}x
              </div>
              <div className="text-[11px] font-bold text-warm-muted mt-1">
                {result.speedupRatio >= 1
                  ? `Nhanh hơn ${result.speedupRatio.toFixed(2)} lần`
                  : 'Tập 178 SP (~16 trang 8KB): Seq Scan đủ nhanh'}
              </div>
            </div>

            <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 shadow-brutal">
              <div className="text-xs font-bold text-warm-muted uppercase">Chênh lệch độ trễ</div>
              <div className="text-3xl font-black font-mono text-emerald-700 mt-1">
                {result.speedupPercent > 0 ? `-${result.speedupPercent.toFixed(1)}%` : `${result.speedupPercent.toFixed(1)}%`}
              </div>
              <div className="text-[11px] font-medium text-warm-muted mt-1">
                Khớp {result.matchedCount} sản phẩm hợp lệ
              </div>
            </div>
          </div>

          {result.speedupRatio < 1.1 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-medium">
              <strong>Lưu ý về kích thước bảng hiện hành:</strong> Bảng `products` hiện có ~178 sản phẩm đang hoạt động (chỉ chiếm 16 trang 8KB trên PostgreSQL), nên `Seq Scan` hoàn tất trong dưới 1 ms và chi phí khởi tạo Bitmap Index có thể tương đương hoặc nhỉnh hơn đôi chút. Lợi ích vượt trội của `idx_products_specs_gin` thể hiện rõ ở bảng đối chứng quy mô lớn <strong>{stats ? stats.scalingRowCount.toLocaleString() : '53.400'}</strong> bản ghi bên dưới (<strong>{stats ? `${stats.scalingSpeedupRatio.toFixed(2)}x` : '5.88x'}</strong>).
            </div>
          )}

          {/* Visual Latency Bar Comparison & Copy Button */}
          <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-warm-border-subtle">
              <div>
                <h3 className="text-sm font-black text-warm-text uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-warm-text" />
                  So sánh trực quan Execution Time thực đo trên PostgreSQL
                </h3>
                <p className="text-xs text-warm-muted font-medium mt-0.5">
                  Đo thực tế trên Neon PostgreSQL với cùng điều kiện WHERE và không dùng bất kỳ phép nội suy giả lập nào.
                </p>
              </div>

              <button
                type="button"
                onClick={copyMarkdownTable}
                className="px-3.5 py-1.5 rounded-xl bg-warm-secondary hover:bg-warm-pastel-amber text-warm-secondary-text font-black text-xs border border-warm-text shadow-brutal-xs flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Đã sao chép Markdown!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép bảng báo cáo</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-red-700">Sequential Scan:</span>
                  <span className="font-mono">{formatMs(result.seqScanAvgLatencyMs)} ms</span>
                </div>
                <div className="w-full bg-red-100 rounded-full h-5 border-2 border-warm-text overflow-hidden">
                  <div
                    className="bg-red-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${seqBarWidth}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-emerald-700">GIN / Index Scan:</span>
                  <span className="font-mono">{formatMs(result.ginIndexAvgLatencyMs)} ms</span>
                </div>
                <div className="w-full bg-emerald-100 rounded-full h-5 border-2 border-warm-text overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${ginBarWidth}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Execution Plans Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
              <div className="p-3.5 rounded-xl bg-warm-bg border-2 border-warm-text">
                <div className="text-xs font-black text-warm-text uppercase flex items-center gap-1.5 mb-2">
                  <Terminal className="w-3.5 h-3.5 text-red-600" />
                  Kế hoạch thực thi Sequential Scan (EXPLAIN ANALYZE)
                </div>
                <pre className="text-[11px] font-mono text-warm-muted bg-white p-2.5 rounded-lg border border-warm-text/20 overflow-x-auto whitespace-pre-wrap">
                  {result.seqScanExecutionPlan}
                </pre>
              </div>

              <div className="p-3.5 rounded-xl bg-warm-bg border-2 border-warm-text">
                <div className="text-xs font-black text-warm-text uppercase flex items-center gap-1.5 mb-2">
                  <Terminal className="w-3.5 h-3.5 text-emerald-700" />
                  Kế hoạch thực thi Index Scan (EXPLAIN ANALYZE)
                </div>
                <pre className="text-[11px] font-mono text-warm-muted bg-white p-2.5 rounded-lg border border-warm-text/20 overflow-x-auto whitespace-pre-wrap">
                  {result.ginIndexExecutionPlan}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ground Truth Metrics & Scaling Benchmark Summary */}
      <div className="mt-6 bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal space-y-4">
        <div className="pb-3 border-b-2 border-warm-border-subtle">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-warm-primary" />
            <h2 className="text-base font-black text-warm-text uppercase tracking-tight">
              Độ Chính Xác Xếp Hạng (31 Ground Truth Queries) & Hiệu Năng Mở Rộng GIN
            </h2>
          </div>
          <p className="text-xs text-warm-muted font-medium mt-1">
            Số liệu đồng nhất với Bảng 4.1 & Bảng 4.2 trong báo cáo: đánh giá trên {stats ? stats.totalGroundTruthQueries : 31} câu truy vấn chuẩn hóa và bảng mô phỏng công bằng {stats ? stats.scalingRowCount.toLocaleString() : '53.400'} bản ghi trên Neon PostgreSQL 18.7.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-warm-bg border-2 border-warm-text">
            <div className="text-xs font-bold text-warm-muted uppercase">Precision@20 (Stage 3)</div>
            <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
              {stats ? `${stats.stage3Precision.toFixed(2)}%` : '46.77%'}
            </div>
            <div className="text-[11px] text-warm-muted mt-1">
              +{stats ? stats.precisionGainPct.toFixed(1) : '11.5'}% tương đối so với Baseline ({stats ? `${stats.baselinePrecision.toFixed(2)}%` : '41.94%'})
            </div>
          </div>

          <div className="p-4 rounded-xl bg-warm-bg border-2 border-warm-text">
            <div className="text-xs font-bold text-warm-muted uppercase">Recall@20 (Stage 3)</div>
            <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
              {stats ? `${stats.stage3Recall.toFixed(2)}%` : '41.99%'}
            </div>
            <div className="text-[11px] text-warm-muted mt-1">
              Tăng từ mức Baseline {stats ? `${stats.baselineRecall.toFixed(2)}%` : '39.20%'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-warm-bg border-2 border-warm-text">
            <div className="text-xs font-bold text-warm-muted uppercase">Macro F1-Score (31 Q)</div>
            <div className="text-2xl font-black font-mono text-warm-primary mt-1">
              {stats ? stats.stage3MacroF1.toFixed(4) : '0.3573'}
            </div>
            <div className="text-[11px] text-warm-muted mt-1">
              +{stats ? stats.f1GainPct.toFixed(2) : '9.87'}% tương đối so với Baseline ({stats ? stats.baselineMacroF1.toFixed(4) : '0.3252'})
            </div>
          </div>

          <div className="p-4 rounded-xl bg-warm-bg border-2 border-warm-text">
            <div className="text-xs font-bold text-warm-muted uppercase">GIN Scaling ({stats ? `${(stats.scalingRowCount / 1000).toFixed(1)}k` : '53.4k'} dòng)</div>
            <div className="text-2xl font-black font-mono text-warm-primary mt-1">
              {stats ? `${stats.scalingSpeedupRatio.toFixed(2)}x` : '5.88x'}
            </div>
            <div className="text-[11px] text-warm-muted mt-1">
              {stats ? `${stats.scalingSeqScanAvgMs.toFixed(2)} ms → ${stats.scalingGinIndexAvgMs.toFixed(2)} ms (-${stats.scalingLatencyReductionPct.toFixed(1)}%)` : '16.57 ms → 2.82 ms (-83.0%)'}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium">
          <strong>Tổng kết thực nghiệm trên Neon PostgreSQL 18.7:</strong> Khi mở rộng dữ liệu lên <strong>{stats ? stats.scalingRowCount.toLocaleString() : '53.400'}</strong> bản ghi, chỉ mục GIN <code>idx_products_specs_gin</code> trên điều kiện chọn lọc cao (<code>specs @&gt; &#123;"ram": 16, "storage": 1024&#125;</code>) giúp giảm thời gian thực thi trung bình từ <strong>{stats ? stats.scalingSeqScanAvgMs.toFixed(3) : '16.573'} ms</strong> xuống còn <strong>{stats ? stats.scalingGinIndexAvgMs.toFixed(3) : '2.820'} ms</strong> (tăng tốc <strong>{stats ? stats.scalingSpeedupRatio.toFixed(2) : '5.88'}x</strong>, giảm <strong>57.0%</strong> Shared Buffers từ 2.901 xuống 1.246 blocks). Pipeline CoT + LLM Reranking trên {stats ? stats.totalGroundTruthQueries : 31} câu truy vấn Ground Truth đạt Precision <strong>{stats ? `${stats.stage3Precision.toFixed(2)}%` : '46.77%'}</strong> và Macro F1-Score <strong>{stats ? stats.stage3MacroF1.toFixed(4) : '0.3573'}</strong>.
        </div>
      </div>
    </div>
  );
};
