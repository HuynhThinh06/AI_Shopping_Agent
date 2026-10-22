import { fetchUserFavoriteIds, toggleUserFavorite } from '../api/favorite';

export interface AuthUser {
  name: string;
  email: string;
  phone?: string;
  avatarText?: string;
  role?: string;
}

export interface SearchHistoryItem {
  id: string;
  queryText: string;
  categoryCode?: string;
  target?: string;
  budgetMax?: number;
  totalMatched?: number;
  timestamp: string;
}

export interface UserReviewItem {
  id: number;
  productId: number;
  productName: string;
  rating: number;
  content: string;
  createdAt: string;
  status: string;
}

const FAVORITES_KEY = 'shopping_agent_favorites';
const COMPARE_KEY = 'shopping_agent_compare';
const HISTORY_KEY = 'shopping_agent_search_history';
const USER_KEY = 'shopping_agent_auth_user';
const TOKEN_KEY = 'shopping_agent_jwt_token';
const REVIEWS_KEY = 'shopping_agent_user_reviews';

/**
 * Phân giải khóa lưu trữ động theo định danh người dùng (User-Scoped Key Resolver).
 * Đảm bảo nguyên lý cách ly dữ liệu: Mỗi email có một vùng lưu trữ riêng biệt,
 * khách vãng lai dùng vùng '_guest'.
 */
export function getScopedKey(baseKey: string, explicitEmail?: string): string {
  const email = explicitEmail || getAuthUser()?.email;
  return email ? `${baseKey}_${email.trim().toLowerCase()}` : `${baseKey}_guest`;
}

// --- Favorites ---
export function getFavoriteIds(explicitEmail?: string): number[] {
  try {
    const key = getScopedKey(FAVORITES_KEY, explicitEmail);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteId(id: number, explicitEmail?: string): boolean {
  const user = getAuthUser();
  const email = explicitEmail || user?.email;
  const key = getScopedKey(FAVORITES_KEY, email);
  const ids = getFavoriteIds(email);
  const exists = ids.includes(id);
  const next = exists ? ids.filter((x) => x !== id) : [...ids, id];

  try {
    localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event('favorites-updated'));

    // Đồng bộ lên PostgreSQL Backend ngầm nếu người dùng đã đăng nhập (Optimistic Background Sync)
    if (email) {
      toggleUserFavorite(id, email).catch((err) => {
        console.warn('[Favorites Sync] Failed background sync to DB:', err);
      });
    }
  } catch (err) {
    console.error('[Favorites Storage] Error toggling favorite:', err);
  }
  return !exists;
}

export function isFavoriteId(id: number, explicitEmail?: string): boolean {
  return getFavoriteIds(explicitEmail).includes(id);
}

/**
 * Đồng bộ danh sách yêu thích từ Database Backend xuống client state của User
 */
export async function syncFavoritesFromBackend(explicitEmail?: string): Promise<number[]> {
  const user = getAuthUser();
  const email = explicitEmail || user?.email;
  if (!email) return [];

  try {
    const remoteIds = await fetchUserFavoriteIds(email);
    const key = getScopedKey(FAVORITES_KEY, email);
    const currentLocal = getFavoriteIds(email);

    const isDifferent =
      remoteIds.length !== currentLocal.length ||
      remoteIds.some((id, idx) => id !== currentLocal[idx]);

    if (isDifferent) {
      localStorage.setItem(key, JSON.stringify(remoteIds));
      window.dispatchEvent(new Event('favorites-updated'));
    }
    return remoteIds;
  } catch (err) {
    console.warn('[Favorites Sync] Failed to sync from backend:', err);
    return getFavoriteIds(email);
  }
}

// --- Compare ---
export function getCompareIds(explicitEmail?: string): number[] {
  const user = getAuthUser();
  const email = explicitEmail || user?.email;
  // Bắt buộc đăng nhập: Khách chưa đăng nhập không có danh sách so sánh
  if (!email) return [];

  try {
    const key = getScopedKey(COMPARE_KEY, email);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getCompareCategory(explicitEmail?: string): string | null {
  const user = getAuthUser();
  const email = explicitEmail || user?.email;
  if (!email) return null;

  try {
    return localStorage.getItem(getScopedKey('shopping_agent_compare_category', email));
  } catch {
    return null;
  }
}

export function toggleCompareId(id: number, categoryCode?: string, explicitEmail?: string): boolean {
  const user = getAuthUser();
  const email = explicitEmail || user?.email;
  if (!email) {
    return false;
  }

  const key = getScopedKey(COMPARE_KEY, email);
  const catKey = getScopedKey('shopping_agent_compare_category', email);
  const ids = getCompareIds(email);
  const exists = ids.includes(id);
  let next = exists ? ids.filter((x) => x !== id) : [...ids, id];
  if (next.length > 3) {
    next = next.slice(next.length - 3); // Giới hạn tối đa 3 SP
  }
  try {
    localStorage.setItem(key, JSON.stringify(next));
    if (next.length === 0) {
      localStorage.removeItem(catKey);
    } else if (categoryCode) {
      localStorage.setItem(catKey, categoryCode.toLowerCase());
    }
    window.dispatchEvent(new Event('compare-updated'));
  } catch (err) {
    console.error('[Compare Storage] Error:', err);
  }
  return !exists;
}

export function isInCompare(id: number, explicitEmail?: string): boolean {
  const user = getAuthUser();
  const email = explicitEmail || user?.email;
  if (!email) return false;
  return getCompareIds(email).includes(id);
}

export function clearCompare(explicitEmail?: string): void {
  try {
    localStorage.removeItem(getScopedKey(COMPARE_KEY, explicitEmail));
    localStorage.removeItem(getScopedKey('shopping_agent_compare_category', explicitEmail));
    window.dispatchEvent(new Event('compare-updated'));
  } catch (err) {
    console.error('[Compare Storage] Error clearing compare:', err);
  }
}

// --- Search History ---
export function getSearchHistory(explicitEmail?: string): SearchHistoryItem[] {
  try {
    const key = getScopedKey(HISTORY_KEY, explicitEmail);
    const raw = localStorage.getItem(key);
    if (!raw) {
      // Tài khoản mới tinh luôn luôn có danh sách rỗng []
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addSearchHistory(
  queryText: string,
  categoryCode?: string | null,
  target?: string | null,
  budgetMax?: number | null,
  totalMatched?: number | null,
  explicitEmail?: string
): void {
  const key = getScopedKey(HISTORY_KEY, explicitEmail);
  const list = getSearchHistory(explicitEmail).filter((x) => x.queryText.toLowerCase() !== queryText.toLowerCase());
  const item: SearchHistoryItem = {
    id: Date.now().toString(),
    queryText,
    categoryCode: categoryCode || undefined,
    target: target || undefined,
    budgetMax: budgetMax || undefined,
    totalMatched: totalMatched || undefined,
    timestamp: new Date().toISOString(),
  };
  const next = [item, ...list].slice(0, 20); // Giữ 20 câu gần nhất
  try {
    localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event('history-updated'));
  } catch (err) {
    console.error('[History Storage] Error:', err);
  }
}

export function clearSearchHistory(explicitEmail?: string): void {
  try {
    localStorage.removeItem(getScopedKey(HISTORY_KEY, explicitEmail));
    window.dispatchEvent(new Event('history-updated'));
  } catch (err) {
    console.error('[History Storage] Error clearing history:', err);
  }
}

// --- Auth User & Token ---
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveAuthToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.error(err);
  }
}

export function removeAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.error(err);
  }
}

export function getAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAuthUser(user: AuthUser): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('auth-updated'));
    window.dispatchEvent(new Event('favorites-updated'));
    window.dispatchEvent(new Event('compare-updated'));
    window.dispatchEvent(new Event('history-updated'));

    // Đồng bộ danh sách yêu thích của tài khoản này từ Database Backend
    if (user.email) {
      syncFavoritesFromBackend(user.email);
    }
  } catch (err) {
    console.error(err);
  }
}

export function logoutUser(): void {
  try {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('auth-updated'));
    window.dispatchEvent(new Event('favorites-updated'));
    window.dispatchEvent(new Event('compare-updated'));
    window.dispatchEvent(new Event('history-updated'));
  } catch (err) {
    console.error(err);
  }
}

// --- User Reviews ---
export function getUserReviews(explicitEmail?: string): UserReviewItem[] {
  try {
    const key = getScopedKey(REVIEWS_KEY, explicitEmail);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addUserReview(review: Omit<UserReviewItem, 'id' | 'createdAt' | 'status'>, explicitEmail?: string): void {
  const key = getScopedKey(REVIEWS_KEY, explicitEmail);
  const list = getUserReviews(explicitEmail);
  const item: UserReviewItem = {
    ...review,
    id: Date.now(),
    createdAt: new Date().toISOString(),
    status: 'Hợp lệ (Đã duyệt)',
  };
  try {
    localStorage.setItem(key, JSON.stringify([item, ...list]));
    window.dispatchEvent(new Event('reviews-updated'));
  } catch (err) {
    console.error(err);
  }
}
