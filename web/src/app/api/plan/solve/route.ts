import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { solveTrip } from "@/lib/plan-solver";
import { guard, failure, capExceeded } from "@/lib/security/guard";
import { SpendCapError } from "@/lib/security/spend-cap";
import { captureServerError } from "@/lib/monitoring";

const schema = z.object({
  from: z.string().min(2).max(120),
  to: z.string().min(2).max(120),
  arriveBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  budget: z.number().min(50).max(100000),
  adults: z.number().int().min(1).max(9).default(1),
  nights: z.number().int().min(1).max(90).optional(),
  airportTransfer: z.enum(["rideshare", "drive", "dropoff", "transit"]).optional(),
  cabinClass: z.enum(["economy", "premium_economy", "business", "first"]).optional(),
  checkedBag: z.boolean().optional(),
  departWindow: z.enum(["any", "morning", "afternoon", "evening"]).optional(),
  stayPreference: z.enum(["home", "resort"]).optional(),
  originCoords: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  const g = await guard(req, "solve");
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid trip brief" }, { status: 400 });
  }

  // Reject dates in the past before spending a Duffel offer request on them.
  const today = new Date().toISOString().slice(0, 10);
  if (parsed.data.arriveBy < today) {
    return NextResponse.json({ error: "Pick a date in the future" }, { status: 400 });
  }

  try {
    const solved = await solveTrip(parsed.data);
    if (!solved) {
      return NextResponse.json({ error: "No routes found for that brief" }, { status: 404 });
    }
    return NextResponse.json(solved);
  } catch (err) {
    if (err instanceof SpendCapError) return capExceeded();
    captureServerError("plan-solve", err);
    return failure("Solver temporarily unavailable");
  }
}
