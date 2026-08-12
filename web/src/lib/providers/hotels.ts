import "server-only";
import { env } from "@/lib/env";
import { cacheGet, cacheSet, HOURS } from "@/lib/cache";
import { resolvePlace } from "@/lib/providers/geo";

// Resort/hotel search via SearchApi's google_hotels engine.
//
// Duffel Stays is the preferred engine for this path because it books in-app,
// but it is a paid add-on ("not enabled for your account" until sales enables
// it). This keeps the resort path fully working on the keys we already have;
// booking is a handoff to the property until Duffel Stays is switched on.
const SEARCHAPI_BASE = "https://www.searchapi.io/api/v1/search";

export type HotelSearchParams = {
  location: string;
  checkIn: string;
  checkOut: string;
  adults: number;
};

export type HotelResult = {
  id: string;
  name: string;
  kind: string; // hotel | resort | vacation_rental
  rating: number | null;
  pricePerNight: number | null;
  totalPrice: number | null;
  currency: string;
  photoUrl: string | null;
  url: string | null;
  amenities: string[];
  bookable: false; // handoff until Duffel Stays is enabled
};

export async function searchHotels(params: HotelSearchParams): Promise<HotelResult[]> {
  const cacheKey =
    `hotels:${params.location}:${params.checkIn}:${params.checkOut}:${params.adults}`.toLowerCase();
  const cached = await cacheGet<HotelResult[]>(cacheKey);
  if (cached) return cached;

  // Anchor the query to the real destination. Google Hotels defaults to US
  // geography and returns US properties for a bare "Kyoto"; resolving the place
  // first gives us the country to disambiguate ("Kyoto, JP" + gl=jp).
  const place = await resolvePlace(params.location).catch(() => null);
  const q =
    place?.countryCode && place?.cityName
      ? `${place.cityName}, ${place.countryCode}`
      : params.location;

  const qs = new URLSearchParams({
    engine: "google_hotels",
    api_key: env.searchApiKey,
    q,
    check_in_date: params.checkIn,
    check_out_date: params.checkOut,
    adults: String(params.adults),
    currency: "USD",
    hl: "en",
  });
  if (place?.countryCode) qs.set("gl", place.countryCode.toLowerCase());

  // Key travels in the query string — never log or rethrow the URL.
  const res = await fetch(`${SEARCHAPI_BASE}?${qs}`);
  if (!res.ok) throw new Error(`SearchApi hotels search failed (${res.status})`);
  const json = await res.json();

  type Money = { extracted_price?: number };
  type RawHotel = {
    property_token?: string;
    name?: string;
    type?: string;
    rating?: number;
    price_per_night?: Money;
    total_price?: Money;
    images?: Array<{ original_image?: string; thumbnail?: string } | string>;
    link?: string;
    amenities?: string[];
    offers?: Array<{ source?: string; link?: string }>;
  };

  const raw: RawHotel[] = json.properties ?? [];
  const results: HotelResult[] = raw.slice(0, 20).map((h, i) => {
    const image = h.images?.[0];
    return {
      id: h.property_token ?? `hotel-${i}`,
      name: h.name ?? "Property",
      kind: h.type ?? "hotel",
      rating: h.rating ?? null,
      pricePerNight: h.price_per_night?.extracted_price ?? null,
      totalPrice: h.total_price?.extracted_price ?? null,
      currency: "USD",
      photoUrl:
        (typeof image === "string" ? image : (image?.original_image ?? image?.thumbnail)) ?? null,
      url: h.link ?? h.offers?.[0]?.link ?? null,
      amenities: (h.amenities ?? []).slice(0, 6),
      bookable: false as const,
    };
  });

  // Priced results first, cheapest of those leading — unpriced entries are the
  // least actionable for a budget-first planner.
  results.sort((a, b) => {
    const ap = a.totalPrice ?? a.pricePerNight;
    const bp = b.totalPrice ?? b.pricePerNight;
    if (ap == null && bp == null) return 0;
    if (ap == null) return 1;
    if (bp == null) return -1;
    return ap - bp;
  });

  await cacheSet(cacheKey, results, 6 * HOURS);
  return results;
}
