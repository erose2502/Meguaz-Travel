import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchFlights } from "@/lib/providers/duffel";
import { guard, failure, capExceeded } from "@/lib/security/guard";
import { SpendCapError } from "@/lib/security/spend-cap";
import { captureServerError } from "@/lib/monitoring";

const schema = z.object({
  origin: z.string().regex(/^[A-Za-z]{3}$/),
  destination: z.string().regex(/^[A-Za-z]{3}$/),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  adults: z.number().int().min(1).max(9).default(1),
  cabinClass: z.enum(["economy", "premium_economy", "business", "first"]).optional(),
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
    if (err instanceof SpendCapError) return capExceeded();
    captureServerError("flight-search", err);
    return failure("Flight search failed");
  }
}
