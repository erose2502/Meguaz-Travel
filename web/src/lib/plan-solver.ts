import { searchFlights, resolveIata, type FlightOffer } from "@/lib/providers/duffel";
import { nearestAirports } from "@/lib/providers/airports";
import { airportCoords } from "@/lib/providers/geo";
import { driveEta } from "@/lib/providers/routing";
import { searchGround, type GroundOption } from "@/lib/providers/ground";
import { searchStays, type StaysSearchResult } from "@/lib/providers/stays";
import type {
  TripBrief,
  PlanOption,
  SolveResponse,
  StayEstimate,
  TimelineStep,
  CostLine,
} from "@/lib/plan-types";

// Solves a trip brief into three lanes (Cheapest / Best overall / Most relaxed)
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
  // Airport-transfer preference models (transparent estimates, labelled so).
  parkingPerDay: 18, // economy-lot per day
  transitCost: 14, // flat airport-transit estimate
  transitFactor: 1.55, // transit typically slower than the drive
};

const LANES = {
  frugal: { buffer: 2, bufferMin: 25, label: "Tight connection" },
  balanced: { buffer: 4, bufferMin: 70, label: "Comfortable gap" },
  calm: { buffer: 5, bufferMin: 90, label: "Plenty of slack" },
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
      // Nobody takes a rideshare to an airport on another continent. If the
      // coordinates and the departure airport disagree this badly, the
      // coordinates are not describing this trip — ignore them rather than
      // billing a 42-hour, $6,000 taxi. (Real case: a traveller in
      // Pennsylvania with a plan departing SFO.)
      const PLAUSIBLE_TRANSFER_MIN = 240;
      const PLAUSIBLE_TRANSFER_KM = 300;
      if (
        eta &&
        eta.minutes <= PLAUSIBLE_TRANSFER_MIN &&
        eta.distanceKm <= PLAUSIBLE_TRANSFER_KM
      ) {
        // Rough fare model until a rideshare API is wired: base + per-km.
        drive = {
          minutes: eta.minutes,
          cost: Math.max(12, Math.round(6 + eta.distanceKm * 1.6)),
          trafficAware: eta.trafficAware,
        };
      }
    }
  }

  // The leg from the arrival airport into the city. searchGround knows about
  // FlixBus, national rail and local operators and caches per route+month.
  // This first lookup (for the city's main airport) drives the deadline filter;
  // once the three lanes are chosen, any lane landing at a DIFFERENT airport
  // gets its own lookup — an offer into Stockholm Västerås must not be paired
  // with the Arlanda Express.
  const ground = await groundFor(destination, brief.to, brief.arriveBy);

  // "Arrive by" is a deadline, not a departure date. A long-haul leg departing
  // ON the deadline usually lands the next morning — past it. So we look at
  // departures the day before as well, then keep only itineraries that actually
  // touch down (plus inbound transfer time) before the deadline expires.
  //
  // A trip length in the brief turns each search into a round trip: Duffel
  // prices both slices in the same offer request (no extra call), and the plan's
  // total becomes the whole trip instead of a one-way surprise.
  const returnDate = brief.nights ? shiftDate(brief.arriveBy, brief.nights) : undefined;
  const dayBefore = shiftDate(brief.arriveBy, -1);
  // A trip length also makes a stay estimate possible: one cached listings
  // search for the same window, folded into "total trip cost in view". Fetched
  // in parallel with the flights and never allowed to fail the solve.
  const staysPromise: Promise<StaysSearchResult | null> = returnDate
    ? searchStays({
        preference: "home",
        location: title(brief.to),
        checkIn: brief.arriveBy,
        checkOut: returnDate,
        adults: brief.adults,
      }).catch(() => null)
    : Promise.resolve(null);
  const [sameDay, priorDay, stays] = await Promise.all([
    searchFlights({ origin, destination, departureDate: brief.arriveBy, returnDate, adults: brief.adults, cabinClass: brief.cabinClass }),
    searchFlights({ origin, destination, departureDate: dayBefore, returnDate, adults: brief.adults, cabinClass: brief.cabinClass }),
    staysPromise,
  ]);

  const all = dedupeById([...sameDay, ...priorDay]).filter(
    (o) => o.slices[0]?.departingAt && o.slices[0]?.arrivingAt
  );
  if (all.length === 0) return null;

  const deadline = new Date(`${brief.arriveBy}T23:59:59`);
  const onTime = all.filter((o) => {
    const landed = new Date(o.slices[0].arrivingAt);
    const atDoor = new Date(
      landed.getTime() + (TRANSFER.borderMin + ground.minutes) * 60_000
    );
    return atDoor <= deadline;
  });

  // Prefer itineraries that meet the deadline; if none do, fall back to the full
  // set rather than showing nothing, and flag it on the response.
  const meetsDeadline = onTime.length > 0;
  let usable = (meetsDeadline ? onTime : all).slice(0, 20);

  // Departure-time window: hour is taken from the ISO string directly, which
  // keeps it in the departure airport's local clock. Morning 5–11, afternoon
  // 12–17, evening 18–4 (red-eyes count as evening). If the window empties the
  // set we fall back to all times and say so, rather than showing nothing.
  let matchesWindow = true;
  const window_ = brief.departWindow ?? "any";
  if (window_ !== "any") {
    const inWindow = usable.filter((o) => {
      const hour = Number(o.slices[0].departingAt.slice(11, 13));
      if (Number.isNaN(hour)) return true;
      if (window_ === "morning") return hour >= 5 && hour < 12;
      if (window_ === "afternoon") return hour >= 12 && hour < 18;
      return hour >= 18 || hour < 5;
    });
    if (inWindow.length > 0) usable = inWindow;
    else matchesWindow = false;
  }

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

  // Transfers must match where each lane actually lands — an offer into
  // Stockholm Västerås must not be paired with the Arlanda Express. Extra
  // lookups are cached per route+month, and there are at most two.
  const groundByArrival = new Map<string, GroundBundle>([[destination, ground]]);
  for (const offer of [cheapest, balanced, calmest]) {
    const arrival = offer.slices[0]?.destination;
    if (arrival && !groundByArrival.has(arrival)) {
      groundByArrival.set(arrival, await groundFor(arrival, brief.to, brief.arriveBy));
    }
  }
  const groundOf = (o: FlightOffer) => groundByArrival.get(o.slices[0]?.destination ?? "") ?? ground;

  const options: PlanOption[] = [
    buildOption("frugal", "The Smart Saver", "Lowest total price, tighter connections", cheapest, brief, "money", drive, groundOf(cheapest)),
    buildOption("balanced", "The Sweet Spot", "Great price with time to spare", balanced, brief, "balanced", drive, groundOf(balanced)),
    buildOption("calm", "The Smooth Ride", "Latest start and the widest safety margin", calmest, brief, "time", drive, groundOf(calmest)),
  ];

  // A 3-hour, $300 rideshare to the airport deserves a comment, not silence.
  // When the priced ride is extreme and a materially closer airport exists,
  // say so — the traveller may simply not know which hub they live near.
  let originAdvice: string | null = null;
  if (drive && brief.originCoords && drive.minutes >= 90) {
    const nearest = nearestAirports(brief.originCoords, 1)[0];
    if (nearest && nearest.iata !== origin) {
      const hours = Math.round((drive.minutes / 60) * 10) / 10;
      originAdvice =
        `The ride to ${origin} runs ~${hours}h and ~$${drive.cost}. ` +
        `${nearest.name} (${nearest.iata}) is only ${nearest.distanceKm} km from you — ` +
        `switching your departure airport could save serious money and time.`;
    }
  }

  return {
    brief,
    routeLabel: `${title(brief.from)} → ${title(brief.to)}`,
    meetsDeadline,
    matchesWindow,
    returnDate: returnDate ?? null,
    stay: stayEstimate(stays, brief.nights ?? 0),
    originAdvice,
    options,
  };
}

/** Median nightly price across live listings — resistant to one luxury outlier. */
export function stayEstimate(
  stays: StaysSearchResult | null,
  nights: number
): StayEstimate | null {
  if (!stays || nights <= 0) return null;
  const nightly = stays.results
    .map((r) => {
      if ("pricePerNight" in r && r.pricePerNight != null) return r.pricePerNight;
      if ("totalAmount" in r && r.totalAmount != null) return Number(r.totalAmount) / nights;
      return null;
    })
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (nightly.length === 0) return null;
  const median = nightly[Math.floor(nightly.length / 2)];
  return {
    nightlyUsd: Math.round(median),
    nights,
    totalUsd: Math.round(median * nights),
    kind: stays.kind,
  };
}

export type GroundBundle = {
  leg: GroundOption | null;
  alts: GroundOption[];
  minutes: number;
  cost: number;
};

/**
 * Best airport→city transfer for one SPECIFIC arrival airport, with live
 * alternatives. Cached per route+month upstream; falls back to flat metro
 * estimates rather than failing the solve.
 */
async function groundFor(airportIata: string, city: string, date: string): Promise<GroundBundle> {
  let leg: GroundOption | null = null;
  let alts: GroundOption[] = [];
  try {
    const options = await searchGround({
      origin: `${airportIata} airport`,
      destination: `${title(city)} city centre`,
      date,
    });
    // Prefer the quickest option that carries real numbers we can add up.
    const priced = options
      .filter((o) => o.typicalDurationHours != null && o.typicalPriceUsd.min != null)
      .sort((a, b) => (a.typicalDurationHours ?? 99) - (b.typicalDurationHours ?? 99));
    leg = priced[0] ?? options[0] ?? null;
    alts = (priced.length ? priced : options).filter((o) => o !== leg).slice(0, 3);
  } catch {
    // Flat estimate below rather than a failed solve.
  }
  return {
    leg,
    alts,
    minutes: leg?.typicalDurationHours
      ? Math.round(leg.typicalDurationHours * 60)
      : TRANSFER.intoCityMin,
    cost: leg?.typicalPriceUsd.min != null ? Math.round(leg.typicalPriceUsd.min) : TRANSFER.intoCityCost,
  };
}

export function dedupeById(offers: FlightOffer[]): FlightOffer[] {
  const seen = new Map<string, FlightOffer>();
  for (const o of offers) if (!seen.has(o.id)) seen.set(o.id, o);
  return [...seen.values()];
}

// Lower is calmer: nonstop first, then shorter air time, then a later departure
// (a 9am start beats a 5am one for the same itinerary).
export function calmScore(o: FlightOffer): number {
  const s = o.slices[0];
  const departHour = new Date(s.departingAt).getHours();
  const earlyPenalty = departHour < 8 ? (8 - departHour) * 20 : 0;
  return s.segments * 600 + (s.durationMinutes ?? 9999) + earlyPenalty;
}

export function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function rank(o: FlightOffer, list: FlightOffer[]) {
  return list.findIndex((x) => x.id === o.id);
}

export function buildOption(
  id: keyof typeof LANES,
  name: string,
  tagline: string,
  offer: FlightOffer,
  brief: TripBrief,
  fits: PlanOption["fits"],
  drive: { minutes: number; cost: number; trafficAware: boolean } | null,
  ground: { leg: GroundOption | null; alts: GroundOption[]; minutes: number; cost: number }
): PlanOption {
  const lane = LANES[id];
  const slice = offer.slices[0];
  // With a return slice priced, totalAmount already covers the whole trip.
  const roundTrip = offer.slices.length > 1;
  const flightCost = Math.round(Number(offer.totalAmount));

  // The traveller's airport-transfer preference decides both the clock and the
  // money — a $130 rideshare, a parked car, a free kerbside drop-off and a
  // transit ride are wildly different totals for the same flight.
  const mode = brief.airportTransfer ?? "rideshare";
  const baseDriveMin = drive?.minutes ?? TRANSFER.toAirportMin;
  const toAirportMin =
    mode === "transit" ? Math.round(baseDriveMin * TRANSFER.transitFactor) : baseDriveMin;
  const parkingDays = (brief.nights ?? 1) + 1;
  const toAirportCost =
    mode === "rideshare"
      ? (drive?.cost ?? TRANSFER.toAirportCost)
      : mode === "drive"
        ? Math.max(TRANSFER.parkingPerDay, TRANSFER.parkingPerDay * parkingDays)
        : mode === "dropoff"
          ? 0
          : TRANSFER.transitCost;
  // Luggage: airlines charge checked bags per direction. When the traveller
  // wants one and the fare includes none, price it honestly instead of
  // letting it ambush them at check-in. $35/direction is the industry mode.
  const wantsChecked = Boolean(brief.checkedBag);
  const bagFee =
    wantsChecked && offer.bags.checked === 0
      ? 35 * brief.adults * (roundTrip ? 2 : 1)
      : 0;
  // Bag drop is real minutes: queue, tag, hand off.
  const bagDropMin = wantsChecked ? 12 : 0;
  const checkinMin = TRANSFER.checkinMin + bagDropMin;

  const total = flightCost + toAirportCost + ground.cost + bagFee;

  const TRANSFER_COPY: Record<
    typeof mode,
    { homeDetail: string; legLabel: string; stepDetail: string; costLabel: string; legType: "car" | "train" }
  > = {
    rideshare: {
      homeDetail: "Rideshare ordered for your departure window",
      legLabel: `Rideshare to ${slice.origin}`,
      stepDetail: "Fare estimate locked",
      costLabel: "Rideshare to airport",
      legType: "car",
    },
    drive: {
      homeDetail: "Driving yourself — parking estimated below",
      legLabel: `Drive to ${slice.origin}`,
      stepDetail: `Economy lot · ~$${TRANSFER.parkingPerDay}/day × ${parkingDays} days (est.)`,
      costLabel: `Airport parking · ${parkingDays} days (est.)`,
      legType: "car",
    },
    dropoff: {
      homeDetail: "Getting dropped off at departures",
      legLabel: `Ride to ${slice.origin} · drop-off`,
      stepDetail: "No transfer cost — thank your driver",
      costLabel: "Airport drop-off",
      legType: "car",
    },
    transit: {
      homeDetail: "Heading to the airport by transit",
      legLabel: `Transit to ${slice.origin}`,
      stepDetail: "Ticket estimate — check local schedules",
      costLabel: "Transit to airport (est.)",
      legType: "train",
    },
  };
  const transfer = TRANSFER_COPY[mode];

  const depart = new Date(slice.departingAt);
  const arrive = new Date(slice.arrivingAt);
  const preFlightMin =
    toAirportMin + checkinMin + TRANSFER.securityWaitMin + lane.bufferMin;
  const leaveHome = new Date(depart.getTime() - preFlightMin * 60_000);
  const doorClose = new Date(
    arrive.getTime() + (TRANSFER.borderMin + ground.minutes) * 60_000
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
      detail: transfer.homeDetail, cost: toAirportCost > 0 ? `$${toAirportCost}` : null, kind: "go", note: null,
    },
    {
      id: "drive", icon: mode === "transit" ? "train" : "car",
      time: `${hm(leaveHome)} → ${hm(addMin(leaveHome, toAirportMin))}`,
      label: transfer.legLabel,
      location: `~${toAirportMin} min · ${driveDetail}`,
      detail: transfer.stepDetail, cost: null, kind: "normal", note: null,
    },
    {
      id: "checkin", icon: "checkin", time: `${hm(addMin(leaveHome, toAirportMin))} → ${hm(addMin(leaveHome, toAirportMin + checkinMin))}`,
      label: wantsChecked ? "Bag drop, check-in & security" : "Check-in & security",
      location: `${slice.origin} · average wait ${TRANSFER.securityWaitMin} min`,
      detail: wantsChecked
        ? `Bag drop first (~${bagDropMin} min padded in) — then ID and boarding pass ready`
        : "Have your ID and boarding pass ready",
      cost: null, kind: "normal", note: null,
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
      detail: roundTrip ? "Round-trip fare — return leg included" : "Flight fare",
      cost: `$${flightCost}`, kind: "main", note: null,
    },
    {
      id: "arrive", icon: "door", time: hm(arrive), label: `Arrive ${title(brief.to)}`,
      location: `Border + baggage ~${TRANSFER.borderMin} min`,
      detail: `We padded ${TRANSFER.borderMin} min for arrivals`, cost: null, kind: "normal", note: null,
    },
    {
      id: "rail",
      icon: "train",
      time: `${hm(addMin(arrive, TRANSFER.borderMin))} → ${hm(doorClose)}`,
      label: ground.leg
        ? `${title(ground.leg.mode)} into the city · ${ground.leg.operator}`
        : "Transport into the city",
      location: `~${ground.minutes} min incl. walk`,
      detail: ground.leg?.frequency ? `Ticket fare · ${ground.leg.frequency}` : "Ticket fare, estimated",
      cost: `$${ground.cost}`,
      kind: "go",
      note:
        ground.alts.length > 0
          ? "Also from the airport: " +
            ground.alts
              .map(
                (a) =>
                  `${a.operator}${a.typicalDurationHours ? ` ~${Math.round(a.typicalDurationHours * 60)}m` : ""}` +
                  `${a.typicalPriceUsd.min != null ? ` from $${Math.round(a.typicalPriceUsd.min)}` : ""}`
              )
              .join(" · ")
          : (ground.leg?.notes ?? null),
    },
  ];

  const costBreakdown: CostLine[] = [
    {
      label: roundTrip
        ? `Round-trip flight (${flightLabel.toLowerCase()} out)`
        : `Flight (${flightLabel.toLowerCase()})`,
      amount: flightCost,
      color: "#146C7E",
    },
    { label: transfer.costLabel, amount: toAirportCost, color: "#FF7A00" },
    { label: ground.leg ? `${title(ground.leg.mode)} into city` : "Transport into city", amount: ground.cost, color: "#2FB4B4" },
  ];
  if (bagFee > 0) {
    costBreakdown.push({
      label: `Checked bag${brief.adults > 1 ? "s" : ""} · ${roundTrip ? "both ways" : "one way"} (est.)`,
      amount: bagFee,
      color: "#8E6BB8",
    });
  }

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
        : `$${Math.abs(under)} over your cap — try the cheapest option or a later date.`,
    legs: [
      { type: "home", label: "Home", time: "" },
      { type: transfer.legType, label: transfer.legLabel, time: `${toAirportMin}m` },
      { type: "flight", label: flightLabel, time: dur(slice.durationMinutes) },
      { type: "train", label: ground.leg ? title(ground.leg.mode) : "Rail", time: `${ground.minutes}m` },
    ],
    fits,
    steps,
    costBreakdown,
    offerId: offer.id,
    airline: { name: offer.owner, iata: offer.ownerIata, logo: offer.ownerLogo },
    bags: { carryOn: offer.bags.carryOn, checked: offer.bags.checked, feeAdded: bagFee },
    etaFromLocation: Boolean(drive),
    etaTrafficAware: Boolean(drive?.trafficAware),
    originAirport: slice.origin,
    departAt: depart.toISOString(),
    preTransferMin: checkinMin + TRANSFER.securityWaitMin + lane.bufferMin,
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
