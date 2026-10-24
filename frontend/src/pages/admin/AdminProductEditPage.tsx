import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AdminNav } from '../../components/admin/AdminNav';
import { apiClient } from '../../api/client';
import { getCategoriesList } from '../../api/adminApi';
import type { CategoryOption } from '../../types/admin';
import type { ProductDetailDTO } from '../../types/product';
import { Package, Save, ArrowLeft, Plus, Trash2, CheckCircle2, Code, Image as ImageIcon, AlertCircle } from 'lucide-react';

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: 1, code: 'laptop', name: 'Laptop' },
  { id: 2, code: 'phone', name: 'Điện thoại' },
];

export const AdminProductEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [categories, setCategories] = useState<CategoryOption[]>(DEFAULT_CATEGORIES);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState<number>(15000000);
  const [stockQuantity, setStockQuantity] = useState<number>(20);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [categoryCode, setCategoryCode] = useState('laptop');
  const [productUrl, setProductUrl] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [specs, setSpecs] = useState<Array<{ key: string; value: string }>>([
    { key: 'ram', value: '16' },
    { key: 'cpu', value: 'Intel Core i5-13420H' },
    { key: 'storage', value: '512' },
    { key: 'battery', value: '50' },
  ]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getCategoriesList()
      .then((list) => {
        if (list && list.length > 0) setCategories(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      setLoading(true);
      apiClient
        .get<ProductDetailDTO>(`/products/${id}`)
        .then((res) => {
          const p = res.data;
          setName(p.name || '');
          setBrand(p.brand || '');
          setSku(p.sku || '');
          setPrice(p.price || 0);
          setStockQuantity(p.stockQuantity ?? 15);
          setIsActive(p.isActive !== false);
          setCategoryCode(p.categoryCode || 'laptop');
          setProductUrl(p.productUrl || '');
          if (p.imageUrls && p.imageUrls.length > 0) {
            setImageUrls(p.imageUrls);
          } else {
            setImageUrls(['']);
          }
          if (p.specs && Object.keys(p.specs).length > 0) {
            setSpecs(
              Object.entries(p.specs).map(([key, value]) => ({
                key,
                value: String(value),
              }))
            );
          }
        })
        .catch((err) => {
          console.error('Failed to load product:', err);
          setErrorMessage('Không thể tải thông tin sản phẩm. Vui lòng kiểm tra lại!');
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const handleAddSpecRow = () => {
    setSpecs((prev) => [...prev, { key: '', value: '' }]);
  };

  const handleRemoveSpecRow = (index: number) => {
    setSpecs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSpecChange = (index: number, field: 'key' | 'value', val: string) => {
    setSpecs((prev) => {
      const next = [...prev];
      next[index][field] = val;
      return next;
    });
  };

  const handleAddImageUrl = () => {
    setImageUrls((prev) => [...prev, '']);
  };

  const handleRemoveImageUrl = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageUrlChange = (index: number, val: string) => {
    setImageUrls((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleCategoryPreset = (newCat: string) => {
    setCategoryCode(newCat);
    if (newCat === 'phone' && specs.some((s) => s.key === 'cpu' && s.value.includes('Intel'))) {
      setSpecs([
        { key: 'ram', value: '8' },
        { key: 'storage', value: '256' },
        { key: 'battery', value: '5000' },
        { key: 'screen_size', value: '6.7' },
      ]);
    } else if (newCat === 'laptop' && specs.some((s) => s.key === 'battery' && s.value === '5000')) {
      setSpecs([
        { key: 'ram', value: '16' },
        { key: 'cpu', value: 'Intel Core i5-13420H' },
        { key: 'storage', value: '512' },
        { key: 'battery', value: '50' },
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    const specsMap: Record<string, any> = {};
    specs.forEach(({ key, value }) => {
      if (key.trim()) {
        const num = Number(value.trim());
        specsMap[key.trim()] = isNaN(num) || value.trim() === '' ? value.trim() : num;
      }
    });

    const cleanImageUrls = imageUrls.map((u) => u.trim()).filter((u) => u.length > 0);

    const payload = {
      name: name.trim(),
      brand: brand.trim(),
      sku: sku.trim() || undefined,
      price,
      stockQuantity,
      categoryCode,
      productUrl: productUrl.trim() || undefined,
      specs: specsMap,
      imageUrls: cleanImageUrls,
      isActive,
    };

    try {
      if (isEdit && id) {
        await apiClient.put(`/products/${id}`, payload);
      } else {
        await apiClient.post('/products', payload);
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        navigate('/admin/products');
      }, 1200);
    } catch (err: any) {
      console.error('Failed to save product:', err);
      setErrorMessage(
        err.response?.data?.message || 'Có lỗi xảy ra khi lưu sản phẩm vào cơ sở dữ liệu. Vui lòng thử lại!'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminNav />
        <div className="p-12 text-center text-warm-muted font-bold text-sm bg-warm-surface border-2 border-warm-text rounded-2xl shadow-brutal">
          Đang tải thông tin sản phẩm #{id}...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminNav />

      {/* Header */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-warm-muted hover:text-warm-text mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại danh sách sản phẩm</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-warm-text tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-warm-primary" />
            {isEdit ? `Chỉnh Sửa Sản Phẩm #${id}` : 'Thêm Mới Sản Phẩm Vào Kho Dữ Liệu'}
          </h1>
          <p className="text-xs sm:text-sm text-warm-muted font-medium mt-1">
            Cấu hình thông số kỹ thuật `specs` dạng JSONB được tự động đánh chỉ mục GIN trong PostgreSQL.
          </p>
        </div>

        {success && (
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>Đã lưu thành công vào CSDL!</span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-400 text-rose-800 text-xs font-bold flex items-center gap-2 shadow-brutal-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Info (7 Cols) */}
          <div className="lg:col-span-7 bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal space-y-4">
            <h2 className="text-sm font-black text-warm-text uppercase tracking-wider pb-3 border-b-2 border-warm-border-subtle">
              Thông Tin Cơ Bản
            </h2>

            <div>
              <label className="block text-xs font-black text-warm-text mb-1">Tên sản phẩm *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Laptop Asus Vivobook 15 OLED A1505ZA"
                className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-warm-text mb-1">Thương hiệu *</label>
                <input
                  type="text"
                  required
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Asus, Apple, Dell, Lenovo, Samsung..."
                  className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-warm-text mb-1">Ngành hàng *</label>
                <select
                  value={categoryCode}
                  onChange={(e) => handleCategoryPreset(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat.code} value={cat.code}>
                      {cat.name} ({cat.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-black text-warm-text mb-1">Mã SKU</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="LAP-ASUS-VIVO-15"
                  className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-warm-text mb-1">Giá bán (VNĐ) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={50000}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-warm-text mb-1">Tồn kho</label>
                <input
                  type="number"
                  min={0}
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-warm-text mb-1">Link nguồn sản phẩm</label>
                <input
                  type="url"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="https://thegioididong.com/..."
                  className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-warm-text mb-1">Trạng thái kinh doanh</label>
                <select
                  value={isActive ? 'active' : 'inactive'}
                  onChange={(e) => setIsActive(e.target.value === 'active')}
                  className={`w-full px-3 py-2 rounded-xl border-2 border-warm-text text-xs font-black focus:outline-none ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-500'
                      : 'bg-warm-border-subtle/30 text-warm-muted'
                  }`}
                >
                  <option value="active">🟢 Đang mở bán (Hiển thị catalog & tìm kiếm)</option>
                  <option value="inactive">⚪ Ngừng bán / Ẩn (Chỉ hiển thị trong Admin)</option>
                </select>
              </div>
            </div>

            {/* Images section */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-warm-text flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-warm-primary" />
                  <span>Hình ảnh sản phẩm (URLs)</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-2 py-0.5 rounded bg-warm-bg border border-warm-text text-[11px] font-bold text-warm-text hover:bg-warm-secondary"
                >
                  + Thêm URL ảnh
                </button>
              </div>

              <div className="space-y-2">
                {imageUrls.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => handleImageUrlChange(idx, e.target.value)}
                      placeholder="https://images.unsplash.com/... hoặc link ảnh CDN"
                      className="flex-1 px-3 py-1.5 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-mono focus:outline-none"
                    />
                    {imageUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveImageUrl(idx)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Xóa link ảnh này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Preview Images */}
              {imageUrls.some((u) => u.trim().length > 0) && (
                <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-warm-border-subtle">
                  {imageUrls
                    .filter((u) => u.trim().length > 0)
                    .map((url, i) => (
                      <div
                        key={i}
                        className="relative w-16 h-16 rounded-lg border-2 border-warm-text overflow-hidden bg-white p-1"
                      >
                        <img
                          src={url}
                          alt="preview"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://placehold.co/100x100?text=Error';
                          }}
                        />
                        {i === 0 && (
                          <span className="absolute bottom-0 left-0 right-0 bg-warm-primary text-[8px] font-black text-center text-warm-primary-text">
                            Chính
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Specs Editor (5 Cols) */}
          <div className="lg:col-span-5 bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-warm-border-subtle">
              <div className="flex items-center gap-1.5 text-sm font-black text-warm-text uppercase tracking-wider">
                <Code className="w-4 h-4 text-warm-primary" />
                <span>Specs JSONB ({categoryCode})</span>
              </div>

              <button
                type="button"
                onClick={handleAddSpecRow}
                className="px-2.5 py-1 rounded-lg bg-warm-secondary hover:bg-warm-pastel-amber border border-warm-text text-warm-secondary-text text-xs font-black flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm dòng</span>
              </button>
            </div>

            <p className="text-[11px] text-warm-muted font-medium">
              Các khóa thông số (`ram`, `cpu`, `storage`, `battery`, `screen_size`) được lập chỉ mục GIN để hỗ trợ hàm so khớp `jsonb_path_query()` và so sánh kỹ thuật.
            </p>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {specs.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={row.key}
                    onChange={(e) => handleSpecChange(i, 'key', e.target.value)}
                    placeholder="Key (vd: ram)"
                    className="w-1/3 px-2.5 py-1.5 rounded-lg border-2 border-warm-text bg-warm-bg font-mono text-xs font-bold focus:outline-none"
                  />
                  <input
                    type="text"
                    value={row.value}
                    onChange={(e) => handleSpecChange(i, 'value', e.target.value)}
                    placeholder="Value (vd: 16)"
                    className="flex-1 px-2.5 py-1.5 rounded-lg border-2 border-warm-text bg-warm-bg font-mono text-xs font-bold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecRow(i)}
                    className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600 font-bold"
                    title="Xóa dòng"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link
            to="/admin/products"
            className="px-5 py-2.5 rounded-xl bg-warm-bg hover:bg-warm-secondary border border-warm-text text-warm-text font-bold text-xs"
          >
            Hủy bỏ
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-warm-primary hover:bg-warm-primary-hover text-warm-primary-text hover:text-white font-black text-xs sm:text-sm border-2 border-warm-text shadow-brutal flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Đang lưu vào CSDL...' : isEdit ? 'Cập nhật sản phẩm' : 'Tạo mới sản phẩm'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
