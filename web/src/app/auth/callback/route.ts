import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { admin, adminAvailable } from "@/lib/supabase/admin";
import { publicOrigin } from "@/lib/public-origin";
import { captureServerError } from "@/lib/monitoring";

// OAuth landing: Supabase redirects here with ?code= after Google consent.
// Exchanging the code sets the httpOnly session cookies; then the user is
// returned to wherever they started (`next` was sanitized when the flow began,
// but is re-checked here because this URL is also attacker-constructable).
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const pub = publicOrigin(request);
  const code = url.searchParams.get("code");
  const next = sanitizeNext(url.searchParams.get("next"), pub);

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // OAuth providers put the name in full_name/name, but the signup
        // trigger only copies display_name — without this backfill, Google
        // users are invisible in community search. Never blocks the login.
        try {
          const { data: userData } = await supabase.auth.getUser();
          const u = userData?.user;
          if (u && adminAvailable()) {
            const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
            const derived = String(
              meta.display_name ?? meta.full_name ?? meta.name ?? u.email?.split("@")[0] ?? ""
            ).trim();
            if (derived) {
              const { data: prof } = await admin()
                .from("profiles")
                .select("display_name")
                .eq("id", u.id)
                .maybeSingle();
              if (!prof?.display_name) {
                await admin()
                  .from("profiles")
                  .upsert({ id: u.id, display_name: derived }, { onConflict: "id" });
              }
            }
          }
        } catch (err) {
          captureServerError("auth-callback-profile", err);
        }
        return NextResponse.redirect(resolveNext(next, pub));
      }
      captureServerError("auth-callback", error);
    } catch (err) {
      captureServerError("auth-callback", err);
    }
  }
  return NextResponse.redirect(new URL("/login?error=oauth", pub));
}

function sanitizeNext(raw: string | null, reqUrl: URL): string {
  if (!raw) return "/";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const u = new URL(raw);
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    if ((u.protocol === "http:" || u.protocol === "https:") && (local || u.host === reqUrl.host)) {
      return u.toString();
    }
  } catch {
    // fall through
  }
  return "/";
}

function resolveNext(next: string, reqUrl: URL): URL {
  return next.startsWith("/") ? new URL(next, reqUrl.origin) : new URL(next);
}
