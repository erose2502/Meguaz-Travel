import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { admin, adminAvailable } from "@/lib/supabase/admin";
import { guard, failure } from "@/lib/security/guard";
import { captureServerError } from "@/lib/monitoring";

// Destination reviews — the Google/Yelp read experience. Reading needs no
// account; writing is one review per traveller per destination (upsert).

export async function GET(req: NextRequest) {
  const g = await guard(req, "search");
  if (!g.ok) return g.response;

  const code = (new URL(req.url).searchParams.get("code") ?? "").toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reviews")
      .select("id, user_id, rating, title, body, created_at")
      .eq("destination_code", code)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return failure("Could not load reviews");

    // Attach public author identity (name + avatar only) via the service role.
    const authors = new Map<string, { name: string; avatarUrl: string | null }>();
    if (adminAvailable() && data && data.length > 0) {
      const ids = [...new Set(data.map((r) => r.user_id as string))];
      const { data: profiles } = await admin()
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      for (const p of profiles ?? []) {
        authors.set(p.id, { name: p.display_name ?? "Traveller", avatarUrl: p.avatar_url });
      }
    }

    const reviews = (data ?? []).map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      createdAt: r.created_at,
      mine: r.user_id === g.caller.userId,
      author: authors.get(r.user_id as string) ?? { name: "Traveller", avatarUrl: null },
    }));
    const average = reviews.length
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null;
    return NextResponse.json({ reviews, average, count: reviews.length });
  } catch (err) {
    captureServerError("reviews-read", err);
    return failure("Could not load reviews");
  }
}

const writeSchema = z.object({
  code: z.string().regex(/^[A-Za-z]{3}$/),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const g = await guard(req, "search", { maxBodyBytes: 8_192 });
  if (!g.ok) return g.response;
  if (!g.caller.userId) {
    return NextResponse.json({ error: "Sign in to review" }, { status: 401 });
  }

  const parsed = writeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reviews")
      .upsert(
        {
          user_id: g.caller.userId,
          destination_code: parsed.data.code.toUpperCase(),
          rating: parsed.data.rating,
          title: parsed.data.title ?? null,
          body: parsed.data.body ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,destination_code" }
      )
      .select("id")
      .single();
    if (error) return failure("Could not save your review");
    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    captureServerError("reviews-write", err);
    return failure("Could not save your review");
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
    return NextResponse.json({ error: "Invalid review id" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", id)
      .eq("user_id", g.caller.userId);
    if (error) return failure("Could not delete the review");
    return NextResponse.json({ ok: true });
  } catch (err) {
    captureServerError("reviews-delete", err);
    return failure("Could not delete the review");
  }
}
