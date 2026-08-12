import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard, failure } from "@/lib/security/guard";
import { driveEta } from "@/lib/providers/routing";
import { resolvePlace, airportCoords } from "@/lib/providers/geo";

// Live drive ETA from the user's device location to their departure airport.
// Accepts either an explicit airport IATA or a place name to resolve.
const schema = z.object({
  from: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  airport: z
    .string()
    .regex(/^[A-Za-z]{3}$/)
    .optional(),
  place: z.string().min(2).max(120).optional(),
  departAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  const g = await guard(req, "search", { maxBodyBytes: 1_024 });
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.airport && !parsed.data.place)) {
    return NextResponse.json({ error: "Provide a location and an airport or place" }, { status: 400 });
  }

  try {
    const dest = parsed.data.airport
      ? await airportCoords(parsed.data.airport.toUpperCase())
      : await placeCoords(parsed.data.place!);
    if (!dest) {
      return NextResponse.json({ error: "Couldn't locate that destination" }, { status: 404 });
    }

    const eta = await driveEta(
      parsed.data.from,
      dest,
      parsed.data.departAt ? new Date(parsed.data.departAt) : undefined
    );
    return NextResponse.json(eta);
  } catch (err) {
    console.error("eta error", err instanceof Error ? err.message : "unknown");
    return failure("Couldn't compute ETA");
  }
}

async function placeCoords(place: string) {
  const p = await resolvePlace(place);
  return p?.lat != null && p?.lng != null ? { lat: p.lat, lng: p.lng } : null;
}
