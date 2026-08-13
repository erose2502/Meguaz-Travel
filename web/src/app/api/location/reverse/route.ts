import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard, failure } from "@/lib/security/guard";
import { checkSpendCap } from "@/lib/security/spend-cap";
import { captureServerError } from "@/lib/monitoring";

// Turns the browser's coordinates into a city name so the planner can start
// from where the traveller actually is instead of a hardcoded home city.
const schema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export async function POST(req: NextRequest) {
  const g = await guard(req, "search", { maxBodyBytes: 512 });
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const token = process.env.MAPBOX_TOKEN;
  if (!token) {
    // Without a token there is no trustworthy answer; the client keeps its default.
    return NextResponse.json({ city: null, region: null, country: null });
  }

  // Reverse geocoding is a nicety — over the daily maps cap, the client simply
  // keeps its default city instead of getting an error.
  const cap = await checkSpendCap("maps").catch(() => ({ allowed: false }));
  if (!cap.allowed) {
    return NextResponse.json({ city: null, region: null, country: null });
  }

  const { lat, lng } = parsed.data;
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
    `?types=place,locality&limit=1&access_token=${token}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return failure("Reverse geocode failed");
    const json = await res.json();
    const feature = json.features?.[0];
    if (!feature) {
      return NextResponse.json({ city: null, region: null, country: null });
    }
    const context: Array<{ id: string; text: string }> = feature.context ?? [];
    const pick = (prefix: string) => context.find((c) => c.id?.startsWith(prefix))?.text ?? null;

    return NextResponse.json({
      city: feature.text ?? null,
      region: pick("region"),
      country: pick("country"),
    });
  } catch (err) {
    captureServerError("reverse-geocode", err);
    return failure("Reverse geocode failed");
  }
}
