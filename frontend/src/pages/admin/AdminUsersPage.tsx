import React, { useState, useEffect } from 'react';
import { AdminNav } from '../../components/admin/AdminNav';
import { apiClient } from '../../api/client';
import type { AdminUserDTO } from '../../types/admin';
import type { PageResponse } from '../../types/review';
import { Users, Search, Shield, ShieldAlert, CheckCircle2, Lock, Unlock, Trash2, Database, AlertCircle } from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUserDTO[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadUsers = async (pageIdx = page) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: pageIdx, size: 10 };
      if (roleFilter) params.role = roleFilter;
      if (keyword.trim()) params.keyword = keyword.trim();

      const res = await apiClient.get<PageResponse<AdminUserDTO>>('/admin/users', { params });
      setUsers(res.data.content);
      setTotalPages(res.data.totalPages);
      setTotalElements(res.data.totalElements);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(page);
  }, [page, roleFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadUsers(0);
  };

  const handleToggleRole = async (user: AdminUserDTO) => {
    const newRole = user.role.toLowerCase() === 'admin' ? 'user' : 'admin';
    const confirmMsg = `Bạn có chắc muốn đổi vai trò của [${user.username}] từ ${user.role.toUpperCase()} thành ${newRole.toUpperCase()}?`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(user.id);
    try {
      await apiClient.put(`/admin/users/${user.id}/role`, { role: newRole });
      setFeedback(`Đã đổi vai trò của người dùng ${user.username} thành ${newRole.toUpperCase()}!`);
      setTimeout(() => setFeedback(null), 3000);
      loadUsers(page);
    } catch (err) {
      console.error('Failed to update role:', err);
      alert('Không thể cập nhật vai trò. Vui lòng thử lại!');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStatus = async (user: AdminUserDTO) => {
    const actionName = user.isActive ? 'Khóa' : 'Mở khóa';
    if (!window.confirm(`Bạn có chắc muốn ${actionName} tài khoản [${user.username}]?`)) return;

    setActionLoadingId(user.id);
    try {
      await apiClient.put(`/admin/users/${user.id}/toggle-status`);
      setFeedback(`Đã ${actionName.toLowerCase()} thành công tài khoản ${user.username}!`);
      setTimeout(() => setFeedback(null), 3000);
      loadUsers(page);
    } catch (err) {
      console.error('Failed to toggle status:', err);
      alert('Không thể thay đổi trạng thái tài khoản!');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (user: AdminUserDTO) => {
    if (!window.confirm(`Xác nhận vô hiệu hóa người dùng [${user.username}]?`)) return;

    setActionLoadingId(user.id);
    try {
      await apiClient.delete(`/admin/users/${user.id}`);
      setFeedback(`Đã vô hiệu hóa tài khoản ${user.username}!`);
      setTimeout(() => setFeedback(null), 3000);
      loadUsers(page);
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Không thể vô hiệu hóa người dùng!');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSeedUsers = async () => {
    if (!window.confirm('Hệ thống sẽ nạp 7 tài khoản mẫu (Admin, Khách hàng VIP, Reviewer, Sinh viên, Spam bot...). Tiếp tục?')) return;
    setLoading(true);
    try {
      await apiClient.post('/seed/users');
      setFeedback('Đã nạp danh sách tài khoản người dùng mẫu thành công!');
      setTimeout(() => setFeedback(null), 3500);
      loadUsers(0);
    } catch (err) {
      console.error('Failed to seed users:', err);
      alert('Nạp tài khoản mẫu thất bại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <AdminNav />

      {/* Header */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-warm-text tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-warm-primary" />
              Quản Trị Người Dùng & Phân Quyền
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-warm-secondary border border-warm-text text-warm-secondary-text text-xs font-black">
              {totalElements} tài khoản
            </span>
          </div>
          <p className="text-xs sm:text-sm text-warm-muted font-medium mt-1">
            Quản lý danh sách thành viên, cấp/thu hồi quyền Quản trị viên (ADMIN) và xử lý khóa tài khoản có dấu hiệu vi phạm/spam.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSeedUsers}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-warm-bg hover:bg-warm-secondary text-warm-text font-black text-xs border-2 border-warm-text shadow-brutal-xs transition-all hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
          title="Tạo sẵn các tài khoản demo (Admin, Reviewer, User thông thường)"
        >
          <Database className="w-4 h-4 text-warm-primary" />
          <span>Nạp Dữ Liệu Tài Khoản Mẫu</span>
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-500 text-emerald-800 font-bold text-xs flex items-center gap-2 shadow-brutal-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 shadow-brutal mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo username, họ tên hoặc email..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
            />
            <Search className="w-4 h-4 text-warm-muted absolute left-3 top-2.5" />
          </div>

          <div className="w-44">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
            >
              <option value="">Tất cả vai trò</option>
              <option value="admin">Quản trị viên (ADMIN)</option>
              <option value="user">Khách hàng (USER)</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-warm-primary text-warm-primary-text font-black text-xs border border-warm-text shadow-brutal-xs cursor-pointer hover:bg-warm-primary-hover"
          >
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl shadow-brutal overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-warm-bg border-b-2 border-warm-text text-warm-text font-black uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">ID / Tên đăng nhập</th>
                <th className="py-3 px-3">Tên hiển thị</th>
                <th className="py-3 px-3">Email</th>
                <th className="py-3 px-3">Vai trò</th>
                <th className="py-3 px-3">Trạng thái</th>
                <th className="py-3 px-3">Thời gian tạo</th>
                <th className="py-3 px-3 text-right">Hành động quản trị</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-warm-border-subtle font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-warm-muted">
                    Đang tải danh sách tài khoản...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-warm-muted">
                    Chưa có tài khoản người dùng nào. Bạn có thể bấm nút &quot;Nạp Dữ Liệu Tài Khoản Mẫu&quot; ở trên để tạo sẵn tài khoản!
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isAdmin = u.role?.toLowerCase() === 'admin';
                  const isActionLoading = actionLoadingId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-warm-bg/70 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-mono font-bold text-warm-text">
                          #{u.id} <span className="text-warm-primary-text font-black">@{u.username}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-warm-text">{u.displayName || '(Chưa đặt)'}</div>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[11px] text-warm-muted">{u.email}</td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 border border-rose-300 text-rose-800">
                            <Shield className="w-3 h-3 text-rose-600" />
                            <span>ADMIN</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-100 border border-sky-300 text-sky-800">
                            <span>USER</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Hoạt động</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>Đã khóa</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[10px] text-warm-muted whitespace-nowrap">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleRole(u)}
                            disabled={isActionLoading}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-warm-bg hover:bg-warm-secondary border border-warm-text text-warm-text font-bold text-[11px] shadow-brutal-xs cursor-pointer disabled:opacity-50"
                            title={isAdmin ? 'Hạ quyền xuống User' : 'Nâng quyền lên Quản trị viên (Admin)'}
                          >
                            <ShieldAlert className="w-3 h-3 text-amber-600" />
                            <span>{isAdmin ? 'Hạ quyền' : 'Lên Admin'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            disabled={isActionLoading}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border font-bold text-[11px] cursor-pointer disabled:opacity-50 ${
                              u.isActive
                                ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800'
                                : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                            }`}
                            title={u.isActive ? 'Khóa tài khoản này' : 'Mở khóa tài khoản này'}
                          >
                            {u.isActive ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                            <span>{u.isActive ? 'Khóa' : 'Mở'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            disabled={isActionLoading}
                            className="p-1 rounded-lg hover:bg-rose-100 text-rose-600 border border-warm-text/20 cursor-pointer disabled:opacity-50"
                            title="Vô hiệu hóa người dùng"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 bg-warm-bg border-t-2 border-warm-text flex items-center justify-between">
            <span className="text-xs font-bold text-warm-muted">
              Trang {page + 1} / {totalPages} (Tổng {totalElements} người dùng)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 rounded-lg border border-warm-text bg-white disabled:opacity-50 text-xs font-bold cursor-pointer"
              >
                Trước
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 rounded-lg border border-warm-text bg-white disabled:opacity-50 text-xs font-bold cursor-pointer"
              >
                Tiếp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
