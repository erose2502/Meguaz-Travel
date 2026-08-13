import { env } from "@/lib/env";
import { cacheGet, cacheSet, HOURS } from "@/lib/cache";
import { assertSpendCap } from "@/lib/security/spend-cap";

// What's trending in travel right now, researched by Perplexity and cached for
// a day — one paid call per day across ALL users. Powers the empty-state
// suggestions in the destination field and the trending chips on Home.

export type TrendingCity = {
  city: string;
  country: string;
  reason: string; // one line: why it's hot right now
};

const SYSTEM = `You are a travel-trends researcher. Report cities that are
genuinely trending for leisure travel RIGHT NOW (events, seasons, new routes,
viral attention). Only cities with international airports. Respond ONLY with
JSON: {"trending":[{"city":string,"country":string,"reason":string}]}.
Max 8 cities, most trending first. Reasons must be one short sentence,
specific and current — never generic praise.`;

export async function trendingCities(): Promise<TrendingCity[]> {
  const cacheKey = `trends:${new Date().toISOString().slice(0, 10)}`;
  const cached = await cacheGet<TrendingCity[]>(cacheKey);
  if (cached) return cached;

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
        { role: "user", content: `Trending travel destinations as of ${new Date().toDateString()}.` },
      ],
      max_tokens: 700,
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error(`Perplexity trends failed (${res.status})`);
  const json = await res.json();
  const content: string = json.choices?.[0]?.message?.content ?? "{}";
  const cities = parse(content);
  await cacheSet(cacheKey, cities, 24 * HOURS);
  return cities;
}

function parse(content: string): TrendingCity[] {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed.trending)) return [];
    return parsed.trending.slice(0, 8).map((t: Record<string, unknown>) => ({
      city: String(t.city ?? ""),
      country: String(t.country ?? ""),
      reason: String(t.reason ?? ""),
    }));
  } catch {
    return [];
  }
}
