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
const REVIEWS_KEY = 'shopping_agent_user_reviews';

// --- Favorites ---
export function getFavoriteIds(): number[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Migration: nếu còn lưu mảng demo cứng [1, 2, 4] từ code cũ thì dọn sạch về rỗng
    if (
      parsed.length === 3 &&
      parsed[0] === 1 &&
      parsed[1] === 2 &&
      parsed[2] === 4 &&
      !localStorage.getItem('shopping_agent_fav_migrated')
    ) {
      localStorage.setItem('shopping_agent_fav_migrated', 'true');
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([]));
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

export function toggleFavoriteId(id: number): boolean {
  const ids = getFavoriteIds();
  const exists = ids.includes(id);
  const next = exists ? ids.filter((x) => x !== id) : [...ids, id];
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('favorites-updated'));
  } catch (err) {
    console.error(err);
  }
  return !exists;
}

export function isFavoriteId(id: number): boolean {
  return getFavoriteIds().includes(id);
}

// --- Compare ---
export function getCompareIds(): number[] {
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Migration: nếu còn lưu mảng demo cứng [1, 2] từ code cũ thì dọn sạch về rỗng
    if (
      parsed.length === 2 &&
      parsed[0] === 1 &&
      parsed[1] === 2 &&
      !localStorage.getItem('shopping_agent_comp_migrated')
    ) {
      localStorage.setItem('shopping_agent_comp_migrated', 'true');
      localStorage.setItem(COMPARE_KEY, JSON.stringify([]));
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

export function toggleCompareId(id: number): boolean {
  const ids = getCompareIds();
  const exists = ids.includes(id);
  let next = exists ? ids.filter((x) => x !== id) : [...ids, id];
  if (next.length > 3) {
    next = next.slice(next.length - 3); // Giới hạn tối đa 3 SP
  }
  try {
    localStorage.setItem(COMPARE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('compare-updated'));
  } catch (err) {
    console.error(err);
  }
  return !exists;
}

export function isInCompare(id: number): boolean {
  return getCompareIds().includes(id);
}

export function clearCompare(): void {
  try {
    localStorage.removeItem(COMPARE_KEY);
    window.dispatchEvent(new Event('compare-updated'));
  } catch (err) {
    console.error(err);
  }
}

// --- Search History ---
export function getSearchHistory(): SearchHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw
      ? JSON.parse(raw)
      : [
          {
            id: 'h1',
            queryText: 'Laptop sinh viên 15 củ học IT',
            categoryCode: 'laptop',
            target: 'student',
            budgetMax: 15000000,
            totalMatched: 8,
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            id: 'h2',
            queryText: 'Điện thoại chụp ảnh ban đêm pin trâu dưới 10 chai',
            categoryCode: 'phone',
            target: 'general',
            budgetMax: 10000000,
            totalMatched: 5,
            timestamp: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: 'h3',
            queryText: 'Macbook Air M2 16GB làm đồ họa mỏng nhẹ',
            categoryCode: 'laptop',
            target: 'designer',
            budgetMax: 28000000,
            totalMatched: 3,
            timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
        ];
  } catch {
    return [];
  }
}

export function addSearchHistory(
  queryText: string,
  categoryCode?: string | null,
  target?: string | null,
  budgetMax?: number | null,
  totalMatched?: number | null
): void {
  const list = getSearchHistory().filter((x) => x.queryText.toLowerCase() !== queryText.toLowerCase());
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
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch (err) {
    console.error(err);
  }
}

export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (err) {
    console.error(err);
  }
}

// --- Auth User ---
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
  } catch (err) {
    console.error(err);
  }
}

export function logoutUser(): void {
  try {
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event('auth-updated'));
  } catch (err) {
    console.error(err);
  }
}

// --- User Reviews ---
export function getUserReviews(): UserReviewItem[] {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    return raw
      ? JSON.parse(raw)
      : [
          {
            id: 101,
            productId: 1,
            productName: 'Asus Vivobook 15 OLED A1505ZA',
            rating: 5,
            content: 'Màn hình OLED màu sắc rất rực rỡ, bàn phím gõ nảy, chạy code Docker và VS Code rất mượt.',
            createdAt: '2026-10-12T14:30:00Z',
            status: 'Hợp lệ (Đã duyệt)',
          },
          {
            id: 102,
            productId: 2,
            productName: 'Lenovo ThinkPad E16 Gen 2',
            rating: 5,
            content: 'Bàn phím ThinkPad bấm êm đỉnh cao, pin dùng thực tế khoảng 7 tiếng văn phòng.',
            createdAt: '2026-10-10T09:15:00Z',
            status: 'Hợp lệ (Đã duyệt)',
          },
          {
            id: 103,
            productId: 4,
            productName: 'iPhone 15 128GB',
            rating: 4,
            content: 'Cổng Type-C rất tiện, Dynamic Island hiển thị thông báo hay, camera quay video xuất sắc.',
            createdAt: '2026-10-05T18:45:00Z',
            status: 'Hợp lệ (Đã duyệt)',
          },
        ];
  } catch {
    return [];
  }
}

export function addUserReview(review: Omit<UserReviewItem, 'id' | 'createdAt' | 'status'>): void {
  const list = getUserReviews();
  const item: UserReviewItem = {
    ...review,
    id: Date.now(),
    createdAt: new Date().toISOString(),
    status: 'Hợp lệ (Đã duyệt)',
  };
  try {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify([item, ...list]));
  } catch (err) {
    console.error(err);
  }
}
