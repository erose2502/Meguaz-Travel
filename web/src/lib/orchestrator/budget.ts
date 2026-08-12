import { env } from "@/lib/env";
import { admin, adminAvailable } from "@/lib/supabase/admin";

// LLM spend ceiling, keyed by the SERVER-resolved caller (user id or hashed IP).
// It was previously keyed by a client-supplied session id, which any caller
// could rotate to reset their own budget — the guard has to sit somewhere the
// client cannot reach.

const WINDOW_SECONDS = 24 * 60 * 60;
const memory = new Map<string, { tokens: number; windowStart: number }>();

export async function recordUsage(callerKey: string, tokens: number): Promise<void> {
  if (tokens <= 0) return;

  if (adminAvailable()) {
    try {
      await admin().rpc("add_token_usage", {
        p_key: callerKey,
        p_tokens: tokens,
        p_window_seconds: WINDOW_SECONDS,
      });
      return;
    } catch {
      // Fall through to memory.
    }
  }

  const now = Date.now();
  const entry = memory.get(callerKey);
  if (!entry || now - entry.windowStart >= WINDOW_SECONDS * 1000) {
    memory.set(callerKey, { tokens, windowStart: now });
  } else {
    entry.tokens += tokens;
  }
}

export async function overBudget(callerKey: string): Promise<boolean> {
  if (adminAvailable()) {
    try {
      const { data, error } = await admin().rpc("get_token_usage", {
        p_key: callerKey,
        p_window_seconds: WINDOW_SECONDS,
      });
      if (!error && data != null) return Number(data) >= env.maxTokensPerSession;
    } catch {
      // Fall through to memory.
    }
  }

  const entry = memory.get(callerKey);
  if (!entry) return false;
  if (Date.now() - entry.windowStart >= WINDOW_SECONDS * 1000) {
    memory.delete(callerKey);
    return false;
  }
  return entry.tokens >= env.maxTokensPerSession;
}

export const BUDGET_EXHAUSTED_REPLY =
  "We've covered a lot today! To keep things snappy, let's continue in the trip planner — your plan and searches are all saved there.";
