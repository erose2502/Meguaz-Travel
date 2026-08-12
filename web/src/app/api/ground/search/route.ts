import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchGround } from "@/lib/providers/ground";

const schema = z.object({
  origin: z.string().min(2),
  destination: z.string().min(2),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const options = await searchGround(parsed.data);
    return NextResponse.json({ options });
  } catch (err) {
    console.error("ground search error", err);
    return NextResponse.json({ error: "Ground transport search failed" }, { status: 502 });
  }
}
