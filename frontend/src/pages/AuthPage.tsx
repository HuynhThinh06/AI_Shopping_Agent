import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saveAuthUser } from '../utils/storage';
import { Sparkles, Lock, Mail, User, Phone, ArrowRight, ShieldCheck } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  const handleQuickDemoLogin = () => {
    saveAuthUser({
      name: 'Trần Tuấn Anh',
      email: 'tuananh.dev@gmail.com',
      phone: '0988 123 456',
      avatarText: 'TA',
      role: 'Thành viên VIP',
    });
    navigate('/');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const initials = name
      ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
      : 'U';

    saveAuthUser({
      name: name || (email.split('@')[0] || 'Người dùng'),
      email: email || 'user@example.com',
      phone: phone || '0900 000 000',
      avatarText: initials,
      role: 'Thành viên mới',
    });

    navigate('/');
  };

  return (
    <div className="max-w-md mx-auto my-6">
      <div className="bg-warm-surface border-2 border-warm-text rounded-3xl p-6 sm:p-8 shadow-brutal space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 border-2 border-warm-text mx-auto flex items-center justify-center shadow-brutal-xs">
            <Sparkles className="w-6 h-6 text-warm-text" />
          </div>
          <h1 className="text-2xl font-black text-warm-text tracking-tight">
            {mode === 'login' ? 'Đăng Nhập Tài Khoản' : 'Đăng Ký Thành Viên'}
          </h1>
          <p className="text-xs text-warm-muted font-medium">
            Trải nghiệm tìm kiếm và tư vấn sản phẩm thông minh cùng ShoppingAgent AI.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-warm-bg p-1.5 rounded-2xl border-2 border-warm-text shadow-brutal-xs">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-warm-primary text-warm-primary-text border-2 border-warm-text shadow-brutal-xs'
                : 'text-warm-text hover:bg-warm-secondary'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-warm-primary text-warm-primary-text border-2 border-warm-text shadow-brutal-xs'
                : 'text-warm-text hover:bg-warm-secondary'
            }`}
          >
            Đăng ký
          </button>
        </div>

        {/* Quick Demo Login Button */}
        <div className="p-3.5 rounded-2xl bg-warm-pastel-amber border-2 border-warm-text shadow-brutal-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-black text-amber-900">
            <ShieldCheck className="w-4 h-4 text-warm-primary" />
            <span>Đăng nhập thử nghiệm nhanh:</span>
          </div>
          <p className="text-[11px] text-warm-muted font-medium">
            Truy cập ngay với tài khoản mẫu <strong>Tuấn Anh (VIP)</strong> để xem đầy đủ các tính năng cá nhân hóa.
          </p>
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            className="w-full py-2 rounded-xl bg-warm-surface hover:bg-white text-warm-text font-black text-xs border border-warm-text shadow-brutal-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Đăng nhập 1-Click (Demo Account)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-black text-warm-text mb-1">Họ và tên</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
                />
                <User className="w-4 h-4 text-warm-muted absolute left-3 top-2.5" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-warm-text mb-1">Email đăng nhập</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
              />
              <Mail className="w-4 h-4 text-warm-muted absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-warm-text mb-1">Mật khẩu</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
              />
              <Lock className="w-4 h-4 text-warm-muted absolute left-3 top-2.5" />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-black text-warm-text mb-1">Số điện thoại</label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0988 123 456"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
                />
                <Phone className="w-4 h-4 text-warm-muted absolute left-3 top-2.5" />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-warm-primary hover:bg-warm-primary-hover text-warm-primary-text hover:text-white font-black text-xs sm:text-sm border-2 border-warm-text shadow-brutal flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>{mode === 'login' ? 'Đăng Nhập Ngay' : 'Tạo Tài Khoản Mới'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
