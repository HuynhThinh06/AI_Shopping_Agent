import { apiClient } from './client';
import type {
  SystemStatsDTO,
  LlmLogItem,
  GinBenchmarkRequest,
  GinBenchmarkResult,
  AdminReviewDTO,
  CategoryOption,
  AuditLogDTO,
  BulkActionResultDTO,
  DashboardTrendsDTO,
} from '../types/admin';
import type { PageResponse } from '../types/review';

export async function getSystemStats(): Promise<SystemStatsDTO> {
  const res = await apiClient.get<SystemStatsDTO>('/admin/stats');
  return res.data;
}

export async function getLlmLogs(
  page = 0,
  size = 15,
  requestType?: string,
  status?: string
): Promise<PageResponse<LlmLogItem>> {
  const params: Record<string, any> = { page, size };
  if (requestType && requestType !== 'ALL') {
    params.requestType = requestType;
  }
  if (status && status !== 'ALL') {
    params.status = status;
  }
  const res = await apiClient.get<PageResponse<LlmLogItem>>('/admin/llm-logs', {
    params,
  });
  return res.data;
}

export async function getAllReviews(
  page = 0,
  size = 15,
  filter = 'all'
): Promise<PageResponse<AdminReviewDTO>> {
  const res = await apiClient.get<PageResponse<AdminReviewDTO>>('/admin/reviews', {
    params: { page, size, filter },
  });
  return res.data;
}

export async function toggleReviewSpam(id: number): Promise<AdminReviewDTO> {
  const res = await apiClient.put<AdminReviewDTO>(`/admin/reviews/${id}/toggle-spam`);
  return res.data;
}

export async function approveReview(id: number): Promise<AdminReviewDTO> {
  const res = await apiClient.put<AdminReviewDTO>(`/admin/reviews/${id}/approve`);
  return res.data;
}

export async function deleteReview(id: number): Promise<void> {
  await apiClient.delete(`/admin/reviews/${id}`);
}

export async function triggerReSummarize(productId: number): Promise<{ message: string }> {
  const res = await apiClient.post<{ message: string }>(`/admin/reviews/${productId}/summarize`);
  return res.data;
}

export async function getCategoryWeights(categoryCode: string): Promise<Record<string, number>> {
  const res = await apiClient.get<Record<string, number>>(`/admin/weights/${categoryCode}`);
  return res.data;
}

export async function updateCategoryWeights(
  categoryCode: string,
  weights: Record<string, number>
): Promise<Record<string, number>> {
  const res = await apiClient.put<Record<string, number>>(`/admin/weights/${categoryCode}`, {
    weights,
  });
  return res.data;
}

export async function runGinBenchmark(req?: GinBenchmarkRequest): Promise<GinBenchmarkResult> {
  const res = await apiClient.post<GinBenchmarkResult>('/admin/benchmark', req || {});
  return res.data;
}

export async function getCategoriesList(includeInactive = false): Promise<CategoryOption[]> {
  const res = await apiClient.get<CategoryOption[]>('/categories', {
    params: { includeInactive },
  });
  return res.data;
}

export interface ProductExcelImportResultDTO {
  totalRows: number;
  successCount: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  errors: string[];
  warnings: string[];
}

export async function exportProductsExcel(categoryCode?: string, keyword?: string): Promise<Blob> {
  const params: Record<string, string> = {};
  if (categoryCode) params.categoryCode = categoryCode;
  if (keyword) params.keyword = keyword;

  const res = await apiClient.get('/admin/products/export', {
    params,
    responseType: 'blob',
  });
  return res.data;
}

export async function downloadExcelTemplate(): Promise<Blob> {
  const res = await apiClient.get('/admin/products/template', {
    responseType: 'blob',
  });
  return res.data;
}

export async function importProductsExcel(file: File): Promise<ProductExcelImportResultDTO> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await apiClient.post<ProductExcelImportResultDTO>('/admin/products/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

export interface AuditLogFilterParams {
  page?: number;
  size?: number;
  entityType?: string;
  action?: string;
  admin?: string;
  from?: string;
  to?: string;
  keyword?: string;
}

export async function getAuditLogs(
  filters: AuditLogFilterParams = {}
): Promise<PageResponse<AuditLogDTO>> {
  const params: Record<string, any> = {
    page: filters.page ?? 0,
    size: filters.size ?? 20,
  };
  if (filters.entityType && filters.entityType !== 'ALL') params.entityType = filters.entityType;
  if (filters.action && filters.action !== 'ALL') params.action = filters.action;
  if (filters.admin && filters.admin.trim()) params.admin = filters.admin.trim();
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.keyword && filters.keyword.trim()) params.keyword = filters.keyword.trim();

  const res = await apiClient.get<PageResponse<AuditLogDTO>>('/admin/audit-logs', { params });
  return res.data;
}

export async function bulkModerateReviews(
  ids: number[],
  action: 'approve' | 'spam' | 'delete'
): Promise<BulkActionResultDTO> {
  const res = await apiClient.post<BulkActionResultDTO>('/admin/reviews/bulk', {
    ids,
    action,
  });
  return res.data;
}

export async function bulkUpdateProducts(
  ids: number[],
  action: 'activate' | 'deactivate'
): Promise<BulkActionResultDTO> {
  const res = await apiClient.post<BulkActionResultDTO>('/admin/products/bulk', {
    ids,
    action,
  });
  return res.data;
}

export async function getDashboardTrends(days: 7 | 14 | 30 | 90 = 14): Promise<DashboardTrendsDTO> {
  const res = await apiClient.get<DashboardTrendsDTO>('/admin/dashboard/trends', {
    params: { days },
  });
  return res.data;
}

