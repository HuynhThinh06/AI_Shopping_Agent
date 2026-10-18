import React, { useState, useEffect } from 'react';
import { AdminNav } from '../../components/admin/AdminNav';
import { apiClient } from '../../api/client';
import { Layers, Laptop, Smartphone, CheckCircle2, Tag, Plus, Edit, Trash2, Sparkles } from 'lucide-react';

interface CategoryItem {
  id?: number;
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export const AdminCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<CategoryItem[]>('/categories', { params: { includeInactive: true } });
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setCode('');
    setName('');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setCode(cat.code);
    setName(cat.name);
    setDescription(cat.description || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCategory && editingCategory.id) {
        await apiClient.put(`/categories/${editingCategory.id}`, {
          name,
          description,
          isActive: editingCategory.isActive ?? true,
        });
        setFeedback(`Đã cập nhật ngành hàng ${name}!`);
      } else {
        await apiClient.post('/categories', {
          code: code.trim().toLowerCase(),
          name: name.trim(),
          description: description.trim(),
        });
        setFeedback(`Đã tạo mới ngành hàng ${name}!`);
      }
      setTimeout(() => setFeedback(null), 3000);
      setIsModalOpen(false);
      loadCategories();
    } catch (err: any) {
      console.error('Failed to save category:', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi lưu ngành hàng');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: CategoryItem) => {
    if (!cat.id) return;
    if (!window.confirm(`Xác nhận vô hiệu hóa ngành hàng [${cat.name}]?`)) return;

    try {
      await apiClient.delete(`/categories/${cat.id}`);
      setFeedback(`Đã vô hiệu hóa ngành hàng ${cat.name}!`);
      setTimeout(() => setFeedback(null), 3000);
      loadCategories();
    } catch (err) {
      console.error('Failed to delete category:', err);
      alert('Không thể vô hiệu hóa ngành hàng!');
    }
  };

  const getCategoryIcon = (catCode: string) => {
    if (catCode.includes('phone') || catCode.includes('mobile')) return Smartphone;
    if (catCode.includes('laptop') || catCode.includes('pc') || catCode.includes('macbook')) return Laptop;
    return Layers;
  };

  const defaultSpecs = {
    laptop: [
      { key: 'ram', label: 'Dung lượng RAM (GB)', type: 'numeric' },
      { key: 'storage', label: 'Dung lượng ổ cứng (GB)', type: 'numeric' },
      { key: 'cpu', label: 'Vi xử lý (CPU)', type: 'text' },
      { key: 'gpu', label: 'Card đồ họa (VGA)', type: 'text' },
      { key: 'battery', label: 'Dung lượng pin (Wh)', type: 'numeric' },
      { key: 'weight', label: 'Trọng lượng (kg)', type: 'numeric' },
    ],
    phone: [
      { key: 'ram', label: 'Dung lượng RAM (GB)', type: 'numeric' },
      { key: 'storage', label: 'Bộ nhớ trong (GB)', type: 'numeric' },
      { key: 'chipset', label: 'Vi xử lý / Chipset', type: 'text' },
      { key: 'battery', label: 'Dung lượng pin (mAh)', type: 'numeric' },
      { key: 'camera', label: 'Camera chính (MP)', type: 'numeric' },
    ],
  };

  return (
    <div className="space-y-6">
      <AdminNav />

      {/* Header */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-warm-text tracking-tight flex items-center gap-2">
              <Layers className="w-6 h-6 text-warm-primary" />
              Quản Lý Ngành Hàng & Thuộc Tính Lọc (GIN Index)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-warm-secondary border border-warm-text text-warm-secondary-text text-xs font-black">
              {categories.length} ngành hàng
            </span>
          </div>
          <p className="text-xs sm:text-sm text-warm-muted font-medium mt-1">
            Định nghĩa các ngành hàng và các thuộc tính specs JSONB được lập chỉ mục GIN trong PostgreSQL phục vụ tìm kiếm AI.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-warm-primary hover:bg-warm-primary-hover text-warm-primary-text font-black text-xs sm:text-sm border-2 border-warm-text shadow-brutal transition-all hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Ngành Hàng Mới</span>
        </button>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-500 text-emerald-800 font-bold text-xs flex items-center gap-2 shadow-brutal-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Categories Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 p-8 text-center text-warm-muted font-bold text-xs bg-warm-surface border-2 border-warm-text rounded-2xl">
            Đang tải danh sách ngành hàng...
          </div>
        ) : (
          categories.map((cat) => {
            const Icon = getCategoryIcon(cat.code);
            const attrs = (defaultSpecs as any)[cat.code] || [
              { key: 'brand', label: 'Thương hiệu', type: 'text' },
              { key: 'price', label: 'Giá thị trường', type: 'numeric' },
              { key: 'features', label: 'Tính năng đặc biệt', type: 'text' },
            ];

            return (
              <div
                key={cat.code}
                className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b-2 border-warm-border-subtle">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-warm-pastel-amber border-2 border-warm-text flex items-center justify-center shadow-brutal-xs">
                      <Icon className="w-5 h-5 text-warm-primary-text" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-warm-text">{cat.name}</h2>
                      <span className="text-[11px] font-mono font-bold text-warm-muted">
                        Mã code: `{cat.code}`
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {cat.isActive !== false ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px]">
                        Active
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px]">
                        Tạm dừng
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditModal(cat)}
                      className="p-1.5 rounded-lg hover:bg-warm-bg border border-warm-text/20 text-blue-600 font-bold cursor-pointer"
                      title="Sửa ngành hàng"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {cat.id && (
                      <button
                        type="button"
                        onClick={() => handleDelete(cat)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 border border-warm-text/20 text-rose-600 font-bold cursor-pointer"
                        title="Vô hiệu hóa ngành hàng"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-warm-muted leading-relaxed font-medium">
                  {cat.description || 'Chưa có mô tả cho ngành hàng này.'}
                </p>

                {/* Attributes Table */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase text-warm-text">
                    <Tag className="w-3.5 h-3.5 text-warm-primary" />
                    <span>Thuộc tính được hỗ trợ trích xuất & lọc GIN:</span>
                  </div>

                  <div className="space-y-1.5">
                    {attrs.map((attr: any) => (
                      <div
                        key={attr.key}
                        className="p-2.5 rounded-xl bg-warm-bg border border-warm-text/20 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-warm-primary-text bg-white px-2 py-0.5 rounded border border-warm-text/20">
                            {attr.key}
                          </span>
                          <span className="font-bold text-warm-text">{attr.label}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-warm-muted bg-warm-surface px-1.5 py-0.5 rounded">
                            {attr.type}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold text-[11px]">
                            <CheckCircle2 className="w-3 h-3" /> GIN Index
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-6 max-w-md w-full shadow-brutal space-y-4">
            <h3 className="text-lg font-black text-warm-text flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-warm-primary" />
              <span>{editingCategory ? 'Chỉnh Sửa Ngành Hàng' : 'Thêm Mới Ngành Hàng'}</span>
            </h3>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-black text-warm-text mb-1">Mã Code (viết liền không dấu) *</label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingCategory)}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="tablet, smartwatch, monitor..."
                  className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-mono font-bold focus:outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-warm-text mb-1">Tên ngành hàng *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Máy tính bảng (Tablet)"
                  className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-warm-text mb-1">Mô tả ngành hàng</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả phân khúc sản phẩm, mục đích sử dụng..."
                  className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-warm-bg border border-warm-text text-warm-text font-bold text-xs cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-warm-primary hover:bg-warm-primary-hover text-warm-primary-text font-black text-xs border-2 border-warm-text shadow-brutal-xs cursor-pointer"
                >
                  {saving ? 'Đang lưu...' : 'Lưu ngành hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
