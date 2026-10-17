import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="py-12 sm:py-20 flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6">
      {/* 404 Big Display Box */}
      <div className="relative">
        <div className="inline-flex items-center justify-center px-8 sm:px-12 py-5 rounded-3xl border-3 border-warm-text bg-warm-secondary shadow-brutal-lg">
          <span className="text-6xl sm:text-8xl font-black text-warm-text tracking-tighter font-mono">
            404
          </span>
        </div>

        {/* Floating AI Sticker */}
        <div className="absolute -top-4 -right-4 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-warm-primary border-2 border-warm-text shadow-brutal flex items-center justify-center text-2xl animate-bounce">
          🤖
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-warm-text tracking-tight">
          Oops! Trang này không tồn tại
        </h1>
        <p className="text-xs sm:text-sm text-warm-muted max-w-md mx-auto leading-relaxed font-medium">
          Đường dẫn bạn yêu cầu không hợp lệ hoặc đã được chuyển sang địa chỉ khác trong hệ thống ShoppingAgent.
        </p>
      </div>

      {/* Helpful Quick Links */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          to="/"
          className="px-5 py-2.5 rounded-xl bg-warm-primary hover:bg-warm-primary-hover text-warm-primary-text hover:text-white font-black text-xs sm:text-sm border-2 border-warm-text shadow-brutal flex items-center gap-2 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Về Trang chủ</span>
        </Link>

        <Link
          to="/search"
          className="px-5 py-2.5 rounded-xl bg-warm-surface hover:bg-warm-bg text-warm-text font-bold text-xs sm:text-sm border-2 border-warm-text shadow-brutal-xs flex items-center gap-2 cursor-pointer"
        >
          <Search className="w-4 h-4" />
          <span>Tìm kiếm sản phẩm AI</span>
        </Link>
      </div>
    </div>
  );
};
