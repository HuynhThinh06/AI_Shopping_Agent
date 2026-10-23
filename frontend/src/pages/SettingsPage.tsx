import React, { useState, useEffect } from 'react';
import { getAuthUser, saveAuthUser } from '../utils/storage';
import { authApi, type UserSessionDTO } from '../api/authApi';
import {
  User,
  Settings,
  Save,
  CheckCircle2,
  Sliders,
  AlertCircle,
  ShieldCheck,
  Laptop,
  Smartphone,
  Globe,
  LogOut,
  RefreshCw,
  Trash2,
} from 'lucide-react';

const VN_PHONE_REGEX = /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const SettingsPage: React.FC = () => {
  const currentUser = getAuthUser();
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [priority, setPriority] = useState('balanced');
  const [defaultCategory, setDefaultCategory] = useState('laptop');
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string }>({});

  // Quản lý phiên đăng nhập và bảo mật
  const [sessions, setSessions] = useState<UserSessionDTO[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(false);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  const loadSessions = async () => {
    if (!currentUser?.email) return;
    setIsLoadingSessions(true);
    try {
      const list = await authApi.getSessions();
      setSessions(list);
    } catch (err) {
      console.warn('[Sessions] Failed to load active sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleRevokeSession = async (sessionId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi phiên đăng nhập này?')) return;
    try {
      await authApi.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSessionMessage(`Đã thu hồi phiên làm việc #${sessionId}`);
      setTimeout(() => setSessionMessage(null), 3500);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Không thể thu hồi phiên đăng nhập');
    }
  };

  const handleRevokeOtherSessions = async () => {
    if (!window.confirm('Bạn có chắc muốn đăng xuất khỏi tất cả các thiết bị khác ngoài thiết bị này?')) return;
    try {
      await authApi.revokeOtherSessions();
      await loadSessions();
      setSessionMessage('Đã đăng xuất thành công khỏi tất cả các thiết bị khác!');
      setTimeout(() => setSessionMessage(null), 3500);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Không thể đăng xuất các thiết bị khác');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; email?: string; phone?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Vui lòng nhập họ và tên.';
    }

    if (!email.trim()) {
      newErrors.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      newErrors.email = 'Email không hợp lệ (VD: name@example.com).';
    }

    const cleanPhone = phone.replace(/[\s.-]/g, '');
    if (cleanPhone && !VN_PHONE_REGEX.test(cleanPhone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ (Phải gồm 10 số thuộc đầu số 03x, 05x, 07x, 08x, 09x).';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const initials = name
      ? name.trim().split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
      : 'U';

    saveAuthUser({
      name: name.trim() || 'Người dùng',
      email: email.trim(),
      phone: cleanPhone || '0900000000',
      avatarText: initials,
      role: currentUser?.role || 'Thành viên mới',
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-warm-secondary border border-warm-text text-warm-secondary-text text-xs font-black uppercase">
              Tùy biến cá nhân
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-warm-text tracking-tight mt-1 flex items-center gap-2">
            <Settings className="w-7 h-7 text-warm-primary" />
            Cài Đặt Tài Khoản & Tùy Chọn AI
          </h1>
          <p className="text-xs sm:text-sm text-warm-muted font-medium mt-1">
            Quản lý thông tin hồ sơ và thiết lập gu mua sắm để trợ lý AI tư vấn sát với nhu cầu nhất.
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>Đã lưu cài đặt!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b-2 border-warm-border-subtle">
            <User className="w-4 h-4 text-warm-primary" />
            <h2 className="text-sm font-black text-warm-text uppercase tracking-wider">
              Thông Tin Hồ Sơ Người Dùng
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-warm-text mb-1">
                Họ và tên <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                className={`w-full px-3 py-2 rounded-xl border-2 text-xs font-bold focus:outline-none ${
                  errors.name
                    ? 'border-rose-500 bg-rose-50 text-rose-900'
                    : 'border-warm-text bg-warm-bg text-warm-text'
                }`}
              />
              {errors.name && (
                <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.name}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-warm-text mb-1">
                Email <span className="text-rose-600">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                className={`w-full px-3 py-2 rounded-xl border-2 text-xs font-bold focus:outline-none ${
                  errors.email
                    ? 'border-rose-500 bg-rose-50 text-rose-900'
                    : 'border-warm-text bg-warm-bg text-warm-text'
                }`}
              />
              {errors.email && (
                <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-warm-text mb-1">Số điện thoại</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                placeholder="0988 123 456"
                className={`w-full px-3 py-2 rounded-xl border-2 text-xs font-bold focus:outline-none ${
                  errors.phone
                    ? 'border-rose-500 bg-rose-50 text-rose-900'
                    : 'border-warm-text bg-warm-bg text-warm-text'
                }`}
              />
              {errors.phone && (
                <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.phone}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-warm-text mb-1">Cấp độ tài khoản</label>
              <div className="px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-pastel-amber text-xs font-black text-warm-secondary-text">
                {currentUser?.role || 'Khách vãng lai (Chưa đăng nhập)'}
              </div>
            </div>
          </div>
        </div>

        {/* AI Shopping Preferences */}
        <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b-2 border-warm-border-subtle">
            <Sliders className="w-4 h-4 text-warm-primary" />
            <h2 className="text-sm font-black text-warm-text uppercase tracking-wider">
              Gu Mua Sắm & Thuật Toán Gợi Ý AI
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-warm-text mb-1">
                Ngành hàng quan tâm thường xuyên
              </label>
              <select
                value={defaultCategory}
                onChange={(e) => setDefaultCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
              >
                <option value="laptop">Laptop (Máy tính xách tay & Đồ họa)</option>
                <option value="phone">Điện thoại (Smartphone & Camera phone)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-warm-text mb-2">
                Đặc tính bạn quan tâm hàng đầu khi mua hàng:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'balanced', title: 'Cân bằng', desc: 'Hài hòa giữa giá cả, cấu hình và độ uy tín.' },
                  { id: 'price', title: 'Ưu tiên Giá tốt', desc: 'Luôn tìm sản phẩm có mức chiết khấu và giá rẻ nhất.' },
                  { id: 'specs', title: 'Cấu hình khủng', desc: 'Bắt buộc RAM lớn, chip mạnh, màn hình đẹp.' },
                ].map((item) => (
                  <label
                    key={item.id}
                    onClick={() => setPriority(item.id)}
                    className={`p-3.5 rounded-xl border-2 border-warm-text cursor-pointer transition-all flex flex-col justify-between ${
                      priority === item.id
                        ? 'bg-warm-pastel-amber shadow-brutal-xs -translate-y-0.5'
                        : 'bg-warm-bg hover:bg-warm-secondary'
                    }`}
                  >
                    <div>
                      <div className="font-black text-xs text-warm-text">{item.title}</div>
                      <div className="text-[11px] text-warm-muted mt-1 leading-normal">
                        {item.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-warm-primary hover:bg-warm-primary-hover text-warm-primary-text hover:text-white font-black text-xs sm:text-sm border-2 border-warm-text shadow-brutal flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Lưu tất cả thay đổi</span>
          </button>
        </div>
      </form>

      {/* Security & Active Sessions Card */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b-2 border-warm-border-subtle gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 border-2 border-warm-text flex items-center justify-center text-emerald-800 shadow-brutal-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-warm-text uppercase tracking-wider">
                Bảo Mật & Quản Lý Phiên Đăng Nhập
              </h2>
              <p className="text-xs text-warm-muted font-medium">
                Kiểm soát các thiết bị và trình duyệt đang duy trì kết nối tới tài khoản của bạn.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadSessions}
              disabled={isLoadingSessions}
              className="px-3 py-1.5 rounded-xl bg-warm-bg hover:bg-warm-secondary border-2 border-warm-text text-warm-text font-black text-xs shadow-brutal-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Làm mới danh sách phiên"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSessions ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>

            {sessions.filter((s) => !s.isCurrent).length > 0 && (
              <button
                type="button"
                onClick={handleRevokeOtherSessions}
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-rose-400 font-black text-xs shadow-brutal-xs flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất thiết bị khác</span>
              </button>
            )}
          </div>
        </div>

        {sessionMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border-2 border-emerald-400 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{sessionMessage}</span>
          </div>
        )}

        <div className="space-y-2.5">
          {sessions.length === 0 ? (
            <div className="py-6 text-center text-xs text-warm-muted font-bold">
              {isLoadingSessions ? 'Đang tải danh sách thiết bị...' : 'Chưa có thông tin phiên làm việc nào.'}
            </div>
          ) : (
            sessions.map((sess) => {
              const isPhone = sess.deviceInfo.toLowerCase().includes('phone') || sess.deviceInfo.toLowerCase().includes('android');
              return (
                <div
                  key={sess.id}
                  className={`p-3.5 rounded-xl border-2 border-warm-text flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                    sess.isCurrent ? 'bg-amber-50/80 shadow-brutal-xs' : 'bg-warm-bg'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-warm-surface border border-warm-text flex items-center justify-center shrink-0">
                      {isPhone ? (
                        <Smartphone className="w-4 h-4 text-warm-text" />
                      ) : (
                        <Laptop className="w-4 h-4 text-warm-text" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-warm-text">{sess.deviceInfo}</span>
                        {sess.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-400 text-[10px] font-black uppercase">
                            Thiết bị này
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-warm-muted font-medium mt-0.5">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-warm-muted" />
                          IP: {sess.ipAddress}
                        </span>
                        <span>•</span>
                        <span>Hoạt động: {new Date(sess.lastActiveAt).toLocaleString('vi-VN')}</span>
                      </div>
                    </div>
                  </div>

                  {!sess.isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleRevokeSession(sess.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs flex items-center gap-1 self-end sm:self-center cursor-pointer transition-colors"
                      title="Hủy phiên làm việc này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Thu hồi</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
