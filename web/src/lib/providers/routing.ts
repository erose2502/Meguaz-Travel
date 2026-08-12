import "server-only";

// Drive-time ETA between two coordinates.
//
// Provider-agnostic by design: today it computes a distance-based estimate from
// the user's real GPS position (free, no key). Drop in GOOGLE_MAPS_API_KEY or
// MAPBOX_TOKEN and the same function returns live traffic-aware ETAs with no
// caller changes — the app already passes real coordinates through.

export type LatLng = { lat: number; lng: number };

export type DriveEta = {
  minutes: number;
  distanceKm: number;
  source: "google" | "mapbox" | "estimate";
  trafficAware: boolean;
};

export async function driveEta(from: LatLng, to: LatLng, departAt?: Date): Promise<DriveEta> {
  const distanceKm = haversineKm(from, to);

  if (process.env.GOOGLE_MAPS_API_KEY) {
    const g = await googleRoutes(from, to, departAt).catch(() => null);
    if (g) return { ...g, distanceKm, source: "google", trafficAware: true };
  }
  if (process.env.MAPBOX_TOKEN) {
    const m = await mapbox(from, to).catch(() => null);
    if (m) return { ...m, distanceKm, source: "mapbox", trafficAware: true };
  }

  return { minutes: estimateMinutes(distanceKm), distanceKm, source: "estimate", trafficAware: false };
}

// Straight-line distance, scaled to a plausible road distance and speed.
// Short hops are stop-and-go city driving; longer hops pick up highway speed.
function estimateMinutes(distanceKm: number): number {
  const roadKm = distanceKm * 1.3; // roads aren't straight lines
  const avgKmh = roadKm < 8 ? 24 : roadKm < 30 ? 40 : 70;
  const minutes = (roadKm / avgKmh) * 60;
  return Math.max(6, Math.round(minutes));
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// ── Live-traffic providers (activate when a key is present) ──────────────────
async function googleRoutes(
  from: LatLng,
  to: LatLng,
  departAt?: Date
): Promise<{ minutes: number }> {
  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY!,
      "X-Goog-FieldMask": "routes.duration",
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
      destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      // Google requires a future departure time for traffic-aware routing.
      departureTime: (departAt && departAt > new Date() ? departAt : new Date(Date.now() + 60_000)).toISOString(),
    }),
  });
  if (!res.ok) throw new Error(`Google Routes ${res.status}`);
  const json = await res.json();
  const seconds = Number(String(json?.routes?.[0]?.duration ?? "").replace("s", ""));
  if (!seconds) throw new Error("no route");
  return { minutes: Math.round(seconds / 60) };
}

async function mapbox(from: LatLng, to: LatLng): Promise<{ minutes: number }> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const res = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coords}?access_token=${process.env.MAPBOX_TOKEN}&overview=false`
  );
  if (!res.ok) throw new Error(`Mapbox ${res.status}`);
  const json = await res.json();
  const seconds = json?.routes?.[0]?.duration;
  if (!seconds) throw new Error("no route");
  return { minutes: Math.round(seconds / 60) };
}
