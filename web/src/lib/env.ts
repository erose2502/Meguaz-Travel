// Server-only environment access. Never import this from a client component.
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  get duffelApiKey() {
    return required("DUFFEL_API_KEY");
  },
  get searchApiKey() {
    return required("SEARCHAPI_API_KEY");
  },
  get perplexityApiKey() {
    return required("PERPLEXITY_API_KEY");
  },
  get openaiApiKey() {
    return required("OPENAI_API_KEY");
  },
  // Cheapest chat-capable model; swap via env without a redeploy.
  chatModel: process.env.OPENAI_CHAT_MODEL ?? "gpt-5-nano",
  fallbackModel: process.env.OPENAI_FALLBACK_MODEL ?? "gpt-5-mini",
  get livekit() {
    return {
      url: required("LIVEKIT_URL"),
      apiKey: required("LIVEKIT_API_KEY"),
      apiSecret: required("LIVEKIT_API_SECRET"),
    };
  },
  get supabaseServiceKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // Budget guards
  maxTokensPerSession: Number(process.env.MAX_TOKENS_PER_SESSION ?? 60_000),
  maxHistoryTurns: Number(process.env.MAX_HISTORY_TURNS ?? 8),
};
