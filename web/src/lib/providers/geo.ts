import "server-only";
import { env } from "@/lib/env";
import { cacheGet, cacheSet, HOURS } from "@/lib/cache";
import { assertSpendCap } from "@/lib/security/spend-cap";

// Place resolution via Duffel Places. One resolver serves two features:
//   • flight/ETA path needs the origin/destination airport IATA + coordinates
//   • hotel search needs the destination country to anchor Google Hotels, whose
//     geocoder is US-biased and returns US properties for a bare "Kyoto".
export type ResolvedPlace = {
  iata: string | null;
  lat: number | null;
  lng: number | null;
  cityName: string | null;
  countryCode: string | null; // ISO-2, e.g. "JP"
};

export async function resolvePlace(query: string): Promise<ResolvedPlace | null> {
  const q = query.trim();
  if (!q) return null;

  const cacheKey = `place:${q.toLowerCase()}`;
  const cached = await cacheGet<ResolvedPlace>(cacheKey);
  if (cached) return cached;

  // Mapbox is a real geocoder — it knows cities that have no airport of their
  // own (Kyoto, Zanzibar). Duffel Places only knows airports and fuzzy-matches
  // "Kyoto" to "Kotoka" (Accra), so it is used only as a no-token fallback.
  if (process.env.MAPBOX_TOKEN) {
    await assertSpendCap("maps");
    const m = await mapboxGeocode(q).catch(() => null);
    if (m) {
      await cacheSet(cacheKey, m, 24 * HOURS);
      return m;
    }
  }

  await assertSpendCap("duffel");
  const res = await fetch(
    `https://api.duffel.com/places/suggestions?query=${encodeURIComponent(q)}`,
    { headers: { Authorization: `Bearer ${env.duffelApiKey}`, "Duffel-Version": "v2" } }
  );
  if (!res.ok) return null;

  const json = await res.json();
  type City = { name?: string; iata_code?: string };
  type Place = {
    type?: string;
    name?: string;
    iata_code?: string;
    latitude?: number;
    longitude?: number;
    iata_country_code?: string;
    city_name?: string;
    city?: City;
    airports?: Array<{ iata_code?: string; latitude?: number; longitude?: number }>;
  };
  const places: Place[] = json?.data ?? [];
  if (places.length === 0) return null;

  // Prefer a city match (its main airport), else the first airport.
  const city = places.find((p) => p.type === "city");
  const airport = places.find((p) => p.type === "airport");
  const primary = city ?? airport ?? places[0];
  const airportSource = airport ?? city?.airports?.[0] ?? primary;

  const resolved: ResolvedPlace = {
    iata: primary.iata_code ?? city?.airports?.[0]?.iata_code ?? airport?.iata_code ?? null,
    lat: airportSource?.latitude ?? primary.latitude ?? null,
    lng: airportSource?.longitude ?? primary.longitude ?? null,
    cityName: primary.city?.name ?? primary.city_name ?? primary.name ?? null,
    countryCode: primary.iata_country_code ?? null,
  };

  await cacheSet(cacheKey, resolved, 24 * HOURS);
  return resolved;
}

// Mapbox forward geocoding → city name, ISO-2 country, coordinates.
async function mapboxGeocode(query: string): Promise<ResolvedPlace | null> {
  const url =
    `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}` +
    `&types=place,region,locality,district&limit=1&access_token=${process.env.MAPBOX_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const feature = json?.features?.[0];
  if (!feature) return null;

  const props = feature.properties ?? {};
  const [lng, lat] = feature.geometry?.coordinates ?? [null, null];
  const countryCode: string | undefined = props.context?.country?.country_code;

  return {
    iata: null, // geocoder resolves places, not airports
    lat: typeof lat === "number" ? lat : null,
    lng: typeof lng === "number" ? lng : null,
    cityName: props.name ?? null,
    countryCode: countryCode ? countryCode.toUpperCase() : null,
  };
}

// Coordinates for a specific airport IATA (used when the solver already knows
// the origin airport but needs its position for the drive ETA). Duffel is the
// right source here: an exact IATA lookup, not fuzzy place search.
export async function airportCoords(
  iata: string
): Promise<{ lat: number; lng: number } | null> {
  const code = iata.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return null;

  const cacheKey = `airport:${code}`;
  const cached = await cacheGet<{ lat: number; lng: number }>(cacheKey);
  if (cached) return cached;

  await assertSpendCap("duffel");
  const res = await fetch(
    `https://api.duffel.com/places/suggestions?query=${code}`,
    { headers: { Authorization: `Bearer ${env.duffelApiKey}`, "Duffel-Version": "v2" } }
  );
  if (!res.ok) return null;
  const json = await res.json();
  type P = { type?: string; iata_code?: string; latitude?: number; longitude?: number };
  const places: P[] = json?.data ?? [];
  const match =
    places.find((p) => p.type === "airport" && p.iata_code === code) ??
    places.find((p) => p.iata_code === code) ??
    places[0];
  if (match?.latitude == null || match?.longitude == null) return null;

  const coords = { lat: match.latitude, lng: match.longitude };
  await cacheSet(cacheKey, coords, 24 * HOURS);
  return coords;
}
