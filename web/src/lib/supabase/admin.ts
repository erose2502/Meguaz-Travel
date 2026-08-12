import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Service-role client. SERVER ONLY — this key bypasses RLS, so it must never be
// imported into a client component or leak into a response body.
let _admin: SupabaseClient | null = null;

export function admin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}

// True when the service role is configured; lets callers fall back to in-memory
// behaviour in local dev rather than hard-failing.
export function adminAvailable(): boolean {
  return Boolean(env.supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
