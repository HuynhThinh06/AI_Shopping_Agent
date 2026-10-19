import { apiClient } from './client';
import type { ProductDetailDTO } from '../types/product';

export const productApi = {
  getProductById: async (id: number): Promise<ProductDetailDTO> => {
    const response = await apiClient.get<ProductDetailDTO>(`/products/${id}`);
    return response.data;
  },
  getFeaturedProducts: async (limit: number = 8): Promise<ProductDetailDTO[]> => {
    const response = await apiClient.get<ProductDetailDTO[]>('/products/featured', { params: { limit } });
    return response.data;
  },
};
