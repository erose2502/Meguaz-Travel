import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { admin, adminAvailable } from "@/lib/supabase/admin";
import { guard, failure } from "@/lib/security/guard";
import { captureServerError } from "@/lib/monitoring";

// Community: find travellers by name and follow them. Search runs through the
// service role but returns ONLY public-safe fields (id, name, avatar) — never
// emails, airports or budgets.

export type CommunityUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
  following: boolean;
};

export type CommunityFeedItem = {
  id: string;
  destinationCode: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
  author: { name: string; avatarUrl: string | null };
};

export async function GET(req: NextRequest) {
  const g = await guard(req, "search");
  if (!g.ok) return g.response;
  if (!g.caller.userId) {
    return NextResponse.json({ error: "Sign in to find travellers" }, { status: 401 });
  }
  if (!adminAvailable()) return NextResponse.json({ users: [] });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);

  try {
    const supabase = await createClient();
    const { data: myFollows } = await supabase
      .from("follows")
      .select("followee_id")
      .eq("follower_id", g.caller.userId);
    const followed = new Set((myFollows ?? []).map((f) => f.followee_id as string));

    type Row = { id: string; display_name: string | null; avatar_url: string | null };
    const toUser = (r: Row): CommunityUser => ({
      id: r.id,
      // Backfilled going forward, but never let a null name hide someone.
      name: r.display_name ?? "Traveller",
      avatarUrl: r.avatar_url,
      following: followed.has(r.id),
    });

    if (q) {
      const { data } = await admin()
        .from("profiles")
        .select("id, display_name, avatar_url")
        .ilike("display_name", `%${q}%`)
        .neq("id", g.caller.userId)
        .limit(20);
      return NextResponse.json({ users: (data ?? []).map(toUser) });
    }

    // No query → your circle, plus fresh faces and the latest reviews, so
    // the tab has something alive in it before anyone types a name.
    let users: CommunityUser[] = [];
    if (followed.size > 0) {
      const { data } = await admin()
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", [...followed]);
      users = (data ?? []).map(toUser);
    }

    const { data: newest } = await admin()
      .from("profiles")
      .select("id, display_name, avatar_url")
      .neq("id", g.caller.userId)
      .order("created_at", { ascending: false })
      .limit(12);
    const discover = (newest ?? []).map(toUser);

    const { data: reviews } = await admin()
      .from("reviews")
      .select("id, user_id, destination_code, rating, title, body, created_at")
      .order("created_at", { ascending: false })
      .limit(12);
    const authorIds = [...new Set((reviews ?? []).map((r) => r.user_id as string))];
    const authors = new Map<string, Row>();
    if (authorIds.length > 0) {
      const { data: profs } = await admin()
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", authorIds);
      for (const p of profs ?? []) authors.set(p.id, p);
    }
    const feed: CommunityFeedItem[] = (reviews ?? []).map((r) => {
      const a = authors.get(r.user_id as string);
      return {
        id: r.id as string,
        destinationCode: r.destination_code as string,
        rating: r.rating as number,
        title: (r.title as string) ?? null,
        body: (r.body as string) ?? null,
        createdAt: r.created_at as string,
        author: { name: a?.display_name ?? "Traveller", avatarUrl: a?.avatar_url ?? null },
      };
    });

    return NextResponse.json({ users, discover, feed });
  } catch (err) {
    captureServerError("community-search", err);
    return failure("Community is unavailable right now");
  }
}

const actionSchema = z.object({
  action: z.enum(["follow", "unfollow"]),
  userId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const g = await guard(req, "search", { maxBodyBytes: 1_024 });
  if (!g.ok) return g.response;
  if (!g.caller.userId) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (parsed.data.userId === g.caller.userId) {
    return NextResponse.json({ error: "That's you" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    if (parsed.data.action === "follow") {
      const { error } = await supabase
        .from("follows")
        .upsert(
          { follower_id: g.caller.userId, followee_id: parsed.data.userId },
          { onConflict: "follower_id,followee_id" }
        );
      if (error) return failure("Could not follow");
    } else {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", g.caller.userId)
        .eq("followee_id", parsed.data.userId);
      if (error) return failure("Could not unfollow");
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    captureServerError("community-follow", err);
    return failure("Community is unavailable right now");
  }
}
