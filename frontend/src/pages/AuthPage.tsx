import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saveAuthUser, saveAuthToken } from '../utils/storage';
import { authApi } from '../api/authApi';
import { Sparkles, Lock, Mail, User, Phone, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

interface TestAccount {
  name: string;
  email: string;
  phone: string;
  avatarText: string;
  role: string;
  badge: string;
  badgeColor: string;
  description: string;
}

const TEST_ACCOUNTS: TestAccount[] = [
  {
    name: 'Trần Tuấn Anh',
    email: 'tuananh.dev@gmail.com',
    phone: '0988 123 456',
    avatarText: 'TA',
    role: 'Thành viên VIP',
    badge: 'VIP Buyer',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-400',
    description: 'Gu cân bằng, so sánh sản phẩm, đánh giá chi tiết',
  },
  {
    name: 'Quản trị viên Hệ thống',
    email: 'admin@shoppingagent.com',
    phone: '0901 888 999',
    avatarText: 'AD',
    role: 'Quản trị viên (Admin)',
    badge: 'Admin',
    badgeColor: 'bg-rose-100 text-rose-900 border-rose-400',
    description: 'Toàn quyền Benchmark GIN Index, LLM Logs, Quản lý sản phẩm',
  },
  {
    name: 'Huỳnh Gia Thịnh',
    email: 'giathinh.student@hcmut.edu.vn',
    phone: '0912 345 678',
    avatarText: 'GT',
    role: 'Sinh viên IT',
    badge: 'Student IT',
    badgeColor: 'bg-blue-100 text-blue-900 border-blue-400',
    description: 'Gu ngân sách tối ưu ("lap 15 củ học IT"), tìm kiếm giá rẻ',
  },
  {
    name: 'Hoàng Minh',
    email: 'hoangminh.tech@gmail.com',
    phone: '0933 678 999',
    avatarText: 'HM',
    role: 'Tech Reviewer',
    badge: 'Specs Gamer',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-400',
    description: 'Gu cấu hình khủng, đồ họa render, viết review chi tiết',
  },
];

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const explicitRedirect = searchParams.get('redirect');

  const executeLogin = async (loginEmail: string, loginPass: string, fallbackName?: string, fallbackRole?: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await authApi.login({
        usernameOrEmail: loginEmail,
        password: loginPass,
      });

      saveAuthToken(res.token);
      const displayName = res.user.displayName || fallbackName || loginEmail.split('@')[0];
      const initials = displayName
        ? displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
        : 'U';

      saveAuthUser({
        name: displayName,
        email: res.user.email,
        avatarText: initials,
        role: res.user.role || fallbackRole || 'user',
      });

      const isAdminAccount = (res.user.role && res.user.role.toLowerCase().includes('admin')) || loginEmail.toLowerCase().includes('admin');
      const target = explicitRedirect || (isAdminAccount ? '/admin/dashboard' : '/');
      navigate(target, { replace: true });
    } catch (err: any) {
      console.warn('[Auth] Server login failed, fallback to offline demo:', err);
      const message = err?.response?.data?.message || err.message || 'Đăng nhập không thành công';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAccount = async (acc: TestAccount, autoLogin = false) => {
    setName(acc.name);
    setEmail(acc.email);
    setPhone(acc.phone);
    setPassword('password123');
    setErrorMsg(null);

    if (autoLogin) {
      await executeLogin(acc.email, 'password123', acc.name, acc.role);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    if (mode === 'login') {
      await executeLogin(email, password, name);
    } else {
      try {
        const username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || `user_${Date.now()}`;
        const res = await authApi.register({
          username,
          email,
          password,
          displayName: name || username,
        });

        saveAuthToken(res.token);
        const displayName = res.user.displayName || name || username;
        const initials = displayName
          ? displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
          : 'U';

        saveAuthUser({
          name: displayName,
          email: res.user.email,
          avatarText: initials,
          role: res.user.role || 'user',
        });

        const target = explicitRedirect || '/';
        navigate(target, { replace: true });
      } catch (err: any) {
        const message = err?.response?.data?.message || err.message || 'Đăng ký không thành công';
        setErrorMsg(message);
      } finally {
        setIsLoading(false);
      }
    }
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

        {/* Quick Demo Login Picker */}
        <div className="p-3.5 rounded-2xl bg-warm-pastel-amber border-2 border-warm-text shadow-brutal-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
              <ShieldCheck className="w-4 h-4 text-warm-primary" />
              <span>Tài khoản kiểm thử đã Seed trên DB:</span>
            </div>
            <span className="text-[10px] bg-amber-300 text-amber-900 font-extrabold px-1.5 py-0.5 rounded-md border border-amber-900/30">
              4 Vai trò
            </span>
          </div>
          <p className="text-[11px] text-warm-muted font-medium">
            Chọn 1 tài khoản bên dưới để đăng nhập tức thì hoặc điền nhanh vào form:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {TEST_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleSelectAccount(acc, true)}
                className="p-2 rounded-xl bg-warm-surface hover:bg-white text-left border border-warm-text shadow-brutal-xs cursor-pointer transition-all hover:translate-x-0.5 hover:-translate-y-0.5 group"
                title={`${acc.description} — Click để đăng nhập ngay`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black text-warm-text truncate group-hover:text-warm-primary">
                    {acc.name.split(' ').slice(-2).join(' ')}
                  </span>
                  <span className={`text-[9px] font-bold px-1 py-0.2 rounded border ${acc.badgeColor}`}>
                    {acc.badge}
                  </span>
                </div>
                <div className="text-[10px] text-warm-muted truncate">{acc.email}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-500 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

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
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-warm-primary hover:bg-warm-primary-hover text-warm-primary-text hover:text-white font-black text-xs sm:text-sm border-2 border-warm-text shadow-brutal flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <span>{mode === 'login' ? 'Đăng Nhập Ngay' : 'Tạo Tài Khoản Mới'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
