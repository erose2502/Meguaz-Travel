import { admin, adminAvailable } from "@/lib/supabase/admin";

// Two-level cache for provider responses.
//   L1: per-instance memory — free, but dies with the serverless instance.
//   L2: Supabase `route_cache` — shared across instances and restarts, so a
//       cold start doesn't re-buy a Perplexity call someone already paid for.
// Holds no PII: only public route/destination data keyed by search parameters.

type Entry = { value: unknown; expiresAt: number };
const memory = new Map<string, Entry>();

export const HOURS = 60 * 60 * 1000;

export async function cacheGet<T>(key: string): Promise<T | null> {
  const hit = memory.get(key);
  if (hit && Date.now() <= hit.expiresAt) return hit.value as T;
  if (hit) memory.delete(key);

  if (!adminAvailable()) return null;
  try {
    const { data, error } = await admin().rpc("cache_get", { p_key: key });
    if (error || data == null) return null;
    // Re-warm L1 with a short TTL; L2 remains the source of truth.
    memory.set(key, { value: data, expiresAt: Date.now() + 5 * 60_000 });
    return data as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlMs: number): Promise<void> {
  memory.set(key, { value, expiresAt: Date.now() + ttlMs });
  if (!adminAvailable()) return;
  try {
    await admin().rpc("cache_put", {
      p_key: key,
      p_payload: value,
      p_ttl_seconds: Math.round(ttlMs / 1000),
    });
  } catch {
    // L1 still holds the value; a failed shared write is not fatal.
  }
}
