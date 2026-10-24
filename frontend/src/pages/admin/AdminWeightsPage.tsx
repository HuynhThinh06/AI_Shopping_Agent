import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminNav } from '../../components/admin/AdminNav';
import { getCategoryWeights, updateCategoryWeights, getCategoriesList } from '../../api/adminApi';
import type { CategoryOption } from '../../types/admin';
import { Sliders, Save, CheckCircle2, RotateCcw, Info, Sparkles, AlertCircle, LogIn } from 'lucide-react';

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: 1, code: 'laptop', name: 'Laptop' },
  { id: 2, code: 'phone', name: 'Điện thoại' },
];

export const AdminWeightsPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryOption[]>(DEFAULT_CATEGORIES);
  const [categoryCode, setCategoryCode] = useState('laptop');
  const [wPrice, setWPrice] = useState(0.35);
  const [wRating, setWRating] = useState(0.20);
  const [wSpec, setWSpec] = useState(0.45);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);

  useEffect(() => {
    getCategoriesList()
      .then((list) => {
        if (list && list.length > 0) setCategories(list);
      })
      .catch(() => {});
  }, []);

  const loadWeights = async (code = categoryCode) => {
    try {
      setErrorMessage(null);
      setIsAuthError(false);
      const weights = await getCategoryWeights(code);
      if (weights) {
        if (weights.price != null) setWPrice(weights.price);
        if (weights.rating != null) setWRating(weights.rating);
        if (weights.spec_match != null) setWSpec(weights.spec_match);
      }
    } catch (err: any) {
      console.error('Failed to load weights:', err);
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setIsAuthError(true);
        setErrorMessage('Phiên làm việc đã hết hạn hoặc bạn chưa đăng nhập tài khoản Quản trị viên (admin). Vui lòng đăng nhập lại tài khoản admin để chỉnh sửa cấu hình.');
      } else {
        setErrorMessage('Không thể tải cấu hình trọng số từ máy chủ. Vui lòng kiểm tra kết nối mạng!');
      }
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
      const p = Math.round((wPrice / sum) * 100) / 100;
      const r = Math.round((wRating / sum) * 100) / 100;
      const s = Math.round((1.0 - p - r) * 100) / 100;
      setWPrice(p);
      setWRating(r);
      setWSpec(s);
    }
  };

  const applyPreset = (p: number, r: number, s: number) => {
    setWPrice(p);
    setWRating(r);
    setWSpec(s);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    setIsAuthError(false);
    setSaveSuccess(false);

    // Tự động cân bằng nếu tổng 3 trọng số bị lệch do kéo thanh trượt
    let finalP = wPrice;
    let finalR = wRating;
    let finalS = wSpec;
    const sum = wPrice + wRating + wSpec;
    if (sum > 0 && Math.abs(sum - 1.0) > 0.001) {
      finalP = Math.round((wPrice / sum) * 100) / 100;
      finalR = Math.round((wRating / sum) * 100) / 100;
      finalS = Math.round((1.0 - finalP - finalR) * 100) / 100;
      setWPrice(finalP);
      setWRating(finalR);
      setWSpec(finalS);
    }

    try {
      const res = await updateCategoryWeights(categoryCode, {
        price: finalP,
        rating: finalR,
        spec_match: finalS,
      });

      if (res) {
        if (res.price != null) setWPrice(res.price);
        if (res.rating != null) setWRating(res.rating);
        if (res.spec_match != null) setWSpec(res.spec_match);
      }

      const catName = categories.find((c) => c.code === categoryCode)?.name || categoryCode;
      setSaveSuccess(true);
      setSuccessMessage(`Đã lưu thành công bộ trọng số xếp hạng cho ngành hàng: ${catName} (Giá: ${(finalP * 100).toFixed(0)}%, Rating: ${(finalR * 100).toFixed(0)}%, Cấu hình: ${(finalS * 100).toFixed(0)}%)!`);
      setTimeout(() => {
        setSaveSuccess(false);
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error('Failed to save weights:', err);
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setIsAuthError(true);
        setErrorMessage('Lỗi xác thực (401/403): Phiên làm việc đã hết hạn hoặc tài khoản hiện tại không có quyền Quản trị viên (admin). Vui lòng đăng nhập lại tài khoản admin.');
      } else {
        const msg = err?.response?.data?.message || err.message || 'Không thể lưu cấu hình trọng số.';
        setErrorMessage(`Lỗi lưu cấu hình: ${msg}`);
      }
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
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-warm-primary hover:bg-warm-primary-hover text-warm-primary-text hover:text-white font-black text-xs sm:text-sm border-2 border-warm-text shadow-brutal flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50 transition-transform active:translate-x-0.5 active:translate-y-0.5"
          title={!isValid ? 'Tự động chuẩn hóa tổng 100% và lưu' : 'Lưu cấu hình trọng số'}
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
              <span>{isValid ? 'Lưu cấu hình' : 'Cân bằng & Lưu'}</span>
            </>
          )}
        </button>
      </div>

      {/* Notifications / Alerts */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-600 text-emerald-900 font-bold text-xs sm:text-sm flex items-center gap-3 shadow-brutal-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border-2 border-rose-600 text-rose-950 font-bold text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-brutal-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {isAuthError && (
            <Link
              to="/auth?redirect=/admin/weights"
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1.5 shrink-0 shadow-brutal-xs border border-rose-800 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập Admin</span>
            </Link>
          )}
        </div>
      )}

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
                {categories.map((cat) => (
                  <option key={cat.code} value={cat.code}>
                    {cat.name} ({cat.code})
                  </option>
                ))}
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
