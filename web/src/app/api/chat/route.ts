import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runChat } from "@/lib/orchestrator/router";
import { guard, failure, capExceeded } from "@/lib/security/guard";
import { SpendCapError } from "@/lib/security/spend-cap";
import { captureServerError } from "@/lib/monitoring";

// sessionId is accepted for client continuity but is NOT trusted for budgeting
// or identity — spend is tracked against the server-resolved caller.
const bodySchema = z.object({
  sessionId: z.string().max(64).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(40),
});

export async function POST(req: NextRequest) {
  const g = await guard(req, "chat", { maxBodyBytes: 64_000 });
  if (!g.ok) return g.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const result = await runChat(parsed.data.messages, g.caller.key);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof SpendCapError) return capExceeded();
    captureServerError("chat", err);
    return failure("Chat temporarily unavailable");
  }
}
