import { randomUUID, createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { env } from "@/lib/env";
import { guard } from "@/lib/security/guard";

/**
 * Issues a short-lived room token for a voice session with the Meguaz agent.
 *
 * Identity and room name are derived SERVER-side. An earlier version read
 * `identity` from the request body and built the room from it, which let anyone
 * mint a token for another person's room and listen in on their conversation.
 * Nothing the client sends is used here.
 */
export async function POST(req: NextRequest) {
  const g = await guard(req, "voice", { maxBodyBytes: 1_024 });
  if (!g.ok) return g.response;

  const { caller } = g;

  // Signed-in users get a stable room (reconnects rejoin the same session).
  // Anonymous callers get a fresh unguessable room each time.
  const identity = caller.userId ?? `guest-${randomUUID()}`;
  const room = caller.userId
    ? `meguaz-${createHash("sha256").update(`room:${caller.userId}`).digest("hex").slice(0, 24)}`
    : `meguaz-guest-${randomUUID()}`;

  const at = new AccessToken(env.livekit.apiKey, env.livekit.apiSecret, {
    identity,
    ttl: "15m",
  });
  at.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    // The agent owns the room; participants must not reconfigure it.
    canPublishData: false,
    canUpdateOwnMetadata: false,
  });

  return NextResponse.json(
    { token: await at.toJwt(), url: env.livekit.url, room },
    { headers: { "Cache-Control": "no-store" } }
  );
}
