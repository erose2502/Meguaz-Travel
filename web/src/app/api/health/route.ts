import { NextResponse } from "next/server";

// Liveness probe for EC2: ALB target groups, Docker HEALTHCHECK, and uptime
// monitors all point here. Deliberately unguarded (health checks carry no
// caller identity) and free — it touches no upstream provider and no database.

const startedAt = Date.now();

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "meguaz-web",
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    time: new Date().toISOString(),
  });
}
