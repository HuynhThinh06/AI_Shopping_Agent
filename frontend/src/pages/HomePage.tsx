import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuthUser, toggleCompareId, isInCompare } from '../utils/storage';
import { productApi } from '../api/productApi';
import { apiClient } from '../api/client';
import type { ProductDetailDTO } from '../types/product';
import {
  Sparkles,
  Search,
  Laptop,
  Smartphone,
  ArrowRight,
  Zap,
  Database,
  ShieldCheck,
  Flame,
  Star,
  Cpu,
  Scale,
  Loader2,
  Layers,
} from 'lucide-react';

const SAMPLE_PROMPTS = [
  'Laptop sinh viên học IT tầm 20 đến 25 triệu pin trâu RAM 16GB',
  'Điện thoại chụp ảnh đẹp RAM 8GB dưới 10 triệu',
  'Laptop gaming i7 RAM 16GB SSD 512 tầm 25 củ',
  'Điện thoại pin trâu dưới 8 chai màn hình to',
];

interface CategoryItem {
  id?: number;
  code: string;
  name: string;
  description?: string;
}

export const HomePage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [featuredProducts, setFeaturedProducts] = useState<ProductDetailDTO[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState<boolean>(true);
  const navigate = useNavigate();
  const user = getAuthUser();

  useEffect(() => {
    // 1. Tải danh sách sản phẩm nổi bật qua GET /api/products/featured
    productApi
      .getFeaturedProducts(6)
      .then((data) => setFeaturedProducts(data || []))
      .catch((err) => console.error('Lỗi khi tải sản phẩm nổi bật:', err))
      .finally(() => setLoadingFeatured(false));

    // 2. Tải danh mục ngành hàng qua GET /api/categories
    apiClient
      .get<CategoryItem[]>('/categories')
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setCategories(res.data);
        }
      })
      .catch((err) => console.warn('Không thể tải categories từ API:', err));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSelectPrompt = (prompt: string) => {
    setQuery(prompt);
    navigate(`/search?q=${encodeURIComponent(prompt)}`);
  };

  const formatVnd = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ';
  };

  return (
    <div className="space-y-12 py-6">
      {/* 1. Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 border-warm-border bg-warm-secondary text-warm-secondary-text font-extrabold text-xs shadow-brutal-xs">
          <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
          <span>Hệ Thống Trợ Lý Mua Sắm Bằng Ngôn Ngữ Tự Nhiên (Gemini AI)</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-warm-text tracking-tight leading-tight">
          Tìm Thiết Bị Công Nghệ Phù Hợp <br />
          <span className="text-amber-600 inline-block mt-1">
            Đúng Nhu Cầu &amp; Chuẩn Ngân Sách
          </span>
        </h1>

        <p className="text-warm-muted text-sm sm:text-base max-w-2xl mx-auto font-medium leading-relaxed">
          Trợ lý AI thông minh phân tích câu hỏi tự nhiên, trích xuất thông số kỹ thuật chuẩn xác và tổng hợp hàng ngàn đánh giá thực tế để đưa ra gợi ý tối ưu nhất cho bạn.
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
                    className="px-3 py-1.5 rounded-xl border-2 border-warm-border bg-warm-subtle hover:bg-amber-100 text-warm-text text-xs font-bold shadow-brutal-xs transition-all text-left flex items-center gap-1.5 cursor-pointer"
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

      {/* 2. Category Selection Cards */}
      <section className="space-y-4">
        <h2 className="text-xl font-black text-warm-text flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-600" />
          <span>Ngành Hàng Nổi Bật ({categories.length > 0 ? `${categories.length} Danh mục` : 'Laptop & Điện thoại'})</span>
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

      {/* 3. Featured Products Section (GET /api/products/featured) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-black text-warm-text flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              <span>Sản Phẩm Nổi Bật Được Đánh Giá Cao Nhất</span>
            </h2>
            <p className="text-xs text-warm-muted font-medium mt-0.5">
              Top các thiết bị công nghệ chính hãng có điểm đánh giá thực tế cao từ cộng đồng người dùng
            </p>
          </div>
          <Link
            to="/search?q=laptop"
            className="text-xs font-extrabold text-amber-700 hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Khám phá thêm bằng AI</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loadingFeatured ? (
          <div className="py-12 text-center text-warm-muted flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            <span className="text-xs font-bold">Đang tải danh sách thiết bị nổi bật...</span>
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="brutal-card p-8 text-center bg-warm-surface text-warm-muted text-xs font-bold">
            Chưa có sản phẩm nổi bật nào trong cơ sở dữ liệu.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((p) => {
              const specs = p.specs || {};
              const cpu = specs.cpu || specs.chipset || specs.CPU || '';
              const ram = specs.ram || specs.RAM ? `${specs.ram || specs.RAM}GB RAM` : '';
              const storage = specs.storage ? `${specs.storage}GB` : '';
              const screen = specs.screen_size ? `${specs.screen_size}"` : '';
              const specSummary = [cpu, ram, storage, screen].filter(Boolean).join(' • ');

              return (
                <div
                  key={p.id}
                  className="brutal-card p-5 bg-warm-surface flex flex-col justify-between hover:-translate-y-1 transition-all"
                >
                  <div className="space-y-3">
                    {/* Header Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-lg border border-warm-border bg-amber-100 text-amber-950 font-black text-[11px] uppercase">
                          {p.brand}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg border border-warm-border bg-sky-100 text-sky-950 font-bold text-[10px] uppercase">
                          {p.categoryCode}
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-xs">
                        <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                        <span>{p.avgRating ? Number(p.avgRating).toFixed(1) : '5.0'}</span>
                      </div>
                    </div>

                    {/* Image Preview */}
                    <div className="w-full h-40 rounded-xl border border-warm-border bg-white p-3 flex items-center justify-center overflow-hidden">
                      {p.imageUrls && p.imageUrls.length > 0 ? (
                        <img
                          src={p.imageUrls[0]}
                          alt={p.name}
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            (e.target as any).src = 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300';
                          }}
                        />
                      ) : (
                        <Cpu className="w-12 h-12 text-warm-hint" />
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-extrabold text-base text-warm-text hover:text-amber-700 transition-colors line-clamp-1" title={p.name}>
                      <Link to={`/product/${p.id}`}>{p.name}</Link>
                    </h3>

                    {/* Specs String */}
                    <p className="text-xs text-warm-muted font-medium line-clamp-1">
                      {specSummary || 'Thông số tiêu chuẩn chính hãng'}
                    </p>

                    {/* Price */}
                    <div>
                      <div className="text-[11px] font-bold text-warm-muted">Giá niêm yết:</div>
                      <div className="text-xl font-black text-amber-700">
                        {formatVnd(p.price)}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 mt-4 border-t border-warm-border/10 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCompareId(p.id)}
                      className={`py-2 px-3 rounded-xl border-2 border-warm-border text-xs font-bold shadow-brutal-xs flex items-center gap-1 cursor-pointer transition-all ${
                        isInCompare(p.id)
                          ? 'bg-emerald-500 text-white'
                          : 'bg-warm-secondary text-warm-secondary-text hover:bg-amber-300'
                      }`}
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>{isInCompare(p.id) ? 'Đang so sánh' : '+ So sánh'}</span>
                    </button>

                    <Link
                      to={`/product/${p.id}`}
                      className="brutal-btn flex-1 py-2 text-xs font-black shadow-brutal-xs flex items-center justify-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Xem Chi Tiết</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Core Value Pillars Section */}
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
