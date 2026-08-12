import { admin, adminAvailable } from "@/lib/supabase/admin";

export type RateLimitResult = {
  allowed: boolean;
  hits: number;
  limit: number;
  resetAt: string | null;
};

// Per-endpoint cost tiers. Anonymous callers get the tighter budget because a
// signed-in user is traceable and revocable; an unauthenticated caller is not.
export type Tier = keyof typeof TIERS;

export const TIERS = {
  // Cheap, deterministic provider calls
  search: { anon: 20, auth: 60, windowSeconds: 60 },
  // Duffel offer requests — slow and quota-metered upstream
  solve: { anon: 6, auth: 20, windowSeconds: 60 },
  // LLM-backed, the most expensive per call
  chat: { anon: 8, auth: 30, windowSeconds: 60 },
  // Perplexity — priciest per call, cached aggressively behind this
  ground: { anon: 5, auth: 15, windowSeconds: 60 },
  // Voice sessions bill by the minute upstream
  voice: { anon: 3, auth: 10, windowSeconds: 300 },
} as const;

// In-memory fallback so local dev (and the window before migration 0002 is
// applied) still gets limited rather than running wide open.
const memory = new Map<string, { hits: number; windowStart: number }>();

export async function rateLimit(
  callerKey: string,
  tier: Tier,
  authenticated: boolean
): Promise<RateLimitResult> {
  const config = TIERS[tier];
  const max = authenticated ? config.auth : config.anon;
  const key = `${tier}:${callerKey}`;

  if (adminAvailable()) {
    try {
      const { data, error } = await admin().rpc("check_rate_limit", {
        p_key: key,
        p_max: max,
        p_window_seconds: config.windowSeconds,
      });
      if (!error && data) {
        const row = data as {
          allowed: boolean;
          hits: number;
          limit: number;
          reset_at: string;
        };
        return {
          allowed: row.allowed,
          hits: row.hits,
          limit: row.limit,
          resetAt: row.reset_at,
        };
      }
    } catch {
      // Fall through to in-memory limiting.
    }
  }

  return memoryLimit(key, max, config.windowSeconds);
}

function memoryLimit(key: string, max: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const entry = memory.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    memory.set(key, { hits: 1, windowStart: now });
    return { allowed: true, hits: 1, limit: max, resetAt: new Date(now + windowMs).toISOString() };
  }

  entry.hits += 1;
  return {
    allowed: entry.hits <= max,
    hits: entry.hits,
    limit: max,
    resetAt: new Date(entry.windowStart + windowMs).toISOString(),
  };
}
