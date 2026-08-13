import { useEffect, useRef, useState } from 'react'
import type { Destination } from '../data/destinations'

const SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/'
const MEDIA_LIST = 'https://en.wikipedia.org/api/rest_v1/page/media-list/'

// Wikimedia file URLs carry their rendered width in the path; swapping the
// number is how we ask for a size that suits the tile.
function atWidth(url: string, px: number) {
  return url.replace(/\/\d+px-/, '/' + px + 'px-')
}

async function fetchThumb(dest: Destination): Promise<string> {
  for (const title of [dest.city, dest.city + ', ' + dest.country]) {
    try {
      const r = await fetch(SUMMARY + encodeURIComponent(title))
      if (!r.ok) continue
      const j = await r.json()
      const u: string | undefined = j.originalimage?.source || j.thumbnail?.source
      if (u && !/\.svg$/i.test(u)) return atWidth(u, 640)
    } catch {
      // offline or blocked — the card keeps its flag fallback
    }
  }
  return ''
}

async function fetchScenes(dest: Destination): Promise<string[]> {
  const titles = [dest.city, dest.city + ', ' + dest.country, dest.country]
  for (const title of titles) {
    try {
      const r = await fetch(MEDIA_LIST + encodeURIComponent(title))
      if (!r.ok) continue
      const j = await r.json()
      const urls: string[] = (j.items || [])
        .filter((it: any) => it.type === 'image' && it.srcset && it.srcset.length)
        .map((it: any) => {
          const s = it.srcset[it.srcset.length - 1].src.split('?')[0]
          return atWidth(s.startsWith('//') ? 'https:' + s : s, 1280)
        })
        .filter(
          (u: string) =>
            /\.(jpg|jpeg|png)$/i.test(u) &&
            !/(icon|logo|flag|map|coat[_-]of[_-]arms|locator|seal|emblem|\.svg)/i.test(u),
        )
      if (urls.length >= 2) return urls.slice(0, 3)
    } catch {
      // offline or blocked — the tiles stay in their loading state
    }
  }
  return []
}

/** Photography for the "three scenes" strip, keyed by destination code. */
export function useDestinationScenes(dest: Destination) {
  const [scenes, setScenes] = useState<Record<string, string[]>>({})
  const requested = useRef<Record<string, true>>({})

  useEffect(() => {
    if (requested.current[dest.code]) return
    requested.current[dest.code] = true
    let live = true
    fetchScenes(dest).then((urls) => {
      if (live) setScenes((prev) => ({ ...prev, [dest.code]: urls }))
    })
    return () => {
      live = false
    }
  }, [dest])

  return scenes[dest.code] ?? []
}

/** Card photography for search results, filled in as each lookup lands. */
export function useDestinationThumbs(dests: Destination[]) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const requested = useRef<Record<string, true>>({})
  const codes = dests.map((d) => d.code).join(',')

  useEffect(() => {
    let live = true
    for (const dest of dests) {
      if (requested.current[dest.code]) continue
      requested.current[dest.code] = true
      fetchThumb(dest).then((url) => {
        if (live && url) setThumbs((prev) => ({ ...prev, [dest.code]: url }))
      })
    }
    return () => {
      live = false
    }
    // `dests` is rebuilt on every keystroke; the code list is what actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codes])

  return thumbs
}
