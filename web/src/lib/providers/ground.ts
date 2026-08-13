import { env } from "@/lib/env";
import { cacheGet, cacheSet, HOURS } from "@/lib/cache";
import { assertSpendCap } from "@/lib/security/spend-cap";

// Ground transport intel (train / FlixBus / Amtrak / Greyhound / local operators)
// via Perplexity sonar. This is the priciest call after plan drafting, so results
// are cached per route + month bucket for 24h and it is ONLY invoked for ground legs.

export type GroundSearchParams = {
  origin: string;
  destination: string;
  date: string; // YYYY-MM-DD
};

export type GroundOption = {
  mode: string; // train | bus | ferry | ...
  operator: string;
  typicalDurationHours: number | null;
  typicalPriceUsd: { min: number | null; max: number | null };
  frequency: string | null;
  bookingUrl: string | null;
  notes: string | null;
};

const SYSTEM = `You are a ground-transport research engine. Given an origin, destination
and travel date, return the realistic intercity options (train, bus — FlixBus, Amtrak,
Greyhound, national rail, reputable local operators — ferry if relevant).
Respond ONLY with JSON: {"options":[{"mode":string,"operator":string,
"typicalDurationHours":number|null,"typicalPriceUsd":{"min":number|null,"max":number|null},
"frequency":string|null,"bookingUrl":string|null,"notes":string|null}]}.
Max 6 options, most practical first. Official operator booking URLs only.`;

export async function searchGround(params: GroundSearchParams): Promise<GroundOption[]> {
  const monthBucket = params.date.slice(0, 7);
  const cacheKey = `ground:${params.origin}:${params.destination}:${monthBucket}`.toLowerCase();
  const cached = await cacheGet<GroundOption[]>(cacheKey);
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
        {
          role: "user",
          content: `From ${params.origin} to ${params.destination} around ${params.date}.`,
        },
      ],
      max_tokens: 900,
      temperature: 0.1,
    }),
  });
  if (!res.ok) {
    // Status only — upstream bodies can echo request context into our logs.
    throw new Error(`Perplexity ground search failed (${res.status})`);
  }
  const json = await res.json();
  const content: string = json.choices?.[0]?.message?.content ?? "{}";
  const options = parseOptions(content);
  await cacheSet(cacheKey, options, 24 * HOURS);
  return options;
}

function parseOptions(content: string): GroundOption[] {
  // Model may wrap JSON in prose/code fences; extract the first JSON object.
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed.options)) return [];
    return parsed.options.slice(0, 6).map((o: Record<string, unknown>) => ({
      mode: String(o.mode ?? "bus"),
      operator: String(o.operator ?? "Unknown"),
      typicalDurationHours:
        typeof o.typicalDurationHours === "number" ? o.typicalDurationHours : null,
      typicalPriceUsd: {
        min: (o.typicalPriceUsd as { min?: number })?.min ?? null,
        max: (o.typicalPriceUsd as { max?: number })?.max ?? null,
      },
      frequency: o.frequency ? String(o.frequency) : null,
      bookingUrl: o.bookingUrl ? String(o.bookingUrl) : null,
      notes: o.notes ? String(o.notes) : null,
    }));
  } catch {
    return [];
  }
}
