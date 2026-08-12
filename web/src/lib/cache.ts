// Simple TTL cache. In-memory for MVP; swap the store for Supabase `route_cache`
// when horizontal scaling matters. Keyed strings, JSON values.
type Entry = { value: unknown; expiresAt: number };

const store = new Map<string, Entry>();

export function cacheGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export function cacheSet(key: string, value: unknown, ttlMs: number) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export const HOURS = 60 * 60 * 1000;
