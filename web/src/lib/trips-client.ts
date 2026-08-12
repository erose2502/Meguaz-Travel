"use client";

import { createClient } from "@/lib/supabase/client";
import type { PlanOption, TripBrief } from "@/lib/plan-types";

// Locked-in plans: Supabase when signed in, localStorage otherwise, so the
// prototype flow works end-to-end before auth is in the user's way.
const LOCAL_KEY = "meguaz_trips";

export type SavedTrip = {
  id: string;
  route: string;
  from: string;
  to: string;
  date: string;
  depart: string;
  leaveHome: string;
  status: string;
  totalUsd: number;
};

export async function saveTrip(brief: TripBrief, option: PlanOption): Promise<SavedTrip> {
  const trip: SavedTrip = {
    id: option.offerId ?? crypto.randomUUID(),
    route: `${brief.from} → ${brief.to}`,
    from: brief.from,
    to: brief.to,
    date: new Date(brief.arriveBy + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    depart: option.steps.find((s) => s.kind === "main")?.time.split(" → ")[0] ?? "",
    leaveHome: option.leaveBy,
    status: "Confirmed",
    totalUsd: option.cost,
  };

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          title: trip.route,
          destination: brief.to,
          start_date: brief.arriveBy,
          budget_usd: brief.budget,
          estimated_total_usd: option.cost,
          cost_lane: option.id === "frugal" ? "saver" : option.id === "calm" ? "comfort" : "balanced",
          status: "booked",
          brief: { ...brief, option: option.id, offerId: option.offerId },
        })
        .select("id")
        .single();
      if (!error && data) trip.id = data.id;
      return trip;
    }
  } catch {
    // fall through to local storage
  }

  const existing: SavedTrip[] = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]");
  localStorage.setItem(LOCAL_KEY, JSON.stringify([trip, ...existing]));
  return trip;
}

export async function loadTrips(): Promise<SavedTrip[]> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("trips")
        .select("id, title, destination, start_date, estimated_total_usd, status, brief")
        .order("created_at", { ascending: false });
      if (data && data.length > 0) {
        return data.map((t) => ({
          id: t.id,
          route: t.title,
          from: (t.brief as { from?: string })?.from ?? "",
          to: t.destination,
          date: t.start_date
            ? new Date(t.start_date + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
            : "Dates TBD",
          depart: "",
          leaveHome: "",
          status: t.status === "booked" ? "Confirmed" : t.status,
          totalUsd: Number(t.estimated_total_usd ?? 0),
        }));
      }
    }
  } catch {
    // fall through
  }
  return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]");
}
