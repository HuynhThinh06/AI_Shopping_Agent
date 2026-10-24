import axios from 'axios';
import type { Category, Product, SearchResponse, SummaryDTO, Review } from '../types';
import { getAuthToken, logoutUser } from '../utils/storage';

// ── Axios Client for React app ─────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 25000, // 25s cho các truy vấn dữ liệu thông thường, đảm bảo an toàn với Cloud DB (Neon)
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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url || '';

    // Khi nhận lỗi 401 Unauthorized từ các API được bảo vệ (tránh chặn lúc đăng nhập sai pass)
    if (status === 401 && !requestUrl.includes('/auth/login') && !requestUrl.includes('/auth/register')) {
      console.warn('[API Client] Phiên làm việc đã hết hạn hoặc không hợp lệ (401). Tự động dọn dẹp phiên.');
      logoutUser();

      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/admin') && !currentPath.includes('/auth') && !currentPath.includes('/login')) {
          window.location.href = `/auth?redirect=${encodeURIComponent(currentPath)}&expired=1`;
        }
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
