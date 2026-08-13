import { useCallback, useEffect, useState } from 'react'
import { deleteTrip, listTrips, type Trip } from './api'

export type TripsState = {
  trips: Trip[]
  loading: boolean
  error: string | null
  reload: () => void
  /** Removes a trip optimistically; restores the list if the server refuses. */
  remove: (id: string) => Promise<void>
}

/** The traveller's saved plans. Empty (not an error) when signed out. */
export function useTrips(enabled: boolean): TripsState {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setTrips([])
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    listTrips(controller.signal)
      .then((r) => setTrips(r.trips))
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') setError('Could not load your trips.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [enabled, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  const remove = useCallback(async (id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id))
    try {
      await deleteTrip(id)
    } catch (err) {
      // Put the list back the way the server sees it.
      setNonce((n) => n + 1)
      throw err
    }
  }, [])

  return { trips, loading, error, reload, remove }
}
