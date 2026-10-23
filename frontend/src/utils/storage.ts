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
const COMPARE_BUCKETS_KEY = 'shopping_agent_compare_buckets';
const HISTORY_KEY = 'shopping_agent_search_history';
const USER_KEY = 'shopping_agent_auth_user';
const TOKEN_KEY = 'shopping_agent_jwt_token';
const REVIEWS_KEY = 'shopping_agent_user_reviews';

export type CompareCategory = 'laptop' | 'phone';

export interface CompareBuckets {
  laptop: number[];
  phone: number[];
}

export interface CompareNotification {
  type: 'success' | 'warning' | 'info';
  message: string;
}

export function dispatchCompareNotify(notification: CompareNotification): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('compare-notify', { detail: notification }));
  }
}

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

    // Bắn thông báo Toast trực quan cho người dùng
    dispatchCompareNotify({
      type: exists ? 'info' : 'success',
      message: exists
        ? 'Đã xóa sản phẩm khỏi danh sách yêu thích.'
        : 'Đã lưu sản phẩm vào danh sách yêu thích!',
    });

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
 * Áp dụng nguyên lý Hợp nhất (Merge Union) và bảo toàn dữ liệu: Tuyệt đối không xóa local khi API lỗi hoặc remote rỗng.
 */
export async function syncFavoritesFromBackend(explicitEmail?: string): Promise<number[]> {
  const user = getAuthUser();
  const email = explicitEmail || user?.email;
  if (!email) return [];

  const key = getScopedKey(FAVORITES_KEY, email);
  const currentLocal = getFavoriteIds(email);

  try {
    const remoteIds = await fetchUserFavoriteIds(email);

    // 1. Nếu API lỗi (null) -> Giữ nguyên dữ liệu local
    if (remoteIds === null) {
      return currentLocal;
    }

    // 2. Nếu remote rỗng nhưng local có dữ liệu -> Đồng bộ ngược từ local lên backend
    if (remoteIds.length === 0 && currentLocal.length > 0) {
      currentLocal.forEach((id) => {
        toggleUserFavorite(id, email).catch(() => {});
      });
      return currentLocal;
    }

    // 3. Hợp nhất hai chiều (Merge Union)
    const merged = Array.from(new Set([...currentLocal, ...remoteIds]));
    const isDifferent =
      merged.length !== currentLocal.length ||
      merged.some((id, idx) => id !== currentLocal[idx]);

    if (isDifferent) {
      localStorage.setItem(key, JSON.stringify(merged));
      window.dispatchEvent(new Event('favorites-updated'));
    }
    return merged;
  } catch (err) {
    console.warn('[Favorites Sync] Failed to sync from backend:', err);
    return currentLocal;
  }
}

// --- Compare Categories & Buckets ---
export function getCompareBuckets(explicitEmail?: string): CompareBuckets {
  const user = getAuthUser();
  const email = explicitEmail || user?.email;
  if (!email) return { laptop: [], phone: [] };

  try {
    const key = getScopedKey(COMPARE_BUCKETS_KEY, email);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        laptop: Array.isArray(parsed?.laptop) ? parsed.laptop : [],
        phone: Array.isArray(parsed?.phone) ? parsed.phone : [],
      };
    }

    // Tự động di chuyển dữ liệu cũ từ key phẳng (Migration)
    const oldKey = getScopedKey(COMPARE_KEY, email);
    const oldRaw = localStorage.getItem(oldKey);
    if (oldRaw) {
      const oldParsed = JSON.parse(oldRaw);
      if (Array.isArray(oldParsed) && oldParsed.length > 0) {
        const catKey = getScopedKey('shopping_agent_compare_category', email);
        const savedCat = (localStorage.getItem(catKey) || 'laptop').toLowerCase();
        const targetCat: CompareCategory = savedCat.includes('phone') ? 'phone' : 'laptop';
        const migrated: CompareBuckets = {
          laptop: targetCat === 'laptop' ? oldParsed.slice(-3) : [],
          phone: targetCat === 'phone' ? oldParsed.slice(-3) : [],
        };
        localStorage.setItem(key, JSON.stringify(migrated));
        return migrated;
      }
    }

    return { laptop: [], phone: [] };
  } catch {
    return { laptop: [], phone: [] };
  }
}

export function saveCompareBuckets(buckets: CompareBuckets, explicitEmail?: string): void {
  const user = getAuthUser();
  const email = explicitEmail || user?.email;
  if (!email) return;

  try {
    const key = getScopedKey(COMPARE_BUCKETS_KEY, email);
    localStorage.setItem(key, JSON.stringify(buckets));
    // Đồng bộ key phẳng để tương thích ngược
    const oldKey = getScopedKey(COMPARE_KEY, email);
    localStorage.setItem(oldKey, JSON.stringify([...buckets.laptop, ...buckets.phone]));
  } catch (err) {
    console.error('[Compare Storage] Error saving buckets:', err);
  }
}

export function getCompareIdsByCategory(category: string, explicitEmail?: string): number[] {
  const normCat: CompareCategory = category.toLowerCase().includes('phone') ? 'phone' : 'laptop';
  const buckets = getCompareBuckets(explicitEmail);
  return buckets[normCat] || [];
}

export function getCompareIds(explicitEmail?: string): number[] {
  const buckets = getCompareBuckets(explicitEmail);
  return [...buckets.laptop, ...buckets.phone];
}

export function setCompareCategoryIds(category: string, ids: number[], explicitEmail?: string): void {
  const normCat: CompareCategory = category.toLowerCase().includes('phone') ? 'phone' : 'laptop';
  const buckets = getCompareBuckets(explicitEmail);
  buckets[normCat] = ids.slice(0, 3);
  saveCompareBuckets(buckets, explicitEmail);
  window.dispatchEvent(new Event('compare-updated'));
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
    dispatchCompareNotify({
      type: 'warning',
      message: 'Vui lòng đăng nhập tài khoản để so sánh sản phẩm.',
    });
    return false;
  }

  const buckets = getCompareBuckets(email);

  // Phân loại ngành hàng mục tiêu
  let normCat: CompareCategory;
  if (categoryCode) {
    normCat = categoryCode.toLowerCase().includes('phone') ? 'phone' : 'laptop';
  } else if (buckets.phone.includes(id)) {
    normCat = 'phone';
  } else if (buckets.laptop.includes(id)) {
    normCat = 'laptop';
  } else {
    const savedCat = getCompareCategory(email);
    normCat = savedCat && savedCat.includes('phone') ? 'phone' : 'laptop';
  }

  const catLabel = normCat === 'phone' ? 'Điện thoại' : 'Laptop';
  const currentList = buckets[normCat];
  const exists = currentList.includes(id);

  if (exists) {
    // 1. Xóa khỏi danh mục so sánh
    buckets[normCat] = currentList.filter((x) => x !== id);
    saveCompareBuckets(buckets, email);
    window.dispatchEvent(new Event('compare-updated'));
    dispatchCompareNotify({
      type: 'info',
      message: `Đã bỏ sản phẩm khỏi danh sách so sánh ${catLabel}.`,
    });
    return false;
  } else {
    // 2. HARD-CAP GUARD: Giới hạn tối đa 3 sản phẩm mỗi loại
    if (currentList.length >= 3) {
      dispatchCompareNotify({
        type: 'warning',
        message: `Bạn chỉ có thể so sánh tối đa 3 sản phẩm ${catLabel}. Vui lòng bỏ bớt 1 sản phẩm trước khi thêm mới!`,
      });
      return false; // Chặn không thêm mới
    }

    // 3. Thêm mới hợp lệ
    buckets[normCat] = [...currentList, id];
    saveCompareBuckets(buckets, email);
    window.dispatchEvent(new Event('compare-updated'));
    dispatchCompareNotify({
      type: 'success',
      message: `Đã thêm vào so sánh ${catLabel} (${buckets[normCat].length}/3 sản phẩm).`,
    });
    return true;
  }
}

export function isInCompare(id: number, explicitEmail?: string): boolean {
  const user = getAuthUser();
  const email = explicitEmail || user?.email;
  if (!email) return false;
  const buckets = getCompareBuckets(email);
  return buckets.laptop.includes(id) || buckets.phone.includes(id);
}

export function clearCompare(category?: 'laptop' | 'phone' | 'all', explicitEmail?: string): void {
  const user = getAuthUser();
  const email = explicitEmail || user?.email;
  if (!email) return;

  try {
    if (!category || category === 'all') {
      const bucketsKey = getScopedKey(COMPARE_BUCKETS_KEY, email);
      const oldKey = getScopedKey(COMPARE_KEY, email);
      const catKey = getScopedKey('shopping_agent_compare_category', email);
      localStorage.removeItem(bucketsKey);
      localStorage.removeItem(oldKey);
      localStorage.removeItem(catKey);
      dispatchCompareNotify({
        type: 'info',
        message: 'Đã xóa toàn bộ sản phẩm khỏi danh sách so sánh.',
      });
    } else {
      const buckets = getCompareBuckets(email);
      buckets[category] = [];
      saveCompareBuckets(buckets, email);
      const catLabel = category === 'phone' ? 'Điện thoại' : 'Laptop';
      dispatchCompareNotify({
        type: 'info',
        message: `Đã xóa danh sách so sánh ${catLabel}.`,
      });
    }
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
