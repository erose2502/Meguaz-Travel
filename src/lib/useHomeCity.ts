import { useEffect, useState } from 'react'
import { nearbyAirports, reverseGeocode, type NearbyAirport } from './api'

export type HomeCity = {
  city: string | null
  coords: { lat: number; lng: number } | null
  airports: NearbyAirport[]
  status: 'idle' | 'locating' | 'resolved' | 'denied' | 'unavailable'
}

/**
 * Where the traveller actually is, resolved through the browser's geolocation
 * and Mapbox reverse geocoding. The planner starts from here rather than a
 * hardcoded home city; if permission is refused we fall back to `fallback`
 * and say so rather than pretending.
 */
export function useHomeCity(fallback: string): HomeCity & { resolvedCity: string } {
  const [state, setState] = useState<HomeCity>({ city: null, coords: null, airports: [], status: 'idle' })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, status: 'unavailable' }))
      return
    }
    let live = true
    setState((s) => ({ ...s, status: 'locating' }))

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!live) return
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        try {
          // The city name is for display; the airport list is what the planner
          // actually departs from, since names are ambiguous across countries.
          const [place, near] = await Promise.all([
            reverseGeocode(coords),
            nearbyAirports(coords).catch(() => ({ airports: [] as NearbyAirport[] })),
          ])
          if (!live) return
          setState({
            city: place.city,
            coords,
            airports: near.airports,
            status: place.city ? 'resolved' : 'unavailable',
          })
        } catch {
          if (live) setState({ city: null, coords, airports: [], status: 'unavailable' })
        }
      },
      () => {
        if (live) setState({ city: null, coords: null, airports: [], status: 'denied' })
      },
      { maximumAge: 600_000, timeout: 8_000 },
    )

    return () => {
      live = false
    }
  }, [])

  return { ...state, resolvedCity: state.city || fallback }
}
