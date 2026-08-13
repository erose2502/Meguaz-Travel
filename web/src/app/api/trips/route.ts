import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { guard, failure } from "@/lib/security/guard";

// A traveller's locked-in plans. Row-level security scopes every read and
// write to the signed-in user, so the user id comes from the session cookie
// and is never accepted from the request body.

const tripInput = z.object({
  title: z.string().min(1).max(160),
  destination: z.string().min(1).max(120),
  origin: z.string().min(1).max(120),
  arriveBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(9),
  budgetUsd: z.number().min(0).max(1_000_000),
  estimatedTotalUsd: z.number().min(0).max(1_000_000),
  costLane: z.enum(["saver", "balanced", "comfort"]),
  brief: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  const g = await guard(req, "search", { maxBodyBytes: 512 });
  if (!g.ok) return g.response;
  if (!g.caller.userId) return NextResponse.json({ trips: [] });

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("user_id", g.caller.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return failure("Could not load your trips");
    return NextResponse.json({ trips: data ?? [] });
  } catch (err) {
    console.error("trips read error", err instanceof Error ? err.message : "unknown");
    return failure("Could not load your trips");
  }
}

export async function DELETE(req: NextRequest) {
  const g = await guard(req, "search", { maxBodyBytes: 512 });
  if (!g.ok) return g.response;
  if (!g.caller.userId) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid trip id" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    // RLS scopes the delete to the owner; a foreign id deletes zero rows.
    const { error, count } = await supabase
      .from("trips")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", g.caller.userId);
    if (error) return failure("Could not delete this trip");
    if (!count) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("trip delete error", err instanceof Error ? err.message : "unknown");
    return failure("Could not delete this trip");
  }
}

export async function POST(req: NextRequest) {
  const g = await guard(req, "search", { maxBodyBytes: 16_384 });
  if (!g.ok) return g.response;
  if (!g.caller.userId) {
    return NextResponse.json({ error: "Sign in to save this trip" }, { status: 401 });
  }

  const parsed = tripInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid trip" }, { status: 400 });
  }
  const t = parsed.data;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("trips")
      .insert({
        user_id: g.caller.userId,
        title: t.title,
        destination: t.destination,
        start_date: t.arriveBy,
        party_adults: t.adults,
        budget_usd: t.budgetUsd,
        estimated_total_usd: t.estimatedTotalUsd,
        cost_lane: t.costLane,
        status: "booked",
        brief: { ...(t.brief ?? {}), origin: t.origin },
      })
      .select("*")
      .single();

    if (error) return failure("Could not save this trip");
    return NextResponse.json({ trip: data });
  } catch (err) {
    console.error("trip write error", err instanceof Error ? err.message : "unknown");
    return failure("Could not save this trip");
  }
}
