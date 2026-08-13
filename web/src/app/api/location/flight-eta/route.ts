import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard, failure, capExceeded } from "@/lib/security/guard";
import { SpendCapError } from "@/lib/security/spend-cap";
import { captureServerError } from "@/lib/monitoring";
import { airportCoords } from "@/lib/providers/geo";
import { haversineKm } from "@/lib/providers/routing";

// Estimated flight time from the traveller's actual location to a destination
// airport — replaces the dataset's San-Francisco-relative sample hours.
// Great-circle distance at typical jet block speed plus taxi/climb overhead.

const schema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  airport: z.string().regex(/^[A-Za-z]{3}$/),
});

export async function POST(req: NextRequest) {
  const g = await guard(req, "search", { maxBodyBytes: 512 });
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const dest = await airportCoords(parsed.data.airport.toUpperCase());
    if (!dest) {
      return NextResponse.json({ error: "Unknown airport" }, { status: 404 });
    }
    const distanceKm = Math.round(
      haversineKm({ lat: parsed.data.lat, lng: parsed.data.lng }, dest)
    );
    // ~840 km/h block speed + 0.65h taxi/climb/descent overhead.
    const hours = Math.round((distanceKm / 840 + 0.65) * 10) / 10;
    return NextResponse.json({ distanceKm, hours });
  } catch (err) {
    if (err instanceof SpendCapError) return capExceeded();
    captureServerError("flight-eta", err);
    return failure("Could not estimate the flight");
  }
}
