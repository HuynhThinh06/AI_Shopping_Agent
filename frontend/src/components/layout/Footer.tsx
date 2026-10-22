import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { getAuthUser, type AuthUser } from '../../utils/storage';

export const Footer: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(() => getAuthUser());

  useEffect(() => {
    const handleAuth = () => setUser(getAuthUser());
    window.addEventListener('auth-updated', handleAuth);
    return () => window.removeEventListener('auth-updated', handleAuth);
  }, []);

  return (
    <footer className="mt-auto border-t-2 border-warm-border bg-warm-surface py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Brand Icon + Title + Slogan */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl border-2 border-warm-border bg-amber-400 flex items-center justify-center shadow-brutal-xs shrink-0">
            <Sparkles className="w-5 h-5 text-amber-950" />
          </div>
          <div className="text-left">
            <div className="font-black text-sm sm:text-base text-warm-text leading-tight">
              AI Shopping Agent
            </div>
            <div className="text-xs text-warm-muted font-medium mt-0.5">
              Hệ thống Tư vấn Thiết bị Công nghệ Thông minh
            </div>
          </div>
        </div>

        {/* Center: Quick Navigation Links */}
        <nav className="flex flex-wrap items-center justify-center gap-5 sm:gap-7 text-xs sm:text-sm font-bold text-warm-text">
          <Link to="/" className="hover:text-amber-700 transition-colors">
            Trang chủ
          </Link>
          <Link to="/search" className="hover:text-amber-700 transition-colors">
            Tìm kiếm AI
          </Link>
          <Link to="/compare" className="hover:text-amber-700 transition-colors">
            So sánh thiết bị
          </Link>
          <Link to="/favorites" className="hover:text-amber-700 transition-colors">
            Yêu thích
          </Link>
          {user && (
            <Link to="/settings" className="hover:text-amber-700 transition-colors">
              Cài đặt cá nhân
            </Link>
          )}
        </nav>

        {/* Right: Copyright */}
        <div className="text-xs text-warm-muted font-medium font-mono shrink-0">
          &copy; 2026 AI Shopping Agent.
        </div>
      </div>
    </footer>
  );
};
