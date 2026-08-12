# Meguaz

A travel planner that helps you get from your front door to your gate on time — built around your **budget** and your **time**, not around flight-booking cards.

Meguaz plans your whole trip end to end (flights, rideshares, trains, buses), scores each option on how far under budget it lands and how much buffer it leaves, flags bottlenecks like traffic before they cost you, and tells you exactly when to leave home.

## Tech stack

- **React 19** + **Vite 8**
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **TypeScript 5.7**
- **GSAP** for scroll/stagger motion
- **Phosphor Icons**

## Getting started

```bash
pnpm install
pnpm dev
```

The dev server runs on `$PORT` (default 8443).

```bash
pnpm build     # production build
pnpm preview   # preview the build
```

## Flow

1. **Onboarding** — welcome, home base, notifications
2. **Home** — value prop, personalized plans, category shortcuts
3. **Planner** — set arrive-by time + budget cap + priority, get 3 whole-trip strategies
4. **Journey** — door-to-door plan led by money & time budgets, with bottlenecks flagged
5. **Plan locked** — confirmation emphasizing money saved and buffer secured

## Brand

Navy `#0D1B2A`, teal `#146C7E`, teal-bright `#2FB4B4`, orange `#FF7A00`, amber `#FFC857`, cream `#F6F3EA`. Display type: DM Serif Display. Body: Inter.
