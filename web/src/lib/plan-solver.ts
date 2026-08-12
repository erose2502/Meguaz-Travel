import { searchFlights, resolveIata, type FlightOffer } from "@/lib/providers/duffel";
import { airportCoords } from "@/lib/providers/geo";
import { driveEta } from "@/lib/providers/routing";
import type {
  TripBrief,
  PlanOption,
  SolveResponse,
  TimelineStep,
  CostLine,
} from "@/lib/plan-types";

// Solves a trip brief into the prototype's three lanes (Frugal / Balanced / Calm)
// from live Duffel offers, wrapped with door-to-door transfer estimates.
//
// Transfer legs are static heuristics at MVP (no maps API): rideshare-to-airport
// and rail-into-city numbers are typical metro values. Swap for Google Routes /
// Mapbox when "leave home by" needs live traffic.
const TRANSFER = {
  toAirportMin: 42,
  toAirportCost: 34,
  checkinMin: 13,
  securityWaitMin: 12,
  borderMin: 45,
  intoCityMin: 35,
  intoCityCost: 35,
};

const LANES = {
  frugal: { buffer: 2, bufferMin: 25, label: "Tight" },
  balanced: { buffer: 4, bufferMin: 70, label: "Comfortable" },
  calm: { buffer: 5, bufferMin: 90, label: "Generous" },
} as const;

export async function solveTrip(brief: TripBrief): Promise<SolveResponse | null> {
  const [origin, destination] = await Promise.all([
    resolveIata(brief.from),
    resolveIata(brief.to),
  ]);
  if (!origin || !destination) return null;

  // If the user shared their location, compute the real drive time to the
  // departure airport. All offers leave from `origin`, so this is one lookup
  // that sharpens "leave home by" for every lane.
  let drive: { minutes: number; cost: number; trafficAware: boolean } | null = null;
  if (brief.originCoords) {
    const dest = await airportCoords(origin).catch(() => null);
    if (dest) {
      const eta = await driveEta(brief.originCoords, dest).catch(() => null);
      if (eta) {
        // Rough fare model until a rideshare API is wired: base + per-km.
        drive = {
          minutes: eta.minutes,
          cost: Math.max(12, Math.round(6 + eta.distanceKm * 1.6)),
          trafficAware: eta.trafficAware,
        };
      }
    }
  }

  // "Arrive by" is a deadline, not a departure date. A long-haul leg departing
  // ON the deadline usually lands the next morning — past it. So we look at
  // departures the day before as well, then keep only itineraries that actually
  // touch down (plus inbound transfer time) before the deadline expires.
  const dayBefore = shiftDate(brief.arriveBy, -1);
  const [sameDay, priorDay] = await Promise.all([
    searchFlights({ origin, destination, departureDate: brief.arriveBy, adults: brief.adults }),
    searchFlights({ origin, destination, departureDate: dayBefore, adults: brief.adults }),
  ]);

  const all = dedupeById([...sameDay, ...priorDay]).filter(
    (o) => o.slices[0]?.departingAt && o.slices[0]?.arrivingAt
  );
  if (all.length === 0) return null;

  const deadline = new Date(`${brief.arriveBy}T23:59:59`);
  const onTime = all.filter((o) => {
    const landed = new Date(o.slices[0].arrivingAt);
    const atDoor = new Date(
      landed.getTime() + (TRANSFER.borderMin + TRANSFER.intoCityMin) * 60_000
    );
    return atDoor <= deadline;
  });

  // Prefer itineraries that meet the deadline; if none do, fall back to the full
  // set rather than showing nothing, and flag it on the response.
  const meetsDeadline = onTime.length > 0;
  const usable = (meetsDeadline ? onTime : all).slice(0, 20);

  const byPrice = [...usable].sort((a, b) => Number(a.totalAmount) - Number(b.totalAmount));
  const byCalm = [...usable].sort((a, b) => calmScore(a) - calmScore(b));
  const byBalance = [...usable].sort(
    (a, b) => rank(a, byPrice) + rank(a, byCalm) - (rank(b, byPrice) + rank(b, byCalm))
  );

  // Each lane must be a genuinely different itinerary — three identical prices
  // makes "3 ways to make this work" meaningless. Claim in order of how
  // strongly each lane defines itself, and only reuse when the market is thin.
  const taken = new Set<string>();
  const claim = (list: FlightOffer[]): FlightOffer => {
    const pick = list.find((o) => !taken.has(o.id)) ?? list[0];
    taken.add(pick.id);
    return pick;
  };
  const cheapest = claim(byPrice);
  const calmest = claim(byCalm);
  const balanced = claim(byBalance);

  const options: PlanOption[] = [
    buildOption("frugal", "The Frugal Route", "Lowest total cost", cheapest, brief, "money", drive),
    buildOption("balanced", "The Balanced Route", "Best mix of price and calm", balanced, brief, "balanced", drive),
    buildOption("calm", "The Calm Route", "Most breathing room", calmest, brief, "time", drive),
  ];

  return {
    brief,
    routeLabel: `${title(brief.from)} → ${title(brief.to)}`,
    meetsDeadline,
    options,
  };
}

function dedupeById(offers: FlightOffer[]): FlightOffer[] {
  const seen = new Map<string, FlightOffer>();
  for (const o of offers) if (!seen.has(o.id)) seen.set(o.id, o);
  return [...seen.values()];
}

// Lower is calmer: nonstop first, then shorter air time, then a later departure
// (a 9am start beats a 5am one for the same itinerary).
function calmScore(o: FlightOffer): number {
  const s = o.slices[0];
  const departHour = new Date(s.departingAt).getHours();
  const earlyPenalty = departHour < 8 ? (8 - departHour) * 20 : 0;
  return s.segments * 600 + (s.durationMinutes ?? 9999) + earlyPenalty;
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function rank(o: FlightOffer, list: FlightOffer[]) {
  return list.findIndex((x) => x.id === o.id);
}

function buildOption(
  id: keyof typeof LANES,
  name: string,
  tagline: string,
  offer: FlightOffer,
  brief: TripBrief,
  fits: PlanOption["fits"],
  drive: { minutes: number; cost: number; trafficAware: boolean } | null
): PlanOption {
  const lane = LANES[id];
  const slice = offer.slices[0];
  const flightCost = Math.round(Number(offer.totalAmount));

  // Real drive time/fare from the user's location when available, else static.
  const toAirportMin = drive?.minutes ?? TRANSFER.toAirportMin;
  const toAirportCost = drive?.cost ?? TRANSFER.toAirportCost;
  const total = flightCost + toAirportCost + TRANSFER.intoCityCost;

  const depart = new Date(slice.departingAt);
  const arrive = new Date(slice.arrivingAt);
  const preFlightMin =
    toAirportMin + TRANSFER.checkinMin + TRANSFER.securityWaitMin + lane.bufferMin;
  const leaveHome = new Date(depart.getTime() - preFlightMin * 60_000);
  const doorClose = new Date(
    arrive.getTime() + (TRANSFER.borderMin + TRANSFER.intoCityMin) * 60_000
  );
  const doorToDoorMin = Math.round((doorClose.getTime() - leaveHome.getTime()) / 60_000);

  const under = brief.budget - total;
  const stops = slice.segments - 1;
  const flightLabel = stops === 0 ? "Nonstop" : `Flight · ${stops} stop${stops > 1 ? "s" : ""}`;
  const driveDetail = drive
    ? drive.trafficAware
      ? "Live traffic — updates as conditions change"
      : "Based on your current location"
    : "~in typical traffic";

  const steps: TimelineStep[] = [
    {
      id: "home", icon: "home", time: hm(leaveHome), label: "Leave home",
      location: drive ? "Your current location" : `${title(brief.from)} home base`,
      detail: "Rideshare ordered for your departure window", cost: `$${toAirportCost}`, kind: "go", note: null,
    },
    {
      id: "drive", icon: "car", time: `${hm(leaveHome)} → ${hm(addMin(leaveHome, toAirportMin))}`,
      label: `Rideshare to ${slice.origin}`,
      location: `~${toAirportMin} min · ${driveDetail}`,
      detail: "Fare estimate locked", cost: null, kind: "normal", note: null,
    },
    {
      id: "checkin", icon: "checkin", time: `${hm(addMin(leaveHome, toAirportMin))} → ${hm(addMin(leaveHome, toAirportMin + TRANSFER.checkinMin))}`,
      label: "Check-in & security",
      location: `${slice.origin} · average wait ${TRANSFER.securityWaitMin} min`,
      detail: "Have your ID and boarding pass ready", cost: null, kind: "normal", note: null,
    },
    {
      id: "buffer", icon: "buffer", time: `${lane.bufferMin}-min buffer`,
      label: `${lane.bufferMin}-min buffer`,
      location: "Time to breathe, grab coffee, relax",
      detail: "Your safety cushion before boarding", cost: null, kind: "buffer", note: null,
    },
    {
      id: "flight", icon: "flight", time: `${hm(depart)} → ${hm(arrive)}`,
      label: `${slice.origin} → ${slice.destination} · ${flightLabel}`,
      location: `${offer.owner} · ${dur(slice.durationMinutes)} in the air`,
      detail: "Flight fare", cost: `$${flightCost}`, kind: "main", note: null,
    },
    {
      id: "arrive", icon: "door", time: hm(arrive), label: `Arrive ${title(brief.to)}`,
      location: `Border + baggage ~${TRANSFER.borderMin} min`,
      detail: `We padded ${TRANSFER.borderMin} min for arrivals`, cost: null, kind: "normal", note: null,
    },
    {
      id: "rail", icon: "train", time: `${hm(addMin(arrive, TRANSFER.borderMin))} → ${hm(doorClose)}`,
      label: "Train into the city",
      location: `~${TRANSFER.intoCityMin} min incl. walk`,
      detail: "Ticket fare", cost: `$${TRANSFER.intoCityCost}`, kind: "go", note: null,
    },
  ];

  const costBreakdown: CostLine[] = [
    { label: `Flight (${flightLabel.toLowerCase()})`, amount: flightCost, color: "#146C7E" },
    { label: "Rideshare to airport", amount: toAirportCost, color: "#FF7A00" },
    { label: "Train into city", amount: TRANSFER.intoCityCost, color: "#2FB4B4" },
  ];

  return {
    id,
    name,
    tagline,
    cost: total,
    doorToDoor: dur(doorToDoorMin),
    leaveBy: hm(leaveHome),
    buffer: lane.buffer,
    bufferMin: lane.bufferMin,
    bufferLabel: `${lane.label} — ${lane.bufferMin} min airport buffer`,
    tradeoff:
      under >= 0
        ? `$${under} under budget with a ${lane.bufferMin}-minute cushion at the airport.`
        : `$${Math.abs(under)} over your cap — consider the Frugal lane or a later date.`,
    legs: [
      { type: "home", label: "Home", time: "" },
      { type: "car", label: "Rideshare", time: `${toAirportMin}m` },
      { type: "flight", label: flightLabel, time: dur(slice.durationMinutes) },
      { type: "train", label: "Rail", time: `${TRANSFER.intoCityMin}m` },
    ],
    fits,
    steps,
    costBreakdown,
    offerId: offer.id,
    etaFromLocation: Boolean(drive),
    etaTrafficAware: Boolean(drive?.trafficAware),
    originAirport: slice.origin,
    departAt: depart.toISOString(),
    preTransferMin: TRANSFER.checkinMin + TRANSFER.securityWaitMin + lane.bufferMin,
  };
}

function hm(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function addMin(d: Date, min: number) {
  return new Date(d.getTime() + min * 60_000);
}
function dur(min: number | null) {
  if (min == null) return "—";
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}
function title(s: string) {
  return s.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1));
}
