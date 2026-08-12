import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchFlights } from "@/lib/providers/duffel";

const schema = z.object({
  origin: z.string().length(3),
  destination: z.string().length(3),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  adults: z.number().int().min(1).max(9).default(1),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const offers = await searchFlights(parsed.data);
    return NextResponse.json({ offers });
  } catch (err) {
    console.error("flight search error", err);
    return NextResponse.json({ error: "Flight search failed" }, { status: 502 });
  }
}
