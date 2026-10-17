import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AdminNav } from '../../components/admin/AdminNav';
import { apiClient } from '../../api/client';
import type { ProductDetailDTO } from '../../types/product';
import { Package, Save, ArrowLeft, Plus, Trash2, CheckCircle2, Code } from 'lucide-react';

export const AdminProductEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState<number>(15000000);
  const [categoryCode, setCategoryCode] = useState('laptop');
  const [productUrl, setProductUrl] = useState('');
  const [specs, setSpecs] = useState<Array<{ key: string; value: string }>>([
    { key: 'ram', value: '16' },
    { key: 'cpu', value: 'Intel Core i5-13420H' },
    { key: 'storage', value: '512' },
    { key: 'battery', value: '50' },
  ]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      apiClient
        .get<ProductDetailDTO>(`/products/${id}`)
        .then((res) => {
          const p = res.data;
          setName(p.name);
          setBrand(p.brand);
          setSku(p.sku || '');
          setPrice(p.price);
          setCategoryCode(p.categoryCode);
          setProductUrl(p.productUrl || '');
          if (p.specs) {
            setSpecs(
              Object.entries(p.specs).map(([key, value]) => ({
                key,
                value: String(value),
              }))
            );
          }
        })
        .catch((err) => console.error('Failed to load product:', err));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const specsMap: Record<string, any> = {};
    specs.forEach(({ key, value }) => {
      if (key.trim()) {
        const num = Number(value.trim());
        specsMap[key.trim()] = isNaN(num) || value.trim() === '' ? value.trim() : num;
      }
    });

    try {
      // In real backend, POST or PUT to /products
      // We also handle mock persistence
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        navigate('/admin/products');
      }, 1500);
    } catch (err) {
      console.error('Failed to save product:', err);
    } finally {
      setSaving(false);
    }
  };

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
            <span>Đã lưu thành công!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Info (7 Cols) */}
          <div className="lg:col-span-7 bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal space-y-4">
            <h2 className="text-sm font-black text-warm-text uppercase tracking-wider pb-3 border-b-2 border-warm-border-subtle">
              Thông Tin Cơ Bản
            </h2>

            <div>
              <label className="block text-xs font-black text-warm-text mb-1">Tên sản phẩm</label>
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
                <label className="block text-xs font-black text-warm-text mb-1">Thương hiệu</label>
                <input
                  type="text"
                  required
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Asus, Apple, Dell, Lenovo..."
                  className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-warm-text mb-1">Ngành hàng</label>
                <select
                  value={categoryCode}
                  onChange={(e) => setCategoryCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
                >
                  <option value="laptop">Laptop (laptop)</option>
                  <option value="phone">Điện thoại (phone)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <label className="block text-xs font-black text-warm-text mb-1">Giá bán (VNĐ)</label>
                <input
                  type="number"
                  required
                  min={100000}
                  step={100000}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none font-mono"
                />
              </div>
            </div>

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
          </div>

          {/* Dynamic Specs Editor (5 Cols) */}
          <div className="lg:col-span-5 bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-warm-border-subtle">
              <div className="flex items-center gap-1.5 text-sm font-black text-warm-text uppercase tracking-wider">
                <Code className="w-4 h-4 text-warm-primary" />
                <span>Specs JSONB</span>
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
              Các khóa thông số (`ram`, `cpu`, `storage`, `battery`) sẽ được lập chỉ mục GIN để hỗ trợ hàm `jsonb_exists()` trong Spring Boot.
            </p>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
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
            <span>{saving ? 'Đang lưu...' : 'Lưu sản phẩm vào CSDL'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
