# Meguaz

A travel planner that helps you get from your front door to your gate on time — built around your **budget** and your **time**, not around flight-booking cards.

Meguaz plans your whole trip end to end (flights, rideshares, trains, buses), scores each option on how far under budget it lands and how much buffer it leaves, flags bottlenecks like traffic before they cost you, and tells you exactly when to leave home.

## Repo layout

| Path | What it is |
|---|---|
| `src/` | The Figma Make prototype (Vite + React 19) — **design source of truth** |
| `web/` | The production app: Next.js 16, same screens ported verbatim + live backend |
| `agent/` | Meguaz voice agent (LiveKit Agents, Python) deployed to LiveKit Cloud |
| `supabase/` | SQL migrations (auth, trips, slots, caches) |
| `brand/` | Brand board + logo system exports |
| `docs/` | `ux-flows.md` (flow analysis) · `architecture.md` (providers & model routing) |

## Running the product app

```bash
cd web
npm install
cp .env.example .env.local   # fill in keys
npm run dev                  # http://localhost:3000
```

Backend engines: Duffel (flights + resort stays, bookable), SearchApi Airbnb
(home stays, deep link out), Perplexity sonar (ground transport intel, cached),
OpenAI nano tier (chat/NL parsing), Supabase (auth + data), LiveKit (voice).

## Running the prototype

```bash
pnpm install && pnpm dev   # Vite, default port 8443
```

## Flow

1. **Onboarding** — welcome, home base, notifications
2. **Home** — value prop, personalized plans, category shortcuts
3. **Planner** — set arrive-by time + budget cap + priority, get 3 whole-trip strategies
4. **Journey** — door-to-door plan led by money & time budgets, with bottlenecks flagged
5. **Plan locked** — confirmation emphasizing money saved and buffer secured

## Brand

Navy `#0D1B2A`, teal `#146C7E`, teal-bright `#2FB4B4`, orange `#FF7A00`, amber `#FFC857`, cream `#F6F3EA`. Display type: DM Serif Display. Body: Inter.
