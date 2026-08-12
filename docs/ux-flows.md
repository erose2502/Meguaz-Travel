# Meguaz — UI Analysis & Flow Optimization

Source of truth: the Figma Make prototype (repo root `src/`), now ported verbatim into
the production app at `web/src/components/app/`. Brand assets in `brand/`.

## What the design already gets right

The prototype's thesis is stronger than a normal OTA: **Meguaz is a door-to-door
constraint solver, not a search engine.**

- **Two budgets, not one.** Every plan is solved against a money cap AND an arrive-by
  time (`SearchResults`, `JourneyTimeline`). The "buffer meter" turns stress into a
  visible, comparable number. This is the product's soul — protect it in every flow.
- **Three solved options** (Frugal / Balanced / Calm) beat infinite result lists. The
  priority segmented control (Save money / Balanced / Save time) re-ranks, it doesn't
  re-search. Zero extra API calls on toggle.
- **The plan is the product.** "Lock in this plan" books the whole chain (rideshare +
  flight + rail), and the confirmation screen sells the two protected numbers ($166
  kept, 70-min buffer secured) plus "we'll keep watch."
- **Onboarding captures the two personalization keys** — home base address and
  notification consent — exactly the data the solver needs for leave-home-by times.

## Flow gaps to close (enhancements, in priority order)

### 1. The missing "brief" step — Landing → Solve It
Today the search pill jumps straight to a hardcoded SF → London result. Insert one
lightweight **Trip Brief sheet** (same glass language) with: destination, arrive-by
(or date range), budget cap, and party size. Free-text is allowed ("London by Aug 24
under $900") and parsed by the nano-tier model into those four fields; the form is the
fallback and the editor. This is the only new screen the flow needs.

### 2. Real data behind "3 ways to make this work"
The solver output maps to providers like this:
- flight legs → **Duffel** offers (bookable in-app)
- rail/bus legs → **Perplexity** route intel (operator + typical price, cached 24h/route)
- rideshare legs → static estimate at MVP (Uber API later)
The three options are assembled server-side (`/api/plan/solve`, next step): cheapest
viable = Frugal, latest-departure max-buffer = Calm, best price×buffer score = Balanced.
Budget bars and "under budget" chips come straight from the solved numbers.

### 3. Stays enter the same flow, not a separate silo
The landing categories include Stays. When a trip spans nights, the plan gains a stay
slot; preference decides the engine (profile setting, asked once):
- **Home-style → Airbnb via SearchApi** — rich cards, booking hands off to Airbnb
  (no public booking API), slot confirmed back as "reserved externally".
- **Resort/hotel → Duffel Stays** — bookable in-app inside "Lock in this plan".
UI: one stay card inside the Journey Timeline between arrival and departure days.

### 4. Trips & Profile go live
- `TripsScreen` reads Supabase `trips` + `trip_slots` (schema in `supabase/migrations/`);
  the "Leave home by" chip is recomputed as conditions change (the "we'll keep watch" promise).
- `ProfileScreen` binds: home address (onboarding), airport buffer, stay preference,
  alerts; Sign out → Supabase auth. Login = magic link (`/login`, styled to prototype).

### 5. Voice agent joins the brief, not the checkout
The LiveKit voice agent fills the Trip Brief conversationally and reads back solved
options; locking in and payment always happen in the visual UI.

### 6. Ambient destination video (Higgsfield)
Landing hero + plan-card imagery are Unsplash stills today. Replace progressively with
short Higgsfield ambient loops stored at `web/public/videos/destinations/<slug>.mp4`
(generated offline — zero runtime cost, no API dependency at page load).

## The routing that keeps this cheap

Toggling priorities, comparing options, and browsing plans are all **zero-token**
interactions — the LLM only runs when free text needs parsing (nano-tier) and
Perplexity only runs once per new ground route per day. Full cost architecture:
`docs/architecture.md`.
