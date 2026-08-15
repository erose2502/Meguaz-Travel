import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { guard, failure } from "@/lib/security/guard";

// Travel preferences the planner remembers between trips.
//
// Row-level security scopes every read and write to the signed-in user, so the
// user id is taken from the session and never from the request body.

const preferences = z.object({
  displayName: z.string().min(1).max(80).nullish(),
  homeAirport: z.string().regex(/^[A-Za-z]{3}$/).nullish(),
  travelStyle: z.enum(["saver", "balanced", "comfort"]).nullish(),
  preferredCabin: z.enum(["economy", "premium_economy", "business", "first"]).nullish(),
  defaultBudgetUsd: z.number().min(50).max(100000).nullish(),
  airportBufferMin: z.number().int().min(0).max(600).nullish(),
  preferredLanguage: z.string().max(40).nullish(),
});

// Columns added by migration 0003. Until it is applied the write is retried
// without them rather than failing the whole save.
const OPTIONAL_COLUMNS = [
  "preferred_cabin",
  "default_budget_usd",
  "airport_buffer_min",
  "preferred_language",
  "updated_at",
] as const;

function toRow(input: z.infer<typeof preferences>) {
  const row: Record<string, unknown> = {};
  if (input.displayName !== undefined) row.display_name = input.displayName;
  if (input.homeAirport !== undefined) {
    row.home_airport = input.homeAirport ? input.homeAirport.toUpperCase() : null;
  }
  if (input.travelStyle !== undefined) row.travel_style = input.travelStyle;
  if (input.preferredCabin !== undefined) row.preferred_cabin = input.preferredCabin;
  if (input.defaultBudgetUsd !== undefined) row.default_budget_usd = input.defaultBudgetUsd;
  if (input.airportBufferMin !== undefined) row.airport_buffer_min = input.airportBufferMin;
  if (input.preferredLanguage !== undefined) row.preferred_language = input.preferredLanguage;
  row.updated_at = new Date().toISOString();
  return row;
}

export async function GET(req: NextRequest) {
  const g = await guard(req, "search", { maxBodyBytes: 512 });
  if (!g.ok) return g.response;
  if (!g.caller.userId) return NextResponse.json({ profile: null });

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", g.caller.userId)
      .maybeSingle();
    if (error) return failure("Could not load your preferences");
    return NextResponse.json({ profile: data ?? null });
  } catch (err) {
    console.error("profile read error", err instanceof Error ? err.message : "unknown");
    return failure("Could not load your preferences");
  }
}

export async function PUT(req: NextRequest) {
  const g = await guard(req, "search", { maxBodyBytes: 2_048 });
  if (!g.ok) return g.response;
  if (!g.caller.userId) {
    return NextResponse.json({ error: "Sign in to save preferences" }, { status: 401 });
  }

  const parsed = preferences.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const full = { id: g.caller.userId, ...toRow(parsed.data) };

    let { data, error } = await supabase
      .from("profiles")
      .upsert(full, { onConflict: "id" })
      .select("*")
      .maybeSingle();

    // 42703 = undefined_column: migration 0003 has not been applied yet.
    if (error && error.code === "42703") {
      const base: Record<string, unknown> = { ...full };
      for (const column of OPTIONAL_COLUMNS) delete base[column];
      ({ data, error } = await supabase
        .from("profiles")
        .upsert(base, { onConflict: "id" })
        .select("*")
        .maybeSingle());
      if (!error) {
        return NextResponse.json({ profile: data ?? null, partial: true });
      }
    }

    if (error) return failure("Could not save your preferences");
    return NextResponse.json({ profile: data ?? null });
  } catch (err) {
    console.error("profile write error", err instanceof Error ? err.message : "unknown");
    return failure("Could not save your preferences");
  }
}
