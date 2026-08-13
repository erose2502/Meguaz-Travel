import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { guard } from "@/lib/security/guard";
import { captureServerError } from "@/lib/monitoring";

// Starts the Google OAuth flow (provider configured in Supabase).
//
// The browser navigates here, we mint the provider URL server-side (the PKCE
// verifier lands in an httpOnly cookie, consistent with the rest of auth), and
// 302 to Google. Google → Supabase → /auth/callback finishes the exchange.
//
// `next` is where the user lands afterwards. It is attacker-suppliable, so it
// is only honoured as a relative path, this host, or localhost (dev SPA).
export async function GET(req: NextRequest) {
  const g = await guard(req, "search");
  if (!g.ok) return g.response;

  const url = new URL(req.url);
  const next = sanitizeNext(url.searchParams.get("next"), url);

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${url.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data?.url) {
      captureServerError("auth-google", error ?? new Error("no provider url"));
      return NextResponse.redirect(`${url.origin}/login?error=google`);
    }
    return NextResponse.redirect(data.url);
  } catch (err) {
    captureServerError("auth-google", err);
    return NextResponse.redirect(`${url.origin}/login?error=google`);
  }
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
