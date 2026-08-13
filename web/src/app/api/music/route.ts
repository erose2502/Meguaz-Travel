import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { destinationMix } from "@/lib/providers/music";
import { guard, failure, capExceeded } from "@/lib/security/guard";
import { SpendCapError } from "@/lib/security/spend-cap";
import { captureServerError } from "@/lib/monitoring";

const schema = z.object({
  city: z.string().min(2).max(120),
  country: z.string().min(2).max(120),
});

export async function GET(req: NextRequest) {
  const g = await guard(req, "search");
  if (!g.ok) return g.response;

  const url = new URL(req.url);
  const parsed = schema.safeParse({
    city: url.searchParams.get("city") ?? "",
    country: url.searchParams.get("country") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const mix = await destinationMix(parsed.data.city, parsed.data.country);
    return NextResponse.json({ mix });
  } catch (err) {
    if (err instanceof SpendCapError) return capExceeded();
    captureServerError("music", err);
    return failure("Music unavailable");
  }
}
