import React, { useState } from 'react';
import { getAuthUser, saveAuthUser } from '../utils/storage';
import { User, Settings, Save, CheckCircle2, Sliders } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const currentUser = getAuthUser();
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [priority, setPriority] = useState('balanced');
  const [defaultCategory, setDefaultCategory] = useState('laptop');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const initials = name
      ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
      : 'U';

    saveAuthUser({
      ...currentUser,
      name,
      email,
      phone,
      avatarText: initials,
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
              <label className="block text-xs font-black text-warm-text mb-1">Họ và tên</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-warm-text mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-warm-text mb-1">Số điện thoại</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-warm-text mb-1">Cấp độ tài khoản</label>
              <div className="px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-pastel-amber text-xs font-black text-warm-secondary-text">
                {currentUser.role || 'Thành viên VIP'}
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
    </div>
  );
};
