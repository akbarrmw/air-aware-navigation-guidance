interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class InMemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMinutes: number): void {
    const expiry = Date.now() + ttlMinutes * 60 * 1000;
    this.store.set(key, { data, expiry });
  }

  clear(): void {
    this.store.clear();
  }
}

export const appCache = new InMemoryCache();
