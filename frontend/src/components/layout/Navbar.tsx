import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sparkles,
  Search,
  Laptop,
  Smartphone,
  Scale,
  Heart,
  History,
  MessageSquare,
  Settings,
  Shield,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { getAuthUser, getFavoriteIds, getCompareIds, type AuthUser } from '../../utils/storage';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [user, setUser] = useState<AuthUser>(getAuthUser());
  const [favoriteCount, setFavoriteCount] = useState<number>(getFavoriteIds().length);
  const [compareCount, setCompareCount] = useState<number>(getCompareIds().length);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleStorageUpdate = () => {
      setUser(getAuthUser());
      setFavoriteCount(getFavoriteIds().length);
      setCompareCount(getCompareIds().length);
    };

    window.addEventListener('auth-updated', handleStorageUpdate);
    window.addEventListener('favorites-updated', handleStorageUpdate);
    window.addEventListener('compare-updated', handleStorageUpdate);

    return () => {
      window.removeEventListener('auth-updated', handleStorageUpdate);
      window.removeEventListener('favorites-updated', handleStorageUpdate);
      window.removeEventListener('compare-updated', handleStorageUpdate);
    };
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setDropdownOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="sticky top-3 z-40 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
      <header className="bg-warm-surface border-2 border-warm-border rounded-2xl sm:rounded-3xl shadow-brutal px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 sm:gap-4 transition-all">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group focus:outline-none shrink-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border-2 border-warm-border shadow-brutal-xs overflow-hidden group-hover:-translate-y-0.5 transition-all shrink-0 bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-extrabold text-warm-text tracking-tight flex items-center gap-1 leading-none">
              ShoppingAgent
              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full border border-warm-border bg-warm-secondary text-warm-secondary-text">
                AI
              </span>
            </span>
            <span className="text-[11px] text-warm-muted hidden md:block mt-0.5 font-medium">
              Trợ lý Mua sắm Công nghệ
            </span>
          </div>
        </Link>

        {/* Primary Nav Links */}
        <nav className="hidden lg:flex items-center gap-2 xl:gap-3 text-xs sm:text-sm font-bold">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-xl border-2 transition-all flex items-center gap-1.5 ${
              isActive('/')
                ? 'bg-warm-primary text-warm-primary-text border-warm-border shadow-brutal-xs'
                : 'text-warm-text border-transparent hover:border-warm-border hover:bg-warm-subtle'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Tìm kiếm AI</span>
          </Link>

          <Link
            to="/category?type=laptop"
            className={`px-3 py-1.5 rounded-xl border-2 transition-all flex items-center gap-1.5 ${
              location.pathname === '/category' && location.search.includes('laptop')
                ? 'bg-warm-primary text-warm-primary-text border-warm-border shadow-brutal-xs'
                : 'text-warm-text border-transparent hover:border-warm-border hover:bg-warm-subtle'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Laptop</span>
          </Link>

          <Link
            to="/category?type=phone"
            className={`px-3 py-1.5 rounded-xl border-2 transition-all flex items-center gap-1.5 ${
              location.pathname === '/category' && location.search.includes('phone')
                ? 'bg-warm-primary text-warm-primary-text border-warm-border shadow-brutal-xs'
                : 'text-warm-text border-transparent hover:border-warm-border hover:bg-warm-subtle'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Điện thoại</span>
          </Link>
        </nav>

        {/* Right Actions: Compare, Favorites, User Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Compare Button */}
          <Link
            to="/compare"
            title="So sánh đa sản phẩm"
            className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border-2 border-warm-border shadow-brutal-xs flex items-center gap-1.5 transition-all text-xs font-black ${
              isActive('/compare')
                ? 'bg-amber-400 text-warm-text -translate-y-0.5'
                : 'bg-warm-surface hover:bg-warm-secondary text-warm-text'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span className="hidden sm:inline">So sánh</span>
            {compareCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-warm-text text-white text-[10px] flex items-center justify-center font-mono">
                {compareCount}
              </span>
            )}
          </Link>

          {/* Favorites Button */}
          <Link
            to="/favorites"
            title="Sản phẩm đã lưu"
            className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border-2 border-warm-border shadow-brutal-xs flex items-center gap-1.5 transition-all text-xs font-black ${
              isActive('/favorites')
                ? 'bg-rose-100 text-rose-800 -translate-y-0.5'
                : 'bg-warm-surface hover:bg-rose-50 text-warm-text'
            }`}
          >
            <Heart
              className={`w-4 h-4 ${favoriteCount > 0 ? 'text-rose-500 fill-rose-500' : 'text-warm-text'}`}
            />
            <span className="hidden sm:inline">Đã lưu</span>
            {favoriteCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-mono">
                {favoriteCount}
              </span>
            )}
          </Link>

          {/* Admin shortcut */}
          <Link
            to="/admin/dashboard"
            title="Bảng điều khiển Admin"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-warm-bg hover:bg-warm-secondary border border-warm-border text-xs font-bold"
          >
            <Shield className="w-3.5 h-3.5 text-warm-primary" />
            <span>Admin</span>
          </Link>

          {/* User Profile Pill & Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-warm-surface border-2 border-warm-border shadow-brutal-xs hover:bg-warm-secondary transition-all cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-warm-primary border border-warm-border flex items-center justify-center text-warm-primary-text font-black text-xs shadow-inner">
                {user.avatarText || 'TA'}
              </div>
              <div className="hidden md:flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-warm-text truncate max-w-[90px]">
                  {user.name.split(' ').slice(-1)[0]}
                </span>
                <span className="text-[10px] text-warm-muted font-medium">
                  {user.role || 'Thành viên'}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-warm-muted transition-transform ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-warm-surface border-2 border-warm-border rounded-2xl shadow-brutal p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-warm-border-subtle mb-1">
                  <div className="text-xs font-black text-warm-text">{user.name}</div>
                  <div className="text-[11px] text-warm-muted font-mono truncate">{user.email}</div>
                </div>

                <Link
                  to="/history"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-warm-text hover:bg-warm-secondary transition-colors"
                >
                  <History className="w-4 h-4 text-warm-primary" />
                  <span>Lịch sử tư vấn AI</span>
                </Link>

                <Link
                  to="/favorites"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-warm-text hover:bg-warm-secondary transition-colors"
                >
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span>Sản phẩm yêu thích ({favoriteCount})</span>
                </Link>

                <Link
                  to="/my-reviews"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-warm-text hover:bg-warm-secondary transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-warm-muted" />
                  <span>Đánh giá của tôi</span>
                </Link>

                <Link
                  to="/settings"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-warm-text hover:bg-warm-secondary transition-colors"
                >
                  <Settings className="w-4 h-4 text-warm-muted" />
                  <span>Cài đặt & Tùy chọn AI</span>
                </Link>

                <div className="border-t border-warm-border-subtle my-1"></div>

                <Link
                  to="/admin/dashboard"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-900 bg-warm-pastel-amber border border-warm-border shadow-brutal-xs my-1"
                >
                  <Shield className="w-4 h-4 text-warm-primary" />
                  <span>Admin Control Center</span>
                </Link>

                <Link
                  to="/auth"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Đổi tài khoản / Đăng xuất</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  );
};
