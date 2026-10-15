import { apiClient } from './client';
import type { SystemStatsDTO, LlmLogItem, GinBenchmarkRequest, GinBenchmarkResult } from '../types/admin';
import type { PageResponse } from '../types/review';
import type { ReviewResponseDTO } from '../types/review';

export async function getSystemStats(): Promise<SystemStatsDTO> {
  const res = await apiClient.get<SystemStatsDTO>('/admin/stats');
  return res.data;
}

export async function getLlmLogs(page = 0, size = 15): Promise<PageResponse<LlmLogItem>> {
  const res = await apiClient.get<PageResponse<LlmLogItem>>('/admin/llm-logs', {
    params: { page, size }
  });
  return res.data;
}

export async function getAllReviews(page = 0, size = 15): Promise<PageResponse<ReviewResponseDTO>> {
  const res = await apiClient.get<PageResponse<ReviewResponseDTO>>('/admin/reviews', {
    params: { page, size }
  });
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
  const res = await apiClient.put<Record<string, number>>(`/admin/weights/${categoryCode}`, { weights });
  return res.data;
}

export async function runGinBenchmark(req?: GinBenchmarkRequest): Promise<GinBenchmarkResult> {
  const res = await apiClient.post<GinBenchmarkResult>('/admin/benchmark', req || {});
  return res.data;
}
