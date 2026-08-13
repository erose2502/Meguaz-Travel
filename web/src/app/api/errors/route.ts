import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard } from "@/lib/security/guard";
import { capture } from "@/lib/monitoring";

// Client-side error intake. The browser has no server log and no Sentry key,
// so the error boundary and window.onerror POST here; the server writes the
// structured log line and forwards to Sentry when a DSN is configured.
//
// Rate limited like every other route — an error loop in one client must not
// become a log-flooding (or Sentry-billing) incident.

const schema = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(8000).optional(),
  source: z.string().max(200).optional(),
  url: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const g = await guard(req, "search", { maxBodyBytes: 16_384 });
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid report" }, { status: 400 });
  }

  capture({
    scope: "client",
    message: parsed.data.message,
    stack: parsed.data.stack,
    url: parsed.data.url,
    userAgent: req.headers.get("user-agent") ?? undefined,
    extra: { source: parsed.data.source ?? "unknown" },
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}
