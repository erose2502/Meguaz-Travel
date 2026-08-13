import { env } from "@/lib/env";
import { cacheGet, cacheSet, HOURS } from "@/lib/cache";
import { assertSpendCap } from "@/lib/security/spend-cap";

// "Eat like a local" for the destination briefing, researched by Perplexity
// sonar. A city's food institutions change slowly, so results cache for 30
// days — one paid call per city per month across ALL users, same pattern as
// ground transport and behind the same spend cap.

export type FoodSpot = {
  name: string;
  kind: string; // street food | market | bakery | restaurant | ...
  dish: string; // the thing to actually order
  area: string | null; // neighbourhood
  priceLevel: "$" | "$$" | "$$$" | null;
  note: string | null;
};

const SYSTEM = `You are a local food guide. Given a city, return the eats a
well-travelled local friend would actually send you to: street food, markets,
one old institution, one worthwhile splurge. Favour places famous for one dish.
Respond ONLY with JSON:
{"spots":[{"name":string,"kind":string,"dish":string,"area":string|null,
"priceLevel":"$"|"$$"|"$$$"|null,"note":string|null}]}.
Max 6 spots, most essential first. No chains, no tourist traps.`;

export async function foodSuggestions(city: string, country: string): Promise<FoodSpot[]> {
  const cacheKey = `food:${city}:${country}`.toLowerCase();
  const cached = await cacheGet<FoodSpot[]>(cacheKey);
  if (cached) return cached;

  // Cache miss means a paid call — check the global ceiling first.
  await assertSpendCap("perplexity");

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.perplexityApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `${city}, ${country}.` },
      ],
      max_tokens: 900,
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    // Status only — upstream bodies can echo request context into our logs.
    throw new Error(`Perplexity food search failed (${res.status})`);
  }
  const json = await res.json();
  const content: string = json.choices?.[0]?.message?.content ?? "{}";
  const spots = parseSpots(content);
  await cacheSet(cacheKey, spots, 30 * 24 * HOURS);
  return spots;
}

function parseSpots(content: string): FoodSpot[] {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed.spots)) return [];
    return parsed.spots.slice(0, 6).map((s: Record<string, unknown>) => ({
      name: String(s.name ?? "Local spot"),
      kind: String(s.kind ?? "restaurant"),
      dish: String(s.dish ?? ""),
      area: s.area ? String(s.area) : null,
      priceLevel: s.priceLevel === "$" || s.priceLevel === "$$" || s.priceLevel === "$$$" ? s.priceLevel : null,
      note: s.note ? String(s.note) : null,
    }));
  } catch {
    return [];
  }
}
