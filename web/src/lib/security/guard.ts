import { NextResponse, type NextRequest } from "next/server";
import { resolveCaller, type Caller } from "@/lib/security/identity";
import { rateLimit, type Tier } from "@/lib/security/rate-limit";

export type GuardResult =
  | { ok: true; caller: Caller }
  | { ok: false; response: NextResponse };

/**
 * One call at the top of every API route: identifies the caller server-side,
 * enforces the per-tier rate limit, and rejects oversized bodies.
 *
 * Every route here spends real money upstream (Duffel, OpenAI, Perplexity,
 * LiveKit), so an unguarded route is a direct billing liability.
 */
export async function guard(
  req: NextRequest,
  tier: Tier,
  opts: { maxBodyBytes?: number } = {}
): Promise<GuardResult> {
  const maxBody = opts.maxBodyBytes ?? 16_384;
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBody) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Request too large" }, { status: 413 }),
    };
  }

  const caller = await resolveCaller(req);
  const limit = await rateLimit(caller.key, tier, caller.authenticated);

  if (!limit.allowed) {
    const retryAfter = limit.resetAt
      ? Math.max(1, Math.ceil((Date.parse(limit.resetAt) - Date.now()) / 1000))
      : 60;
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: caller.authenticated
            ? "You're searching faster than we can plan. Give it a few seconds."
            : "Too many requests. Sign in for a higher limit.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "RateLimit-Limit": String(limit.limit),
            "RateLimit-Remaining": String(Math.max(0, limit.limit - limit.hits)),
          },
        }
      ),
    };
  }

  return { ok: true, caller };
}

/** Uniform error body — never echo upstream provider text to the client. */
export function failure(message: string, status = 502) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Response for a SpendCapError: the global daily ceiling for an upstream
 * provider is reached, so the feature is paused rather than broken. 503 (not
 * 429) because it is not the caller's fault and no caller behaviour fixes it.
 */
export function capExceeded() {
  return NextResponse.json(
    { error: "We've reached today's search capacity. Please try again later." },
    { status: 503, headers: { "Retry-After": "3600" } }
  );
}
