import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuthUser } from '../utils/storage';
import { Sparkles, Search, Laptop, Smartphone, ArrowRight, Zap, Database, ShieldCheck, Flame } from 'lucide-react';

const SAMPLE_PROMPTS = [
  'Laptop sinh viên 15 củ học IT pin trâu',
  'Điện thoại chụp ảnh đẹp RAM 8GB dưới 10 triệu',
  'Laptop gaming i7 RAM 16GB SSD 512 tầm 25 củ',
  'Điện thoại pin trâu dưới 8 chai màn hình to',
];

export const HomePage: React.FC = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const user = getAuthUser();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSelectPrompt = (prompt: string) => {
    setQuery(prompt);
    navigate(`/search?q=${encodeURIComponent(prompt)}`);
  };

  return (
    <div className="space-y-12 py-6">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 border-warm-border bg-warm-secondary text-warm-secondary-text font-extrabold text-xs shadow-brutal-xs">
          <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
          <span>Hệ Thống Trợ Lý Mua Sắm Bằng Ngôn Ngữ Tự Nhiên (Gemini AI)</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-warm-text tracking-tight leading-tight">
          Tìm Thiết Bị Công Nghệ Phù Hợp <br />
          <span className="text-amber-600 underline decoration-wavy decoration-amber-400">
            Đúng Nhu Cầu &amp; Chuẩn Ngân Sách
          </span>
        </h1>

        <p className="text-warm-muted text-base sm:text-lg max-w-2xl mx-auto font-medium">
          Chỉ cần gõ câu hỏi tự nhiên hoặc tiếng lóng, AI sẽ tự trích xuất thông số, truy vấn qua CSDL <strong>PostgreSQL GIN Index</strong> và xếp hạng bằng thuật toán <strong>Weighted Scoring</strong>.
        </p>

        {/* AI Omnibox Search */}
        <div className="max-w-3xl mx-auto pt-2">
          <form onSubmit={handleSearch} className="brutal-card p-3 sm:p-4 bg-warm-surface">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 relative flex items-center">
                <Search className="w-5 h-5 text-warm-hint absolute left-3.5" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ví dụ: Laptop sinh viên 15 củ học IT RAM 16GB..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-warm-border bg-warm-bg text-warm-text font-bold text-sm sm:text-base focus:outline-none focus:bg-white focus:border-amber-500 shadow-brutal-xs transition-all"
                />
              </div>

              <button
                type="submit"
                className="brutal-btn px-6 py-3 text-sm sm:text-base whitespace-nowrap shadow-brutal"
              >
                <Sparkles className="w-4 h-4" />
                <span>Tìm Kiếm AI</span>
              </button>
            </div>

            {/* Prompt suggestions chips */}
            <div className="mt-4 pt-3 border-t border-warm-border/10 text-left">
              <div className="text-xs font-extrabold text-warm-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Gợi ý câu hỏi tiếng lóng / thực tế:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPrompt(prompt)}
                    className="px-3 py-1.5 rounded-xl border-2 border-warm-border bg-warm-subtle hover:bg-amber-100 text-warm-text text-xs font-bold shadow-brutal-xs transition-all text-left flex items-center gap-1.5"
                  >
                    <span>“{prompt}”</span>
                    <ArrowRight className="w-3 h-3 text-amber-600 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Category Selection Cards */}
      <section className="space-y-4">
        <h2 className="text-xl font-black text-warm-text flex items-center gap-2">
          <span>Ngành Hàng Nổi Bật</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div
            onClick={() => navigate('/category?type=laptop')}
            className="brutal-card p-6 bg-gradient-to-br from-amber-50 to-orange-50 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl border-2 border-warm-border bg-amber-200 flex items-center justify-center shadow-brutal-xs group-hover:scale-105 transition-transform">
                <Laptop className="w-7 h-7 text-amber-900" />
              </div>
              <span className="text-xs font-extrabold px-3 py-1 rounded-full border border-warm-border bg-warm-surface shadow-brutal-xs">
                Trọng số: Spec 45% • Giá 35%
              </span>
            </div>
            <h3 className="font-extrabold text-2xl text-warm-text mt-4">Laptop &amp; Máy tính xách tay</h3>
            <p className="text-sm text-warm-muted mt-1">
              Phù hợp cho lập trình viên, sinh viên, thiết kế đồ họa hoặc văn phòng mỏng nhẹ.
            </p>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-black text-amber-700">
              <span>Xem danh mục Laptop</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div
            onClick={() => navigate('/category?type=phone')}
            className="brutal-card p-6 bg-gradient-to-br from-sky-50 to-indigo-50 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl border-2 border-warm-border bg-sky-200 flex items-center justify-center shadow-brutal-xs group-hover:scale-105 transition-transform">
                <Smartphone className="w-7 h-7 text-sky-900" />
              </div>
              <span className="text-xs font-extrabold px-3 py-1 rounded-full border border-warm-border bg-warm-surface shadow-brutal-xs">
                Trọng số: Spec 40% • Giá 30%
              </span>
            </div>
            <h3 className="font-extrabold text-2xl text-warm-text mt-4">Điện Thoại Thông Minh</h3>
            <p className="text-sm text-warm-muted mt-1">
              Tìm theo tiêu chí pin trâu trên 5000 mAh, camera chụp đẹp, sạc nhanh.
            </p>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-black text-sky-700">
              <span>Xem danh mục Điện thoại</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </section>

      {/* Core Value Pillars Section */}
      <section className="brutal-card p-6 sm:p-8 bg-warm-surface">
        <h3 className="text-lg font-extrabold text-warm-text mb-4 text-center">
          Cam Kết Giá Trị Đột Phá Của ShoppingAgent AI
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          <div className="p-4 rounded-xl border border-warm-border bg-warm-subtle">
            <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Hiểu Ngôn Ngữ Tự Nhiên</span>
            </div>
            <p className="text-xs text-warm-muted mt-1">
              Trí tuệ nhân tạo Gemini tự bóc tách nhu cầu theo ngân sách, thương hiệu và cấu hình bạn mong muốn.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-warm-border bg-warm-subtle">
            <div className="flex items-center gap-2 font-bold text-sky-800 text-sm">
              <Database className="w-4 h-4 text-sky-600" />
              <span>Tìm Kiếm Tức Thì</span>
            </div>
            <p className="text-xs text-warm-muted mt-1">
              Hệ thống tra cứu chuyên sâu giúp lọc nhanh thông số phần cứng của hàng trăm thiết bị trong vài mili-giây.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-warm-border bg-warm-subtle">
            <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>Xếp Hạng Minh Bạch</span>
            </div>
            <p className="text-xs text-warm-muted mt-1">
              Thuật toán tính điểm công bằng dựa trên độ khớp thông số, mức giá thực tế và điểm đánh giá người dùng.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-warm-border bg-warm-subtle">
            <div className="flex items-center gap-2 font-bold text-purple-800 text-sm">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Tóm Tắt Đánh Giá Thực Tế</span>
            </div>
            <p className="text-xs text-warm-muted mt-1">
              Hệ thống lọc bỏ đánh giá ảo, tự động tổng hợp ưu/nhược điểm khách quan từ người đã sử dụng sản phẩm.
            </p>
          </div>
        </div>

        {/* Admin Quick Shortcuts (Chỉ hiển thị cho Quản trị viên) */}
        {user && user.role?.toLowerCase().includes('admin') && (
          <div className="mt-6 pt-4 border-t border-warm-border/10 flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-warm-muted">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200 px-2 py-0.5 rounded-md border border-amber-300">
              Admin Shortcuts:
            </span>
            <Link to="/admin/benchmark" className="hover:text-warm-text underline flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-amber-500" />
              Bảng Đo Đạc GIN Index
            </Link>
            <span>•</span>
            <Link to="/admin/llm-logs" className="hover:text-warm-text underline flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Log Token &amp; Độ Trễ LLM
            </Link>
            <span>•</span>
            <Link to="/admin/weights" className="hover:text-warm-text underline flex items-center gap-1">
              Cấu Hình Trọng Số Xếp Hạng
            </Link>
          </div>
        )}
      </section>
    </div>
  );
};
