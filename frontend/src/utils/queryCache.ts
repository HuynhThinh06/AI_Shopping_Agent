interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const PERSISTENT_PREFIX = 'shopping_agent_cache_';

class QueryMemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs = 15 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Lấy dữ liệu bền vững từ RAM hoặc LocalStorage (tốc độ < 1ms)
   */
  getPersistent<T>(key: string): T | null {
    const mem = this.get<T>(key);
    if (mem !== null) return mem;

    try {
      const raw = localStorage.getItem(PERSISTENT_PREFIX + key);
      if (!raw) return null;
      const parsed: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() > parsed.expiresAt) {
        localStorage.removeItem(PERSISTENT_PREFIX + key);
        return null;
      }
      this.cache.set(key, parsed);
      return parsed.data;
    } catch {
      return null;
    }
  }

  /**
   * Lưu dữ liệu vào cả RAM và LocalStorage (F5 tải lại trang vẫn nhận được ngay 0ms)
   */
  setPersistent<T>(key: string, data: T, ttlMs = 60 * 60 * 1000): void {
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttlMs,
    };
    this.cache.set(key, entry);
    try {
      localStorage.setItem(PERSISTENT_PREFIX + key, JSON.stringify(entry));
    } catch (e) {
      console.warn('[Cache] LocalStorage storage limit exceeded:', e);
    }
  }

  has(key: string): boolean {
    return this.getPersistent(key) !== null;
  }

  invalidate(keyPrefix?: string): void {
    if (!keyPrefix) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.cache.delete(key);
        localStorage.removeItem(PERSISTENT_PREFIX + key);
      }
    }
  }

  async fetchWithCache<T>(key: string, fetcher: () => Promise<T>, ttlMs = 15 * 60 * 1000): Promise<T> {
    const cached = this.getPersistent<T>(key);
    if (cached !== null) {
      return cached;
    }
    const fresh = await fetcher();
    this.setPersistent(key, fresh, ttlMs);
    return fresh;
  }
}

export const queryCache = new QueryMemoryCache();
