import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard } from "@/lib/security/guard";
import { AIRPORTS, distanceKm, nearestAirports } from "@/lib/providers/airports";

// Departure airports: nearest by coordinates, or searched by name/IATA.
//
// Coordinates exist because resolving an origin from a city NAME is unsafe —
// Duffel Places fuzzy-matches "Reading" (UK) to Redding, California (RDD),
// turning a 2-hour hop into a 65-hour itinerary. Search exists because nearest
// is not always wanted: someone outside Philadelphia may still prefer JFK.
const schema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  query: z.string().max(60).optional(),
  limit: z.number().int().min(1).max(20).optional(),
});

export async function POST(req: NextRequest) {
  const g = await guard(req, "search", { maxBodyBytes: 512 });
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { lat, lng, limit } = parsed.data;
  const coords = lat != null && lng != null ? { lat, lng } : null;
  const query = parsed.data.query?.trim().toLowerCase() ?? "";

  if (!query) {
    if (!coords) return NextResponse.json({ airports: [] });
    return NextResponse.json({ airports: nearestAirports(coords, limit ?? 6) });
  }

  const scored = AIRPORTS.map((a) => {
    const iata = a.iata.toLowerCase();
    const name = a.name.toLowerCase();
    let score = 0;
    if (iata === query) score = 100;
    else if (name.startsWith(query)) score = 80;
    else if (name.split(/\s+/).some((w) => w.startsWith(query))) score = 70;
    else if (iata.startsWith(query)) score = 60;
    else if (query.length >= 3 && name.includes(query)) score = 40;
    return { airport: a, score };
  })
    .filter((r) => r.score > 0)
    // Same relevance? Prefer the one closer to the traveller.
    .sort(
      (x, y) =>
        y.score - x.score ||
        (coords ? distanceKm(coords, x.airport) - distanceKm(coords, y.airport) : 0)
    )
    .slice(0, limit ?? 8)
    .map((r) => ({
      ...r.airport,
      distanceKm: coords ? distanceKm(coords, r.airport) : null,
    }));

  return NextResponse.json({ airports: scored });
}
