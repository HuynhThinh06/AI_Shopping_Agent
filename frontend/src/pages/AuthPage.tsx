import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saveAuthUser, saveAuthToken, saveRefreshToken } from '../utils/storage';
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
  ChevronDown,
  ChevronUp,
  KeyRound,
  ArrowLeft,
  RotateCw,
  CheckCircle2,
  ShieldCheck,
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
  const isExpired = searchParams.get('expired') === '1';

  // Clear errors when switching modes
  const handleSwitchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setErrors({});
    setErrorMsg(null);
    setErrorCode(null);
    setShowDemoBox(newMode === 'login');
    setIsOtpStep(false);
    setOtpSuccessMessage(null);
  };

  // OTP Verification state cho xác thực Gmail
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOtpStep) return;

    const timer = setInterval(() => {
      setOtpExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOtpStep]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otpCode];
    next[index] = digit;
    setOtpCode(next);

    if (digit && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasteData) return;
    const digits = pasteData.split('');
    const next = [...otpCode];
    digits.forEach((d, i) => {
      if (i < 6) next[i] = d;
    });
    setOtpCode(next);
    const lastIndex = Math.min(digits.length, 5);
    const targetInput = document.getElementById(`otp-input-${lastIndex}`);
    targetInput?.focus();
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otpCode.join('').trim();
    if (fullOtp.length !== 6) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số mã xác thực.');
      return;
    }

    setIsVerifyingOtp(true);
    setErrorMsg(null);

    try {
      const res = await authApi.verifyRegistrationOtp({
        email,
        otp: fullOtp,
      });

      saveAuthToken(res.accessToken || res.token);
      if (res.refreshToken) {
        saveRefreshToken(res.refreshToken);
      }
      const displayName = res.user.displayName || name || email.split('@')[0];
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
      const message = err?.response?.data?.message || err.message || 'Mã xác thực không hợp lệ';
      setErrorMsg(message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setIsResendingOtp(true);
    setErrorMsg(null);

    try {
      const res = await authApi.resendOtp({ email });
      setResendCooldown(res.cooldownSeconds || 60);
      setOtpExpirySeconds(res.expiresInSeconds || 300);
      setOtpSuccessMessage('Đã gửi lại mã xác nhận mới tới email của bạn!');
      setTimeout(() => setOtpSuccessMessage(null), 4000);
    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || 'Không thể gửi lại mã OTP';
      setErrorMsg(message);
    } finally {
      setIsResendingOtp(false);
    }
  };

  const executeLogin = async (loginEmail: string, loginPass: string, fallbackName?: string, fallbackRole?: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await authApi.login({
        usernameOrEmail: loginEmail,
        password: loginPass,
      });

      saveAuthToken(res.accessToken || res.token);
      if (res.refreshToken) {
        saveRefreshToken(res.refreshToken);
      }
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
    setConfirmPassword('password123');
    setErrors({});
    setErrorMsg(null);
    setErrorCode(null);

    if (autoLogin) {
      await executeLogin(acc.email, 'password123', acc.name, acc.role);
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
        const res = await authApi.registerInitiate({
          username,
          email,
          password,
          displayName: name || username,
        });

        setIsOtpStep(true);
        setOtpExpirySeconds(res.expiresInSeconds || 300);
        setResendCooldown(res.cooldownSeconds || 60);
        setOtpCode(['', '', '', '', '', '']);
        setOtpSuccessMessage(res.message);
        setErrorMsg(null);
        setErrorCode(null);
      } catch (err: any) {
        const message = err?.response?.data?.message || err.message || 'Không thể gửi mã xác nhận qua email';
        const code = err?.response?.data?.code || null;
        setErrorMsg(message);
        setErrorCode(code);
        if (code === 'DUPLICATE_EMAIL' || message.toLowerCase().includes('email đã được đăng ký')) {
          setErrors((prev) => ({ ...prev, email: 'Địa chỉ Email này đã có tài khoản trong hệ thống' }));
        }
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

        {mode === 'register' && isOtpStep ? (
          /* OTP Verification Step View */
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-2 border-b-2 border-warm-border-subtle">
              <button
                type="button"
                onClick={() => {
                  setIsOtpStep(false);
                  setErrorMsg(null);
                }}
                className="flex items-center gap-1.5 text-xs font-black text-warm-text hover:text-warm-primary transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại sửa thông tin</span>
              </button>
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                Bước 2 / 2: Xác thực
              </span>
            </div>

            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-xl bg-amber-400 border-2 border-warm-text flex items-center justify-center text-warm-text mx-auto shadow-brutal-xs">
                <KeyRound className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-black text-warm-text">Nhập Mã Xác Nhận</h2>
              <p className="text-xs text-warm-muted font-medium">
                Mã gồm 6 chữ số đã được gửi tới hòm thư:{' '}
                <span className="font-black text-warm-text underline">{email}</span>
              </p>
            </div>

            {otpSuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border-2 border-emerald-500 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{otpSuccessMessage}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-500 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 6 Digit Input Boxes with Paste Support */}
            <div>
              <label className="block text-xs font-black text-warm-text mb-2 text-center uppercase tracking-wider">
                Mã xác thực OTP (6 chữ số)
              </label>
              <div className="flex justify-center gap-2 sm:gap-2.5 my-2" onPaste={handleOtpPaste}>
                {otpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-input-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-10 h-12 sm:w-11 sm:h-13 text-center text-xl font-black rounded-xl border-2 border-warm-text bg-white shadow-brutal-xs focus:bg-amber-50 focus:border-warm-primary focus:outline-none transition-all"
                  />
                ))}
              </div>
              <p className="text-[11px] text-center text-warm-muted font-medium mt-1">
                (Gợi ý: Bạn có thể sao chép và dán nhanh 6 số vào bất kỳ ô nào)
              </p>
            </div>

            {/* Timer & Resend */}
            <div className="flex items-center justify-between text-xs px-2 pt-1 font-bold">
              <span className={`flex items-center gap-1 ${otpExpirySeconds < 60 ? 'text-rose-600 font-black' : 'text-warm-muted'}`}>
                <span>Hết hạn sau:</span>
                <span className="font-mono text-xs">{formatTime(otpExpirySeconds)}</span>
              </span>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isResendingOtp}
                className="text-warm-text hover:text-warm-primary flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-black text-xs"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isResendingOtp ? 'animate-spin' : ''}`} />
                <span>{resendCooldown > 0 ? `Gửi lại sau (${resendCooldown}s)` : 'Gửi lại mã mới'}</span>
              </button>
            </div>

            {/* Dev helper note */}
            <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-300 text-[11px] text-amber-900 leading-relaxed font-medium">
              💡 <strong>Lưu ý kiểm thử:</strong> Mã OTP đồng thời được in trực tiếp trên <strong>Terminal Console của Backend</strong> để bạn có thể sao chép kiểm thử ngay mà không phụ thuộc vào gửi Gmail thật.
            </div>

            {/* Action Submit */}
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={isVerifyingOtp || otpCode.join('').length !== 6}
              className="w-full py-2.5 rounded-xl bg-warm-primary hover:bg-warm-primary-hover text-warm-primary-text hover:text-white font-black text-xs sm:text-sm border-2 border-warm-text shadow-brutal flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-transform active:translate-y-0.5"
            >
              {isVerifyingOtp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác nhận mã OTP...</span>
                </>
              ) : (
                <>
                  <span>Xác Nhận & Hoàn Tất Đăng Ký</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            {/* Error message */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-500 text-rose-800 text-xs font-bold space-y-2.5 shadow-brutal-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span className="font-black leading-snug">{errorMsg}</span>
                </div>

                {(errorCode === 'DUPLICATE_EMAIL' ||
                  errorMsg.toLowerCase().includes('đã được đăng ký') ||
                  errorMsg.toLowerCase().includes('đã tồn tại')) && (
                  <div className="pt-2 border-t border-rose-200/80 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-rose-700 font-medium">
                      Bạn đã có tài khoản với email này?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        handleSwitchMode('login');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] flex items-center gap-1 transition-transform active:scale-95 cursor-pointer shadow-sm shrink-0"
                    >
                      <span>Đăng nhập ngay</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
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
                <span>{mode === 'login' ? 'Đăng Nhập Ngay' : 'Gửi Mã Xác Nhận Qua Gmail'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
        </>
        )}
      </div>
    </div>
  );
};
