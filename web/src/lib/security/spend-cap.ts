import { admin, adminAvailable } from "@/lib/supabase/admin";

// Global daily spend ceiling, per upstream provider, across ALL callers.
//
// Per-user rate limits bound how fast one caller can spend; nothing bounded the
// aggregate. Duffel, Perplexity, OpenAI, ElevenLabs and SearchApi all bill per
// call, and the home screen fires a fare search on load — one bot or one viral
// day is real money. Every paid provider call passes through here first.
//
// Semantics: FAIL CLOSED. When a shared ledger is configured but cannot confirm
// we are under the ceiling, the call is denied — "unknown" is not "free".
// Without a shared ledger (local dev), a per-instance counter still applies.
//
// The counter is the same atomic check-and-increment RPC the rate limiter uses
// (migration 0002), keyed by provider + UTC date so it resets at midnight UTC.

export type Provider =
  | "duffel"
  | "perplexity"
  | "openai"
  | "elevenlabs"
  | "searchapi"
  | "maps"
  | "youtube";

// Calls per provider per UTC day, all users combined. Override per environment
// with SPEND_CAP_<PROVIDER>; 0 blocks the provider entirely (kill switch).
const DEFAULT_CAPS: Record<Provider, number> = {
  duffel: 400, // offer requests + place lookups
  perplexity: 150, // priciest per call; heavily cached upstream of this
  openai: 1500, // chat completions (~2 per turn)
  elevenlabs: 400, // phrase syntheses; browser-cached per phrase
  searchapi: 150, // hotel searches; cached 6h per query
  maps: 2000, // routing + geocoding; cheap per call but metered
  youtube: 90, // searches cost 100 quota units of the 10k/day allowance
};

export function capFor(provider: Provider): number {
  const raw = process.env[`SPEND_CAP_${provider.toUpperCase()}`];
  const parsed = raw == null || raw === "" ? NaN : Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : DEFAULT_CAPS[provider];
}

export class SpendCapError extends Error {
  provider: Provider;
  constructor(provider: Provider) {
    super(`Daily spend cap reached for ${provider}`);
    this.name = "SpendCapError";
    this.provider = provider;
  }
}

export type SpendCheck = { allowed: boolean; used: number; cap: number };

export function spendKey(provider: Provider, now: Date = new Date()): string {
  return `spend:${provider}:${now.toISOString().slice(0, 10)}`;
}

// In-memory fallback used only when no shared ledger is configured. The UTC
// date inside the key makes each day's counter self-expiring.
const memory = new Map<string, number>();

export async function checkSpendCap(
  provider: Provider,
  now: Date = new Date()
): Promise<SpendCheck> {
  const cap = capFor(provider);
  if (cap <= 0) return { allowed: false, used: 0, cap };
  const key = spendKey(provider, now);

  if (adminAvailable()) {
    try {
      const { data, error } = await admin().rpc("check_rate_limit", {
        p_key: key,
        p_max: cap,
        p_window_seconds: 86_400,
      });
      if (error || !data) return { allowed: false, used: cap, cap };
      const row = data as { allowed: boolean; hits: number };
      return { allowed: row.allowed, used: row.hits, cap };
    } catch {
      return { allowed: false, used: cap, cap };
    }
  }

  const used = (memory.get(key) ?? 0) + 1;
  memory.set(key, used);
  if (memory.size > 64) {
    const today = now.toISOString().slice(0, 10);
    for (const k of memory.keys()) if (!k.endsWith(today)) memory.delete(k);
  }
  return { allowed: used <= cap, used, cap };
}

/** Throws SpendCapError when the provider's global daily ceiling is reached. */
export async function assertSpendCap(provider: Provider, now?: Date): Promise<void> {
  const check = await checkSpendCap(provider, now);
  if (!check.allowed) {
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "warn",
        scope: "spend-cap",
        provider,
        used: check.used,
        cap: check.cap,
      })
    );
    throw new SpendCapError(provider);
  }
}

/** Test hook: clears the in-memory fallback counters. */
export function resetSpendCapMemory(): void {
  memory.clear();
}
