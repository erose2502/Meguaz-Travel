import { NextResponse } from "next/server";

// Public runtime config for the static frontend. Only values that are public
// by nature belong here — a Pixel ID is visible in any page that embeds it.
// Serving it from env means turning tracking on/off never needs a frontend
// rebuild.

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { pixelId: process.env.META_PIXEL_ID || null },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } }
  );
}
