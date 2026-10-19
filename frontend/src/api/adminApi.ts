import { apiClient } from './client';
import type {
  SystemStatsDTO,
  LlmLogItem,
  GinBenchmarkRequest,
  GinBenchmarkResult,
  AdminReviewDTO,
  CategoryOption,
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
