import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchFlights } from "@/lib/providers/duffel";
import { guard, failure } from "@/lib/security/guard";

const schema = z.object({
  origin: z.string().regex(/^[A-Za-z]{3}$/),
  destination: z.string().regex(/^[A-Za-z]{3}$/),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  adults: z.number().int().min(1).max(9).default(1),
});

export async function POST(req: NextRequest) {
  const g = await guard(req, "solve");
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid search" }, { status: 400 });
  }

  try {
    const offers = await searchFlights(parsed.data);
    return NextResponse.json({ offers });
  } catch (err) {
    console.error("flight search error", err instanceof Error ? err.message : "unknown");
    return failure("Flight search failed");
  }
}
