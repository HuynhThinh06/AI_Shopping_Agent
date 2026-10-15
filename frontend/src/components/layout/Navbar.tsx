import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Shield, BarChart3, Sliders, History, Search } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="sticky top-3 z-40 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
      <header className="bg-warm-surface border-2 border-warm-border rounded-2xl sm:rounded-3xl shadow-brutal px-4 sm:px-6 py-3 flex items-center justify-between gap-4 transition-all">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group focus:outline-none shrink-0">
          <div className="w-11 h-11 rounded-2xl border-2 border-warm-border shadow-brutal-xs overflow-hidden group-hover:-translate-y-0.5 transition-all shrink-0 bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-extrabold text-warm-text tracking-tight flex items-center gap-1.5 leading-none">
              ShoppingAgent
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-warm-border bg-warm-secondary text-warm-secondary-text">
                AI
              </span>
            </span>
            <span className="text-xs text-warm-muted hidden sm:block mt-1 font-medium">
              Trợ lý Mua sắm Công nghệ
            </span>
          </div>
        </Link>

        {/* Navigation links */}
        <nav className="flex items-center gap-2 sm:gap-3 text-sm font-bold">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-xl border-2 transition-all flex items-center gap-1.5 ${
              isActive('/')
                ? 'bg-warm-primary text-warm-primary-text border-warm-border shadow-brutal-xs'
                : 'bg-warm-surface text-warm-text border-transparent hover:border-warm-border hover:bg-warm-subtle'
            }`}
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Tìm kiếm AI</span>
          </Link>

          {/* Admin Navigation Dropdown / Group */}
          <div className="flex items-center gap-1.5 p-1 bg-warm-subtle rounded-2xl border border-warm-border">
            <Link
              to="/admin/benchmark"
              title="Đo đạc Benchmark GIN Index"
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                isActive('/admin/benchmark')
                  ? 'bg-amber-400 text-warm-text border border-warm-border shadow-brutal-xs'
                  : 'hover:bg-warm-surface text-warm-muted'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Benchmark</span>
            </Link>

            <Link
              to="/admin/llm-logs"
              title="Thống kê Log LLM & Token"
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                isActive('/admin/llm-logs')
                  ? 'bg-amber-400 text-warm-text border border-warm-border shadow-brutal-xs'
                  : 'hover:bg-warm-surface text-warm-muted'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden md:inline">LLM Logs</span>
            </Link>

            <Link
              to="/admin/weights"
              title="Cấu hình Trọng số Xếp hạng"
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                isActive('/admin/weights')
                  ? 'bg-amber-400 text-warm-text border border-warm-border shadow-brutal-xs'
                  : 'hover:bg-warm-surface text-warm-muted'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Trọng số</span>
            </Link>

            <Link
              to="/admin/dashboard"
              title="Quản trị Hệ thống"
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                isActive('/admin/dashboard')
                  ? 'bg-amber-400 text-warm-text border border-warm-border shadow-brutal-xs'
                  : 'hover:bg-warm-surface text-warm-muted'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Admin</span>
            </Link>
          </div>
        </nav>
      </header>
    </div>
  );
};
