import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { solveTrip } from "@/lib/plan-solver";

const schema = z.object({
  from: z.string().min(2),
  to: z.string().min(2),
  arriveBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  budget: z.number().min(50).max(100000),
  adults: z.number().int().min(1).max(9).default(1),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const solved = await solveTrip(parsed.data);
    if (!solved) {
      return NextResponse.json(
        { error: "No routes found for that brief" },
        { status: 404 }
      );
    }
    return NextResponse.json(solved);
  } catch (err) {
    console.error("plan solve error", err);
    return NextResponse.json({ error: "Solver temporarily unavailable" }, { status: 502 });
  }
}
