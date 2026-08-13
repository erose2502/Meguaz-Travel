import { env } from "@/lib/env";
import { cacheGet, cacheSet, HOURS } from "@/lib/cache";
import { assertSpendCap } from "@/lib/security/spend-cap";

// Destination soundtrack via the YouTube Data API. A search costs 100 of the
// 10k daily quota units, so results cache for a week per city — the whole
// destination catalogue costs a couple hundred units a week at steady state.

export type DestinationMix = {
  videoId: string;
  title: string;
  channel: string;
};

export async function destinationMix(city: string, country: string): Promise<DestinationMix | null> {
  const cacheKey = `music:${city}:${country}`.toLowerCase();
  const cached = await cacheGet<DestinationMix | null>(cacheKey);
  if (cached) return cached;

  // Quota guard: unlike the dollar caps this protects a unit budget, but the
  // fail-closed semantics are identical.
  await assertSpendCap("youtube");

  const qs = new URLSearchParams({
    key: env.youtubeApiKey,
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    videoCategoryId: "10", // Music
    maxResults: "5",
    safeSearch: "strict",
    q: `${city} ${country} ambient music mix`,
  });

  // Key travels in the query string — never log or rethrow the URL.
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${qs}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`YouTube search failed (${res.status})`);
  const json = await res.json();

  type Item = {
    id?: { videoId?: string };
    snippet?: { title?: string; channelTitle?: string; liveBroadcastContent?: string };
  };
  const items: Item[] = json.items ?? [];
  const pick = items.find((i) => i.id?.videoId && i.snippet?.liveBroadcastContent !== "live") ?? items[0];

  const mix: DestinationMix | null = pick?.id?.videoId
    ? {
        videoId: pick.id.videoId,
        title: decodeEntities(pick.snippet?.title ?? "Destination mix"),
        channel: pick.snippet?.channelTitle ?? "",
      }
    : null;

  await cacheSet(cacheKey, mix, 7 * 24 * HOURS);
  return mix;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
