import Icon from './Icon'
import Spinner, { Skeleton } from './Spinner'
import type { SessionUser, Trip } from '../lib/api'

type Props = {
  user: SessionUser | null
  trips: Trip[]
  loading: boolean
  error: string | null
  onReload: () => void
  onDelete: (id: string) => Promise<void>
  goPlanner: () => void
  goAccount: () => void
}

const LANE_LABEL: Record<string, string> = {
  saver: 'Frugal route',
  balanced: 'Balanced route',
  comfort: 'Calm route',
}

function formatDate(iso: string | null) {
  if (!iso) return 'Date to confirm'
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, (m || 1) - 1, d || 1)
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

function daysUntil(iso: string | null) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  const target = new Date(y, (m || 1) - 1, d || 1)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export default function TripsScreen({
  user,
  trips,
  loading,
  error,
  onReload,
  onDelete,
  goPlanner,
  goAccount,
}: Props) {
  const confirmDelete = (trip: Trip) => {
    if (window.confirm('Remove "' + trip.destination + '" from your trips? This cannot be undone.')) {
      onDelete(trip.id).catch(() => window.alert('Could not delete that trip — try again.'))
    }
  }
  const upcoming = trips.filter((t) => {
    const days = daysUntil(t.start_date)
    return days === null || days >= 0
  })
  const past = trips.filter((t) => {
    const days = daysUntil(t.start_date)
    return days !== null && days < 0
  })

  return (
    <div data-screen-label="Trips">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          margin: '0 0 16px',
        }}
      >
        <h1 style={{ fontSize: 'clamp(26px,3.4vw,40px)', lineHeight: 1.05, margin: 0 }}>Trips</h1>
        {user && (
          <button
            className="glass hv-white"
            onClick={onReload}
            style={{
              borderRadius: 999,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--color-neutral-700)',
              cursor: 'pointer',
            }}
          >
            {loading ? <Spinner size={12} label="Loading" /> : 'Refresh'}
          </button>
        )}
      </div>

      {!user && (
        <div className="glass" style={{ borderRadius: 22, padding: 24, textAlign: 'center' }}>
          <span
            className="glass-accent"
            style={{
              width: 52,
              height: 52,
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="ticket" size={22} color="var(--color-accent-800)" />
          </span>
          <h2 style={{ fontSize: 20, margin: '12px 0 6px' }}>Your trips live in your account</h2>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: 'var(--color-neutral-700)',
              margin: '0 auto 16px',
              maxWidth: '46ch',
            }}
          >
            Sign in and every plan you lock in is saved here — with its leave-home time, total cost and the
            phrases you saved for that destination.
          </p>
          <button
            className="hv-accent"
            onClick={goAccount}
            style={{
              border: 0,
              borderRadius: 999,
              padding: '12px 22px',
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-heading)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Sign in or create an account
          </button>
        </div>
      )}

      {user && loading && trips.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Skeleton height={104} radius={22} />
          <Skeleton height={104} radius={22} />
        </div>
      )}

      {user && error && (
        <div className="glass-accent" style={{ borderRadius: 20, padding: 18 }}>
          <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{error}</p>
          <button
            className="hv-white glass"
            onClick={onReload}
            style={{
              marginTop: 10,
              borderRadius: 999,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      )}

      {user && !loading && !error && trips.length === 0 && (
        <div className="glass" style={{ borderRadius: 22, padding: 24, textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, margin: '0 0 6px' }}>No trips yet</h2>
          <p style={{ fontSize: 13, color: 'var(--color-neutral-700)', margin: '0 0 16px' }}>
            Plan a journey and lock it in — it will appear here with everything you need on the day.
          </p>
          <button
            className="hv-accent"
            onClick={goPlanner}
            style={{
              border: 0,
              borderRadius: 999,
              padding: '12px 22px',
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-heading)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Plan a trip
          </button>
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {upcoming.map((trip, i) => {
            const days = daysUntil(trip.start_date)
            const origin = typeof trip.brief?.origin === 'string' ? trip.brief.origin : null
            return (
              <div
                key={trip.id}
                className={i === 0 ? 'glass-strong' : 'glass'}
                style={{ borderRadius: 22, padding: 18 }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                  <span className="tag tag-accent-2">
                    {trip.status === 'booked' ? 'Confirmed' : trip.status}
                  </span>
                  {trip.cost_lane && (
                    <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>
                      {LANE_LABEL[trip.cost_lane] ?? trip.cost_lane}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-neutral-600)' }}>
                    {formatDate(trip.start_date)}
                  </span>
                  <button
                    className="hv-white"
                    onClick={() => confirmDelete(trip)}
                    aria-label={'Delete trip to ' + trip.destination}
                    title="Delete this trip"
                    style={{
                      width: 30,
                      height: 30,
                      flex: 'none',
                      border: '1px solid var(--color-divider)',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.55)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon name="trash" size={14} color="var(--color-neutral-700)" />
                  </button>
                </div>

                <p
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'clamp(19px,2.2vw,26px)',
                    lineHeight: 1.15,
                    margin: '10px 0 0',
                  }}
                >
                  {origin ? origin + ' → ' + trip.destination : trip.title}
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 16,
                    marginTop: 12,
                  }}
                >
                  {days !== null && (
                    <div>
                      <p
                        style={{
                          fontSize: 10,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'var(--color-neutral-600)',
                          margin: 0,
                        }}
                      >
                        Departs
                      </p>
                      <p style={{ fontSize: 14, fontWeight: 700, margin: '2px 0 0' }}>
                        {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : 'in ' + days + ' days'}
                      </p>
                    </div>
                  )}
                  <div>
                    <p
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--color-neutral-600)',
                        margin: 0,
                      }}
                    >
                      Total
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 700, margin: '2px 0 0' }}>
                      ${Math.round(Number(trip.estimated_total_usd ?? 0))}
                    </p>
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--color-neutral-600)',
                        margin: 0,
                      }}
                    >
                      Travellers
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 700, margin: '2px 0 0' }}>{trip.party_adults}</p>
                  </div>
                  {trip.budget_usd != null && (
                    <div>
                      <p
                        style={{
                          fontSize: 10,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'var(--color-neutral-600)',
                          margin: 0,
                        }}
                      >
                        Under cap by
                      </p>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          margin: '2px 0 0',
                          color: 'var(--color-accent-2-700)',
                        }}
                      >
                        ${Math.round(Number(trip.budget_usd) - Number(trip.estimated_total_usd ?? 0))}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {past.length > 0 && (
        <>
          <p
            style={{
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-neutral-600)',
              margin: '22px 0 10px',
            }}
          >
            Earlier trips
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {past.map((trip) => (
              <div
                key={trip.id}
                className="glass-soft"
                style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 18, padding: '14px 16px' }}
              >
                <span
                  style={{
                    width: 38,
                    height: 38,
                    flex: 'none',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.65)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="plane" size={16} color="var(--color-neutral-800)" />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{trip.destination}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-neutral-600)', margin: '2px 0 0' }}>
                    {formatDate(trip.start_date)} · ${Math.round(Number(trip.estimated_total_usd ?? 0))}
                  </p>
                </div>
                <button
                  className="hv-white"
                  onClick={() => confirmDelete(trip)}
                  aria-label={'Delete trip to ' + trip.destination}
                  title="Delete this trip"
                  style={{
                    width: 30,
                    height: 30,
                    flex: 'none',
                    border: '1px solid var(--color-divider)',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Icon name="trash" size={14} color="var(--color-neutral-700)" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {user && trips.length > 0 && (
        <button
          className="glass hv-white"
          onClick={goPlanner}
          style={{
            width: '100%',
            marginTop: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: 14,
            borderRadius: 999,
            fontFamily: 'var(--font-heading)',
            fontSize: 14,
            color: 'var(--color-text)',
            cursor: 'pointer',
          }}
        >
          Plan another trip
          <Icon name="arrowRight" size={15} />
        </button>
      )}
    </div>
  )
}
