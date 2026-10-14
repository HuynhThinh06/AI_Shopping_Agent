import type { Category, Product, SearchResponse, SummaryDTO, Review } from '../types';

const API_BASE = 'http://localhost:8080/api';

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
  const res = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: query.trim() }),
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(review),
  });
  if (!res.ok) throw new Error(`Failed to create review (${res.status})`);
  return res.json();
}
