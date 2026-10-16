import React from 'react';
import { AdminNav } from '../../components/admin/AdminNav';
import { Layers, Laptop, Smartphone, CheckCircle2, Tag } from 'lucide-react';

export const AdminCategoriesPage: React.FC = () => {
  const categories = [
    {
      code: 'laptop',
      name: 'Máy tính xách tay (Laptop)',
      icon: Laptop,
      description: 'Các dòng laptop văn phòng, học tập, đồ họa kỹ thuật và gaming.',
      productCount: 15,
      attributes: [
        { key: 'ram', label: 'Dung lượng RAM (GB)', type: 'numeric', isFilterable: true },
        { key: 'storage', label: 'Dung lượng ổ cứng (GB)', type: 'numeric', isFilterable: true },
        { key: 'cpu', label: 'Vi xử lý (CPU)', type: 'text', isFilterable: true },
        { key: 'gpu', label: 'Card đồ họa (VGA)', type: 'text', isFilterable: true },
        { key: 'battery', label: 'Dung lượng pin (Wh)', type: 'numeric', isFilterable: true },
        { key: 'weight', label: 'Trọng lượng (kg)', type: 'numeric', isFilterable: true },
      ],
    },
    {
      code: 'phone',
      name: 'Điện thoại thông minh (Phone)',
      icon: Smartphone,
      description: 'Smartphone các phân khúc phổ thông, tầm trung, cận cao cấp và flagship.',
      productCount: 12,
      attributes: [
        { key: 'ram', label: 'Dung lượng RAM (GB)', type: 'numeric', isFilterable: true },
        { key: 'storage', label: 'Bộ nhớ trong (GB)', type: 'numeric', isFilterable: true },
        { key: 'chipset', label: 'Vi xử lý / Chipset', type: 'text', isFilterable: true },
        { key: 'battery', label: 'Dung lượng pin (mAh)', type: 'numeric', isFilterable: true },
        { key: 'camera', label: 'Camera chính (MP)', type: 'numeric', isFilterable: true },
      ],
    },
  ];

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
              Bảng `categories` & `category_attributes`
            </span>
          </div>
          <p className="text-xs sm:text-sm text-warm-muted font-medium mt-1">
            Định nghĩa các thuộc tính có thể trích xuất tự động bằng Gemini và phục vụ lọc nhanh bằng PostgreSQL GIN Index.
          </p>
        </div>
      </div>

      {/* Categories Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => {
          const Icon = cat.icon;
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

                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs">
                  {cat.productCount} sản phẩm
                </span>
              </div>

              <p className="text-xs text-warm-muted leading-relaxed font-medium">
                {cat.description}
              </p>

              {/* Attributes Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase text-warm-text">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Thuộc tính được hỗ trợ trích xuất & lọc GIN:</span>
                </div>

                <div className="space-y-1.5">
                  {cat.attributes.map((attr) => (
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
        })}
      </div>
    </div>
  );
};
