import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Icon from './Icon'
import DatePicker from './DatePicker'
import AirportPicker from './AirportPicker'
import Spinner from './Spinner'
import {
  trendingDestinations,
  type CabinClass,
  type NearbyAirport,
  type TransferMode,
  type TrendingCity,
} from '../lib/api'
import { DESTINATIONS, formatDuration, type Destination } from '../data/destinations'
import { SPOTLIGHTS } from '../data/plans'

type Props = {
  query: string
  onQuery: (value: string) => void
  matches: Destination[]
  dest: Destination | null
  onPick: (dest: Destination) => void
  arriveBy: string
  onArriveBy: (value: string) => void
  nights: number
  onNights: (value: number) => void
  budget: number
  onBudget: (value: number) => void
  adults: number
  onAdults: (value: number) => void
  companions: string[]
  onCompanions: (names: string[]) => void
  originCity: string
  originIsLive: boolean
  originLocating: boolean
  airports: NearbyAirport[]
  originIata: string | null
  onOriginIata: (iata: string) => void
  originCoords: { lat: number; lng: number } | null
  cabinClass: CabinClass
  onCabinClass: (c: CabinClass) => void
  transfer: TransferMode
  onTransfer: (mode: TransferMode) => void
  onSubmit: () => void
  submitting: boolean
}

const LABEL: CSSProperties = {
  display: 'block',
  fontSize: 10,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  color: 'var(--color-neutral-600)',
  margin: '0 0 5px',
}

const FIELD: CSSProperties = {
  width: '100%',
  height: 40,
  padding: '0 12px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.75)',
  background: 'rgba(255,255,255,0.62)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
  font: 'inherit',
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--color-text)',
  outline: 'none',
}

/** −/+ control for small counts — raw number-input spinners have no place here. */
function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  label: string
}) {
  const btn = (dir: -1 | 1, disabled: boolean): CSSProperties => ({
    width: 30,
    height: 30,
    flex: 'none',
    borderRadius: 999,
    border: 0,
    background: disabled ? 'transparent' : 'rgba(255,255,255,0.85)',
    boxShadow: disabled ? 'none' : '0 1px 3px rgba(46,43,37,0.15)',
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 1,
    color: disabled ? 'var(--color-neutral-400)' : 'var(--color-text)',
    cursor: disabled ? 'default' : 'pointer',
  })
  return (
    <div
      role="group"
      aria-label={label}
      style={{
        ...FIELD,
        padding: '0 5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 4,
      }}
    >
      <button
        type="button"
        aria-label={'Fewer ' + label.toLowerCase()}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        style={btn(-1, value <= min)}
      >
        −
      </button>
      <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{value}</span>
      <button
        type="button"
        aria-label={'More ' + label.toLowerCase()}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        style={btn(1, value >= max)}
      >
        +
      </button>
    </div>
  )
}

export default function TripBriefBar(props: Props) {
  const {
    query,
    onQuery,
    matches,
    dest,
    onPick,
    arriveBy,
    onArriveBy,
    nights,
    onNights,
    budget,
    onBudget,
    adults,
    onAdults,
    companions,
    onCompanions,
    originCity,
    originIsLive,
    originLocating,
    airports,
    originIata,
    onOriginIata,
    originCoords,
    cabinClass,
    onCabinClass,
    transfer,
    onTransfer,
    onSubmit,
    submitting,
  } = props

  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Empty-field suggestions: today's trending cities (fetched lazily on first
  // focus, cached server-side for a day), padded with the spotlight list.
  const [trending, setTrending] = useState<TrendingCity[] | null>(null)
  const trendsRequested = useRef(false)
  const fetchTrends = () => {
    if (trendsRequested.current) return
    trendsRequested.current = true
    trendingDestinations()
      .then((r) => setTrending(r.trending))
      .catch(() => setTrending([]))
  }

  type SuggestRow = { dest: Destination; note: string | null; hot: boolean }
  const suggestions: SuggestRow[] = useMemo(() => {
    const rows: SuggestRow[] = []
    const seen = new Set<string>()
    for (const t of trending ?? []) {
      const dest = DESTINATIONS.find((d) => d.city.toLowerCase() === t.city.toLowerCase())
      if (dest && !seen.has(dest.code)) {
        seen.add(dest.code)
        rows.push({ dest, note: t.reason, hot: true })
      }
    }
    for (const s of SPOTLIGHTS) {
      if (rows.length >= 8) break
      if (!seen.has(s.code)) {
        seen.add(s.code)
        rows.push({ dest: s, note: null, hot: false })
      }
    }
    return rows.slice(0, 8)
  }, [trending])

  const rows: SuggestRow[] =
    query.trim() !== ''
      ? matches.slice(0, 8).map((d) => ({ dest: d, note: null, hot: false }))
      : suggestions
  const options = rows.map((r) => r.dest)

  useEffect(() => setActive(0), [query])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const choose = (d: Destination) => {
    onPick(d)
    onQuery('')
    setOpen(false)
    // Drop focus so the field shows the newly chosen city rather than an
    // empty search box.
    setFocused(false)
    inputRef.current?.blur()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || options.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % options.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + options.length) % options.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(options[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div
      className="glass-strong grain"
      style={{ borderRadius: 24, padding: 16, position: 'relative', zIndex: 5 }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
        {/* Destination */}
        <div ref={boxRef} style={{ flex: '2 1 260px', minWidth: 220, position: 'relative' }}>
          <label style={LABEL} htmlFor="mg-dest">
            Going to
          </label>
          <div style={{ position: 'relative' }}>
            <Icon
              name="mapPin"
              size={15}
              color="var(--color-neutral-600)"
              style={{ position: 'absolute', left: 12, top: 12, pointerEvents: 'none' }}
            />
            <input
              ref={inputRef}
              id="mg-dest"
              value={focused ? query : dest ? dest.city + ', ' + dest.country : ''}
              onChange={(e) => {
                onQuery(e.target.value)
                setOpen(true)
              }}
              onFocus={() => {
                setFocused(true)
                setOpen(true)
                fetchTrends()
              }}
              onBlur={() => {
                setFocused(false)
                onQuery('')
              }}
              onKeyDown={onKeyDown}
              placeholder={dest ? 'Search a city or country' : 'Where do you want to go?'}
              autoComplete="off"
              role="combobox"
              aria-expanded={open && options.length > 0}
              aria-controls="mg-dest-list"
              style={{ ...FIELD, paddingLeft: 34 }}
            />
          </div>

          {open && (
            <div
              id="mg-dest-list"
              role="listbox"
              className="popover"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                zIndex: 40,
                borderRadius: 16,
                padding: 6,
                maxHeight: 300,
                overflowY: 'auto',
              }}
            >
              {query.trim() === '' && (
                <p
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    color: 'var(--color-neutral-600)',
                    margin: 0,
                    padding: '8px 12px 4px',
                  }}
                >
                  {trending === null
                    ? 'Finding what’s trending…'
                    : trending.length > 0
                      ? 'Trending now'
                      : 'Popular with travellers'}
                </p>
              )}
              {rows.length === 0 && query.trim() !== '' && (
                <p style={{ fontSize: 13, color: 'var(--color-neutral-600)', margin: 0, padding: '10px 12px' }}>
                  No match — try a city, country or airport code.
                </p>
              )}
              {rows.map((row, i) => (
                <button
                  key={row.dest.code}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(row.dest)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 10px',
                    border: 0,
                    borderRadius: 12,
                    background: i === active ? 'rgba(255,255,255,0.75)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: 26,
                      height: 18,
                      flex: 'none',
                      borderRadius: 4,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundImage: 'url("https://flagcdn.com/w80/' + row.dest.cc + '.png")',
                      backgroundColor: 'var(--color-neutral-300)',
                      outline: '1px solid rgba(255,255,255,0.8)',
                    }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700 }}>
                      {row.dest.city}
                      {row.hot && (
                        <span className="tag tag-accent" style={{ fontSize: 9, padding: '1px 7px' }}>
                          Trending
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 11,
                        color: 'var(--color-neutral-600)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.note ?? row.dest.country + ' · ' + row.dest.code + ' · ' + formatDuration(row.dest.hrs)}
                    </span>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent-700)' }}>
                    ${row.dest.price}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Arrive by */}
        <div style={{ flex: '1 1 160px', minWidth: 150 }}>
          <label style={LABEL} htmlFor="mg-date">
            Arrive by
          </label>
          <DatePicker value={arriveBy} onChange={onArriveBy} id="mg-date" />
        </div>

        {/* Trip length — prices the return leg so the total is the whole trip */}
        <div style={{ flex: '0 1 108px', minWidth: 100 }}>
          <span style={LABEL} id="mg-nights-label">
            Nights
          </span>
          <Stepper value={nights} min={1} max={90} onChange={onNights} label="Nights" />
        </div>

        {/* Budget */}
        <div style={{ flex: '0 1 120px', minWidth: 110 }}>
          <label style={LABEL} htmlFor="mg-budget">
            Budget cap
          </label>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: 12,
                top: 10,
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--color-neutral-600)',
                pointerEvents: 'none',
              }}
            >
              $
            </span>
            <input
              id="mg-budget"
              type="number"
              min={50}
              max={100000}
              step={50}
              value={budget}
              onChange={(e) => onBudget(Number(e.target.value))}
              style={{ ...FIELD, paddingLeft: 24 }}
            />
          </div>
        </div>

        {/* Cabin */}
        <div style={{ flex: '0 1 140px', minWidth: 124 }}>
          <label style={LABEL} htmlFor="mg-cabin">
            Cabin
          </label>
          <select
            id="mg-cabin"
            value={cabinClass}
            onChange={(e) => onCabinClass(e.target.value as CabinClass)}
            style={{ ...FIELD, cursor: 'pointer' }}
          >
            <option value="economy">Economy</option>
            <option value="premium_economy">Premium economy</option>
            <option value="business">Business</option>
            <option value="first">First</option>
          </select>
        </div>

        {/* Travellers */}
        <div style={{ flex: '0 1 108px', minWidth: 100 }}>
          <span style={LABEL} id="mg-adults-label">
            Travellers
          </span>
          <Stepper value={adults} min={1} max={9} onChange={onAdults} label="Travellers" />
        </div>

        <button
          className="hv-accent"
          onClick={onSubmit}
          disabled={submitting || !dest}
          title={dest ? undefined : 'Choose a destination first'}
          style={{
            flex: '0 0 auto',
            height: 40,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '0 18px',
            border: 0,
            borderRadius: 999,
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
            fontFamily: 'var(--font-heading)',
            fontSize: 13,
            whiteSpace: 'nowrap',
            cursor: submitting ? 'progress' : dest ? 'pointer' : 'not-allowed',
            opacity: submitting || !dest ? 0.55 : 1,
            boxShadow: '0 8px 18px -8px rgba(140,73,26,0.7), inset 0 1px 0 rgba(255,255,255,0.3)',
          }}
        >
          {submitting ? <Spinner size={14} color="var(--color-bg)" /> : null}
          {submitting ? 'Solving…' : 'Find my options'}
          {!submitting && <Icon name="arrowRight" size={15} />}
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 10,
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid var(--color-divider)',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--color-neutral-700)',
            flexWrap: 'wrap',
          }}
        >
          <Icon name="home" size={13} color="var(--color-neutral-600)" />
          Leaving from
          <AirportPicker
            nearby={airports}
            value={originIata}
            onChange={onOriginIata}
            coords={originCoords}
            locating={originLocating}
          />
          {originIsLive && airports.length > 0 && (
            <span className="tag tag-accent-2">near {originCity}</span>
          )}
        </span>

        {/* How they get to the airport — changes real money in every plan */}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-neutral-700)' }}>
          <Icon name="car" size={13} color="var(--color-neutral-600)" />
          Getting there
          <select
            value={transfer}
            onChange={(e) => onTransfer(e.target.value as TransferMode)}
            aria-label="How you get to the airport"
            style={{
              height: 30,
              padding: '0 10px',
              borderRadius: 999,
              border: '1px solid var(--color-divider)',
              background: 'rgba(255,255,255,0.6)',
              font: 'inherit',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--color-text)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="rideshare">Rideshare</option>
            <option value="drive">Drive & park</option>
            <option value="dropoff">Drop-off</option>
            <option value="transit">Transit</option>
          </select>
        </span>

        {adults > 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>Travelling with:</span>
            {companions.map((name, i) => (
              <span
                key={name + i}
                className="tag tag-accent"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {name}
                <button
                  onClick={() => onCompanions(companions.filter((_, j) => j !== i))}
                  aria-label={'Remove ' + name}
                  style={{
                    border: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 0,
                    lineHeight: 1,
                    color: 'inherit',
                    fontWeight: 700,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
            {companions.length < adults - 1 && (
              <input
                placeholder="Add a friend by name or email"
                onKeyDown={(e) => {
                  const target = e.currentTarget
                  if (e.key === 'Enter' && target.value.trim()) {
                    onCompanions([...companions, target.value.trim()])
                    target.value = ''
                  }
                }}
                style={{
                  height: 30,
                  padding: '0 12px',
                  borderRadius: 999,
                  border: '1px dashed var(--color-divider)',
                  background: 'rgba(255,255,255,0.5)',
                  font: 'inherit',
                  fontSize: 12,
                  outline: 'none',
                  minWidth: 210,
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
