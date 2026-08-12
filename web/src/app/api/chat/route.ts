import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runChat } from "@/lib/orchestrator/router";

const bodySchema = z.object({
  sessionId: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })
    )
    .min(1)
    .max(40),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    const result = await runChat(parsed.data.messages, parsed.data.sessionId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("chat route error", err);
    return NextResponse.json({ error: "Chat temporarily unavailable" }, { status: 502 });
  }
}
