import { apiClient } from './client';

export interface ToggleFavoriteResponse {
  productId: number;
  isFavorite: boolean;
  message: string;
}

export async function fetchUserFavoriteIds(userEmail?: string, userId?: number): Promise<number[]> {
  try {
    const params: Record<string, string | number> = {};
    if (userEmail) params.userEmail = userEmail;
    if (userId) params.userId = userId;

    const res = await apiClient.get<number[]>('/favorites', { params });
    return res.data || [];
  } catch (err) {
    console.warn('[Favorites API] Failed to fetch favorites from backend:', err);
    return [];
  }
}

export async function toggleUserFavorite(productId: number, userEmail?: string, userId?: number): Promise<boolean> {
  try {
    const res = await apiClient.post<ToggleFavoriteResponse>('/favorites/toggle', {
      productId,
      userEmail,
      userId,
    });
    return res.data.isFavorite;
  } catch (err) {
    console.error('[Favorites API] Failed to toggle favorite:', err);
    throw err;
  }
}

export async function removeUserFavorite(productId: number, userEmail?: string, userId?: number): Promise<void> {
  try {
    const params: Record<string, string | number> = {};
    if (userEmail) params.userEmail = userEmail;
    if (userId) params.userId = userId;

    await apiClient.delete(`/favorites/${productId}`, { params });
  } catch (err) {
    console.error('[Favorites API] Failed to delete favorite:', err);
  }
}
