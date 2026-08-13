import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchStays } from "@/lib/providers/stays";
import { guard, failure, capExceeded } from "@/lib/security/guard";
import { SpendCapError } from "@/lib/security/spend-cap";
import { captureServerError } from "@/lib/monitoring";

const schema = z.object({
  preference: z.enum(["home", "resort"]),
  location: z.string().min(2).max(120),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(16).default(2),
});

export async function POST(req: NextRequest) {
  const g = await guard(req, "search");
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid search" }, { status: 400 });
  }
  if (parsed.data.checkOut <= parsed.data.checkIn) {
    return NextResponse.json({ error: "Check-out must be after check-in" }, { status: 400 });
  }

  try {
    const result = await searchStays(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SpendCapError) return capExceeded();
    captureServerError("stays-search", err);
    return failure("Stay search failed");
  }
}
