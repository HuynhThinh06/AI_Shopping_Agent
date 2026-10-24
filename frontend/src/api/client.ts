import axios from 'axios';
import type { Category, Product, SearchResponse, SummaryDTO, Review } from '../types';
import { getAuthToken, saveAuthToken, getRefreshToken, saveRefreshToken, logoutUser } from '../utils/storage';

// ── Axios Client for React app ─────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 25000, // 25s cho các truy vấn dữ liệu thông thường, đảm bảo an toàn với Cloud DB (Neon)
  withCredentials: true, // Cho phép trình duyệt tự động gửi và nhận HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Cơ chế Silent Refresh Token Queue khi Access Token hết hạn (401 Unauthorized)
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh');

    // Nếu gặp 401 trên các API nghiệp vụ và chưa từng retry
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const fallbackRefreshToken = getRefreshToken();
        // Dùng axios instance riêng biệt để tránh interceptor loop
        const refreshResponse = await axios.post<{
          token?: string;
          accessToken?: string;
          refreshToken?: string;
        }>(
          '/api/auth/refresh',
          { refreshToken: fallbackRefreshToken || undefined },
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data.accessToken || refreshResponse.data.token;
        const newRefreshToken = refreshResponse.data.refreshToken;

        if (newAccessToken) {
          saveAuthToken(newAccessToken);
        }
        if (newRefreshToken) {
          saveRefreshToken(newRefreshToken);
        }

        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        console.warn('[API Client] Phiên làm việc đã hết hạn hoặc không thể refresh (401). Tự động dọn dẹp phiên.');
        logoutUser();

        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          if (currentPath.startsWith('/admin') && !currentPath.includes('/auth') && !currentPath.includes('/login')) {
            window.location.href = `/auth?redirect=${encodeURIComponent(currentPath)}&expired=1`;
          }
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    console.error('[API Error]:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ── Native Fetch Helper Functions ──────────────────────────────────────────
const API_BASE = 'http://localhost:8080/api';

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE}/categories`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchFeaturedProducts(limit = 8): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/products/featured?limit=${limit}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function searchProducts(query: string): Promise<SearchResponse> {
  const trimmed = query.trim();
  const res = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queryText: trimmed, query: trimmed }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Search error (${res.status}): ${errText}`);
  }
  return res.json();
}

export async function fetchProductDetail(id: number | string): Promise<Product> {
  const res = await fetch(`${API_BASE}/products/${id}`);
  if (!res.ok) throw new Error(`Product not found (${res.status})`);
  return res.json();
}

export async function fetchProductSummary(id: number | string): Promise<SummaryDTO> {
  const res = await fetch(`${API_BASE}/products/${id}/summary`);
  if (!res.ok) throw new Error(`Failed to fetch AI summary (${res.status})`);
  return res.json();
}

export async function fetchProductReviews(
  id: number | string,
  page = 0,
  size = 10
): Promise<{ content: Review[]; totalElements: number }> {
  const res = await fetch(`${API_BASE}/products/${id}/reviews?page=${page}&size=${size}`);
  if (!res.ok) throw new Error(`Failed to fetch reviews (${res.status})`);
  return res.json();
}

export async function createProductReview(
  id: number | string,
  review: { reviewerName: string; rating: number; content: string }
): Promise<Review> {
  const res = await fetch(`${API_BASE}/products/${id}/reviews`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(review),
  });
  if (!res.ok) throw new Error(`Failed to create review (${res.status})`);
  return res.json();
}
