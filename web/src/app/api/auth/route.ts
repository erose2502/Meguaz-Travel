import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { guard, failure } from "@/lib/security/guard";

// Session endpoints for the planner UI.
//
// Auth runs server-side so the session lives in an httpOnly cookie rather than
// in reachable browser storage, and so no Supabase key ships in the client
// bundle. The browser only ever sees {user} or {user: null}.

const credentials = z.object({
  action: z.enum(["signin", "signup", "signout"]),
  email: z.string().email().max(320).optional(),
  password: z.string().min(8).max(128).optional(),
  displayName: z.string().min(1).max(80).optional(),
});

type PublicUser = { id: string; email: string | null; displayName: string | null };

function shape(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null): PublicUser | null {
  if (!user) return null;
  const name = user.user_metadata?.display_name;
  return {
    id: user.id,
    email: user.email ?? null,
    displayName: typeof name === "string" ? name : null,
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return NextResponse.json({ user: shape(user) });
  } catch {
    return NextResponse.json({ user: null });
  }
}

export async function POST(req: NextRequest) {
  // Rate limited so the sign-in endpoint cannot be used for credential stuffing.
  const g = await guard(req, "search", { maxBodyBytes: 2_048 });
  if (!g.ok) return g.response;

  const parsed = credentials.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { action, email, password, displayName } = parsed.data;

  try {
    const supabase = await createClient();

    if (action === "signout") {
      await supabase.auth.signOut();
      return NextResponse.json({ user: null });
    }

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (action === "signin") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Deliberately vague: distinguishing "no such user" from "wrong
        // password" tells an attacker which emails are registered.
        return NextResponse.json({ error: "Email or password is incorrect" }, { status: 401 });
      }
      return NextResponse.json({ user: shape(data.user) });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: displayName ? { display_name: displayName } : undefined },
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // With email confirmation switched on, sign-up returns a user but no
    // session until they click the link. Say so instead of pretending.
    if (!data.session) {
      return NextResponse.json({ user: null, confirmationRequired: true });
    }

    if (data.user) {
      await supabase
        .from("profiles")
        .upsert({ id: data.user.id, display_name: displayName ?? null }, { onConflict: "id" });
    }
    return NextResponse.json({ user: shape(data.user) });
  } catch (err) {
    console.error("auth error", err instanceof Error ? err.message : "unknown");
    return failure("Authentication is unavailable");
  }
}
