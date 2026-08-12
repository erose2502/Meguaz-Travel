import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchGround } from "@/lib/providers/ground";
import { guard, failure } from "@/lib/security/guard";

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
    console.error("ground search error", err instanceof Error ? err.message : "unknown");
    return failure("Ground transport search failed");
  }
}
