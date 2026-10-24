import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saveAuthUser, saveAuthToken } from '../utils/storage';
import { authApi } from '../api/authApi';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
} from 'lucide-react';

// Regex kiểm tra số điện thoại chuẩn các nhà mạng Việt Nam:
// 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09 (hoặc +84)
const VN_PHONE_REGEX = /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
// Regex kiểm tra email chuẩn
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Inline Validation Errors
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    phone?: string;
    general?: string;
  }>({});

  const explicitRedirect = searchParams.get('redirect');
  const isExpired = searchParams.get('expired') === '1';

  // Clear errors when switching modes
  const handleSwitchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setErrors({});
    setErrorMsg(null);
  };

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

  const validateForm = (): boolean => {
    const newErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      phone?: string;
    } = {};

    // 1. Kiểm tra Họ và tên (chế độ đăng ký)
    if (mode === 'register') {
      const trimmedName = name.trim();
      if (!trimmedName) {
        newErrors.name = 'Vui lòng nhập họ và tên của bạn.';
      } else if (trimmedName.length < 2) {
        newErrors.name = 'Họ và tên phải có ít nhất 2 ký tự.';
      } else if (/[0-9]/.test(trimmedName)) {
        newErrors.name = 'Họ và tên không được chứa chữ số.';
      }
    }

    // 2. Kiểm tra Email
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      newErrors.email = 'Email không hợp lệ (Ví dụ: name@example.com).';
    }

    // 3. Kiểm tra Mật khẩu
    if (!password) {
      newErrors.password = 'Vui lòng nhập mật khẩu.';
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.';
    }

    // 4. Kiểm tra Xác nhận mật khẩu (chế độ đăng ký)
    if (mode === 'register') {
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Vui lòng nhập lại mật khẩu để xác nhận.';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Mật khẩu xác nhận không trùng khớp.';
      }
    }

    // 5. Kiểm tra Số điện thoại (chế độ đăng ký hoặc nếu có nhập)
    if (mode === 'register' || phone.trim() !== '') {
      const cleanPhone = phone.replace(/[\s.-]/g, '');
      if (!cleanPhone && mode === 'register') {
        newErrors.phone = 'Vui lòng nhập số điện thoại liên hệ.';
      } else if (cleanPhone && !VN_PHONE_REGEX.test(cleanPhone)) {
        newErrors.phone =
          'Số điện thoại không hợp lệ. Phải gồm 10 chữ số thuộc các đầu số nhà mạng VN (VD: 0988 123 456, 03x, 05x, 07x, 08x, 09x).';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!validateForm()) {
      return;
    }

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
            onClick={() => handleSwitchMode('login')}
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
            onClick={() => handleSwitchMode('register')}
            className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-warm-primary text-warm-primary-text border-2 border-warm-text shadow-brutal-xs'
                : 'text-warm-text hover:bg-warm-secondary'
            }`}
          >
            Đăng ký
          </button>
        </div>

        {/* Session Expired / Auth Required Notice */}
        {isExpired && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-500 text-amber-950 text-xs font-bold flex items-center gap-2.5 shadow-brutal-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
            <span>Phiên làm việc đã hết hạn hoặc chưa được xác thực. Vui lòng đăng nhập lại để tiếp tục thao tác!</span>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-500 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Quick Admin Helper for testing */}
        {mode === 'login' && (
          <div className="p-2.5 rounded-2xl bg-warm-bg border border-warm-border flex items-center justify-between text-xs">
            <span className="text-[11px] text-warm-muted font-bold">Thử nghiệm Quản trị viên:</span>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@shoppingagent.com');
                setPassword('password123');
                setErrors({});
                setErrorMsg(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-warm-secondary hover:bg-warm-primary/30 text-warm-text border border-warm-border text-[11px] font-black transition-colors cursor-pointer"
            >
              🔑 Điền mẫu Admin
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-black text-warm-text mb-1">
                Họ và tên <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder="Nguyễn Văn A"
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border-2 text-xs font-bold focus:outline-none transition-colors ${
                    errors.name
                      ? 'border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-1 focus:ring-rose-500'
                      : 'border-warm-text bg-warm-bg text-warm-text'
                  }`}
                />
                <User className="w-4 h-4 text-warm-muted absolute left-3 top-2.5" />
              </div>
              {errors.name && (
                <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.name}</span>
                </p>
              )}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-black text-warm-text mb-1">
              Email đăng nhập <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="name@example.com"
                className={`w-full pl-9 pr-3 py-2 rounded-xl border-2 text-xs font-bold focus:outline-none transition-colors ${
                  errors.email
                    ? 'border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-1 focus:ring-rose-500'
                    : 'border-warm-text bg-warm-bg text-warm-text'
                }`}
              />
              <Mail className="w-4 h-4 text-warm-muted absolute left-3 top-2.5" />
            </div>
            {errors.email && (
              <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.email}</span>
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-black text-warm-text mb-1">
              Mật khẩu <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                className={`w-full pl-9 pr-10 py-2 rounded-xl border-2 text-xs font-bold focus:outline-none transition-colors ${
                  errors.password
                    ? 'border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-1 focus:ring-rose-500'
                    : 'border-warm-text bg-warm-bg text-warm-text'
                }`}
              />
              <Lock className="w-4 h-4 text-warm-muted absolute left-3 top-2.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-warm-muted hover:text-warm-text cursor-pointer"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.password}</span>
              </p>
            )}
          </div>

          {/* Confirm Password (chỉ hiện khi Đăng ký) */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-black text-warm-text mb-1">
                Xác nhận mật khẩu <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword)
                      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  placeholder="Nhập lại mật khẩu"
                  className={`w-full pl-9 pr-10 py-2 rounded-xl border-2 text-xs font-bold focus:outline-none transition-colors ${
                    errors.confirmPassword
                      ? 'border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-1 focus:ring-rose-500'
                      : 'border-warm-text bg-warm-bg text-warm-text'
                  }`}
                />
                <Lock className="w-4 h-4 text-warm-muted absolute left-3 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-warm-muted hover:text-warm-text cursor-pointer"
                  title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.confirmPassword}</span>
                </p>
              )}
            </div>
          )}

          {/* Phone Number */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-black text-warm-text mb-1">
                Số điện thoại liên hệ <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  placeholder="0988 123 456 (10 chữ số)"
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border-2 text-xs font-bold focus:outline-none transition-colors ${
                    errors.phone
                      ? 'border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-1 focus:ring-rose-500'
                      : 'border-warm-text bg-warm-bg text-warm-text'
                  }`}
                />
                <Phone className="w-4 h-4 text-warm-muted absolute left-3 top-2.5" />
              </div>
              {errors.phone ? (
                <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.phone}</span>
                </p>
              ) : (
                <p className="text-[10px] text-warm-muted mt-1">
                  Định dạng 10 chữ số hợp lệ thuộc các nhà mạng Việt Nam (03x, 05x, 07x, 08x, 09x).
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-warm-primary hover:bg-warm-primary-hover text-warm-primary-text hover:text-white font-black text-xs sm:text-sm border-2 border-warm-text shadow-brutal flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50 transition-transform active:translate-y-0.5"
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
