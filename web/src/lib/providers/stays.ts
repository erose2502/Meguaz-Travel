import { searchAirbnb, type AirbnbResult } from "@/lib/providers/airbnb";
import { searchResorts, type ResortResult } from "@/lib/providers/duffel";

// The stays conditional: one "Stays" step in the UI, two engines behind it.
// - "home"   → Airbnb via SearchApi (search + deep link out, confirm-back)
// - "resort" → Duffel Stays (bookable in-app)
export type StayPreference = "home" | "resort";

export type StaysSearchParams = {
  preference: StayPreference;
  location: string;
  checkIn: string;
  checkOut: string;
  adults: number;
};

export type StaysSearchResult =
  | { kind: "airbnb"; results: AirbnbResult[] }
  | { kind: "resort"; results: ResortResult[] };

export async function searchStays(params: StaysSearchParams): Promise<StaysSearchResult> {
  if (params.preference === "resort") {
    return {
      kind: "resort",
      results: await searchResorts({
        location: params.location,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        adults: params.adults,
      }),
    };
  }
  return {
    kind: "airbnb",
    results: await searchAirbnb({
      location: params.location,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      adults: params.adults,
    }),
  };
}
