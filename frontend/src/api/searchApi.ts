import { apiClient } from './client';
import type { SearchRequest, SearchResponse } from '../types/search';

export const searchApi = {
  searchProducts: async (queryText: string, topK: number = 10, sessionId?: string): Promise<SearchResponse> => {
    const payload: SearchRequest = {
      queryText,
      topK,
      sessionId: sessionId || 'web-session-' + Date.now(),
    };
    const response = await apiClient.post<SearchResponse>('/search', payload);
    return response.data;
  },
};
