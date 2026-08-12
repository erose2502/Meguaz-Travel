import { env } from "@/lib/env";
import { cacheGet, cacheSet, HOURS } from "@/lib/cache";

// Airbnb has no public booking API. We search via SearchApi.io's Airbnb engine and
// deep-link the user out to complete booking; the trip slot is then confirmed back.
const SEARCHAPI_BASE = "https://www.searchapi.io/api/v1/search";
const ENGINE = process.env.SEARCHAPI_AIRBNB_ENGINE ?? "airbnb";

export type AirbnbSearchParams = {
  location: string;
  checkIn: string;
  checkOut: string;
  adults: number;
};

export type AirbnbResult = {
  id: string;
  name: string;
  rating: number | null;
  pricePerNight: number | null;
  totalPrice: number | null;
  currency: string | null;
  photoUrl: string | null;
  url: string | null; // deep link to book on Airbnb
  bookable: false; // external handoff
};

export async function searchAirbnb(params: AirbnbSearchParams): Promise<AirbnbResult[]> {
  const cacheKey = `airbnb:${params.location}:${params.checkIn}:${params.checkOut}:${params.adults}`;
  const cached = await cacheGet<AirbnbResult[]>(cacheKey);
  if (cached) return cached;

  const qs = new URLSearchParams({
    engine: ENGINE,
    api_key: env.searchApiKey,
    q: params.location,
    check_in: params.checkIn,
    check_out: params.checkOut,
    adults: String(params.adults),
  });

  // Key travels in the query string, so never log or rethrow the URL/body.
  const res = await fetch(`${SEARCHAPI_BASE}?${qs}`);
  if (!res.ok) {
    throw new Error(`SearchApi Airbnb search failed (${res.status})`);
  }
  const json = await res.json();
  // SearchApi result shape can shift; normalize defensively.
  type RawProperty = {
    id?: string | number;
    property_id?: string | number;
    name?: string;
    title?: string;
    rating?: number;
    price?: {
      per_night?: number;
      total?: number;
      currency?: string;
      rate?: number;
      extracted_total_price?: number;
      extracted_price_per_qualifier?: number;
    };
    price_per_night?: number;
    total_price?: number;
    images?: Array<string | { url?: string }>;
    image?: string;
    thumbnail?: string;
    link?: string;
    booking_link?: string;
    url?: string;
  };
  const raw: RawProperty[] = json.properties ?? json.results ?? json.organic_results ?? [];

  const results: AirbnbResult[] = raw.slice(0, 20).map((p) => {
    const id = String(p.id ?? p.property_id ?? "");
    const firstImage = p.images?.[0];
    return {
      id,
      name: p.name ?? p.title ?? "Airbnb stay",
      rating: p.rating ?? null,
      pricePerNight:
        p.price?.per_night ??
        p.price?.rate ??
        p.price?.extracted_price_per_qualifier ??
        p.price_per_night ??
        null,
      totalPrice: p.price?.total ?? p.price?.extracted_total_price ?? p.total_price ?? null,
      currency: p.price?.currency ?? "USD",
      photoUrl:
        (typeof firstImage === "string" ? firstImage : firstImage?.url) ??
        p.image ??
        p.thumbnail ??
        null,
      url: p.booking_link ?? p.link ?? p.url ?? (id ? `https://www.airbnb.com/rooms/${id}` : null),
      bookable: false as const,
    };
  });

  cacheSet(cacheKey, results, 6 * HOURS);
  return results;
}
