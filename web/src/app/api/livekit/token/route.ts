import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { env } from "@/lib/env";

// Issues a short-lived room token so the browser can join a voice session with
// the Meguaz agent running on LiveKit Cloud.
export async function POST(req: NextRequest) {
  const { identity } = await req.json().catch(() => ({ identity: null }));
  const user = typeof identity === "string" && identity ? identity : `guest-${Date.now()}`;
  const room = `meguaz-${user}`;

  const at = new AccessToken(env.livekit.apiKey, env.livekit.apiSecret, {
    identity: user,
    ttl: "15m",
  });
  at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });

  return NextResponse.json({
    token: await at.toJwt(),
    url: env.livekit.url,
    room,
  });
}
