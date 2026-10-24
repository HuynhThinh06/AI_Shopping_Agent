import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, Zap, Activity, Sliders, Package, MessageSquare, Layers, Users, ScrollText, Store } from 'lucide-react';

export const AdminNav: React.FC = () => {
  const navItems = [
    { to: '/admin/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { to: '/admin/benchmark', label: 'Benchmark GIN Index', icon: Zap, badge: 'Thực nghiệm' },
    { to: '/admin/llm-logs', label: 'Nhật ký LLM & Chi phí', icon: Activity, badge: 'Gemini' },
    { to: '/admin/weights', label: 'Trọng số Xếp hạng', icon: Sliders },
    { to: '/admin/products', label: 'Sản phẩm', icon: Package },
    { to: '/admin/categories', label: 'Ngành hàng & GIN', icon: Layers },
    { to: '/admin/reviews', label: 'Đánh giá & Cache', icon: MessageSquare },
    { to: '/admin/users', label: 'Người dùng & Quyền', icon: Users },
    { to: '/admin/audit-logs', label: 'Nhật ký thao tác', icon: ScrollText },
  ];

  return (
    <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-3 shadow-brutal mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                  isActive
                    ? 'bg-warm-primary text-warm-primary-text border-2 border-warm-text shadow-brutal-xs -translate-y-0.5'
                    : 'bg-warm-bg hover:bg-warm-secondary text-warm-text border border-warm-text/30'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-warm-pastel-amber border border-warm-text/40 font-mono">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      <div className="flex items-center justify-end">
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-warm-bg hover:bg-warm-secondary text-warm-text font-black text-xs border-2 border-warm-text shadow-brutal-xs transition-all hover:-translate-y-0.5"
          title="Mở giao diện khách hàng để trải nghiệm"
        >
          <Store className="w-4 h-4 text-warm-primary" />
          <span>Về Storefront Khách Hàng</span>
        </Link>
      </div>
    </div>
  );
};
