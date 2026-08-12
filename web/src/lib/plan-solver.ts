import { searchFlights, resolveIata, type FlightOffer } from "@/lib/providers/duffel";
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

  const offers = await searchFlights({
    origin,
    destination,
    departureDate: brief.arriveBy,
    adults: brief.adults,
  });
  if (offers.length === 0) return null;

  const usable = offers
    .filter((o) => o.slices[0]?.departingAt && o.slices[0]?.arrivingAt)
    .slice(0, 15);
  if (usable.length === 0) return null;

  const byPrice = [...usable].sort((a, b) => Number(a.totalAmount) - Number(b.totalAmount));
  const byCalm = [...usable].sort(
    (a, b) =>
      a.slices[0].segments - b.slices[0].segments ||
      (a.slices[0].durationMinutes ?? 9999) - (b.slices[0].durationMinutes ?? 9999)
  );
  const cheapest = byPrice[0];
  const calmest = byCalm[0];
  // Balanced: best combined rank of price and duration/stops.
  const balanced =
    [...usable].sort(
      (a, b) => rank(a, byPrice) + rank(a, byCalm) - (rank(b, byPrice) + rank(b, byCalm))
    )[0] ?? cheapest;

  const options: PlanOption[] = [
    buildOption("frugal", "The Frugal Route", "Lowest total cost", cheapest, brief, "money"),
    buildOption("balanced", "The Balanced Route", "Best mix of price and calm", balanced, brief, "balanced"),
    buildOption("calm", "The Calm Route", "Most breathing room", calmest, brief, "time"),
  ];

  return {
    brief,
    routeLabel: `${title(brief.from)} → ${title(brief.to)}`,
    options,
  };
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
  fits: PlanOption["fits"]
): PlanOption {
  const lane = LANES[id];
  const slice = offer.slices[0];
  const flightCost = Math.round(Number(offer.totalAmount));
  const total = flightCost + TRANSFER.toAirportCost + TRANSFER.intoCityCost;

  const depart = new Date(slice.departingAt);
  const arrive = new Date(slice.arrivingAt);
  const preFlightMin =
    TRANSFER.toAirportMin + TRANSFER.checkinMin + TRANSFER.securityWaitMin + lane.bufferMin;
  const leaveHome = new Date(depart.getTime() - preFlightMin * 60_000);
  const doorClose = new Date(
    arrive.getTime() + (TRANSFER.borderMin + TRANSFER.intoCityMin) * 60_000
  );
  const doorToDoorMin = Math.round((doorClose.getTime() - leaveHome.getTime()) / 60_000);

  const under = brief.budget - total;
  const stops = slice.segments - 1;
  const flightLabel = stops === 0 ? "Nonstop" : `Flight · ${stops} stop${stops > 1 ? "s" : ""}`;

  const steps: TimelineStep[] = [
    {
      id: "home", icon: "home", time: hm(leaveHome), label: "Leave home",
      location: `${title(brief.from)} home base`,
      detail: "Rideshare ordered for your departure window", cost: `$${TRANSFER.toAirportCost}`, kind: "go", note: null,
    },
    {
      id: "drive", icon: "car", time: `${hm(leaveHome)} → ${hm(addMin(leaveHome, TRANSFER.toAirportMin))}`,
      label: `Rideshare to ${slice.origin}`,
      location: `~${TRANSFER.toAirportMin} min in typical traffic`,
      detail: "Fare estimate locked", cost: null, kind: "normal", note: null,
    },
    {
      id: "checkin", icon: "checkin", time: `${hm(addMin(leaveHome, TRANSFER.toAirportMin))} → ${hm(addMin(leaveHome, TRANSFER.toAirportMin + TRANSFER.checkinMin))}`,
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
    { label: "Rideshare to airport", amount: TRANSFER.toAirportCost, color: "#FF7A00" },
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
      { type: "car", label: "Rideshare", time: `${TRANSFER.toAirportMin}m` },
      { type: "flight", label: flightLabel, time: dur(slice.durationMinutes) },
      { type: "train", label: "Rail", time: `${TRANSFER.intoCityMin}m` },
    ],
    fits,
    steps,
    costBreakdown,
    offerId: offer.id,
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
