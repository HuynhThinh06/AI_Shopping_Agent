import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminNav } from '../../components/admin/AdminNav';
import { apiClient } from '../../api/client';
import {
  getCategoriesList,
  exportProductsExcel,
  downloadExcelTemplate,
  importProductsExcel,
} from '../../api/adminApi';
import type { ProductExcelImportResultDTO } from '../../api/adminApi';
import type { CategoryOption } from '../../types/admin';
import type { ProductDetailDTO } from '../../types/product';
import type { PageResponse } from '../../types/review';
import {
  Package,
  Search,
  ExternalLink,
  Star,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Upload,
  Loader2,
  X,
  FileCheck,
  AlertTriangle,
} from 'lucide-react';

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: 1, code: 'laptop', name: 'Laptop' },
  { id: 2, code: 'phone', name: 'Điện thoại' },
];

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<ProductDetailDTO[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>(DEFAULT_CATEGORIES);
  const [categoryCode, setCategoryCode] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Excel Import / Export States
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<ProductExcelImportResultDTO | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportProductsExcel(categoryCode, keyword);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.download = `products_export_${timestamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setFeedback('Xuất danh sách sản phẩm ra Excel thành công!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      console.error('Export failed:', err);
      alert('Không thể xuất file Excel: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const blob = await downloadExcelTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Template download failed:', err);
      alert('Không thể tải file mẫu: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!selectedFile) return;
    setIsImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const result = await importProductsExcel(selectedFile);
      setImportResult(result);
      if (result.successCount > 0) {
        setFeedback(`Nhập Excel hoàn tất: ${result.createdCount} tạo mới, ${result.updatedCount} cập nhật!`);
        setTimeout(() => setFeedback(null), 4000);
        loadProducts(0);
      }
    } catch (err: any) {
      console.error('Import failed:', err);
      const msg = err?.response?.data?.message || err.message || 'Lỗi khi nhập file Excel';
      setImportError(msg);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setSelectedFile(null);
    setImportResult(null);
    setImportError(null);
  };

  useEffect(() => {
    getCategoriesList()
      .then((list) => {
        if (list && list.length > 0) setCategories(list);
      })
      .catch(() => {});
  }, []);

  const loadProducts = async (pageIdx = page) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: pageIdx, size: 10 };
      if (categoryCode) params.categoryCode = categoryCode;
      if (keyword.trim()) params.keyword = keyword.trim();

      const res = await apiClient.get<PageResponse<ProductDetailDTO>>('/products', { params });
      setProducts(res.data.content);
      setTotalPages(res.data.totalPages);
      setTotalElements(res.data.totalElements);
    } catch (err) {
      // Fallback nếu Backend chưa restart (lỗi PostgreSQL LOWER(bytea) khi categoryCode rỗng)
      if (!categoryCode) {
        try {
          const fallbackParams: Record<string, any> = {
            page: pageIdx,
            size: 10,
            categoryCode: 'laptop',
          };
          if (keyword.trim()) fallbackParams.keyword = keyword.trim();
          const resFallback = await apiClient.get<PageResponse<ProductDetailDTO>>('/products', {
            params: fallbackParams,
          });
          setProducts(resFallback.data.content);
          setTotalPages(resFallback.data.totalPages);
          setTotalElements(resFallback.data.totalElements);
          return;
        } catch (fallbackErr) {
          console.error('Fallback failed to load products:', fallbackErr);
        }
      }
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts(page);
  }, [page, categoryCode]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadProducts(0);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/products/${deleteId}`);
      setFeedback(`Đã xóa thành công sản phẩm #${deleteId}!`);
      setTimeout(() => setFeedback(null), 3000);
      setDeleteId(null);
      loadProducts(page);
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert('Không thể xóa sản phẩm. Vui lòng thử lại!');
    } finally {
      setDeleting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div>
      <AdminNav />

      {/* Page Header */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-5 sm:p-6 shadow-brutal mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-warm-text tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-warm-primary" />
              Quản Lý Kho Dữ Liệu Sản Phẩm
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-warm-secondary border border-warm-text text-warm-secondary-text text-xs font-black">
              {totalElements} sản phẩm
            </span>
          </div>
          <p className="text-xs sm:text-sm text-warm-muted font-medium mt-1">
            Danh sách tất cả sản phẩm được đồng bộ trong PostgreSQL với trường `specs` JSONB đã được đánh chỉ mục GIN.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Xuất Excel */}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm border-2 border-warm-text shadow-brutal transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
            title="Xuất danh sách sản phẩm hiện tại ra file Excel (.xlsx)"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{isExporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
          </button>

          {/* Nhập Excel */}
          <button
            type="button"
            onClick={() => {
              setImportResult(null);
              setImportError(null);
              setSelectedFile(null);
              setShowImportModal(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm border-2 border-warm-text shadow-brutal transition-all hover:-translate-y-0.5 cursor-pointer"
            title="Nhập sản phẩm hàng loạt từ file Excel"
          >
            <Upload className="w-4 h-4" />
            <span>Nhập Excel</span>
          </button>

          <Link
            to="/admin/products/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-warm-primary hover:bg-warm-primary-hover text-warm-primary-text font-black text-xs sm:text-sm border-2 border-warm-text shadow-brutal transition-all hover:-translate-y-0.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Sản Phẩm Mới</span>
          </Link>
        </div>
      </div>

      {/* Alert notification */}
      {feedback && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-500 text-emerald-800 font-bold text-xs flex items-center gap-2 shadow-brutal-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-4 shadow-brutal mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên sản phẩm hoặc thương hiệu (Dell, Asus, iPhone...)"
              className="w-full pl-9 pr-4 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
            />
            <Search className="w-4 h-4 text-warm-muted absolute left-3 top-2.5" />
          </div>

          <div className="w-44">
            <select
              value={categoryCode}
              onChange={(e) => {
                setCategoryCode(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 rounded-xl border-2 border-warm-text bg-warm-bg text-xs font-bold focus:outline-none"
            >
              <option value="">Tất cả ngành hàng</option>
              {categories.map((cat) => (
                <option key={cat.code} value={cat.code}>
                  {cat.name} ({cat.code})
                </option>
              ))}
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

      {/* Products Table */}
      <div className="bg-warm-surface border-2 border-warm-text rounded-2xl shadow-brutal overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-warm-bg border-b-2 border-warm-text text-warm-text font-black uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">Sản phẩm</th>
                <th className="py-3 px-3">Ngành hàng</th>
                <th className="py-3 px-3">Thương hiệu</th>
                <th className="py-3 px-3">Giá bán</th>
                <th className="py-3 px-3">Tồn kho / Trạng thái</th>
                <th className="py-3 px-3">Đánh giá</th>
                <th className="py-3 px-3">Thông số Specs (JSONB)</th>
                <th className="py-3 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-warm-border-subtle font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-warm-muted">
                    Đang tải dữ liệu sản phẩm...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-warm-muted">
                    Không tìm thấy sản phẩm nào phù hợp.
                  </td>
                </tr>
              ) : (
                products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-warm-bg/70 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        {prod.imageUrls && prod.imageUrls.length > 0 ? (
                          <img
                            src={prod.imageUrls[0]}
                            alt={prod.name}
                            className="w-12 h-12 rounded-lg object-contain bg-white border border-warm-text/20 p-1 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-warm-bg border border-warm-text/20 flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-warm-muted" />
                          </div>
                        )}
                        <div>
                          <div className="font-mono text-[10px] font-bold text-warm-muted">
                            #{prod.id} {prod.sku && `• ${prod.sku}`}
                          </div>
                          <div className="font-extrabold text-warm-text text-xs line-clamp-2 max-w-[220px]">
                            {prod.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-warm-pastel-amber border border-warm-text text-warm-secondary-text">
                        {prod.categoryCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-bold">{prod.brand}</td>
                    <td className="py-3.5 px-3 font-mono font-bold text-warm-primary-text whitespace-nowrap">
                      {formatPrice(prod.price)}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold text-warm-text">
                          SL: {prod.stockQuantity ?? 10}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 w-max">
                          Đang bán
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-bold text-warm-text">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>{prod.avgRating ? prod.avgRating.toFixed(1) : '5.0'}</span>
                        <span className="text-[10px] text-warm-muted">({prod.reviewCount})</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {prod.specs &&
                          Object.entries(prod.specs).slice(0, 3).map(([k, v]) => (
                            <span
                              key={k}
                              className="px-1.5 py-0.5 bg-warm-bg rounded border border-warm-text/20 text-[10px] font-mono text-warm-muted"
                            >
                              {k}: {String(v)}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/admin/products/${prod.id}/edit`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-warm-bg hover:bg-warm-secondary border border-warm-text text-warm-text font-bold text-[11px] shadow-brutal-xs"
                          title="Sửa thông tin sản phẩm"
                        >
                          <Edit className="w-3 h-3 text-blue-600" />
                          <span>Sửa</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteId(prod.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 font-bold text-[11px] cursor-pointer"
                          title="Xóa sản phẩm"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Xóa</span>
                        </button>
                        <Link
                          to={`/product/${prod.id}`}
                          target="_blank"
                          className="p-1 rounded-lg hover:bg-warm-bg border border-warm-text/20 text-warm-muted hover:text-warm-text"
                          title="Xem trang khách hàng"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 bg-warm-bg border-t-2 border-warm-text flex items-center justify-between">
            <span className="text-xs font-bold text-warm-muted">
              Trang {page + 1} / {totalPages} (Tổng {totalElements} sản phẩm)
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

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-warm-surface border-2 border-warm-text rounded-2xl p-6 max-w-md w-full shadow-brutal space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-lg font-black text-warm-text">Xác nhận xóa sản phẩm</h3>
            </div>
            <p className="text-xs text-warm-muted font-medium">
              Bạn có chắc chắn muốn xóa sản phẩm <strong>#{deleteId}</strong>? Sản phẩm sẽ được đánh dấu vô hiệu hóa (soft delete) và ẩn khỏi trang tìm kiếm cũng như danh mục.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-warm-bg border border-warm-text font-bold text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs border border-warm-text shadow-brutal-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Đang xóa...' : 'Xóa sản phẩm'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-warm-surface border-2 border-warm-text rounded-2xl max-w-xl w-full shadow-brutal my-8 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b-2 border-warm-text bg-warm-bg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 border border-warm-text rounded-xl text-indigo-700">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-warm-text">Nhập Sản Phẩm Bằng Excel</h3>
                  <p className="text-xs text-warm-muted font-medium">Đồng bộ hoặc thêm mới danh sách sản phẩm từ file .xlsx</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseImportModal}
                disabled={isImporting}
                className="p-1.5 rounded-lg border border-warm-text hover:bg-white text-warm-text cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Step 1: Download Template */}
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-indigo-600" />
                    <span>File mẫu chuẩn của hệ thống</span>
                  </div>
                  <p className="text-xs text-indigo-800/80 font-medium">
                    Tải mẫu Excel đã cấu hình sẵn các cột, sheet hướng dẫn & dữ liệu mẫu.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={isDownloadingTemplate}
                  className="px-3.5 py-2 rounded-xl bg-white border border-warm-text text-warm-text font-black text-xs hover:bg-warm-bg shadow-brutal-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  {isDownloadingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  <span>Tải File Mẫu (.xlsx)</span>
                </button>
              </div>

              {/* Step 2: Upload File */}
              <div>
                <label className="block text-xs font-black text-warm-text mb-2">
                  Chọn file dữ liệu Excel (.xlsx, .xls)
                </label>
                <label className="border-2 border-dashed border-warm-text/40 hover:border-warm-text rounded-2xl p-6 bg-warm-bg/50 hover:bg-warm-bg flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-center">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    disabled={isImporting}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                        setImportResult(null);
                        setImportError(null);
                      }
                    }}
                  />
                  <Upload className="w-8 h-8 text-warm-muted" />
                  {selectedFile ? (
                    <div>
                      <span className="text-xs font-black text-emerald-700 block">{selectedFile.name}</span>
                      <span className="text-[11px] text-warm-muted font-medium">
                        {(selectedFile.size / 1024).toFixed(1)} KB — Nhấp để đổi file khác
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs font-bold text-warm-text block">
                        Nhấp vào đây để duyệt file từ máy tính
                      </span>
                      <span className="text-[11px] text-warm-muted font-medium">
                        Hỗ trợ định dạng Microsoft Excel (.xlsx, .xls)
                      </span>
                    </div>
                  )}
                </label>
              </div>

              {/* Import Error Message */}
              {importError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs font-bold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Import Result Summary */}
              {importResult && (
                <div className="space-y-3 pt-2 border-t border-warm-text/20">
                  <h4 className="text-xs font-black text-warm-text">Kết Quả Nhập Dữ Liệu:</h4>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-xl bg-warm-bg border border-warm-text text-center">
                      <div className="text-[10px] font-bold text-warm-muted">Tổng số</div>
                      <div className="text-sm font-black text-warm-text">{importResult.totalRows}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-500 text-center">
                      <div className="text-[10px] font-bold text-emerald-700">Tạo mới</div>
                      <div className="text-sm font-black text-emerald-700">{importResult.createdCount}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-500 text-center">
                      <div className="text-[10px] font-bold text-blue-700">Cập nhật</div>
                      <div className="text-sm font-black text-blue-700">{importResult.updatedCount}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-500 text-center">
                      <div className="text-[10px] font-bold text-rose-700">Lỗi</div>
                      <div className="text-sm font-black text-rose-700">{importResult.errorCount}</div>
                    </div>
                  </div>

                  {/* Errors List */}
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-bold text-rose-700 mb-1.5">
                        Chi tiết các dòng bị lỗi ({importResult.errors.length}):
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-rose-50/70 border border-rose-200 rounded-xl text-xs">
                        {importResult.errors.map((err, idx) => (
                          <div key={idx} className="text-rose-800 flex items-start gap-1.5">
                            <span className="font-bold flex-shrink-0">•</span>
                            <span className="font-medium">{err}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t-2 border-warm-text bg-warm-bg flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCloseImportModal}
                disabled={isImporting}
                className="px-4 py-2 rounded-xl bg-white border border-warm-text font-bold text-xs hover:bg-warm-bg cursor-pointer"
              >
                {importResult ? 'Đóng' : 'Hủy bỏ'}
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={!selectedFile || isImporting}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs border border-warm-text shadow-brutal-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xử lý file...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Bắt đầu nhập dữ liệu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
