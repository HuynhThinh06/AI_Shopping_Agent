import { apiClient } from './client';
import type { SearchRequest, SearchResponse } from '../types/search';
import { getAuthUser } from '../utils/storage';

export const searchApi = {
  searchProducts: async (queryText: string, topK: number = 10, sessionId?: string): Promise<SearchResponse> => {
    const user = getAuthUser();
    const payload: SearchRequest = {
      queryText,
      topK,
      sessionId: sessionId || 'web-session-' + Date.now(),
      userEmail: user?.email || undefined,
    };
    const response = await apiClient.post<SearchResponse>('/search', payload, { timeout: 65000 });
    return response.data;
  },
};
