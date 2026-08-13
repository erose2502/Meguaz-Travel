import { env } from "@/lib/env";
import { cacheGet, cacheSet, HOURS } from "@/lib/cache";
import { assertSpendCap } from "@/lib/security/spend-cap";

// One researched guide per city: the attractions worth a traveller's time
// (with public review averages) plus destination-specific fun facts for the
// hero ticker. Cached 30 days — one paid call per city per month covers both
// features for every user. Photos are NOT fetched here: the client resolves
// each attraction's Wikipedia thumbnail, which is stable and embeddable.

export type Attraction = {
  name: string;
  kind: string; // museum | landmark | park | market | ...
  rating: number | null; // public review average, e.g. 4.7
  why: string; // one line a local would say
  wiki: string | null; // exact English Wikipedia article title, for the photo
};

export type DestinationGuide = {
  attractions: Attraction[];
  facts: string[];
};

const SYSTEM = `You are a travel researcher. For a given city return JSON ONLY:
{"facts":[string,...],"attractions":[{"name":string,"kind":string,
"rating":number|null,"why":string,"wiki":string|null}]}.
facts: 4-6 fun, TRUE, surprising one-liners about the city a traveller would
enjoy — each starting with "Fun fact:", plain text only, NO markdown of any
kind. attractions: max 6 places genuinely worth a visit, most essential first;
rating is the public review average as commonly reported on major review
platforms, one decimal (e.g. 4.7) — most famous attractions have one; null
only if genuinely not reviewed; wiki is the EXACT English Wikipedia article
title for the place, or null if none exists. No chains, no tourist traps.`;

export async function destinationGuide(city: string, country: string): Promise<DestinationGuide> {
  // v2: markdown stripping + rating nudge; bypasses v1 cached entries.
  const cacheKey = `guide:v2:${city}:${country}`.toLowerCase();
  const cached = await cacheGet<DestinationGuide>(cacheKey);
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
        { role: "user", content: `${city}, ${country}.` },
      ],
      max_tokens: 1100,
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error(`Perplexity guide failed (${res.status})`);
  const json = await res.json();
  const content: string = json.choices?.[0]?.message?.content ?? "{}";
  const guide = parse(content);
  await cacheSet(cacheKey, guide, 30 * 24 * HOURS);
  return guide;
}

/** Models sneak markdown into prose no matter what the prompt says. */
function plain(s: string): string {
  return s.replace(/\*\*|__|`/g, "").replace(/\s+/g, " ").trim();
}

function parse(content: string): DestinationGuide {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return { attractions: [], facts: [] };
  try {
    const parsed = JSON.parse(match[0]);
    const attractions: Attraction[] = (Array.isArray(parsed.attractions) ? parsed.attractions : [])
      .slice(0, 6)
      .map((a: Record<string, unknown>) => ({
        name: plain(String(a.name ?? "")),
        kind: plain(String(a.kind ?? "landmark")),
        rating:
          typeof a.rating === "number" && a.rating >= 1 && a.rating <= 5
            ? Math.round(a.rating * 10) / 10
            : null,
        why: plain(String(a.why ?? "")),
        wiki: a.wiki ? String(a.wiki) : null,
      }))
      .filter((a: Attraction) => a.name);
    const facts: string[] = (Array.isArray(parsed.facts) ? parsed.facts : [])
      .slice(0, 6)
      .map((f: unknown) => plain(String(f)))
      .filter((f: string) => f.length > 12 && f.length < 240);
    return { attractions, facts };
  } catch {
    return { attractions: [], facts: [] };
  }
}
