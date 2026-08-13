// Server-only environment access. The `server-only` import turns an accidental
// client import into a build error instead of a leaked key at runtime.
import "server-only";

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
  get youtubeApiKey() {
    return required("YOUTUBE_API_KEY");
  },
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // Meta (WhatsApp Cloud API + Conversions API). All optional — the features
  // no-op when unset, so a deploy without credentials stays safe.
  get metaWaToken() {
    return process.env.META_WA_TOKEN ?? "";
  },
  get metaWaPhoneId() {
    return process.env.META_WA_PHONE_ID ?? "";
  },
  // hello_world is the only pre-approved template on a fresh Meta app; switch
  // to the real booking template via env once Meta approves it.
  get metaWaTemplate() {
    return process.env.META_WA_TEMPLATE ?? "hello_world";
  },
  get metaPixelId() {
    return process.env.META_PIXEL_ID ?? "";
  },
  get metaCapiToken() {
    return process.env.META_CAPI_TOKEN ?? "";
  },
  // Budget guards
  maxTokensPerSession: Number(process.env.MAX_TOKENS_PER_SESSION ?? 60_000),
  maxHistoryTurns: Number(process.env.MAX_HISTORY_TURNS ?? 8),
};
