import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import Spinner from './Spinner'
import { searchAirports, type NearbyAirport } from '../lib/api'

type Props = {
  /** Airports nearest the traveller, shown before they type. */
  nearby: NearbyAirport[]
  value: string | null
  onChange: (iata: string) => void
  coords: { lat: number; lng: number } | null
  locating: boolean
}

/**
 * Departure airport chooser. Nearest airports are offered first, but the
 * whole list is searchable — someone outside Philadelphia may still want to
 * fly from JFK, and "nearest" should be a default, not a cage.
 */
export default function AirportPicker({ nearby, value, onChange, coords, locating }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NearbyAirport[]>([])
  const [busy, setBusy] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const selected = [...nearby, ...results].find((a) => a.iata === value) ?? nearby[0] ?? null

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    const term = query.trim()
    if (!term) {
      setResults([])
      setBusy(false)
      return
    }
    const controller = new AbortController()
    setBusy(true)
    const timer = setTimeout(() => {
      searchAirports(term, coords, controller.signal)
        .then((r) => setResults(r.airports))
        .catch(() => setResults([]))
        .finally(() => setBusy(false))
    }, 220)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, coords])

  const options = query.trim() ? results : nearby
  const label = selected
    ? selected.iata + ' · ' + selected.name + (selected.distanceKm != null ? ' (' + selected.distanceKm + ' km)' : '')
    : 'Choose an airport'

  return (
    <span ref={boxRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={locating}
        style={{
          height: 28,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 10px',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.8)',
          background: 'rgba(255,255,255,0.6)',
          font: 'inherit',
          fontSize: 12,
          fontWeight: 700,
          cursor: locating ? 'progress' : 'pointer',
          color: 'var(--color-text)',
        }}
      >
        {locating ? <Spinner size={11} /> : label}
        {!locating && <Icon name="chevronRight" size={11} style={{ transform: 'rotate(90deg)' }} />}
      </button>

      {open && (
        <div
          role="listbox"
          className="popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 50,
            width: 300,
            borderRadius: 16,
            padding: 8,
          }}
        >
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any airport — JFK, Newark…"
            style={{
              width: '100%',
              height: 34,
              padding: '0 10px',
              marginBottom: 6,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.8)',
              background: 'rgba(255,255,255,0.7)',
              font: 'inherit',
              fontSize: 13,
              outline: 'none',
            }}
          />

          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {!query.trim() && nearby.length > 0 && (
              <p
                style={{
                  fontSize: 9,
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                  color: 'var(--color-neutral-600)',
                  margin: '4px 8px 4px',
                }}
              >
                Nearest to you
              </p>
            )}
            {busy && options.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--color-neutral-600)', margin: 0, padding: '8px 10px' }}>
                Searching…
              </p>
            )}
            {!busy && options.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--color-neutral-600)', margin: 0, padding: '8px 10px' }}>
                {query.trim() ? 'No airport matches that.' : 'Allow location to see nearby airports.'}
              </p>
            )}
            {options.map((a) => (
              <button
                key={a.iata}
                role="option"
                aria-selected={a.iata === value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(a.iata)
                  setQuery('')
                  setOpen(false)
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  border: 0,
                  borderRadius: 10,
                  background: a.iata === value ? 'rgba(255,255,255,0.75)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 13,
                    width: 34,
                    flex: 'none',
                    color: 'var(--color-accent-700)',
                  }}
                >
                  {a.iata}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{a.name}</span>
                {a.distanceKm != null && (
                  <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>{a.distanceKm} km</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </span>
  )
}
