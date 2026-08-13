import { NextRequest, NextResponse } from "next/server";
import { trendingCities } from "@/lib/providers/trends";
import { guard, failure, capExceeded } from "@/lib/security/guard";
import { SpendCapError } from "@/lib/security/spend-cap";
import { captureServerError } from "@/lib/monitoring";

export async function GET(req: NextRequest) {
  // Tightest tier: a cache miss is a paid Perplexity call (once per day).
  const g = await guard(req, "ground");
  if (!g.ok) return g.response;

  try {
    const trending = await trendingCities();
    return NextResponse.json({ trending });
  } catch (err) {
    if (err instanceof SpendCapError) return capExceeded();
    captureServerError("trends", err);
    return failure("Trends unavailable");
  }
}
