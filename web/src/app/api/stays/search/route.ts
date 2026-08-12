import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchStays } from "@/lib/providers/stays";

const schema = z.object({
  preference: z.enum(["home", "resort"]),
  location: z.string().min(2),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(16).default(2),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const result = await searchStays(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    console.error("stays search error", err);
    return NextResponse.json({ error: "Stay search failed" }, { status: 502 });
  }
}
