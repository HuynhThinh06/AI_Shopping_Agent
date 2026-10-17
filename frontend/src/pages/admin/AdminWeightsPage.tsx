import React, { useState, useEffect } from 'react';
import { AdminNav } from '../../components/admin/AdminNav';
import { getCategoryWeights, updateCategoryWeights } from '../../api/adminApi';
import { Sliders, Save, CheckCircle2, RotateCcw, Info, Sparkles } from 'lucide-react';

export const AdminWeightsPage: React.FC = () => {
  const [categoryCode, setCategoryCode] = useState('laptop');
  const [wPrice, setWPrice] = useState(0.35);
  const [wRating, setWRating] = useState(0.20);
  const [wSpec, setWSpec] = useState(0.45);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadWeights = async (code = categoryCode) => {
    try {
      const weights = await getCategoryWeights(code);
      if (weights) {
        if (weights.price != null) setWPrice(weights.price);
        if (weights.rating != null) setWRating(weights.rating);
        if (weights.spec_match != null) setWSpec(weights.spec_match);
      }
    } catch (err) {
      console.error('Failed to load weights:', err);
    }
  };

  useEffect(() => {
    loadWeights(categoryCode);
  }, [categoryCode]);

  const totalSum = Math.round((wPrice + wRating + wSpec) * 100) / 100;
  const isValid = Math.abs(totalSum - 1.0) < 0.01;

  const handleNormalize = () => {
    const sum = wPrice + wRating + wSpec;
    if (sum > 0) {
      setWPrice(Math.round((wPrice / sum) * 100) / 100);
      setWRating(Math.round((wRating / sum) * 100) / 100);
      setWSpec(Math.round((1 - (wPrice / sum) - (wRating / sum)) * 100) / 100);
    }
  };

  const applyPreset = (p: number, r: number, s: number) => {
    setWPrice(p);
    setWRating(r);
    setWSpec(s);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCategoryWeights(categoryCode, {
        price: wPrice,
        rating: wRating,
        spec_match: wSpec,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save weights:', err);
    } finally {
      setSaving(false);
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
              <Sliders className="w-6 h-6 text-warm-primary" />
              Cấu Hình Trọng Số Xếp Hạng Đa Tiêu Chí (Weighted Scoring)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-warm-secondary border border-warm-text text-warm-secondary-text text-xs font-black">
              Bảng `ranking_weights`
            </span>
          </div>
          <p className="text-xs sm:text-sm text-warm-muted font-medium mt-1">
            Điều chỉnh trọng số xếp hạng sản phẩm (Giá cả, Đánh giá sao, Khớp thông số cấu hình) áp dụng cho thuật toán tìm kiếm và xếp hạng ứng viên.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isValid}
          className="px-5 py-2.5 rounded-xl bg-warm-primary hover:bg-warm-primary-hover text-warm-primary-text hover:text-white font-black text-xs sm:text-sm border-2 border-warm-text shadow-brutal flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
        >
          {saving ? (
            <span>Đang lưu...</span>
          ) : saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-800" />
              <span>Đã lưu thành công!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Lưu cấu hình</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Sliders & Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal space-y-5">
            {/* Category Selector */}
            <div>
              <label className="block text-xs font-bold text-warm-text mb-1">
                Chọn ngành hàng áp dụng trọng số:
              </label>
              <select
                value={categoryCode}
                onChange={(e) => setCategoryCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg font-bold text-xs focus:outline-none shadow-brutal-xs"
              >
                <option value="laptop">Laptop (laptop) — Máy tính xách tay</option>
                <option value="phone">Điện thoại (phone) — Smartphone</option>
              </select>
            </div>

            {/* Presets */}
            <div>
              <span className="block text-xs font-bold text-warm-muted mb-2">
                Bộ mẫu cấu hình nhanh (Presets):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset(0.35, 0.20, 0.45)}
                  className="p-2 rounded-xl bg-warm-bg hover:bg-warm-secondary border border-warm-text text-left font-bold text-xs"
                >
                  <div className="text-[11px] font-black">Cân bằng</div>
                  <div className="text-[10px] text-warm-muted">35 / 20 / 45</div>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(0.60, 0.15, 0.25)}
                  className="p-2 rounded-xl bg-warm-bg hover:bg-warm-secondary border border-warm-text text-left font-bold text-xs"
                >
                  <div className="text-[11px] font-black">Ưu tiên Giá rẻ</div>
                  <div className="text-[10px] text-warm-muted">60 / 15 / 25</div>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(0.15, 0.20, 0.65)}
                  className="p-2 rounded-xl bg-warm-bg hover:bg-warm-secondary border border-warm-text text-left font-bold text-xs"
                >
                  <div className="text-[11px] font-black">Cấu hình khủng</div>
                  <div className="text-[10px] text-warm-muted">15 / 20 / 65</div>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(0.20, 0.60, 0.20)}
                  className="p-2 rounded-xl bg-warm-bg hover:bg-warm-secondary border border-warm-text text-left font-bold text-xs"
                >
                  <div className="text-[11px] font-black">Độ uy tín cao</div>
                  <div className="text-[10px] text-warm-muted">20 / 60 / 20</div>
                </button>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4 pt-2">
              {/* Price Slider */}
              <div className="p-3.5 rounded-xl bg-warm-bg border-2 border-warm-text">
                <div className="flex items-center justify-between text-xs font-black mb-1">
                  <span>Trọng số Giá cả (w_price)</span>
                  <span className="font-mono text-warm-primary-text bg-warm-pastel-amber px-2 py-0.5 rounded border border-warm-text">
                    {(wPrice * 100).toFixed(0)}% ({wPrice.toFixed(2)})
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={wPrice}
                  onChange={(e) => setWPrice(parseFloat(e.target.value))}
                  className="w-full h-2 bg-warm-border-subtle rounded-lg appearance-none cursor-pointer accent-warm-primary"
                />
                <div className="text-[10px] text-warm-muted mt-1">
                  Sản phẩm giá thấp hơn sẽ nhận điểm cao hơn thông qua chuẩn hóa Norm(1/price).
                </div>
              </div>

              {/* Rating Slider */}
              <div className="p-3.5 rounded-xl bg-warm-bg border-2 border-warm-text">
                <div className="flex items-center justify-between text-xs font-black mb-1">
                  <span>Trọng số Đánh giá sao (w_rating)</span>
                  <span className="font-mono text-warm-primary-text bg-warm-pastel-amber px-2 py-0.5 rounded border border-warm-text">
                    {(wRating * 100).toFixed(0)}% ({wRating.toFixed(2)})
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={wRating}
                  onChange={(e) => setWRating(parseFloat(e.target.value))}
                  className="w-full h-2 bg-warm-border-subtle rounded-lg appearance-none cursor-pointer accent-warm-primary"
                />
                <div className="text-[10px] text-warm-muted mt-1">
                  Chuẩn hóa điểm rating người dùng thực tế Norm(avgRating).
                </div>
              </div>

              {/* SpecMatch Slider */}
              <div className="p-3.5 rounded-xl bg-warm-bg border-2 border-warm-text">
                <div className="flex items-center justify-between text-xs font-black mb-1">
                  <span>Trọng số Khớp thông số cấu hình (w_spec)</span>
                  <span className="font-mono text-warm-primary-text bg-warm-pastel-amber px-2 py-0.5 rounded border border-warm-text">
                    {(wSpec * 100).toFixed(0)}% ({wSpec.toFixed(2)})
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={wSpec}
                  onChange={(e) => setWSpec(parseFloat(e.target.value))}
                  className="w-full h-2 bg-warm-border-subtle rounded-lg appearance-none cursor-pointer accent-warm-primary"
                />
                <div className="text-[10px] text-warm-muted mt-1">
                  Tỷ lệ thông số phần cứng của sản phẩm khớp với yêu cầu trích xuất từ câu hỏi.
                </div>
              </div>
            </div>

            {/* Total Sum Bar & Validation */}
            <div className="pt-2 border-t-2 border-warm-border-subtle">
              <div className="flex items-center justify-between text-xs font-black mb-2">
                <span>Tổng tỷ trọng 3 tiêu chí:</span>
                <span className={`font-mono text-sm ${isValid ? 'text-emerald-700' : 'text-red-600'}`}>
                  {(totalSum * 100).toFixed(0)}% {isValid ? '✓ Hợp lệ (100%)' : '✗ Phải bằng 100%'}
                </span>
              </div>
              <div className="w-full h-4 rounded-full border-2 border-warm-text flex overflow-hidden">
                <div style={{ width: `${wPrice * 100}%` }} className="bg-amber-400" title="Giá cả" />
                <div style={{ width: `${wRating * 100}%` }} className="bg-emerald-400" title="Đánh giá" />
                <div style={{ width: `${wSpec * 100}%` }} className="bg-sky-400" title="Khớp cấu hình" />
              </div>
              {!isValid && (
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-red-600 font-bold">
                    Tổng 3 trọng số phải bằng đúng 100% để đảm bảo thang điểm 0 - 1.
                  </span>
                  <button
                    type="button"
                    onClick={handleNormalize}
                    className="px-2.5 py-1 rounded-lg bg-warm-secondary border border-warm-text text-warm-secondary-text font-black text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Tự động cân bằng</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Algorithm & Math Explanation (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b-2 border-warm-border-subtle">
              <Sparkles className="w-4 h-4 text-warm-primary" />
              <h3 className="text-sm font-black text-warm-text uppercase tracking-wider">
                Công thức Xếp hạng Đa Tiêu chí
              </h3>
            </div>

            <div className="p-3.5 rounded-xl bg-warm-bg border-2 border-warm-text font-mono text-xs leading-relaxed">
              <div className="font-bold text-warm-text mb-1">Score(p) =</div>
              <div className="text-amber-800 font-semibold pl-4">
                + w_rating × Norm(avgRating)
              </div>
              <div className="text-emerald-800 font-semibold pl-4">
                + w_price × Norm(1/price)
              </div>
              <div className="text-sky-800 font-semibold pl-4">
                + w_spec × SpecMatch(p, criteria)
              </div>
            </div>

            <div className="space-y-2 text-xs text-warm-muted leading-relaxed font-medium">
              <p>
                <strong>Min-Max Normalization:</strong> Chuẩn hóa mọi thang đo về khoảng [0, 1] để loại trừ chênh lệch đơn vị tiền tệ (VNĐ) và thang điểm sao (1 - 5).
              </p>
              <p>
                <strong>Nghịch đảo giá (1 / price):</strong> Giúp sản phẩm có giá thấp hơn nhận điểm số chuẩn hóa cao hơn khi người dùng yêu cầu tối ưu chi phí.
              </p>
              <p>
                <strong>SpecMatch:</strong> Đếm số thông số phần cứng khớp (RAM, Storage, CPU, GPU, Battery) trên tổng số thông số yêu cầu trong câu hỏi.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Cấu hình này được lưu trực tiếp vào bảng `ranking_weights` của PostgreSQL và tự động áp dụng ngay cho tất cả các truy vấn tìm kiếm mới.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
