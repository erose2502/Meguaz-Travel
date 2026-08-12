import { Duffel } from "@duffel/api";
import { env } from "@/lib/env";

let _duffel: Duffel | null = null;
function duffel() {
  if (!_duffel) _duffel = new Duffel({ token: env.duffelApiKey });
  return _duffel;
}

export type FlightSearchParams = {
  origin: string; // IATA code
  destination: string; // IATA code
  departureDate: string; // YYYY-MM-DD
  returnDate?: string;
  adults: number;
  cabinClass?: "economy" | "premium_economy" | "business" | "first";
};

export type FlightOffer = {
  id: string;
  totalAmount: string;
  totalCurrency: string;
  owner: string;
  slices: Array<{
    origin: string;
    destination: string;
    departingAt: string;
    arrivingAt: string;
    durationMinutes: number | null;
    segments: number;
    carriers: string[];
  }>;
};

export async function searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
  const slice = (origin: string, destination: string, departure_date: string) => ({
    origin,
    destination,
    departure_date,
    departure_time: null,
    arrival_time: null,
  });
  const slices = [slice(params.origin, params.destination, params.departureDate)];
  if (params.returnDate) {
    slices.push(slice(params.destination, params.origin, params.returnDate));
  }

  const offerRequest = await duffel().offerRequests.create({
    slices,
    passengers: Array.from({ length: params.adults }, () => ({ type: "adult" as const })),
    cabin_class: params.cabinClass ?? "economy",
    return_offers: true,
  });

  const offers = offerRequest.data.offers ?? [];
  return offers.slice(0, 20).map((o) => ({
    id: o.id,
    totalAmount: o.total_amount,
    totalCurrency: o.total_currency,
    owner: o.owner?.name ?? "Unknown airline",
    slices: (o.slices ?? []).map((s) => ({
      origin: s.origin?.iata_code ?? "",
      destination: s.destination?.iata_code ?? "",
      departingAt: s.segments?.[0]?.departing_at ?? "",
      arrivingAt: s.segments?.at(-1)?.arriving_at ?? "",
      durationMinutes: s.duration ? parseIsoDurationMinutes(s.duration) : null,
      segments: s.segments?.length ?? 0,
      carriers: [
        ...new Set(
          (s.segments ?? []).map((seg) => seg.marketing_carrier?.name).filter(Boolean) as string[]
        ),
      ],
    })),
  }));
}

// Resolve a free-text city to its main airport IATA code via Duffel Places.
export async function resolveIata(query: string): Promise<string | null> {
  if (/^[A-Za-z]{3}$/.test(query.trim())) return query.trim().toUpperCase();
  const res = await fetch(
    `https://api.duffel.com/places/suggestions?query=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${env.duffelApiKey}`,
        "Duffel-Version": "v2",
      },
    }
  );
  if (!res.ok) return null;
  const json = await res.json();
  type Place = { type?: string; iata_code?: string; airports?: Array<{ iata_code?: string }> };
  const places: Place[] = json?.data ?? [];
  const city = places.find((p) => p.type === "city");
  const airport = places.find((p) => p.type === "airport");
  return (
    city?.iata_code ??
    city?.airports?.[0]?.iata_code ??
    airport?.iata_code ??
    places[0]?.iata_code ??
    null
  );
}

function parseIsoDurationMinutes(iso: string): number | null {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return null;
  return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
}

// --- Duffel Stays (resort/hotel path of the stays conditional) ---
// The @duffel/api SDK ships a stays client, but we call REST directly to stay
// pinned to the v2 wire format.
export type StaySearchParams = {
  location: string; // free-text place; we geocode via Duffel's location search
  lat?: number;
  lng?: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms?: number;
};

export type ResortResult = {
  id: string;
  name: string;
  rating: number | null;
  totalAmount: string | null;
  currency: string | null;
  address: string;
  photoUrl: string | null;
  bookable: true; // Duffel Stays books in-app
};

export async function searchResorts(params: StaySearchParams): Promise<ResortResult[]> {
  const body = {
    location: {
      radius: 15,
      geographic_coordinates:
        params.lat != null && params.lng != null
          ? { latitude: params.lat, longitude: params.lng }
          : undefined,
      query: params.lat != null ? undefined : params.location,
    },
    check_in_date: params.checkIn,
    check_out_date: params.checkOut,
    guests: Array.from({ length: params.adults }, () => ({ type: "adult" })),
    rooms: params.rooms ?? 1,
  };

  const res = await fetch("https://api.duffel.com/stays/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.duffelApiKey}`,
      "Duffel-Version": "v2",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: body }),
  });
  if (!res.ok) {
    throw new Error(`Duffel Stays search failed (${res.status})`);
  }
  const json = await res.json();
  const results = json?.data?.results ?? [];
  type DuffelStayResult = {
    id?: string;
    accommodation?: {
      id?: string;
      name?: string;
      rating?: number;
      review_score?: number;
      location?: { address?: { line_one?: string; city_name?: string } };
      photos?: Array<{ url?: string }>;
    };
    cheapest_rate_total_amount?: string;
    cheapest_rate_currency?: string;
  };
  return (results as DuffelStayResult[]).slice(0, 20).map((r) => ({
    id: r.id ?? r.accommodation?.id ?? "",
    name: r.accommodation?.name ?? "Unnamed property",
    rating: r.accommodation?.rating ?? r.accommodation?.review_score ?? null,
    totalAmount: r.cheapest_rate_total_amount ?? null,
    currency: r.cheapest_rate_currency ?? null,
    address: [
      r.accommodation?.location?.address?.line_one,
      r.accommodation?.location?.address?.city_name,
    ]
      .filter(Boolean)
      .join(", "),
    photoUrl: r.accommodation?.photos?.[0]?.url ?? null,
    bookable: true as const,
  }));
}
