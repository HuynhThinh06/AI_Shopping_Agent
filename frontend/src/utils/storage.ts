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
    return raw ? JSON.parse(raw) : [1, 2, 4]; // Mặc định 3 SP demo nếu chưa có
  } catch {
    return [1, 2, 4];
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
    return raw ? JSON.parse(raw) : [1, 2]; // Mặc định 2 SP demo so sánh
  } catch {
    return [1, 2];
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
  categoryCode?: string,
  target?: string,
  budgetMax?: number,
  totalMatched?: number
): void {
  const list = getSearchHistory().filter((x) => x.queryText.toLowerCase() !== queryText.toLowerCase());
  const item: SearchHistoryItem = {
    id: Date.now().toString(),
    queryText,
    categoryCode,
    target,
    budgetMax,
    totalMatched,
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
export function getAuthUser(): AuthUser {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw
      ? JSON.parse(raw)
      : {
          name: 'Trần Tuấn Anh',
          email: 'tuananh.dev@gmail.com',
          phone: '0988 123 456',
          avatarText: 'TA',
          role: 'Thành viên VIP',
        };
  } catch {
    return {
      name: 'Trần Tuấn Anh',
      email: 'tuananh.dev@gmail.com',
      avatarText: 'TA',
    };
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
