import { apiClient } from './client';
import type { SummaryDTO, ReviewResponseDTO, ReviewCreateRequest, PageResponse } from '../types/review';

export const reviewApi = {
  getSummary: async (productId: number): Promise<SummaryDTO> => {
    const response = await apiClient.get<SummaryDTO>(`/products/${productId}/summary`);
    return response.data;
  },

  listReviews: async (productId: number, page: number = 0, size: number = 10): Promise<PageResponse<ReviewResponseDTO>> => {
    const response = await apiClient.get<PageResponse<ReviewResponseDTO>>(`/products/${productId}/reviews`, {
      params: { page, size },
    });
    return response.data;
  },

  createReview: async (productId: number, data: ReviewCreateRequest): Promise<ReviewResponseDTO> => {
    const response = await apiClient.post<ReviewResponseDTO>(`/products/${productId}/reviews`, data);
    return response.data;
  },
};
