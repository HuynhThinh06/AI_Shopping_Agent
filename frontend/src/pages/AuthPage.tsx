import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saveAuthUser } from '../utils/storage';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

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
    phone: '0988123456',
    avatarText: 'TA',
    role: 'Thành viên VIP',
    badge: 'VIP Buyer',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-400',
    description: 'Gu cân bằng, so sánh sản phẩm, đánh giá chi tiết',
  },
  {
    name: 'Quản trị viên Hệ thống',
    email: 'admin@shoppingagent.com',
    phone: '0901888999',
    avatarText: 'AD',
    role: 'Quản trị viên (Admin)',
    badge: 'Admin',
    badgeColor: 'bg-rose-100 text-rose-900 border-rose-400',
    description: 'Toàn quyền Benchmark GIN Index, LLM Logs, Quản lý sản phẩm',
  },
  {
    name: 'Huỳnh Gia Thịnh',
    email: 'giathinh.student@hcmut.edu.vn',
    phone: '0912345678',
    avatarText: 'GT',
    role: 'Sinh viên IT',
    badge: 'Student IT',
    badgeColor: 'bg-blue-100 text-blue-900 border-blue-400',
    description: 'Gu ngân sách tối ưu ("lap 15 củ học IT"), tìm kiếm giá rẻ',
  },
  {
    name: 'Hoàng Minh',
    email: 'hoangminh.tech@gmail.com',
    phone: '0933678999',
    avatarText: 'HM',
    role: 'Tech Reviewer',
    badge: 'Specs Gamer',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-400',
    description: 'Gu cấu hình khủng, đồ họa render, viết review chi tiết',
  },
];

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

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Accordion toggle for demo accounts
  const [showDemoBox, setShowDemoBox] = useState<boolean>(initialMode === 'login');

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

  // Clear errors when switching modes
  const handleSwitchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setErrors({});
    setShowDemoBox(newMode === 'login');
  };

  const handleSelectAccount = (acc: TestAccount, autoLogin = false) => {
    setName(acc.name);
    setEmail(acc.email);
    setPhone(acc.phone);
    setPassword('password123');
    setConfirmPassword('password123');
    setErrors({});

    if (autoLogin) {
      saveAuthUser({
        name: acc.name,
        email: acc.email,
        phone: acc.phone,
        avatarText: acc.avatarText,
        role: acc.role,
      });
      const isAdminAccount =
        acc.email.toLowerCase().includes('admin') || acc.role.toLowerCase().includes('admin');
      const target = explicitRedirect || (isAdminAccount ? '/admin/dashboard' : '/');
      navigate(target, { replace: true });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const cleanPhone = phone.replace(/[\s.-]/g, '');
    const initials = name
      ? name.trim().split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
      : email.charAt(0).toUpperCase();

    const isAdminAccount = email.toLowerCase().includes('admin');
    saveAuthUser({
      name: name.trim() || email.split('@')[0],
      email: email.trim(),
      phone: cleanPhone || '0900000000',
      avatarText: initials || 'U',
      role: isAdminAccount ? 'Quản trị viên (Admin)' : 'Thành viên mới',
    });

    const target = explicitRedirect || (isAdminAccount ? '/admin/dashboard' : '/');
    navigate(target, { replace: true });
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

        {/* Quick Demo Login Picker (CHỈ hiển thị khi ở tab Đăng nhập & có thể đóng mở) */}
        {mode === 'login' && (
          <div className="rounded-2xl bg-amber-50/70 border-2 border-warm-text overflow-hidden shadow-brutal-xs">
            <button
              type="button"
              onClick={() => setShowDemoBox(!showDemoBox)}
              className="w-full p-3 flex items-center justify-between text-left hover:bg-amber-100/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-black text-amber-950">
                  Tài khoản kiểm thử nhanh (Dành cho Giám khảo)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] bg-amber-300 text-amber-900 font-extrabold px-1.5 py-0.5 rounded-md border border-amber-900/30">
                  4 Vai trò
                </span>
                {showDemoBox ? (
                  <ChevronUp className="w-3.5 h-3.5 text-amber-900" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-amber-900" />
                )}
              </div>
            </button>

            {showDemoBox && (
              <div className="p-3.5 pt-1 border-t border-amber-200/80 space-y-2.5">
                <p className="text-[11px] text-warm-muted font-medium">
                  Chọn 1 tài khoản bên dưới để <strong>đăng nhập tức thì 1-click</strong> hoặc điền nhanh vào form:
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
            )}
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
            className="w-full py-2.5 rounded-xl bg-warm-primary hover:bg-warm-primary-hover text-warm-primary-text hover:text-white font-black text-xs sm:text-sm border-2 border-warm-text shadow-brutal flex items-center justify-center gap-2 cursor-pointer mt-3 transition-transform active:translate-y-0.5"
          >
            <span>{mode === 'login' ? 'Đăng Nhập Ngay' : 'Tạo Tài Khoản Mới'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
