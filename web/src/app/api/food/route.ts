import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { foodSuggestions } from "@/lib/providers/food";
import { guard, failure, capExceeded } from "@/lib/security/guard";
import { SpendCapError } from "@/lib/security/spend-cap";
import { captureServerError } from "@/lib/monitoring";

const schema = z.object({
  city: z.string().min(2).max(120),
  country: z.string().min(2).max(120),
});

export async function POST(req: NextRequest) {
  // Tightest tier: a cache miss here is a paid Perplexity call.
  const g = await guard(req, "ground", { maxBodyBytes: 1_024 });
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const spots = await foodSuggestions(parsed.data.city, parsed.data.country);
    return NextResponse.json({ spots });
  } catch (err) {
    if (err instanceof SpendCapError) return capExceeded();
    captureServerError("food", err);
    return failure("Food suggestions unavailable");
  }
}
