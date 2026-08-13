import type { Destination } from '../data/destinations'

// "Zurich" and "Zürich", "Sao Paulo" and "São Paulo" should be the same query.
function fold(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function words(s: string) {
  return fold(s).split(/[^a-z0-9]+/).filter(Boolean)
}

/**
 * Ranked destination search.
 *
 * The rule that keeps short queries useful: a single letter only ever matches
 * the START of a place name, never the middle of one and never a language.
 * Otherwise "h" pulls in every English-, Dutch- and French-speaking country,
 * which is noise dressed up as results.
 */
export function searchDestinations(query: string, dests: Destination[]): Destination[] {
  const q = fold(query.trim())
  if (!q) return []

  const scored: { dest: Destination; score: number }[] = []

  for (const dest of dests) {
    const city = fold(dest.city)
    const country = fold(dest.country)
    const code = fold(dest.code)
    const lang = fold(dest.lang)

    let score = 0

    if (code === q) score = 120
    else if (city === q || country === q) score = 110
    else if (city.startsWith(q)) score = 90
    else if (words(dest.city).some((w) => w.startsWith(q))) score = 80
    else if (country.startsWith(q)) score = 70
    else if (words(dest.country).some((w) => w.startsWith(q))) score = 60
    // Loose "contains" and language matching need enough letters to mean something.
    else if (q.length >= 3 && city.includes(q)) score = 45
    else if (q.length >= 3 && country.includes(q)) score = 35
    else if (q.length >= 3 && (lang.startsWith(q) || words(dest.lang).some((w) => w.startsWith(q)))) score = 25
    else if (q.length >= 2 && code.startsWith(q)) score = 20

    if (score > 0) scored.push({ dest, score })
  }

  // Same relevance? Put the closer, cheaper trip first.
  scored.sort((a, b) => b.score - a.score || a.dest.hrs - b.dest.hrs || a.dest.price - b.dest.price)
  return scored.map((s) => s.dest)
}
