import { apiClient } from './client';
import type { Category } from '../types';
import type { CategoryFacetDTO } from '../types/search';

export const categoryApi = {
  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get<Category[]>('/categories');
    return response.data;
  },
  getCategoryFacets: async (categoryCode: string): Promise<CategoryFacetDTO[]> => {
    const response = await apiClient.get<CategoryFacetDTO[]>(`/categories/${categoryCode}/facets`);
    return response.data;
  },
};
