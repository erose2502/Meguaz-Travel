import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type Caller = {
  /** Stable key for rate limiting and spend counters. Never client-supplied. */
  key: string;
  /** Supabase user id when signed in. */
  userId: string | null;
  authenticated: boolean;
};

/**
 * Resolves who is calling, server-side only.
 *
 * Signed-in users are keyed by their Supabase user id. Anonymous callers are
 * keyed by a hash of their IP — hashed so raw addresses never land in the
 * database. Client-supplied identifiers are ignored entirely: trusting them
 * would let anyone reset their own limits by rotating a session id.
 */
export async function resolveCaller(req: NextRequest): Promise<Caller> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      return { key: `u:${user.id}`, userId: user.id, authenticated: true };
    }
  } catch {
    // No session cookie / auth unreachable — fall through to anonymous.
  }

  return { key: `ip:${hashedIp(req)}`, userId: null, authenticated: false };
}

function hashedIp(req: NextRequest): string {
  // x-forwarded-for is set by Vercel/proxies; take the client-most entry.
  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const salt = process.env.IP_HASH_SALT ?? "meguaz-dev-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}
