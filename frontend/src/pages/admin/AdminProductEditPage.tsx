import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AdminNav } from '../../components/admin/AdminNav';
import { apiClient } from '../../api/client';
import { getCategoriesList } from '../../api/adminApi';
import type { CategoryOption } from '../../types/admin';
import type { ProductDetailDTO } from '../../types/product';
import { Package, Save, ArrowLeft, Plus, Trash2, CheckCircle2, Code, Image as ImageIcon, AlertCircle, UploadCloud, X } from 'lucide-react';

const DEFAULT_CATEGORIES: CategoryOption[] = [
  {
    id: 1,
    code: 'laptop',
    name: 'Laptop',
    attributes: [
      { attributeKey: 'cpu', attributeLabel: 'CPU', unit: '', dataType: 'text' },
      { attributeKey: 'ram', attributeLabel: 'RAM', unit: 'GB', dataType: 'number' },
      { attributeKey: 'storage', attributeLabel: 'Ổ cứng', unit: 'GB', dataType: 'number' },
      { attributeKey: 'battery', attributeLabel: 'Pin', unit: 'Wh', dataType: 'number' },
      { attributeKey: 'screen_size', attributeLabel: 'Màn hình', unit: 'inch', dataType: 'number' },
      { attributeKey: 'weight', attributeLabel: 'Trọng lượng', unit: 'kg', dataType: 'number' },
    ],
  },
  {
    id: 2,
    code: 'phone',
    name: 'Điện thoại',
    attributes: [
      { attributeKey: 'chipset', attributeLabel: 'Chipset', unit: '', dataType: 'text' },
      { attributeKey: 'ram', attributeLabel: 'RAM', unit: 'GB', dataType: 'number' },
      { attributeKey: 'storage', attributeLabel: 'Bộ nhớ', unit: 'GB', dataType: 'number' },
      { attributeKey: 'battery', attributeLabel: 'Pin', unit: 'mAh', dataType: 'number' },
      { attributeKey: 'screen_size', attributeLabel: 'Màn hình', unit: 'inch', dataType: 'number' },
      { attributeKey: 'camera', attributeLabel: 'Camera sau', unit: 'MP', dataType: 'number' },
    ],
  },
];

const getInitialSpecsForCategory = (catCode: string, catList: CategoryOption[] = DEFAULT_CATEGORIES) => {
  const normCat = catCode.toLowerCase();
  const cat = catList.find((c) => c.code.toLowerCase() === normCat);
  const attrs = cat?.attributes && cat.attributes.length > 0
    ? cat.attributes
    : (normCat === 'phone' ? DEFAULT_CATEGORIES[1].attributes! : DEFAULT_CATEGORIES[0].attributes!);

  return attrs.map((attr) => {
    let val = '';
    if (normCat === 'phone') {
      if (attr.attributeKey === 'chipset') val = 'Snapdragon 8 Gen 3';
      else if (attr.attributeKey === 'ram') val = '8';
      else if (attr.attributeKey === 'storage') val = '256';
      else if (attr.attributeKey === 'battery') val = '5000';
      else if (attr.attributeKey === 'screen_size') val = '6.7';
      else if (attr.attributeKey === 'camera') val = '50';
    } else {
      if (attr.attributeKey === 'cpu') val = 'Intel Core i5-13420H';
      else if (attr.attributeKey === 'ram') val = '16';
      else if (attr.attributeKey === 'storage') val = '512';
      else if (attr.attributeKey === 'battery') val = '50';
      else if (attr.attributeKey === 'screen_size') val = '15.6';
      else if (attr.attributeKey === 'weight') val = '1.6';
    }
    return { key: attr.attributeKey, value: val };
  });
};

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
  const [imageUploadMode, setImageUploadMode] = useState<'device' | 'url'>('device');
  const [deviceFiles, setDeviceFiles] = useState<File[]>([]);
  const [devicePreviews, setDevicePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [specs, setSpecs] = useState<Array<{ key: string; value: string }>>(() =>
    getInitialSpecsForCategory('laptop', DEFAULT_CATEGORIES)
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getCategoriesList()
      .then((list) => {
        if (list && list.length > 0) {
          setCategories(list);
          if (!isEdit) {
            setSpecs(getInitialSpecsForCategory(categoryCode, list));
          }
        }
      })
      .catch(() => {});
  }, [isEdit]);

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

  const handleDeviceFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const validFiles: File[] = [];
      const newPreviews: string[] = [];

      filesArray.forEach((file) => {
        if (file.size > 5 * 1024 * 1024) {
          alert(`File "${file.name}" vượt quá dung lượng tối đa 5MB!`);
          return;
        }
        validFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      });

      setDeviceFiles((prev) => [...prev, ...validFiles]);
      setDevicePreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const handleRemoveDeviceFile = (index: number) => {
    URL.revokeObjectURL(devicePreviews[index]);
    setDeviceFiles((prev) => prev.filter((_, i) => i !== index));
    setDevicePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      const validFiles: File[] = [];
      const newPreviews: string[] = [];
      filesArray.forEach((file) => {
        if (file.size > 5 * 1024 * 1024) {
          alert(`File "${file.name}" vượt quá dung lượng tối đa 5MB!`);
          return;
        }
        validFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      });
      setDeviceFiles((prev) => [...prev, ...validFiles]);
      setDevicePreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const handleCategoryPreset = (newCat: string) => {
    setCategoryCode(newCat);
    if (!isEdit) {
      setSpecs(getInitialSpecsForCategory(newCat, categories));
    }
  };

  const currentCategory = categories.find((c) => c.code.toLowerCase() === categoryCode.toLowerCase());
  const currentCategoryAttributes = currentCategory?.attributes || [];

  const handleSyncMissingCategoryAttributes = () => {
    const existingKeys = new Set(specs.map((s) => s.key.trim().toLowerCase()));
    const missing = currentCategoryAttributes.filter(
      (attr) => !existingKeys.has(attr.attributeKey.toLowerCase())
    );
    if (missing.length > 0) {
      const addedRows = missing.map((attr) => ({
        key: attr.attributeKey,
        value: '',
      }));
      setSpecs((prev) => [...prev, ...addedRows]);
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
      if (deviceFiles.length > 0) {
        // Tải ảnh trực tiếp từ thiết bị lên Cloudinary qua Multipart Form
        const formData = new FormData();
        formData.append('product', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
        deviceFiles.forEach((file) => {
          formData.append('images', file);
        });

        if (isEdit && id) {
          await apiClient.put(`/products/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } else {
          await apiClient.post('/products', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      } else {
        // Gửi JSON thông thường nếu chỉ dùng URL ảnh hoặc không thêm ảnh mới
        if (isEdit && id) {
          await apiClient.put(`/products/${id}`, payload);
        } else {
          await apiClient.post('/products', payload);
        }
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
                  step="any"
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
                  <span>Hình ảnh sản phẩm</span>
                </label>

                {/* Tab switch between Device and URL */}
                <div className="flex items-center bg-warm-bg border border-warm-text rounded-lg p-0.5 shadow-brutal-xs">
                  <button
                    type="button"
                    onClick={() => setImageUploadMode('device')}
                    className={`px-2.5 py-1 rounded text-[11px] font-black transition-colors cursor-pointer ${
                      imageUploadMode === 'device'
                        ? 'bg-warm-primary text-warm-primary-text'
                        : 'text-warm-muted hover:text-warm-text'
                    }`}
                  >
                    Tải từ máy tính
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUploadMode('url')}
                    className={`px-2.5 py-1 rounded text-[11px] font-black transition-colors cursor-pointer ${
                      imageUploadMode === 'url'
                        ? 'bg-warm-primary text-warm-primary-text'
                        : 'text-warm-muted hover:text-warm-text'
                    }`}
                  >
                    Dán link URL
                  </button>
                </div>
              </div>

              {imageUploadMode === 'device' ? (
                <div className="space-y-3">
                  {/* Dropzone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-warm-primary bg-amber-50 scale-[1.01]'
                        : 'border-warm-text bg-warm-bg hover:bg-warm-secondary'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      multiple
                      onChange={handleDeviceFilesChange}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-warm-surface border border-warm-text flex items-center justify-center shadow-brutal-xs">
                        <UploadCloud className="w-5 h-5 text-warm-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-warm-text">
                          Bấm để chọn ảnh từ thiết bị hoặc kéo thả vào đây
                        </p>
                        <p className="text-[10px] text-warm-muted mt-0.5">
                          Hỗ trợ PNG, JPG, JPEG, WEBP (Tự động tải lên Cloudinary khi lưu)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Device files preview list */}
                  {deviceFiles.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-extrabold text-warm-text flex items-center justify-between">
                        <span>Ảnh mới đã chọn từ thiết bị ({deviceFiles.length}):</span>
                        <button
                          type="button"
                          onClick={() => {
                            devicePreviews.forEach((u) => URL.revokeObjectURL(u));
                            setDeviceFiles([]);
                            setDevicePreviews([]);
                          }}
                          className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                        >
                          Xóa tất cả ảnh đã chọn
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {deviceFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="relative group rounded-xl border-2 border-warm-text bg-warm-surface p-1.5 shadow-brutal-xs flex flex-col items-center overflow-hidden"
                          >
                            <div className="relative w-full h-20 rounded-lg overflow-hidden bg-white mb-1.5 border border-warm-border">
                              <img
                                src={devicePreviews[idx]}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                              {idx === 0 && (
                                <span className="absolute top-1 left-1 bg-warm-primary text-warm-primary-text text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">
                                  Ảnh chính
                                </span>
                              )}
                            </div>
                            <div className="w-full flex items-center justify-between gap-1 px-1">
                              <span className="text-[10px] font-bold text-warm-text truncate max-w-[90px]" title={file.name}>
                                {file.name}
                              </span>
                              <span className="text-[9px] text-warm-muted shrink-0">
                                {(file.size / 1024).toFixed(0)} KB
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveDeviceFile(idx);
                              }}
                              className="absolute top-2 right-2 p-1 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-sm cursor-pointer"
                              title="Bỏ chọn ảnh này"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Existing Images when in Edit Mode */}
                  {isEdit && imageUrls.some((u) => u.trim().length > 0) && (
                    <div className="mt-3 pt-3 border-t border-warm-border-subtle">
                      <p className="text-[11px] font-extrabold text-warm-muted mb-2">
                        Ảnh hiện có của sản phẩm trên Cloudinary / CDN:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {imageUrls
                          .filter((u) => u.trim().length > 0)
                          .map((url, i) => (
                            <div
                              key={i}
                              className="relative w-16 h-16 rounded-xl border-2 border-warm-text overflow-hidden bg-white p-1 shadow-brutal-xs"
                            >
                              <img
                                src={url}
                                alt="existing"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://placehold.co/100x100?text=Error';
                                }}
                              />
                            </div>
                          ))}
                      </div>
                      <p className="text-[10px] text-warm-muted mt-1 italic">
                        * Bạn có thể chọn thêm ảnh mới từ thiết bị ở trên để bổ sung vào sản phẩm.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* URL Input Mode */
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
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Xóa link ảnh này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="mt-1 px-2.5 py-1 rounded-lg bg-warm-bg border border-warm-text text-[11px] font-bold text-warm-text hover:bg-warm-secondary cursor-pointer"
                  >
                    + Thêm URL ảnh khác
                  </button>

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
              )}
            </div>
          </div>

          {/* Dynamic Specs Editor (5 Cols) */}
          <div className="lg:col-span-5 bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-warm-border-subtle">
              <div className="flex items-center gap-1.5 text-sm font-black text-warm-text uppercase tracking-wider">
                <Code className="w-4 h-4 text-warm-primary" />
                <span>Specs JSONB ({categoryCode})</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-warm-secondary text-warm-secondary-text border border-warm-text/20">
                  {specs.length} thuộc tính
                </span>
              </div>

              <div className="flex items-center gap-2">
                {currentCategoryAttributes.some(
                  (a) => !specs.some((s) => s.key.trim().toLowerCase() === a.attributeKey.toLowerCase())
                ) && (
                  <button
                    type="button"
                    onClick={handleSyncMissingCategoryAttributes}
                    className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-500 text-amber-950 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-brutal-xs"
                    title="Bổ sung các thuộc tính chuẩn của ngành hàng này chưa có trong form"
                  >
                    <Plus className="w-3 h-3 text-amber-800" />
                    <span>+ Thuộc tính GIN</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddSpecRow}
                  className="px-2.5 py-1 rounded-lg bg-warm-secondary hover:bg-warm-pastel-amber border border-warm-text text-warm-secondary-text text-xs font-black flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm dòng</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-warm-muted font-medium">
              Các khóa thông số GIN ({currentCategoryAttributes.length > 0
                ? currentCategoryAttributes.map((a) => `\`${a.attributeKey}\``).join(', ')
                : '`ram`, `cpu`, `storage`, `battery`, `screen_size`, `weight`'}) được đồng bộ từ Quản lý ngành hàng để hỗ trợ AI trích xuất và lọc GIN trên cột `products.specs`.
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
            <span>
              {saving
                ? deviceFiles.length > 0
                  ? 'Đang tải ảnh lên Cloudinary & Lưu...'
                  : 'Đang lưu vào CSDL...'
                : isEdit
                ? 'Cập nhật sản phẩm'
                : 'Tạo mới sản phẩm'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
