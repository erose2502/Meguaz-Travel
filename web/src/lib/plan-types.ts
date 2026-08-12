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

export type TripBrief = {
  from: string; // city, e.g. "San Francisco"
  to: string; // city, e.g. "London"
  arriveBy: string; // YYYY-MM-DD
  budget: number; // USD cap
  adults: number;
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

export type SolveResponse = {
  brief: TripBrief;
  routeLabel: string; // "San Francisco → London"
  /** False when no itinerary lands before the arrive-by deadline; UI warns. */
  meetsDeadline: boolean;
  options: PlanOption[];
};
