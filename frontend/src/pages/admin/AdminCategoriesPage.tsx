import React, { useState, useEffect } from 'react';
import { AdminNav } from '../../components/admin/AdminNav';
import { apiClient } from '../../api/client';
import {
  Layers,
  Laptop,
  Smartphone,
  CheckCircle2,
  Tag,
  Plus,
  Edit,
  Trash2,
  Sparkles,
  X,
} from 'lucide-react';

export interface CategoryAttributeItem {
  id?: number;
  attributeKey: string;
  attributeLabel: string;
  unit?: string;
  dataType: string;
  isFilterable?: boolean;
  displayOrder?: number;
}

interface CategoryItem {
  id?: number;
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
  attributes?: CategoryAttributeItem[];
}

const DEFAULT_FALLBACK_SPECS: Record<string, CategoryAttributeItem[]> = {
  laptop: [
    { attributeKey: 'ram', attributeLabel: 'Dung lượng RAM', unit: 'GB', dataType: 'number', isFilterable: true },
    { attributeKey: 'storage', attributeLabel: 'Dung lượng ổ cứng', unit: 'GB', dataType: 'number', isFilterable: true },
    { attributeKey: 'cpu', attributeLabel: 'Vi xử lý (CPU)', unit: '', dataType: 'text', isFilterable: true },
    { attributeKey: 'gpu', attributeLabel: 'Card đồ họa (VGA)', unit: '', dataType: 'text', isFilterable: true },
    { attributeKey: 'battery', attributeLabel: 'Dung lượng pin', unit: 'Wh', dataType: 'number', isFilterable: true },
    { attributeKey: 'weight', attributeLabel: 'Trọng lượng', unit: 'kg', dataType: 'number', isFilterable: true },
  ],
  phone: [
    { attributeKey: 'ram', attributeLabel: 'Dung lượng RAM', unit: 'GB', dataType: 'number', isFilterable: true },
    { attributeKey: 'storage', attributeLabel: 'Bộ nhớ trong', unit: 'GB', dataType: 'number', isFilterable: true },
    { attributeKey: 'chipset', attributeLabel: 'Vi xử lý / Chipset', unit: '', dataType: 'text', isFilterable: true },
    { attributeKey: 'battery', attributeLabel: 'Dung lượng pin', unit: 'mAh', dataType: 'number', isFilterable: true },
    { attributeKey: 'camera', attributeLabel: 'Camera chính', unit: 'MP', dataType: 'number', isFilterable: true },
  ],
};

export const AdminCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [modalAttributes, setModalAttributes] = useState<CategoryAttributeItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Quick Add Attribute inline state per Category ID
  const [addingAttrCatId, setAddingAttrCatId] = useState<number | null>(null);
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrLabel, setNewAttrLabel] = useState('');
  const [newAttrUnit, setNewAttrUnit] = useState('');
  const [newAttrType, setNewAttrType] = useState('number');
  const [attrSaving, setAttrSaving] = useState(false);

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

  const getCategoryAttributes = (cat: CategoryItem): CategoryAttributeItem[] => {
    if (cat.attributes && cat.attributes.length > 0) {
      return cat.attributes;
    }
    return DEFAULT_FALLBACK_SPECS[cat.code] || [];
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setCode('');
    setName('');
    setDescription('');
    setModalAttributes([
      { attributeKey: 'ram', attributeLabel: 'Dung lượng RAM', unit: 'GB', dataType: 'number', isFilterable: true },
      { attributeKey: 'storage', attributeLabel: 'Bộ nhớ lưu trữ', unit: 'GB', dataType: 'number', isFilterable: true },
      { attributeKey: 'battery', attributeLabel: 'Dung lượng pin', unit: 'mAh', dataType: 'number', isFilterable: true },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setCode(cat.code);
    setName(cat.name);
    setDescription(cat.description || '');
    const currentAttrs = getCategoryAttributes(cat).map((a) => ({ ...a }));
    setModalAttributes(currentAttrs);
    setIsModalOpen(true);
  };

  const handleAddModalAttrRow = () => {
    setModalAttributes((prev) => [
      ...prev,
      { attributeKey: '', attributeLabel: '', unit: '', dataType: 'text', isFilterable: true },
    ]);
  };

  const handleRemoveModalAttrRow = (index: number) => {
    setModalAttributes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleModalAttrChange = (
    index: number,
    field: keyof CategoryAttributeItem,
    value: string | boolean
  ) => {
    setModalAttributes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cleanAttrs = modalAttributes
        .filter((a) => a.attributeKey.trim().length > 0)
        .map((a, idx) => ({
          attributeKey: a.attributeKey.trim().toLowerCase().replace(/\s+/g, '_'),
          attributeLabel: a.attributeLabel.trim() || a.attributeKey.trim(),
          unit: a.unit?.trim() || '',
          dataType: a.dataType || 'text',
          isFilterable: a.isFilterable ?? true,
          displayOrder: idx + 1,
        }));

      if (editingCategory && editingCategory.id) {
        await apiClient.put(`/categories/${editingCategory.id}`, {
          name: name.trim(),
          description: description.trim(),
          isActive: editingCategory.isActive ?? true,
          attributes: cleanAttrs,
        });
        setFeedback(`Đã cập nhật ngành hàng "${name}" và ${cleanAttrs.length} thuộc tính lọc GIN!`);
      } else {
        await apiClient.post('/categories', {
          code: code.trim().toLowerCase(),
          name: name.trim(),
          description: description.trim(),
          attributes: cleanAttrs,
        });
        setFeedback(`Đã tạo mới ngành hàng "${name}" kèm ${cleanAttrs.length} thuộc tính lọc GIN!`);
      }
      setTimeout(() => setFeedback(null), 3500);
      setIsModalOpen(false);
      loadCategories();
    } catch (err: any) {
      console.error('Failed to save category:', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi lưu ngành hàng');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAddAttribute = async (e: React.FormEvent, cat: CategoryItem) => {
    e.preventDefault();
    if (!cat.id || !newAttrKey.trim()) return;
    setAttrSaving(true);
    try {
      await apiClient.post(`/categories/${cat.id}/attributes`, {
        attributeKey: newAttrKey.trim().toLowerCase().replace(/\s+/g, '_'),
        attributeLabel: newAttrLabel.trim() || newAttrKey.trim(),
        unit: newAttrUnit.trim() || '',
        dataType: newAttrType,
        isFilterable: true,
      });
      setFeedback(`Đã thêm thuộc tính "${newAttrKey.trim()}" cho ngành hàng ${cat.name}!`);
      setTimeout(() => setFeedback(null), 3000);
      setAddingAttrCatId(null);
      setNewAttrKey('');
      setNewAttrLabel('');
      setNewAttrUnit('');
      setNewAttrType('number');
      loadCategories();
    } catch (err: any) {
      console.error('Failed to add attribute:', err);
      alert(err.response?.data?.message || 'Không thể thêm thuộc tính ngành hàng!');
    } finally {
      setAttrSaving(false);
    }
  };

  const handleDeleteAttribute = async (cat: CategoryItem, attr: CategoryAttributeItem) => {
    if (!cat.id || !attr.id) {
      // Nếu là fallback chưa có id trong DB thì mở modal sửa để lưu đồng bộ
      openEditModal(cat);
      return;
    }
    if (!window.confirm(`Xóa thuộc tính [${attr.attributeKey} - ${attr.attributeLabel}] khỏi ngành hàng ${cat.name}?`)) {
      return;
    }
    try {
      await apiClient.delete(`/categories/${cat.id}/attributes/${attr.id}`);
      setFeedback(`Đã xóa thuộc tính "${attr.attributeKey}" khỏi ngành hàng ${cat.name}!`);
      setTimeout(() => setFeedback(null), 3000);
      loadCategories();
    } catch (err) {
      console.error('Failed to delete attribute:', err);
      alert('Không thể xóa thuộc tính này!');
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
            Định nghĩa các ngành hàng và các thuộc tính <code>specs</code> JSONB (bảng <code>category_attributes</code>) được lập chỉ mục GIN trong PostgreSQL phục vụ trích xuất AI.
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
            Đang tải danh sách ngành hàng và thuộc tính...
          </div>
        ) : (
          categories.map((cat) => {
            const Icon = getCategoryIcon(cat.code);
            const attrs = getCategoryAttributes(cat);
            const isAddingAttrHere = addingAttrCatId === cat.id;

            return (
              <div
                key={cat.code}
                className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b-2 border-warm-border-subtle">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-warm-pastel-amber border-2 border-warm-text flex items-center justify-center shadow-brutal-xs">
                        <Icon className="w-5 h-5 text-warm-primary-text" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-warm-text">{cat.name}</h2>
                        <span className="text-[11px] font-mono font-bold text-warm-muted">
                          Mã code: <code>{cat.code}</code> • {attrs.length} thuộc tính
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
                        title="Sửa ngành hàng & danh sách thuộc tính"
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
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-black uppercase text-warm-text">
                        <Tag className="w-3.5 h-3.5 text-warm-primary" />
                        <span>Thuộc tính lọc GIN ({attrs.length}):</span>
                      </div>

                      {cat.id && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isAddingAttrHere) {
                              setAddingAttrCatId(null);
                            } else {
                              setAddingAttrCatId(cat.id!);
                              setNewAttrKey('');
                              setNewAttrLabel('');
                              setNewAttrUnit('');
                              setNewAttrType('number');
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-warm-pastel-amber hover:bg-amber-200 border border-warm-text text-warm-text font-black text-[11px] cursor-pointer shadow-brutal-xs"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Thêm thuộc tính</span>
                        </button>
                      )}
                    </div>

                    {/* Quick Add Attribute Inline Form */}
                    {isAddingAttrHere && (
                      <form
                        onSubmit={(e) => handleQuickAddAttribute(e, cat)}
                        className="p-3 rounded-xl bg-warm-pastel-amber/60 border-2 border-warm-text space-y-2.5 shadow-brutal-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-warm-text">
                            + Thêm thuộc tính mới vào `{cat.code}`
                          </span>
                          <button
                            type="button"
                            onClick={() => setAddingAttrCatId(null)}
                            className="text-warm-muted hover:text-warm-text cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <input
                            type="text"
                            required
                            value={newAttrKey}
                            onChange={(e) => setNewAttrKey(e.target.value)}
                            placeholder="Key (vd: screen_size)"
                            className="px-2.5 py-1.5 rounded-lg border border-warm-text bg-white text-xs font-mono font-bold focus:outline-none"
                          />
                          <input
                            type="text"
                            required
                            value={newAttrLabel}
                            onChange={(e) => setNewAttrLabel(e.target.value)}
                            placeholder="Tên hiển thị (Màn hình)"
                            className="px-2.5 py-1.5 rounded-lg border border-warm-text bg-white text-xs font-bold focus:outline-none"
                          />
                          <input
                            type="text"
                            value={newAttrUnit}
                            onChange={(e) => setNewAttrUnit(e.target.value)}
                            placeholder="Đơn vị (inch, GB, Hz)"
                            className="px-2.5 py-1.5 rounded-lg border border-warm-text bg-white text-xs font-bold focus:outline-none"
                          />
                          <select
                            value={newAttrType}
                            onChange={(e) => setNewAttrType(e.target.value)}
                            className="px-2 py-1.5 rounded-lg border border-warm-text bg-white text-xs font-bold focus:outline-none"
                          >
                            <option value="number">number (Số)</option>
                            <option value="text">text (Chuỗi)</option>
                            <option value="boolean">boolean</option>
                          </select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setAddingAttrCatId(null)}
                            className="px-3 py-1 rounded-lg bg-white border border-warm-text text-[11px] font-bold cursor-pointer"
                          >
                            Hủy
                          </button>
                          <button
                            type="submit"
                            disabled={attrSaving}
                            className="px-3 py-1 rounded-lg bg-warm-primary text-warm-primary-text border border-warm-text text-[11px] font-black cursor-pointer shadow-brutal-xs"
                          >
                            {attrSaving ? 'Đang lưu...' : 'Lưu thuộc tính'}
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="space-y-1.5">
                      {attrs.length === 0 ? (
                        <div className="p-3 rounded-xl bg-warm-bg border border-dashed border-warm-text/30 text-center text-xs text-warm-muted">
                          Chưa có thuộc tính lọc nào. Nhấn <strong>+ Thêm thuộc tính</strong> để cấu hình!
                        </div>
                      ) : (
                        attrs.map((attr) => (
                          <div
                            key={attr.id || attr.attributeKey}
                            className="p-2.5 rounded-xl bg-warm-bg border border-warm-text/20 flex items-center justify-between text-xs group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono font-bold text-warm-primary-text bg-white px-2 py-0.5 rounded border border-warm-text/20">
                                {attr.attributeKey}
                              </span>
                              <span className="font-bold text-warm-text truncate">
                                {attr.attributeLabel}
                                {attr.unit ? ` (${attr.unit})` : ''}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-mono text-warm-muted bg-warm-surface px-1.5 py-0.5 rounded border border-warm-text/10">
                                {attr.dataType}
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold text-[11px]">
                                <CheckCircle2 className="w-3 h-3" /> GIN
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteAttribute(cat, attr)}
                                className="p-1 rounded hover:bg-rose-100 text-warm-muted hover:text-rose-600 transition-colors cursor-pointer"
                                title="Xóa thuộc tính này"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Create/Edit Category + Attributes */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-6 max-w-2xl w-full shadow-brutal space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-warm-border-subtle">
              <h3 className="text-lg font-black text-warm-text flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-warm-primary" />
                <span>{editingCategory ? 'Chỉnh Sửa Ngành Hàng & Thuộc Tính' : 'Thêm Mới Ngành Hàng & Thuộc Tính'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-warm-bg text-warm-muted hover:text-warm-text cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-warm-text mb-1">
                    Mã Code (viết liền không dấu) *
                  </label>
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
              </div>

              <div>
                <label className="block text-xs font-black text-warm-text mb-1">Mô tả ngành hàng</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả phân khúc sản phẩm, mục đích sử dụng..."
                  className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
                />
              </div>

              {/* Attributes Builder inside Modal */}
              <div className="space-y-2.5 pt-2 border-t border-warm-border-subtle">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-black text-warm-text">
                      Danh sách Thuộc tính Ngành hàng (`category_attributes`)
                    </label>
                    <p className="text-[11px] text-warm-muted">
                      Các thuộc tính này được đưa vào Prompt để AI trích xuất yêu cầu và lọc GIN trên cột `specs`.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddModalAttrRow}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-warm-secondary hover:bg-amber-200 border border-warm-text text-warm-text font-black text-xs cursor-pointer shadow-brutal-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm dòng thuộc tính</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {modalAttributes.length === 0 ? (
                    <div className="p-3 rounded-xl bg-warm-bg border border-dashed border-warm-text/30 text-center text-xs text-warm-muted">
                      Chưa có thuộc tính nào. Nhấn <strong>+ Thêm dòng thuộc tính</strong> ở trên để thêm mới.
                    </div>
                  ) : (
                    modalAttributes.map((attr, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 items-center bg-warm-bg p-2 rounded-xl border border-warm-text/20"
                      >
                        <div className="col-span-3">
                          <input
                            type="text"
                            value={attr.attributeKey}
                            onChange={(e) => handleModalAttrChange(idx, 'attributeKey', e.target.value)}
                            placeholder="Key (vd: ram)"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-warm-text bg-white text-xs font-mono font-bold focus:outline-none"
                          />
                        </div>
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={attr.attributeLabel}
                            onChange={(e) => handleModalAttrChange(idx, 'attributeLabel', e.target.value)}
                            placeholder="Tên hiển thị (Dung lượng RAM)"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-warm-text bg-white text-xs font-bold focus:outline-none"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={attr.unit || ''}
                            onChange={(e) => handleModalAttrChange(idx, 'unit', e.target.value)}
                            placeholder="Đơn vị (GB)"
                            className="w-full px-2 py-1.5 rounded-lg border border-warm-text bg-white text-xs font-bold focus:outline-none"
                          />
                        </div>
                        <div className="col-span-2">
                          <select
                            value={attr.dataType || 'text'}
                            onChange={(e) => handleModalAttrChange(idx, 'dataType', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-warm-text bg-white text-xs font-bold focus:outline-none"
                          >
                            <option value="number">number</option>
                            <option value="text">text</option>
                            <option value="boolean">boolean</option>
                          </select>
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveModalAttrRow(idx)}
                            className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600 cursor-pointer"
                            title="Xóa dòng"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-warm-border-subtle">
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
                  {saving ? 'Đang lưu...' : 'Lưu ngành hàng & thuộc tính'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
