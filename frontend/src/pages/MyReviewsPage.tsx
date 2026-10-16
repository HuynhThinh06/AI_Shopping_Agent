import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getUserReviews, type UserReviewItem } from '../utils/storage';
import { MessageSquare, Star, CheckCircle2, Sparkles, ExternalLink } from 'lucide-react';

export const MyReviewsPage: React.FC = () => {
  const [reviews] = useState<UserReviewItem[]>(getUserReviews());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-warm-secondary border border-warm-text text-warm-secondary-text text-xs font-black uppercase">
              Đóng góp cộng đồng
            </span>
            <span className="text-xs text-warm-muted font-bold font-mono">
              {reviews.length} đánh giá
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-warm-text tracking-tight mt-1 flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-warm-primary" />
            Đánh Giá Của Tôi & Đóng Góp AI
          </h1>
          <p className="text-xs sm:text-sm text-warm-muted font-medium mt-1">
            Các nhận xét thực tế của bạn giúp mô hình Gemini tổng hợp ưu/nhược điểm khách quan cho cộng đồng người mua.
          </p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-8 sm:p-12 shadow-brutal text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-warm-secondary border-2 border-warm-text mx-auto flex items-center justify-center text-3xl shadow-brutal-xs">
            ✍️
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-lg font-black text-warm-text">Bạn chưa viết đánh giá nào</h2>
            <p className="text-xs text-warm-muted mt-1 leading-relaxed">
              Hãy trải nghiệm sản phẩm và để lại đánh giá ở trang chi tiết sản phẩm để đóng góp vào bộ dữ liệu huấn luyện tóm tắt AI.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/category?type=laptop"
              className="px-5 py-2.5 rounded-xl bg-warm-primary text-warm-primary-text font-black text-xs border-2 border-warm-text shadow-brutal-xs inline-flex items-center gap-2 hover:bg-warm-primary-hover"
            >
              <span>Xem sản phẩm để đánh giá</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 shadow-brutal space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-warm-border-subtle">
                <Link
                  to={`/product/${r.productId}`}
                  className="font-black text-base text-warm-text hover:text-warm-primary transition-colors flex items-center gap-1.5"
                >
                  <span>{r.productName}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-warm-muted" />
                </Link>

                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px]">
                    <CheckCircle2 className="w-3 h-3" />
                    {r.status}
                  </span>
                  <span className="text-warm-muted font-mono">
                    {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>

              {/* Star Rating */}
              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < r.rating ? 'fill-amber-400 text-amber-500' : 'text-warm-border-subtle'
                    }`}
                  />
                ))}
                <span className="text-xs font-black text-warm-text ml-1.5">
                  {r.rating} / 5 sao
                </span>
              </div>

              {/* Review Content */}
              <p className="text-xs sm:text-sm text-warm-text leading-relaxed font-medium bg-warm-bg p-3.5 rounded-xl border border-warm-text/20">
                "{r.content}"
              </p>

              {/* Impact Note */}
              <div className="flex items-center gap-2 text-[11px] font-bold text-amber-800">
                <Sparkles className="w-3.5 h-3.5 text-warm-primary shrink-0" />
                <span>Đã được Gemini tổng hợp vào bảng cache tóm tắt của sản phẩm.</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
