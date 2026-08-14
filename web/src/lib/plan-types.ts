// Shared shapes between the plan solver API and the prototype screens.
export type Priority = "money" | "balanced" | "time";
export type LegType = "home" | "car" | "flight" | "train";
export type StepKind = "go" | "normal" | "buffer" | "main";
export type StepIcon =
  | "home"
  | "car"
  | "flight"
  | "checkin"
  | "buffer"
  | "door"
  | "train";

/** How the traveller gets to their departure airport. */
export type TransferMode = "rideshare" | "drive" | "dropoff" | "transit";

export type TripBrief = {
  from: string; // city, e.g. "San Francisco"
  to: string; // city, e.g. "London"
  arriveBy: string; // YYYY-MM-DD
  budget: number; // USD cap
  adults: number;
  /** Airport-transfer preference; defaults to rideshare. */
  airportTransfer?: TransferMode;
  /**
   * Trip length in nights. When present the solver prices the return leg too
   * (one Duffel round-trip request, not two), so `cost` is the whole trip.
   */
  nights?: number;
  /** Fare class the traveller wants priced. */
  cabinClass?: "economy" | "premium_economy" | "business" | "first";
  /** Travelling with a checked bag: prices the fee when the fare includes
   * none, and pads bag-drop time into the airport plan. */
  checkedBag?: boolean;
  // When present, the solver uses a real drive ETA from here to the departure
  // airport instead of a static estimate, sharpening "leave home by".
  originCoords?: { lat: number; lng: number };
};

export type PlanLeg = { type: LegType; label: string; time: string };

export type TimelineStep = {
  id: string;
  icon: StepIcon;
  time: string;
  label: string;
  location: string;
  detail: string;
  cost: string | null;
  kind: StepKind;
  note: string | null;
};

export type CostLine = { label: string; amount: number; color: string };

export type PlanOption = {
  id: string;
  name: string;
  tagline: string;
  cost: number;
  doorToDoor: string;
  leaveBy: string;
  buffer: number; // 1..5
  bufferMin: number;
  bufferLabel: string;
  tradeoff: string;
  legs: PlanLeg[];
  fits: Priority;
  steps: TimelineStep[];
  costBreakdown: CostLine[];
  offerId: string | null; // Duffel offer backing the flight leg
  /** What the fare includes per traveller, plus any estimated checked-bag fee
   * the solver added because the traveller wants one and the fare has none. */
  bags: { carryOn: number; checked: number; feeAdded: number };
  /** True when leave-by used a real drive ETA from the user's location. */
  etaFromLocation: boolean;
  etaTrafficAware: boolean;
  // Fields that let the Journey timeline recompute leave-by from a fresh ETA:
  originAirport: string; // departure IATA, e.g. "SFO"
  departAt: string; // ISO datetime of the flight departure
  // Everything before boarding except the drive (check-in + security + buffer),
  // so live leave-by = departAt − (liveDriveMin + preTransferMin).
  preTransferMin: number;
};

/** Median nightly stay estimate for the trip window, from live listings. */
export type StayEstimate = {
  nightlyUsd: number;
  nights: number;
  totalUsd: number;
  kind: "airbnb" | "resort" | "hotel";
};

export type SolveResponse = {
  brief: TripBrief;
  routeLabel: string; // "San Francisco → London"
  /** False when no itinerary lands before the arrive-by deadline; UI warns. */
  meetsDeadline: boolean;
  /** YYYY-MM-DD of the priced return leg, when the brief carried a trip length. */
  returnDate: string | null;
  /** Null when no trip length was given or no priced listings came back. */
  stay: StayEstimate | null;
  /** Set when the ride to the departure airport is extreme and a materially
   * closer airport exists — surfaced so the traveller can switch. */
  originAdvice: string | null;
  options: PlanOption[];
};
