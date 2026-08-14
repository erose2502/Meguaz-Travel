import { describe, it, expect } from "vitest";
import { buildOption, calmScore, shiftDate, dedupeById, stayEstimate } from "@/lib/plan-solver";
import type { FlightOffer } from "@/lib/providers/duffel";
import type { TripBrief } from "@/lib/plan-types";

// The solver's arithmetic is where a silent bug costs a user real money
// (a mispriced total, a "leave home by" that misses the flight), so the pure
// maths is pinned down here without touching Duffel.

const slice = (over: Partial<FlightOffer["slices"][0]> = {}) => ({
  origin: "SFO",
  destination: "JFK",
  departingAt: "2030-09-01T09:00:00",
  arrivingAt: "2030-09-01T17:30:00",
  durationMinutes: 330,
  segments: 1,
  carriers: ["Meguaz Air"],
  ...over,
});

const offer = (over: Partial<FlightOffer> = {}): FlightOffer => ({
  id: "off_1",
  totalAmount: "500",
  totalCurrency: "USD",
  owner: "Meguaz Air",
  bags: { carryOn: 1, checked: 0 },
  slices: [slice()],
  ...over,
});

const brief = (over: Partial<TripBrief> = {}): TripBrief => ({
  from: "san francisco",
  to: "new york",
  arriveBy: "2030-09-01",
  budget: 900,
  adults: 1,
  ...over,
});

const drive = { minutes: 20, cost: 25, trafficAware: true };
const ground = { leg: null, alts: [], minutes: 30, cost: 20 };

describe("buildOption cost maths", () => {
  it("totals flight + drive + ground exactly", () => {
    const opt = buildOption("frugal", "Cheapest overall", "t", offer(), brief(), "money", drive, ground);
    expect(opt.cost).toBe(500 + 25 + 20);
  });

  it("cost breakdown lines sum to the headline total", () => {
    const opt = buildOption("balanced", "Best overall", "t", offer(), brief(), "balanced", drive, ground);
    const sum = opt.costBreakdown.reduce((acc, line) => acc + line.amount, 0);
    expect(sum).toBe(opt.cost);
  });

  it("prices an estimated checked-bag fee when wanted but not included", () => {
    const opt = buildOption(
      "frugal", "Cheapest overall", "t", offer(), brief({ checkedBag: true }), "money", drive, ground);
    expect(opt.cost).toBe(500 + 25 + 20 + 35); // one-way fare → one $35 fee
    expect(opt.bags.feeAdded).toBe(35);
    const sum = opt.costBreakdown.reduce((acc, line) => acc + line.amount, 0);
    expect(sum).toBe(opt.cost);
  });

  it("adds no bag fee when the fare already includes a checked bag", () => {
    const withBag = offer({ bags: { carryOn: 1, checked: 1 } });
    const opt = buildOption(
      "frugal", "Cheapest overall", "t", withBag, brief({ checkedBag: true }), "money", drive, ground);
    expect(opt.cost).toBe(500 + 25 + 20);
    expect(opt.bags).toEqual({ carryOn: 1, checked: 1, feeAdded: 0 });
  });

  it("falls back to static transfer estimates when no live drive exists", () => {
    const opt = buildOption("frugal", "Cheapest overall", "t", offer(), brief(), "money", null, ground);
    // Static rideshare estimate is $34 (TRANSFER.toAirportCost).
    expect(opt.cost).toBe(500 + 34 + 20);
    expect(opt.etaFromLocation).toBe(false);
  });

  it("reports the under-budget margin in whole dollars", () => {
    const opt = buildOption("frugal", "Cheapest overall", "t", offer(), brief({ budget: 900 }), "money", drive, ground);
    expect(opt.tradeoff).toContain("$355 under budget");
  });

  it("reports the over-budget overshoot rather than a negative number", () => {
    const opt = buildOption("frugal", "Cheapest overall", "t", offer(), brief({ budget: 500 }), "money", drive, ground);
    expect(opt.tradeoff).toContain("$45 over your cap");
    expect(opt.tradeoff).not.toContain("-");
  });

  it("computes leave-by as departure minus drive, check-in, security and lane buffer", () => {
    // 09:00 departure − (20 drive + 13 check-in + 12 security + 25 frugal buffer) = 07:50
    const opt = buildOption("frugal", "Cheapest overall", "t", offer(), brief(), "money", drive, ground);
    expect(opt.leaveBy).toBe("07:50");
    expect(opt.preTransferMin).toBe(13 + 12 + 25);
  });

  it("computes door-to-door from leave-home to arrival plus border and transit", () => {
    // 07:50 → 17:30 + 45 border + 30 transit = 18:45 ⇒ 10h 55m
    const opt = buildOption("frugal", "Cheapest overall", "t", offer(), brief(), "money", drive, ground);
    expect(opt.doorToDoor).toBe("10h 55m");
  });

  it("labels the fare as round-trip when a return slice is priced", () => {
    const rt = offer({
      slices: [slice(), slice({ origin: "JFK", destination: "SFO" })],
    });
    const opt = buildOption("frugal", "Cheapest overall", "t", rt, brief({ nights: 5 }), "money", drive, ground);
    expect(opt.costBreakdown[0].label).toMatch(/^Round-trip flight/);
    const flightStep = opt.steps.find((s) => s.id === "flight");
    expect(flightStep?.detail).toContain("return leg included");
  });

  it("keeps one-way labels when only the outbound is priced", () => {
    const opt = buildOption("frugal", "Cheapest overall", "t", offer(), brief(), "money", drive, ground);
    expect(opt.costBreakdown[0].label).toMatch(/^Flight \(/);
  });
});

describe("airport transfer preference", () => {
  it("prices drive-and-park as parking days, not a rideshare fare", () => {
    // 5 nights → 6 parking days × $18 = $108
    const opt = buildOption(
      "frugal", "t", "t",
      offer(),
      brief({ nights: 5, airportTransfer: "drive" }),
      "money", drive, ground,
    );
    expect(opt.cost).toBe(500 + 108 + 20);
    expect(opt.costBreakdown[1].label).toContain("parking");
  });

  it("prices a drop-off at zero transfer cost", () => {
    const opt = buildOption(
      "frugal", "t", "t",
      offer(),
      brief({ airportTransfer: "dropoff" }),
      "money", drive, ground,
    );
    expect(opt.cost).toBe(500 + 0 + 20);
  });

  it("makes transit slower but cheap, shifting leave-by earlier", () => {
    const opt = buildOption(
      "frugal", "t", "t",
      offer(),
      brief({ airportTransfer: "transit" }),
      "money", drive, ground,
    );
    // 20-min drive × 1.55 ≈ 31 min; flat $14 ticket
    expect(opt.cost).toBe(500 + 14 + 20);
    // 09:00 − (31 + 13 + 12 + 25) = 07:39
    expect(opt.leaveBy).toBe("07:39");
  });

  it("defaults to the rideshare model when no preference is given", () => {
    const opt = buildOption("frugal", "t", "t", offer(), brief(), "money", drive, ground);
    expect(opt.costBreakdown[1].label).toBe("Rideshare to airport");
  });
});

describe("calmScore", () => {
  it("ranks a nonstop above a one-stop of similar length", () => {
    const nonstop = offer({ slices: [slice({ segments: 1, durationMinutes: 330 })] });
    const oneStop = offer({ slices: [slice({ segments: 2, durationMinutes: 330 })] });
    expect(calmScore(nonstop)).toBeLessThan(calmScore(oneStop));
  });

  it("penalises pre-8am departures", () => {
    const civil = offer({ slices: [slice({ departingAt: "2030-09-01T09:00:00" })] });
    const dawn = offer({ slices: [slice({ departingAt: "2030-09-01T05:00:00" })] });
    expect(calmScore(civil)).toBeLessThan(calmScore(dawn));
  });
});

describe("shiftDate", () => {
  it("moves backward across a month boundary", () => {
    expect(shiftDate("2030-09-01", -1)).toBe("2030-08-31");
  });

  it("computes the return date from a trip length in nights", () => {
    expect(shiftDate("2030-09-01", 5)).toBe("2030-09-06");
  });

  it("handles leap years", () => {
    expect(shiftDate("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("stayEstimate", () => {
  const listing = (pricePerNight: number | null) => ({
    id: "x",
    name: "Listing",
    rating: null,
    pricePerNight,
    totalPrice: null,
    currency: "USD",
    photoUrl: null,
    url: null,
    bookable: false as const,
  });

  it("uses the median nightly price so one luxury outlier cannot skew it", () => {
    const stays = {
      kind: "airbnb" as const,
      bookableInApp: false as const,
      results: [listing(80), listing(90), listing(1000)],
    };
    expect(stayEstimate(stays, 5)).toEqual({ nightlyUsd: 90, nights: 5, totalUsd: 450, kind: "airbnb" });
  });

  it("returns null when nothing carries a price", () => {
    const stays = { kind: "airbnb" as const, bookableInApp: false as const, results: [listing(null)] };
    expect(stayEstimate(stays, 5)).toBeNull();
    expect(stayEstimate(null, 5)).toBeNull();
  });
});

describe("dedupeById", () => {
  it("keeps the first occurrence of each offer id", () => {
    const a = offer({ id: "a", totalAmount: "100" });
    const aDupe = offer({ id: "a", totalAmount: "999" });
    const b = offer({ id: "b" });
    const out = dedupeById([a, aDupe, b]);
    expect(out).toHaveLength(2);
    expect(out[0].totalAmount).toBe("100");
  });
});
