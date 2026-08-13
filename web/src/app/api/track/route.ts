import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard } from "@/lib/security/guard";
import { capiEnabled, sendMetaEvent } from "@/lib/providers/meta-capi";
import { captureServerError } from "@/lib/monitoring";

// Browser → Conversions API relay. The client fires the same event to the
// Pixel with a shared eventId, so Meta dedupes the pair. Purchase is
// deliberately NOT accepted here — it is emitted server-side by /api/book,
// where a real order exists, so spoofed requests can't pollute ad signals.

const schema = z.object({
  event: z.enum(["PageView", "Search", "ViewContent", "InitiateCheckout"]),
  eventId: z.string().max(64).optional(),
  url: z.string().url().max(500).optional(),
  value: z.number().nonnegative().max(1_000_000).optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
});

export async function POST(req: NextRequest) {
  const g = await guard(req, "search", { maxBodyBytes: 2_048 });
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad event" }, { status: 400 });
  }
  if (!capiEnabled()) return NextResponse.json({ ok: true, forwarded: false });

  const { event, eventId, url, value, currency } = parsed.data;
  // Attacker-suppliable; only honour our own pages as the source URL.
  const sourceUrl = url && new URL(url).host === req.nextUrl.host ? url : undefined;

  sendMetaEvent({
    name: event,
    eventId,
    sourceUrl,
    value,
    currency,
    ip: (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
    fbp: req.cookies.get("_fbp")?.value,
    fbc: req.cookies.get("_fbc")?.value,
  }).catch((err) => captureServerError("meta-capi", err));

  return NextResponse.json({ ok: true, forwarded: true });
}
