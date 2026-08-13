import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  capFor,
  checkSpendCap,
  assertSpendCap,
  resetSpendCapMemory,
  spendKey,
  SpendCapError,
} from "@/lib/security/spend-cap";

// The global daily ceiling per provider. Two properties matter most:
//   1. the counter actually stops calls at the cap, and
//   2. when the shared ledger cannot answer, spending stops (fail closed).

describe("capFor", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the built-in default when no env override exists", () => {
    expect(capFor("perplexity")).toBe(150);
  });

  it("honours a per-environment override", () => {
    vi.stubEnv("SPEND_CAP_PERPLEXITY", "7");
    expect(capFor("perplexity")).toBe(7);
  });

  it("falls back to the default when the override is not a number", () => {
    vi.stubEnv("SPEND_CAP_PERPLEXITY", "unlimited");
    expect(capFor("perplexity")).toBe(150);
  });
});

describe("spendKey", () => {
  it("scopes the counter to provider and UTC day", () => {
    expect(spendKey("duffel", new Date("2030-06-15T23:59:59Z"))).toBe("spend:duffel:2030-06-15");
    expect(spendKey("duffel", new Date("2030-06-16T00:00:01Z"))).toBe("spend:duffel:2030-06-16");
  });
});

describe("daily ceiling (in-memory ledger)", () => {
  beforeEach(() => resetSpendCapMemory());
  afterEach(() => vi.unstubAllEnvs());

  it("allows calls under the cap and denies at the cap", async () => {
    vi.stubEnv("SPEND_CAP_SEARCHAPI", "2");
    const day = new Date("2030-06-15T10:00:00Z");
    expect((await checkSpendCap("searchapi", day)).allowed).toBe(true);
    expect((await checkSpendCap("searchapi", day)).allowed).toBe(true);
    expect((await checkSpendCap("searchapi", day)).allowed).toBe(false);
  });

  it("resets at the UTC day boundary", async () => {
    vi.stubEnv("SPEND_CAP_SEARCHAPI", "1");
    expect((await checkSpendCap("searchapi", new Date("2030-06-15T23:00:00Z"))).allowed).toBe(true);
    expect((await checkSpendCap("searchapi", new Date("2030-06-15T23:30:00Z"))).allowed).toBe(false);
    expect((await checkSpendCap("searchapi", new Date("2030-06-16T00:30:00Z"))).allowed).toBe(true);
  });

  it("treats a cap of zero as a kill switch", async () => {
    vi.stubEnv("SPEND_CAP_ELEVENLABS", "0");
    expect((await checkSpendCap("elevenlabs")).allowed).toBe(false);
  });

  it("assertSpendCap throws a typed error at the ceiling", async () => {
    vi.stubEnv("SPEND_CAP_OPENAI", "1");
    const day = new Date("2030-06-15T10:00:00Z");
    await expect(assertSpendCap("openai", day)).resolves.toBeUndefined();
    await expect(assertSpendCap("openai", day)).rejects.toBeInstanceOf(SpendCapError);
  });
});

describe("fail closed with a shared ledger", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/admin");
    vi.resetModules();
  });

  async function importWithLedger(rpc: () => Promise<unknown>) {
    vi.resetModules();
    vi.doMock("@/lib/supabase/admin", () => ({
      adminAvailable: () => true,
      admin: () => ({ rpc }),
    }));
    return import("@/lib/security/spend-cap");
  }

  it("denies when the ledger throws — unknown is not free", async () => {
    const mod = await importWithLedger(async () => {
      throw new Error("ledger unreachable");
    });
    expect((await mod.checkSpendCap("duffel")).allowed).toBe(false);
    await expect(mod.assertSpendCap("duffel")).rejects.toBeInstanceOf(mod.SpendCapError);
  });

  it("denies when the ledger returns an error row", async () => {
    const mod = await importWithLedger(async () => ({ data: null, error: { message: "boom" } }));
    expect((await mod.checkSpendCap("duffel")).allowed).toBe(false);
  });

  it("passes the ledger's verdict through when it answers", async () => {
    const mod = await importWithLedger(async () => ({
      data: { allowed: true, hits: 3, limit: 400, reset_at: "2030-06-16T00:00:00Z" },
      error: null,
    }));
    const res = await mod.checkSpendCap("duffel");
    expect(res.allowed).toBe(true);
    expect(res.used).toBe(3);
  });
});
