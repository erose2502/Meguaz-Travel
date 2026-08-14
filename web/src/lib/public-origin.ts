import type { NextRequest } from "next/server";

// Behind Caddy (and Cloudflare) this Node server sees its own listen address
// as the request host, so `new URL(req.url).origin` can resolve to
// https://0.0.0.0:3000 — a dead end when it leaks into an OAuth redirect.
// The public origin arrives in the forwarded headers instead.
export function publicOrigin(req: NextRequest): URL {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  if (host && !/^(0\.0\.0\.0|127\.|\[::\]|localhost)/.test(host)) {
    try {
      return new URL(`${proto}://${host}`);
    } catch {
      // fall through to the request URL
    }
  }
  return new URL(new URL(req.url).origin);
}
