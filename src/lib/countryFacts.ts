import { useEffect, useRef, useState } from 'react'
import type { Destination } from '../data/destinations'

const WIKI_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/'

// Country reference data (currency, dial code, driving side) is a static table
// in data/countryEssentials.ts rather than a live lookup: the facts barely
// change, a table needs no key and no round trip, and the free tier of the
// country API we first reached for now returns "authorization key required".

export type CityIntro = {
  extract: string
  url: string
}

/** The opening paragraph of the city's encyclopedia entry, for orientation. */
export function useCityIntro(dest: Destination) {
  const [byCode, setByCode] = useState<Record<string, CityIntro | null>>({})
  const requested = useRef<Record<string, true>>({})

  useEffect(() => {
    if (requested.current[dest.code]) return
    requested.current[dest.code] = true
    let live = true
    const run = async () => {
      for (const title of [dest.city, dest.city + ', ' + dest.country]) {
        try {
          const r = await fetch(WIKI_SUMMARY + encodeURIComponent(title))
          if (!r.ok) continue
          const j = await r.json()
          if (j.extract && live) {
            setByCode((prev) => ({
              ...prev,
              [dest.code]: { extract: j.extract, url: j.content_urls?.desktop?.page || '' },
            }))
            return
          }
        } catch {
          // offline — the briefing simply omits the orientation paragraph
        }
      }
      if (live) setByCode((prev) => ({ ...prev, [dest.code]: null }))
    }
    run()
    return () => {
      live = false
    }
  }, [dest])

  return { intro: byCode[dest.code] ?? null, loading: byCode[dest.code] === undefined }
}
