import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchApi } from '../api/searchApi';
import type { SearchResponse, RankedProduct } from '../types/search';
import { addSearchHistory, getAuthUser } from '../utils/storage';
import { Sparkles, Search, ArrowRight, Star, Cpu, AlertCircle, Loader2, Trophy, CheckCircle, SlidersHorizontal } from 'lucide-react';

export const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const user = getAuthUser();

  const [queryInput, setQueryInput] = useState(queryParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);

  const fetchResults = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchApi.searchProducts(text.trim(), 10);
      setResult(data);

      // Tự động ghi vào lịch sử tư vấn AI của người dùng
      addSearchHistory(
        text.trim(),
        data.extractedCriteria?.categoryCode,
        data.extractedCriteria?.target,
        data.extractedCriteria?.budgetMax,
        data.totalMatched
      );
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err?.response?.data?.detail || 'Không thể kết nối đến máy chủ hoặc dịch vụ AI. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryParam) {
      setQueryInput(queryParam);
      fetchResults(queryParam);
    }
  }, [queryParam]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim()) return;
    setSearchParams({ q: queryInput.trim() });
  };

  const formatVnd = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ';
  };

  const getRankBadge = (pos: number) => {
    if (pos === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-400 text-amber-950 font-black text-xs border border-warm-border shadow-brutal-xs">
          <Trophy className="w-3.5 h-3.5 fill-current" />
          <span>Top 1 Phù Hợp Nhất</span>
        </span>
      );
    }
    if (pos === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-200 text-slate-800 font-bold text-xs border border-warm-border shadow-brutal-xs">
          <span>Top 2</span>
        </span>
      );
    }
    if (pos === 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-200 text-amber-900 font-bold text-xs border border-warm-border shadow-brutal-xs">
          <span>Top 3</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-warm-subtle text-warm-muted font-bold text-xs border border-warm-border">
        Hạng #{pos}
      </span>
    );
  };

  return (
    <div className="space-y-6 py-4">
      {/* Search Input Bar */}
      <section className="brutal-card p-4 bg-warm-surface">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 relative flex items-center">
            <Search className="w-5 h-5 text-warm-hint absolute left-3.5" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Nhập câu hỏi tìm kiếm tự nhiên..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border-2 border-warm-border bg-warm-bg text-warm-text font-bold text-sm sm:text-base focus:outline-none focus:bg-white focus:border-amber-500 shadow-brutal-xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="brutal-btn px-6 py-2.5 text-sm font-bold shadow-brutal shrink-0 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{loading ? 'Đang phân tích...' : 'Phân tích & Tìm'}</span>
          </button>
        </form>
      </section>

      {/* Loading State */}
      {loading && (
        <div className="brutal-card p-12 text-center bg-warm-surface space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl border-2 border-warm-border bg-amber-200 flex items-center justify-center shadow-brutal-sm animate-bounce">
            <Sparkles className="w-7 h-7 text-amber-900 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-lg text-warm-text">Gemini AI đang phân tích truy vấn...</h3>
            <p className="text-xs text-warm-muted">
              Đang trích xuất ràng buộc ngôn ngữ tự nhiên $\rightarrow$ Lọc qua CSDL PostgreSQL GIN Index $\rightarrow$ Tính điểm xếp hạng Weighted Scoring.
            </p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && !loading && (
        <div className="p-4 rounded-xl border-2 border-rose-600 bg-rose-50 text-rose-900 shadow-brutal-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-extrabold text-sm">Có lỗi xảy ra khi gọi AI Search:</div>
            <div className="text-xs mt-1">{error}</div>
          </div>
        </div>
      )}

      {/* Criteria Extraction Banner */}
      {result && !loading && (
        <section className="brutal-card p-5 sm:p-6 bg-warm-surface space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-warm-border/10">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-warm-border bg-amber-100 text-amber-950 font-extrabold text-xs shadow-brutal-xs">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Trích xuất tiêu chí thành công</span>
              </span>
              <span className="text-xs text-warm-muted font-medium">
                Tìm thấy <strong>{result.totalMatched}</strong> sản phẩm ứng viên
              </span>
            </div>

            {user && user.role?.toLowerCase().includes('admin') && (
              <Link
                to="/admin/llm-logs"
                className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1"
              >
                <span>Xem log &amp; token tiêu thụ</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-warm-muted">Câu truy vấn:</div>
            <div className="text-lg font-extrabold text-warm-text mt-0.5">
              “{queryParam}”
            </div>
          </div>

          {/* Extracted pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
            {result.extractedCriteria?.categoryCode && (
              <span className="px-3 py-1.5 rounded-xl border border-warm-border bg-sky-100 text-sky-950 font-bold shadow-brutal-xs">
                Ngành hàng: <strong className="uppercase">{result.extractedCriteria.categoryCode}</strong>
              </span>
            )}

            {(result.extractedCriteria?.budgetMin || result.extractedCriteria?.budgetMax) && (
              <span className="px-3 py-1.5 rounded-xl border border-warm-border bg-emerald-100 text-emerald-950 font-bold shadow-brutal-xs">
                Ngân sách: <strong>
                  {result.extractedCriteria.budgetMin ? formatVnd(result.extractedCriteria.budgetMin) : '0'} 
                  {' — '}
                  {result.extractedCriteria.budgetMax ? formatVnd(result.extractedCriteria.budgetMax) : 'Không giới hạn'}
                </strong>
              </span>
            )}

            {result.extractedCriteria?.target && (
              <span className="px-3 py-1.5 rounded-xl border border-warm-border bg-purple-100 text-purple-950 font-bold shadow-brutal-xs">
                Đối tượng: <strong className="capitalize">{result.extractedCriteria.target}</strong>
              </span>
            )}

            {result.extractedCriteria?.requiredSpecs && Object.entries(result.extractedCriteria.requiredSpecs).map(([key, val]) => (
              <span key={key} className="px-3 py-1.5 rounded-xl border border-warm-border bg-amber-100 text-amber-950 font-bold shadow-brutal-xs">
                {key.toUpperCase()}: <strong>{val}</strong>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Ranked Product List */}
      {result && !loading && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-warm-text flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-amber-600" />
              <span>Sản Phẩm Đã Được Xếp Hạng Đa Tiêu Chí</span>
            </h2>
            {user && user.role?.toLowerCase().includes('admin') && (
              <Link to="/admin/weights" className="text-xs font-bold text-warm-muted hover:text-amber-700 underline">
                Tùy chỉnh trọng số
              </Link>
            )}
          </div>

          {result.results.length === 0 ? (
            <div className="brutal-card p-12 text-center bg-warm-surface space-y-3">
              <AlertCircle className="w-10 h-10 text-warm-muted mx-auto" />
              <h3 className="font-extrabold text-base text-warm-text">Không tìm thấy sản phẩm phù hợp</h3>
              <p className="text-xs text-warm-muted max-w-md mx-auto">
                Hãy thử mở rộng khoảng ngân sách hoặc giảm bớt các yêu cầu cấu hình quá chi tiết.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {result.results.map((product: RankedProduct) => (
                <div
                  key={product.productId}
                  className={`brutal-card p-5 sm:p-6 bg-warm-surface flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all ${
                    product.rankPosition === 1 ? 'border-amber-500 ring-2 ring-amber-300' : ''
                  }`}
                >
                  {/* Left: Image & Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-warm-border bg-warm-subtle shrink-0 p-2 flex items-center justify-center overflow-hidden shadow-brutal-xs">
                      {product.primaryImageUrl ? (
                        <img
                          src={product.primaryImageUrl}
                          alt={product.productName}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as any).src = 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300';
                          }}
                        />
                      ) : (
                        <Cpu className="w-8 h-8 text-warm-hint" />
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        {getRankBadge(product.rankPosition)}
                        {product.brand && (
                          <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-warm-subtle text-warm-muted border border-warm-border">
                            {product.brand}
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-base sm:text-lg text-warm-text hover:text-amber-700 transition-colors">
                        <Link to={`/product/${product.productId}`}>
                          {product.productName}
                        </Link>
                      </h3>

                      <div className="flex items-center gap-4 text-xs font-bold text-warm-muted">
                        <div className="flex items-center gap-1 text-amber-600">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{product.avgRating ? Number(product.avgRating).toFixed(1) : '4.5'}</span>
                        </div>
                        <span>•</span>
                        <span>{product.reviewCount || 0} đánh giá</span>
                      </div>

                      {/* Specs badges */}
                      {product.specs && (
                        <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-semibold text-warm-muted">
                          {Object.entries(product.specs).slice(0, 4).map(([k, v]) => (
                            <span key={k} className="px-2 py-0.5 rounded bg-warm-bg border border-warm-border-subtle">
                              {k}: {String(v)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Scores & Action */}
                  <div className="w-full md:w-64 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-warm-border/10 md:pl-6 flex flex-col justify-between self-stretch shrink-0">
                    <div>
                      <div className="text-xs text-warm-muted font-bold">Giá bán tham khảo:</div>
                      <div className="text-xl sm:text-2xl font-black text-amber-700">
                        {formatVnd(product.price)}
                      </div>

                      {/* Score metrics box */}
                      <div className="mt-3 p-2.5 rounded-xl border border-warm-border bg-warm-subtle space-y-1.5 text-xs font-bold">
                        <div className="flex items-center justify-between text-warm-text">
                          <span>Điểm Tổng Hợp:</span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 font-black">
                            {(product.score * 100).toFixed(1)} / 100
                          </span>
                        </div>

                        {product.specMatchScore !== undefined && (
                          <div className="flex items-center justify-between text-[11px] text-warm-muted">
                            <span>Khớp cấu hình:</span>
                            <span className="text-emerald-700 font-extrabold">
                              {(product.specMatchScore * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Link
                      to={`/product/${product.productId}`}
                      className="brutal-btn mt-4 w-full py-2.5 text-xs font-black shadow-brutal-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Xem Chi Tiết &amp; Tóm Tắt AI</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Empty State / Welcome Guide when no query yet */}
      {!queryParam && !loading && !result && (
        <div className="space-y-6">
          <div className="brutal-card p-6 sm:p-8 bg-warm-surface text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 border-warm-border bg-warm-secondary text-warm-secondary-text font-black text-xs shadow-brutal-xs">
              <Sparkles className="w-4 h-4 text-warm-primary animate-pulse" />
              <span>Khám Phá Sức Mạnh Trợ Lý Mua Sắm Bằng AI</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-warm-text tracking-tight">
              Tìm Thiết Bị Công Nghệ Theo Ngôn Ngữ Tự Nhiên
            </h2>

            <p className="text-xs sm:text-sm text-warm-muted max-w-2xl mx-auto font-medium">
              Bạn có thể gõ bất kỳ câu hỏi nào bằng văn phong đời thường, tiếng lóng hay yêu cầu kỹ thuật chi tiết.
              Mô hình <strong>Gemini AI</strong> sẽ tự động nhận diện thiết bị, phân tách tiêu chí cấu hình &amp; mức giá để đề xuất sản phẩm tốt nhất.
            </p>

            {/* Prompt Suggestion Chips */}
            <div className="pt-4 max-w-3xl mx-auto text-left">
              <div className="text-xs font-black uppercase tracking-wider text-warm-muted mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Gợi ý câu hỏi tìm kiếm nhanh (Click để thử ngay):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    title: 'Laptop sinh viên IT pin trâu',
                    query: 'Laptop sinh viên 15 củ học IT pin trâu RAM 16GB',
                  },
                  {
                    title: 'Điện thoại chụp ảnh đẹp < 10 triệu',
                    query: 'Điện thoại chụp ảnh đẹp RAM 8GB dưới 10 triệu pin trâu',
                  },
                  {
                    title: 'Laptop Gaming đồ họa mượt',
                    query: 'Laptop gaming i7 RAM 16GB SSD 512 tầm 25 củ',
                  },
                  {
                    title: 'MacBook mỏng nhẹ văn phòng',
                    query: 'MacBook mỏng nhẹ cho dân văn phòng pin dùng cả ngày dưới 22 triệu',
                  },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQueryInput(item.query);
                      setSearchParams({ q: item.query });
                    }}
                    className="p-3 rounded-xl border-2 border-warm-border bg-warm-bg hover:bg-warm-secondary hover:-translate-y-0.5 text-warm-text shadow-brutal-xs transition-all text-left flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-extrabold group-hover:text-warm-primary transition-colors">
                        {item.title}
                      </span>
                      <span className="text-[11px] text-warm-muted truncate mt-0.5">
                        “{item.query}”
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-warm-primary group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
