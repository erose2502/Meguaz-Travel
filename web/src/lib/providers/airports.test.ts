import { describe, it, expect } from "vitest";
import { AIRPORTS, distanceKm, nearestAirports } from "@/lib/providers/airports";

// The airport-distance ranking picks which airport a traveller "actually leaves
// from". Getting it wrong is exactly how a plan once priced a $6,373 rideshare
// from Pennsylvania to SFO, so the ranking is pinned here.

const JFK = { lat: 40.64, lng: -73.78 };
const LHR = { lat: 51.47, lng: -0.45 };

describe("distanceKm", () => {
  it("returns zero for identical coordinates", () => {
    expect(distanceKm(JFK, JFK)).toBe(0);
  });

  it("is symmetric", () => {
    expect(distanceKm(JFK, LHR)).toBe(distanceKm(LHR, JFK));
  });

  it("matches the known JFK→LHR great-circle distance (~5,540 km)", () => {
    const d = distanceKm(JFK, LHR);
    expect(d).toBeGreaterThan(5400);
    expect(d).toBeLessThan(5700);
  });
});

describe("nearestAirports", () => {
  // Lancaster, Pennsylvania — the real-world case behind the plausibility guard.
  const lancasterPA = { lat: 40.04, lng: -76.31 };

  it("puts Philadelphia first for a traveller in south-east Pennsylvania", () => {
    const nearest = nearestAirports(lancasterPA, 4);
    expect(nearest[0].iata).toBe("PHL");
  });

  it("never offers a cross-country airport as a nearby option", () => {
    const nearest = nearestAirports(lancasterPA, 4);
    expect(nearest.map((a) => a.iata)).not.toContain("SFO");
    for (const airport of nearest) {
      expect(airport.distanceKm).toBeLessThan(300);
    }
  });

  it("returns airports sorted by ascending distance", () => {
    const nearest = nearestAirports(lancasterPA, 8);
    const distances = nearest.map((a) => a.distanceKm);
    expect(distances).toEqual([...distances].sort((x, y) => x - y));
  });

  it("respects the limit and never exceeds the table size", () => {
    expect(nearestAirports(lancasterPA, 3)).toHaveLength(3);
    expect(nearestAirports(lancasterPA, 10_000).length).toBe(AIRPORTS.length);
  });
});
