# Meguaz — Backend & Model-Routing Architecture

## Principles

1. **UI-first, LLM-last.** Structured forms and mode shortcuts never touch an LLM.
   The model router only runs for natural-language surfaces (chat, voice, NL search).
2. **One brain, many surfaces.** Text chat, NL search, and the LiveKit voice agent all
   call the same `orchestrator` with the same tool registry. No duplicated prompts.
3. **Cheapest model that can do the job**, escalate only on structured-output failure.
4. **Cache everything that isn't a live price.** Destination content, ground-transport
   route intel, airport lookups.

## Provider map

| Concern | Provider | Mode | Key env var |
|---|---|---|---|
| Flights (search + book) | Duffel API v2 | In-app booking | `DUFFEL_API_KEY` (test) |
| Stays — home-style | Airbnb via SearchApi.io | Search + deep link out | `SEARCHAPI_API_KEY` |
| Stays — resort/hotel | Duffel Stays | In-app booking | `DUFFEL_API_KEY` |
| Ground transport intel | Perplexity `sonar` | Search + operator link | `PERPLEXITY_API_KEY` |
| Chat / NL parsing / plan drafting | OpenAI nano tier | LLM | `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL` |
| Voice agent | LiveKit Cloud + Agents | Realtime voice | `LIVEKIT_*` |
| Auth, users, trips, cache | Supabase | Postgres + RLS | `SUPABASE_*` |
| Destination card videos | Higgsfield | Offline content pipeline | CLI auth |

## Model routing (the cost story)

```
User input
  │
  ├─ Structured UI action (form/chip tap) ─────────────► provider API directly. 0 tokens.
  │
  └─ Natural language (chat / voice / NL search)
       │
       ├─ Tier 0: deterministic pre-router (regex + UI context)
       │    "flights to X", date-shaped strings, mode already selected
       │    → skip classification, call provider. 0 tokens.
       │
       ├─ Tier 1: OPENAI_CHAT_MODEL (nano tier, e.g. gpt-5-nano)
       │    single call w/ function-calling over the tool registry:
       │    parse_trip_brief · search_flights · search_stays · search_ground · chat_reply
       │    History truncated to last 8 turns + rolling summary. Hard cap
       │    MAX_TOKENS_PER_SESSION; on breach → polite "let's continue in the planner".
       │
       ├─ Tier 2: Perplexity sonar — ONLY inside search_ground, never for chit-chat.
       │    Response cached in Supabase `route_cache` keyed (origin,dest,month), TTL 24h.
       │
       └─ Escalation: if nano fails schema validation twice → one retry on
            OPENAI_FALLBACK_MODEL (mini tier). Never silently loop.
```

**Why this stays cheap:** the expensive-looking features (personalized plan, ground
intel, destination content) are either single bounded calls, cached shared content, or
deterministic code. There is no agentic multi-step loop in the request path; the
"agent" is a router with one tool round-trip.

## Request path (web)

```
Next.js App Router (web/)
  src/app/api/chat/route.ts        → orchestrator (streaming)
  src/app/api/flights/search       → lib/providers/duffel.ts
  src/app/api/stays/search         → lib/providers/stays.ts   (conditional: airbnb|resort)
  src/app/api/ground/search        → lib/providers/ground.ts  (perplexity + cache)
  src/app/api/livekit/token        → issues room token for voice agent
  src/lib/orchestrator/            → router, tool registry, budget guard
```

All provider keys are **server-only** (no `NEXT_PUBLIC_` except Supabase URL + anon key
and LiveKit URL). The browser never talks to Duffel/OpenAI/Perplexity directly.

## Booking state machine (per plan slot)

```
pending → searching → selected → booking(in-app: Duffel) → booked
                              └→ handed_off(external: Airbnb/operator) → confirm-back → booked_external
```

Slots live in Supabase `trip_slots`; webhooks (Duffel order events) update status later.

## Voice agent (LiveKit Cloud)

Single agent (`agent/`): LiveKit Agents (Python) pipeline —
STT `gpt-4o-mini-transcribe` → LLM `OPENAI_CHAT_MODEL` with the same tool registry via
HTTP to the web API → TTS `gpt-4o-mini-tts`. Deployed with `lk agent create` (one agent,
LiveKit Cloud free tier covers MVP). Checkout is always redirected to the visual UI.

## Cost guardrails checklist

- [x] nano-tier default model, env-swappable without deploy
- [x] deterministic Tier-0 pre-router
- [x] per-session token budget + history truncation
- [x] Perplexity only per ground leg, 24h route cache
- [x] destination content generated once, stored in Supabase, shared by all users
- [x] Higgsfield videos generated offline into `public/videos/destinations/` — zero runtime cost
- [x] Duffel in test mode until launch
