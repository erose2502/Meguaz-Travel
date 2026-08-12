import "server-only";
import { searchAirbnb, type AirbnbResult } from "@/lib/providers/airbnb";
import { searchResorts, type ResortResult } from "@/lib/providers/duffel";
import { searchHotels, type HotelResult } from "@/lib/providers/hotels";

// The stays conditional: one "Stays" step in the UI, different engines behind it.
//
//   home   → Airbnb via SearchApi           (search + deep link out)
//   resort → Duffel Stays when enabled      (books in-app)
//            else SearchApi google_hotels   (search + deep link out)
//
// Duffel Stays is a paid add-on and returns 403 until sales enables it, so the
// resort path falls back automatically rather than failing the request.
export type StayPreference = "home" | "resort";

const DUFFEL_STAYS_ENABLED = process.env.DUFFEL_STAYS_ENABLED === "true";

export type StaysSearchParams = {
  preference: StayPreference;
  location: string;
  checkIn: string;
  checkOut: string;
  adults: number;
};

export type StaysSearchResult =
  | { kind: "airbnb"; bookableInApp: false; results: AirbnbResult[] }
  | { kind: "resort"; bookableInApp: true; results: ResortResult[] }
  | { kind: "hotel"; bookableInApp: false; results: HotelResult[] };

export async function searchStays(params: StaysSearchParams): Promise<StaysSearchResult> {
  if (params.preference === "resort") {
    if (DUFFEL_STAYS_ENABLED) {
      try {
        const results = await searchResorts({
          location: params.location,
          checkIn: params.checkIn,
          checkOut: params.checkOut,
          adults: params.adults,
        });
        if (results.length > 0) {
          return { kind: "resort", bookableInApp: true, results };
        }
      } catch (err) {
        console.warn(
          "Duffel Stays unavailable, using hotel search:",
          err instanceof Error ? err.message : "unknown"
        );
      }
    }

    return {
      kind: "hotel",
      bookableInApp: false,
      results: await searchHotels({
        location: params.location,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        adults: params.adults,
      }),
    };
  }

  return {
    kind: "airbnb",
    bookableInApp: false,
    results: await searchAirbnb({
      location: params.location,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      adults: params.adults,
    }),
  };
}
