import { useEffect, useState } from 'react'
import Icon from './Icon'
import { searchStays, type AirbnbResult, type StayPreference, type StaysResponse } from '../lib/api'

type Props = {
  location: string
  checkIn: string
  checkOut: string
  adults: number
}

const CACHE: Record<string, StaysResponse> = {}

/**
 * Real stay inventory inside the plan — Airbnb rentals via SearchApi's Airbnb
 * engine, resorts/hotels via the same stays route. Booking finishes on the
 * provider's site (Airbnb has no booking API), so cards deep-link out.
 */
export default function StaysPanel({ location, checkIn, checkOut, adults }: Props) {
  const [pref, setPref] = useState<StayPreference>('home')
  const [stays, setStays] = useState<StaysResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const key = [pref, location, checkIn, checkOut, adults].join('|')
    if (CACHE[key]) {
      setStays(CACHE[key])
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setFailed(false)
    searchStays({ preference: pref, location, checkIn, checkOut, adults }, controller.signal)
      .then((r) => {
        CACHE[key] = r
        setStays(r)
        setLoading(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFailed(true)
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [pref, location, checkIn, checkOut, adults])

  const results = stays?.results ?? []

  return (
    <div className="glass grain" style={{ borderRadius: 22, padding: 16, marginTop: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: 18, margin: 0, flex: 1 }}>
          Where you’ll stay
        </p>
        <div className="seg" style={{ background: 'rgba(255,255,255,0.5)' }}>
          {(
            [
              ['home', 'Homes'],
              ['resort', 'Hotels'],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="seg-opt">
              <input
                type="radio"
                name="mg-stay-pref"
                checked={pref === value}
                onChange={() => setPref(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--color-neutral-600)', margin: '0 0 12px' }}>
        {checkIn} → {checkOut} · {adults} {adults === 1 ? 'guest' : 'guests'} · live prices
        {stays && !stays.bookableInApp ? ' · booking finishes on ' + (stays.kind === 'airbnb' ? 'Airbnb' : 'the property site') : ''}
      </p>

      {loading && (
        <div style={{ display: 'flex', gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                flex: '0 0 220px',
                height: 200,
                borderRadius: 16,
                background:
                  'linear-gradient(100deg, var(--color-neutral-200) 40%, var(--color-neutral-100) 50%, var(--color-neutral-200) 60%)',
                backgroundSize: '300% 100%',
                animation: 'mg-shimmer 1.4s linear infinite',
              }}
            />
          ))}
        </div>
      )}

      {!loading && (failed || results.length === 0) && (
        <p style={{ fontSize: 13, color: 'var(--color-neutral-600)', margin: 0 }}>
          No live listings right now — try the other tab, or check back in a minute.
        </p>
      )}

      {!loading && results.length > 0 && (
        <div className="mg-rail" style={{ gap: 12, margin: '0 -4px', padding: '0 4px' }}>
          {results.slice(0, 10).map((r: AirbnbResult) => (
            <a
              key={r.id || r.name}
              href={r.url ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-soft glass-lift"
              style={{
                flex: '0 0 228px',
                borderRadius: 16,
                overflow: 'hidden',
                textDecoration: 'none',
                color: 'var(--color-text)',
              }}
            >
              <div
                style={{
                  height: 118,
                  background: r.photoUrl
                    ? 'url("' + r.photoUrl + '") center/cover'
                    : 'linear-gradient(135deg, var(--color-accent-2-200), var(--color-accent-200))',
                }}
              />
              <div style={{ padding: '10px 12px 12px' }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    margin: 0,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: 1.3,
                    minHeight: 34,
                  }}
                >
                  {r.name}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                  {r.pricePerNight != null && (
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-accent-700)' }}>
                      ${Math.round(r.pricePerNight)}
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--color-neutral-600)' }}>
                        /night
                      </span>
                    </span>
                  )}
                  {r.rating != null && (
                    <span style={{ fontSize: 11.5, color: 'var(--color-neutral-700)', marginLeft: 'auto' }}>
                      ★ {r.rating.toFixed(2)}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    marginTop: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--color-accent-2-800)',
                  }}
                >
                  Book on {stays?.kind === 'airbnb' ? 'Airbnb' : 'site'}
                  <Icon name="arrowRight" size={11} color="var(--color-accent-2-800)" />
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
