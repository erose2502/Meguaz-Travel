import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchGround } from "@/lib/providers/ground";
import { guard, failure, capExceeded } from "@/lib/security/guard";
import { SpendCapError } from "@/lib/security/spend-cap";
import { captureServerError } from "@/lib/monitoring";

const schema = z.object({
  origin: z.string().min(2).max(120),
  destination: z.string().min(2).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: NextRequest) {
  // Tightest tier: every miss here is a paid Perplexity call.
  const g = await guard(req, "ground");
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid search" }, { status: 400 });
  }

  try {
    const options = await searchGround(parsed.data);
    return NextResponse.json({ options });
  } catch (err) {
    if (err instanceof SpendCapError) return capExceeded();
    captureServerError("ground-search", err);
    return failure("Ground transport search failed");
  }
}
