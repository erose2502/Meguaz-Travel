import { describe, it, expect, afterEach, vi } from "vitest";
import { recordUsage, overBudget } from "@/lib/orchestrator/budget";

// LLM spend ceiling per caller. Without Supabase configured (as in tests) the
// in-memory window applies — the same arithmetic the shared ledger mirrors.
// Default ceiling: 60,000 tokens per rolling 24h window.

const CAP = 60_000;

describe("per-caller token budget", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("lets an unknown caller through", async () => {
    expect(await overBudget("caller-fresh")).toBe(false);
  });

  it("stays open up to the cap and closes at it", async () => {
    const key = "caller-edge";
    await recordUsage(key, CAP - 1);
    expect(await overBudget(key)).toBe(false);
    await recordUsage(key, 1);
    expect(await overBudget(key)).toBe(true);
  });

  it("accumulates usage across calls", async () => {
    const key = "caller-accumulate";
    for (let i = 0; i < 6; i++) await recordUsage(key, 10_000);
    expect(await overBudget(key)).toBe(true);
  });

  it("ignores zero and negative usage", async () => {
    const key = "caller-zero";
    await recordUsage(key, 0);
    await recordUsage(key, -500);
    expect(await overBudget(key)).toBe(false);
  });

  it("resets after the 24h window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    const key = "caller-window";
    await recordUsage(key, CAP);
    expect(await overBudget(key)).toBe(true);

    vi.setSystemTime(new Date("2030-01-02T00:00:01Z"));
    expect(await overBudget(key)).toBe(false);
  });
});
