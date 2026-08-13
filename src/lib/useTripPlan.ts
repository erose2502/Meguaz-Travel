import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, driveEta, solvePlan, type PlanOption, type SolveResponse, type TripBrief } from './api'

/** Airline offers expire; re-solving on a timer keeps the prices on screen real. */
const REFRESH_MS = 90_000
const ETA_MS = 60_000

export type PlanState = {
  plan: SolveResponse | null
  loading: boolean
  refreshing: boolean
  error: string | null
  lastUpdated: number | null
  refresh: () => void
}

export function useTripPlan(brief: TripBrief, active: boolean): PlanState {
  const [plan, setPlan] = useState<SolveResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const inFlight = useRef<AbortController | null>(null)
  // Solving spends a Duffel offer request, so only re-solve when the brief
  // itself changes — not on every unrelated re-render.
  const key = [
    brief.from,
    brief.to,
    brief.arriveBy,
    brief.budget,
    brief.adults,
    brief.nights ?? '',
    brief.cabinClass ?? '',
    brief.airportTransfer ?? '',
  ].join('|')

  const run = useCallback(
    async (isRefresh: boolean) => {
      inFlight.current?.abort()
      const controller = new AbortController()
      inFlight.current = controller
      isRefresh ? setRefreshing(true) : setLoading(true)
      setError(null)
      try {
        const result = await solvePlan(brief, controller.signal)
        if (controller.signal.aborted) return
        setPlan(result)
        setLastUpdated(Date.now())
      } catch (err) {
        if (controller.signal.aborted || (err as Error).name === 'AbortError') return
        const message =
          err instanceof ApiError
            ? err.message
            : 'Could not reach the planner. Is the backend running on :3000?'
        setError(message)
        if (!isRefresh) setPlan(null)
      } finally {
        if (!controller.signal.aborted) {
          setRefreshing(false)
          setLoading(false)
        }
      }
    },
    // `brief` is rebuilt each render; `key` is what actually changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )

  useEffect(() => {
    if (!active) return
    run(false)
    return () => inFlight.current?.abort()
  }, [active, run])

  useEffect(() => {
    if (!active || !plan) return
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') run(true)
    }, REFRESH_MS)
    return () => clearInterval(id)
  }, [active, plan, run])

  return { plan, loading, refreshing, error, lastUpdated, refresh: () => run(true) }
}

function offsetMinutes(iso: string) {
  const m = /([+-])(\d{2}):(\d{2})$/.exec(iso)
  if (m) return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]))
  if (/Z$/.test(iso)) return 0
  return -new Date().getTimezoneOffset()
}

function formatAtOffset(ms: number, offMin: number) {
  const d = new Date(ms + offMin * 60_000)
  return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0')
}

export type LiveLeaveBy = {
  leaveBy: string
  driveMinutes: number | null
  trafficAware: boolean
  live: boolean
}

/**
 * Recomputes "leave home by" from a live traffic-aware drive ETA between the
 * device's location and the departure airport, so the number on screen moves
 * when the roads do. Falls back to the solver's own estimate.
 */
export function useLiveLeaveBy(option: PlanOption | null, enabled: boolean): LiveLeaveBy {
  const [eta, setEta] = useState<{ minutes: number; trafficAware: boolean } | null>(null)
  const coords = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (!enabled || !option || !navigator.geolocation) return
    let live = true
    let timer: ReturnType<typeof setInterval> | undefined

    const poll = async () => {
      if (!coords.current) return
      try {
        const next = await driveEta({
          from: coords.current,
          airport: option.originAirport,
          departAt: option.departAt,
        })
        if (live) setEta(next)
      } catch {
        // keep the solver's estimate on screen
      }
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!live) return
        coords.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        poll()
        timer = setInterval(poll, ETA_MS)
      },
      () => {
        /* permission denied — the static estimate stands */
      },
      { maximumAge: 300_000, timeout: 8_000 },
    )

    return () => {
      live = false
      if (timer) clearInterval(timer)
    }
  }, [enabled, option])

  if (!option) return { leaveBy: '', driveMinutes: null, trafficAware: false, live: false }
  if (!eta) {
    return {
      leaveBy: option.leaveBy,
      driveMinutes: null,
      trafficAware: option.etaTrafficAware,
      live: false,
    }
  }

  const off = offsetMinutes(option.departAt)
  const leaveMs = Date.parse(option.departAt) - (eta.minutes + option.preTransferMin) * 60_000
  return {
    leaveBy: formatAtOffset(leaveMs, off),
    driveMinutes: eta.minutes,
    trafficAware: eta.trafficAware,
    live: true,
  }
}
