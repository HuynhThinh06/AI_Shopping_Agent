/**
 * AI Shopping Agent — API Client & Shared Utilities
 * Used for dynamic data binding across HTML pages in frontend/design/
 */

const API_BASE = 'http://localhost:8080/api';

const api = {
  // ── Categories ────────────────────────────────────────────────────────────
  async getCategories() {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[API] getCategories failed, falling back to defaults:', err);
      return [
        { code: 'laptop', name: 'Laptop' },
        { code: 'phone', name: 'Điện thoại' }
      ];
    }
  },

  // ── Featured Products (Trang chủ) ─────────────────────────────────────────
  async getFeaturedProducts(limit = 8) {
    try {
      const res = await fetch(`${API_BASE}/products/featured?limit=${limit}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[API] getFeaturedProducts failed:', err);
      return [];
    }
  },

  // ── AI Search (SCR-02) ────────────────────────────────────────────────────
  async search(query) {
    const trimmed = (query || '').trim();
    const res = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ queryText: trimmed, query: trimmed })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Lỗi tìm kiếm (${res.status}): ${errText}`);
    }
    return await res.json();
  },

  // ── Product Detail (SCR-03) ───────────────────────────────────────────────
  async getProduct(id) {
    const res = await fetch(`${API_BASE}/products/${id}`);
    if (!res.ok) {
      throw new Error(`Không tìm thấy sản phẩm #${id} (${res.status})`);
    }
    return await res.json();
  },

  // ── AI Review Summary (SCR-03) ────────────────────────────────────────────
  async getProductSummary(id) {
    const res = await fetch(`${API_BASE}/products/${id}/summary`);
    if (!res.ok) {
      throw new Error(`Không lấy được tóm tắt AI (${res.status})`);
    }
    return await res.json();
  },

  // ── Product Reviews List (SCR-03) ─────────────────────────────────────────
  async getReviews(id, page = 0, size = 10) {
    const res = await fetch(`${API_BASE}/products/${id}/reviews?page=${page}&size=${size}`);
    if (!res.ok) {
      throw new Error(`Không lấy được danh sách review (${res.status})`);
    }
    return await res.json();
  },

  // ── Submit Review (SCR-03) ────────────────────────────────────────────────
  async createReview(id, { reviewerName, rating, content }) {
    const res = await fetch(`${API_BASE}/products/${id}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reviewerName, rating, content })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Không gửi được đánh giá (${res.status}): ${err}`);
    }
    return await res.json();
  }
};

// ── Shared UI Utilities ─────────────────────────────────────────────────────

function formatPrice(price) {
  if (price == null) return 'Liên hệ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(price)
    .replace('₫', 'đ');
}

function renderStars(rating = 5) {
  const rounded = Math.round(rating || 5);
  let html = '';
  for (let i = 1; i <= 5; i++) {
    const fillClass = i <= rounded ? 'text-amber-500 fill-amber-500' : 'text-stone-300 fill-stone-300';
    html += `
      <svg class="w-4 h-4 ${fillClass} inline-block" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
      </svg>
    `;
  }
  return html;
}

function getPrimaryImage(product) {
  if (product.imageUrls && product.imageUrls.length > 0) {
    return product.imageUrls[0];
  }
  if (product.primaryImageUrl) {
    return product.primaryImageUrl;
  }
  // Default placeholder based on category
  const isPhone = (product.categoryCode || '').toLowerCase().includes('phone');
  return isPhone
    ? 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=600&auto=format&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80';
}

function parseSpecs(specs) {
  if (!specs) return {};
  if (typeof specs === 'string') {
    try {
      return JSON.parse(specs);
    } catch {
      return {};
    }
  }
  return specs;
}
