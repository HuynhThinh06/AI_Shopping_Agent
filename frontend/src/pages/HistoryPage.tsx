import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSearchHistory, clearSearchHistory, getAuthUser, type SearchHistoryItem } from '../utils/storage';
import { apiClient } from '../api/client';
import { History, Trash2, Search, ArrowRight, Sparkles, Clock } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<SearchHistoryItem[]>(() => getSearchHistory());

  useEffect(() => {
    const handleUpdate = () => setHistory(getSearchHistory());
    window.addEventListener('history-updated', handleUpdate);
    window.addEventListener('auth-updated', handleUpdate);

    const user = getAuthUser();
    if (user?.email) {
      apiClient.get<any[]>('/search/history', { params: { userEmail: user.email } })
        .then((res) => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            const backendItems: SearchHistoryItem[] = res.data.map((d) => ({
              id: d.id,
              queryText: d.queryText,
              categoryCode: d.categoryCode,
              target: d.target,
              budgetMax: d.budgetMax,
              timestamp: d.timestamp || new Date().toISOString(),
            }));
            setHistory(backendItems);
          }
        })
        .catch((err) => console.warn('Could not sync history from backend:', err));
    }

    return () => {
      window.removeEventListener('history-updated', handleUpdate);
      window.removeEventListener('auth-updated', handleUpdate);
    };
  }, []);

  const handleClear = () => {
    clearSearchHistory();
    setHistory([]);
  };

  const handleSearchAgain = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const formatPrice = (price?: number) => {
    if (!price) return null;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-warm-secondary border border-warm-text text-warm-secondary-text text-xs font-black uppercase">
              Nhật ký truy vấn AI
            </span>
            <span className="text-xs text-warm-muted font-bold font-mono">
              {history.length} câu hỏi gần đây
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-warm-text tracking-tight mt-1 flex items-center gap-2">
            <History className="w-7 h-7 text-warm-primary" />
            Lịch Sử Tư Vấn & Tìm Kiếm AI
          </h1>
          <p className="text-xs sm:text-sm text-warm-muted font-medium mt-1">
            Xem lại các câu hỏi bằng ngôn ngữ tự nhiên đã được mô hình Gemini bóc tách ràng buộc nghiệp vụ.
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="px-3.5 py-2 rounded-xl bg-warm-bg hover:bg-rose-100 text-rose-700 font-black text-xs border border-warm-text shadow-brutal-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa lịch sử</span>
          </button>
        )}
      </div>

      {/* History Items */}
      {history.length === 0 ? (
        <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-8 sm:p-12 shadow-brutal text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-warm-secondary border-2 border-warm-text mx-auto flex items-center justify-center text-3xl shadow-brutal-xs">
            ⏳
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-lg font-black text-warm-text">Chưa có lịch sử tìm kiếm nào</h2>
            <p className="text-xs text-warm-muted mt-1 leading-relaxed">
              Khi bạn hỏi trợ lý AI về laptop hoặc điện thoại, các câu hỏi và tiêu chí trích xuất sẽ được lưu lại ở đây để bạn xem lại bất cứ lúc nào.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/"
              className="px-5 py-2.5 rounded-xl bg-warm-primary text-warm-primary-text font-black text-xs border-2 border-warm-text shadow-brutal-xs inline-flex items-center gap-2 hover:bg-warm-primary-hover"
            >
              <Search className="w-4 h-4" />
              <span>Hỏi AI ngay</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 sm:p-5 shadow-brutal hover:-translate-y-0.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-warm-pastel-amber border border-warm-text text-[10px] font-mono font-black text-warm-secondary-text uppercase">
                    {item.categoryCode || 'laptop'}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-warm-muted">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(item.timestamp).toLocaleString('vi-VN')}</span>
                  </div>
                </div>

                <div className="font-black text-sm sm:text-base text-warm-text group-hover:text-warm-primary transition-colors flex items-center gap-2">
                  <span>"{item.queryText}"</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  {item.budgetMax && (
                    <span className="px-2 py-0.5 rounded bg-warm-bg border border-warm-text/20 font-mono text-[11px] text-warm-text font-bold">
                      Ngân sách: ≤ {formatPrice(item.budgetMax)}
                    </span>
                  )}
                  {item.target && (
                    <span className="px-2 py-0.5 rounded bg-warm-bg border border-warm-text/20 text-[11px] text-warm-muted font-bold">
                      Đối tượng: {item.target}
                    </span>
                  )}
                  {item.totalMatched !== undefined && (
                    <span className="text-[11px] font-bold text-emerald-700">
                      ✓ Đã tìm thấy {item.totalMatched} sản phẩm phù hợp
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSearchAgain(item.queryText)}
                  className="px-4 py-2 rounded-xl bg-warm-primary hover:bg-warm-primary-hover text-warm-primary-text hover:text-white font-black text-xs border-2 border-warm-text shadow-brutal-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tìm kiếm lại</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
