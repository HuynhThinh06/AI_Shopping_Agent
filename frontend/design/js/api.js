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
  },

  // ── Admin: Dashboard KPIs (P1) ────────────────────────────────────────────
  async getAdminStats() {
    try {
      const res = await fetch(`${API_BASE}/admin/stats`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[API] getAdminStats error, using fallback:', err);
      return null;
    }
  },

  // ── Admin: Reviews Moderation (P1) ────────────────────────────────────────
  async getAdminReviews(page = 0, size = 15, filter = 'all') {
    const res = await fetch(`${API_BASE}/admin/reviews?page=${page}&size=${size}&filter=${filter}`);
    if (!res.ok) throw new Error(`Lỗi tải danh sách review (${res.status})`);
    return await res.json();
  },

  async toggleReviewSpam(id) {
    const res = await fetch(`${API_BASE}/admin/reviews/${id}/toggle-spam`, { method: 'PUT' });
    if (!res.ok) throw new Error(`Lỗi đổi cờ spam (${res.status})`);
    return await res.json();
  },

  async approveReview(id) {
    const res = await fetch(`${API_BASE}/admin/reviews/${id}/approve`, { method: 'PUT' });
    if (!res.ok) throw new Error(`Lỗi duyệt review (${res.status})`);
    return await res.json();
  },

  async deleteReview(id) {
    const res = await fetch(`${API_BASE}/admin/reviews/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Lỗi xóa review (${res.status})`);
    return true;
  },

  async triggerProductSummary(productId) {
    const res = await fetch(`${API_BASE}/admin/reviews/${productId}/summarize`, { method: 'POST' });
    if (!res.ok) throw new Error(`Lỗi tóm tắt (${res.status})`);
    return await res.json();
  },

  // ── Admin: Ranking Weights (P1) ───────────────────────────────────────────
  async getAdminWeights() {
    const res = await fetch(`${API_BASE}/admin/weights`);
    if (!res.ok) throw new Error(`Lỗi tải trọng số ranking (${res.status})`);
    return await res.json();
  },

  async updateAdminWeights(categoryCode, weights) {
    const res = await fetch(`${API_BASE}/admin/weights`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryCode, weights })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Lỗi cập nhật trọng số (${res.status}): ${err}`);
    }
    return await res.json();
  },

  // ── Admin: LLM Request Logs (P1) ──────────────────────────────────────────
  async getAdminLlmLogs(page = 0, size = 20, requestType = '', status = '') {
    const params = new URLSearchParams({ page, size });
    if (requestType) params.append('requestType', requestType);
    if (status) params.append('status', status);

    const res = await fetch(`${API_BASE}/admin/llm-logs?${params.toString()}`);
    if (!res.ok) throw new Error(`Lỗi tải nhật ký LLM (${res.status})`);
    return await res.json();
  },

  // ── Admin: Benchmark (P1) ─────────────────────────────────────────────────
  async getAdminBenchmark() {
    const res = await fetch(`${API_BASE}/admin/benchmark`);
    if (!res.ok) throw new Error(`Lỗi tải dữ liệu benchmark (${res.status})`);
    return await res.json();
  },

  // ── Product Compare (P2) ──────────────────────────────────────────────────
  async compareProducts(ids) {
    if (!ids || ids.length === 0) return [];
    const idList = Array.isArray(ids) ? ids.join(',') : ids;
    const res = await fetch(`${API_BASE}/products/compare?ids=${idList}`);
    if (!res.ok) throw new Error(`Lỗi tải dữ liệu so sánh (${res.status})`);
    return await res.json();
  }
};

// ── Compare Manager (Persistent State across pages) ─────────────────────────
const CompareManager = {
  KEY: 'ai_shopping_compare_items',

  getList() {
    try {
      const data = localStorage.getItem(this.KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  add(product) {
    let list = this.getList();
    if (list.find(p => p.id === product.id)) {
      showToast(`Sản phẩm "${product.name}" đã có trong danh sách so sánh!`, 'info');
      return list;
    }
    if (list.length >= 4) {
      showToast('Bạn chỉ có thể so sánh tối đa 4 sản phẩm cùng lúc!', 'warning');
      return list;
    }
    list.push({
      id: product.id,
      name: product.name,
      price: product.price,
      brand: product.brand,
      image: getPrimaryImage(product)
    });
    localStorage.setItem(this.KEY, JSON.stringify(list));
    showToast(`Đã thêm "${product.name}" vào so sánh (${list.length}/4)`, 'success');
    window.dispatchEvent(new CustomEvent('compare-updated', { detail: list }));
    return list;
  },

  remove(id) {
    let list = this.getList().filter(p => p.id !== id);
    localStorage.setItem(this.KEY, JSON.stringify(list));
    showToast('Đã bỏ sản phẩm khỏi so sánh.', 'info');
    window.dispatchEvent(new CustomEvent('compare-updated', { detail: list }));
    return list;
  },

  clear() {
    localStorage.removeItem(this.KEY);
    window.dispatchEvent(new CustomEvent('compare-updated', { detail: [] }));
  },

  has(id) {
    return this.getList().some(p => p.id === id);
  }
};

// ── Toast Notification Utility ──────────────────────────────────────────────
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const bgColors = {
    success: 'bg-emerald-100 border-emerald-500 text-emerald-900',
    warning: 'bg-amber-100 border-amber-500 text-amber-900',
    error: 'bg-red-100 border-red-500 text-red-900',
    info: 'bg-warm-secondary border-warm-text text-warm-text'
  };

  toast.className = `p-3.5 rounded-2xl border-2 shadow-brutal-sm font-extrabold text-xs flex items-center justify-between gap-3 pointer-events-auto transition-all transform translate-y-4 opacity-0 ${bgColors[type] || bgColors.info}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button type="button" class="text-xs font-black p-1 hover:opacity-70" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

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
