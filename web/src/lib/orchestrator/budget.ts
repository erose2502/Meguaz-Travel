import { env } from "@/lib/env";

// Per-session token budget (MVP: in-memory; move to Supabase counters when scaling).
const usage = new Map<string, number>();

export function recordUsage(sessionId: string, tokens: number) {
  usage.set(sessionId, (usage.get(sessionId) ?? 0) + tokens);
}

export function overBudget(sessionId: string): boolean {
  return (usage.get(sessionId) ?? 0) >= env.maxTokensPerSession;
}

export const BUDGET_EXHAUSTED_REPLY =
  "We've covered a lot in this conversation! To keep things snappy, let's continue in the trip planner — your plan and searches are all saved there.";
