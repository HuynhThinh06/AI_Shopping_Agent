import { apiClient } from './client';
import type { ProductDetailDTO } from '../types/product';

export const productApi = {
  getProductById: async (id: number): Promise<ProductDetailDTO> => {
    const response = await apiClient.get<ProductDetailDTO>(`/products/${id}`);
    return response.data;
  },
};
