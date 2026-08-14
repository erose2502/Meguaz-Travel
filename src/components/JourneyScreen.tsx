import { useEffect, useState, type CSSProperties } from 'react'
import Icon, { type IconName } from './Icon'
import { weatherForecast, type PlanOption, type Weather } from '../lib/api'
import type { LiveLeaveBy } from '../lib/useTripPlan'

type Props = {
  option: PlanOption | null
  routeLabel: string
  budget: number
  live: LiveLeaveBy
  /** Destination airport code + city, for the on-arrival weather card. */
  dest: { city: string; code: string } | null
  goPlanner: () => void
  goLocked: () => void
}

// WMO weather codes → a glanceable glyph and a plain word.
function wmo(code: number): { glyph: string; label: string } {
  if (code === 0) return { glyph: '☀️', label: 'Clear' }
  if (code <= 2) return { glyph: '⛅️', label: 'Partly cloudy' }
  if (code === 3) return { glyph: '☁️', label: 'Overcast' }
  if (code === 45 || code === 48) return { glyph: '🌫️', label: 'Fog' }
  if (code <= 57) return { glyph: '🌦️', label: 'Drizzle' }
  if (code <= 67) return { glyph: '🌧️', label: 'Rain' }
  if (code <= 77) return { glyph: '❄️', label: 'Snow' }
  if (code <= 82) return { glyph: '🌧️', label: 'Showers' }
  if (code <= 86) return { glyph: '❄️', label: 'Snow showers' }
  return { glyph: '⛈️', label: 'Thunderstorms' }
}

function WeatherCard({ dest }: { dest: { city: string; code: string } }) {
  const [weather, setWeather] = useState<Weather | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    setWeather(null)
    setFailed(false)

    // Rate limits are shared across the whole screen's calls, so a 429 here is
    // usually transient — retry twice with a pause before giving up.
    const attempt = (retriesLeft: number) => {
      weatherForecast(dest.code, controller.signal)
        .then(setWeather)
        .catch((err) => {
          if (controller.signal.aborted || (err as Error).name === 'AbortError') return
          if (retriesLeft > 0) {
            timer = setTimeout(() => attempt(retriesLeft - 1), 6000)
          } else {
            setFailed(true)
          }
        })
    }
    attempt(2)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [dest.code])

  const now = weather ? wmo(weather.current.code) : null
  return (
    <div className="glass-strong" style={{ borderRadius: 22, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="sparkle" size={15} color="var(--color-accent-2-700)" />
        <span
          style={{
            fontSize: 10,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: 'var(--color-neutral-700)',
          }}
        >
          Weather · {dest.city}
        </span>
      </div>

      {failed ? (
        <p style={{ fontSize: 12, color: 'var(--color-neutral-600)', margin: '12px 0 0' }}>
          Weather is unavailable right now — the plan is unaffected.
        </p>
      ) : !weather ? (
        <p style={{ fontSize: 12, color: 'var(--color-neutral-600)', margin: '12px 0 0' }}>
          Checking the sky over {dest.city}…
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '10px 0 0' }}>
            <span style={{ fontSize: 34, lineHeight: 1 }} aria-hidden="true">
              {now?.glyph}
            </span>
            <div>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: 30, lineHeight: 1, margin: 0 }}>
                {weather.current.tempC}°C
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-neutral-700)', margin: '3px 0 0' }}>
                {now?.label} right now
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 4,
              marginTop: 12,
              paddingTop: 10,
              borderTop: '1px solid var(--color-divider)',
            }}
          >
            {weather.daily.slice(0, 5).map((day) => (
              <div key={day.date} style={{ textAlign: 'center', minWidth: 0 }}>
                <p style={{ fontSize: 10, color: 'var(--color-neutral-600)', margin: 0 }}>
                  {new Date(day.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })}
                </p>
                <p style={{ fontSize: 16, margin: '2px 0' }} aria-hidden="true">
                  {wmo(day.code).glyph}
                </p>
                <p style={{ fontSize: 11, fontWeight: 700, margin: 0 }}>
                  {day.maxC}°
                  <span style={{ color: 'var(--color-neutral-500)', fontWeight: 400 }}> {day.minC}°</span>
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const PANEL: CSSProperties = { borderRadius: 22, padding: 16 }

const CAPS: CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  color: 'var(--color-neutral-700)',
}

const STEP_ICON: Record<string, IconName> = {
  home: 'home',
  car: 'car',
  flight: 'plane',
  checkin: 'shieldCheck',
  buffer: 'coffee',
  door: 'mapPin',
  train: 'tram',
}

export default function JourneyScreen({ option, routeLabel, budget, live, dest, goPlanner, goLocked }: Props) {
  if (!option) {
    return (
      <div data-screen-label="Journey" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
        <div className="glass" style={{ ...PANEL, padding: 24 }}>
          <h1 style={{ fontSize: 24, margin: '0 0 8px' }}>No plan selected yet</h1>
          <p style={{ fontSize: 13, color: 'var(--color-neutral-700)', margin: '0 0 14px' }}>
            Pick one of the three routes and its full door-to-door plan appears here.
          </p>
          <button
            className="hv-accent"
            onClick={goPlanner}
            style={{
              border: 0,
              borderRadius: 999,
              padding: '11px 20px',
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-heading)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Choose a route
          </button>
        </div>
      </div>
    )
  }

  const under = budget - option.cost
  const total = option.costBreakdown.reduce((sum, line) => sum + line.amount, 0) || option.cost

  return (
    <div data-screen-label="Journey">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          className="glass hv-white"
          onClick={goPlanner}
          aria-label="Back to the route options"
          style={{
            width: 38,
            height: 38,
            flex: 'none',
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Icon name="arrowLeft" size={16} color="var(--color-text)" />
        </button>
        <div>
          <p
            style={{
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-accent-700)',
              margin: 0,
            }}
          >
            Step 2 of 2 · {routeLabel}
          </p>
          <h1 style={{ fontSize: 'clamp(22px,2.8vw,34px)', lineHeight: 1.08, margin: '2px 0 0' }}>
            {option.name}
          </h1>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }}>
        {/* Budgets — pinned beside the tall plan on wide screens only; when
            the columns stack on mobile, sticky would make the plan below
            scroll up underneath this block. */}
        <div
          className="mg-side-sticky"
          style={{
            flex: '1 1 250px',
            minWidth: 240,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div className="glass-strong" style={PANEL}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="wallet" size={15} color="var(--color-accent-700)" />
              <span style={CAPS}>Money budget</span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 11,
                  fontWeight: 700,
                  color: under >= 0 ? 'var(--color-accent-2-700)' : 'var(--color-accent-800)',
                }}
              >
                {under >= 0 ? '$' + under + ' to spare' : '$' + Math.abs(under) + ' over'}
              </span>
            </div>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 30, lineHeight: 1, margin: '10px 0 0' }}>
              ${option.cost}
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontWeight: 400,
                  color: 'var(--color-neutral-600)',
                }}
              >
                {' '}
                of ${budget} cap
              </span>
            </p>
            <div
              style={{
                height: 8,
                borderRadius: 999,
                overflow: 'hidden',
                display: 'flex',
                background: 'rgba(46,43,37,0.12)',
                margin: '12px 0 10px',
              }}
            >
              {option.costBreakdown.map((line) => (
                <span
                  key={line.label}
                  style={{
                    width: Math.max(2, Math.round((line.amount / Math.max(total, 1)) * 100)) + '%',
                    background: line.color,
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {option.costBreakdown.map((line) => (
                <div key={line.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: line.color }} />
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--color-neutral-700)' }}>{line.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>${line.amount}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-strong" style={PANEL}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="clock" size={15} color="var(--color-accent-2-700)" />
              <span style={CAPS}>Time budget</span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--color-accent-2-700)',
                }}
              >
                {option.bufferMin} min buffer
              </span>
            </div>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 28, lineHeight: 1, margin: '10px 0 0' }}>
              {option.doorToDoor}
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontWeight: 400,
                  color: 'var(--color-neutral-600)',
                }}
              >
                {' '}
                door to door
              </span>
            </p>
            <div
              style={{
                marginTop: 12,
                borderRadius: 18,
                background: 'var(--color-accent-200)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    color: 'var(--color-accent-800)',
                    margin: 0,
                  }}
                >
                  Leave home by
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 28,
                    lineHeight: 1,
                    color: 'var(--color-accent-800)',
                    margin: '3px 0 0',
                  }}
                >
                  {live.leaveBy || option.leaveBy}
                </p>
              </div>
              <Icon name="clock" size={24} color="var(--color-accent-700)" />
            </div>
            <p style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--color-neutral-700)', margin: '10px 0 0' }}>
              {live.live
                ? 'Live drive time from where you are now: ' +
                  live.driveMinutes +
                  ' min' +
                  (live.trafficAware ? ', traffic-aware.' : '.')
                : 'Allow location access and this recalculates from live traffic between you and ' +
                  option.originAirport +
                  '.'}
            </p>
          </div>

          {dest && <WeatherCard dest={dest} />}
        </div>

        {/* Door-to-gate plan — one itinerary document with a continuous spine,
            not a stack of cards. The flight is the centrepiece. */}
        <div style={{ flex: '2.4 1 400px', minWidth: 280 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, margin: '0 0 12px' }}>
            <h2 style={{ fontSize: 'clamp(18px,2vw,24px)', margin: 0 }}>Your door-to-gate plan</h2>
            {/* Real fare allowance from the airline, not boilerplate. */}
            <span className="tag tag-accent-2" style={{ fontSize: 11.5, fontWeight: 700 }}>
              {option.bags.checked > 0
                ? `${option.bags.carryOn || 1} carry-on + ${option.bags.checked} checked included`
                : option.bags.feeAdded > 0
                  ? `Carry-on fare · checked bag added ($${option.bags.feeAdded} est.)`
                  : `Carry-on only fare`}
            </span>
          </div>

          <div
            className="glass-strong grain"
            style={{
              borderRadius: 24,
              padding: 'clamp(14px,1.8vw,22px) clamp(14px,1.8vw,22px) clamp(6px,1vw,10px)',
              backgroundColor: 'rgba(255,252,247,0.9)',
            }}
          >
            {option.steps.map((step, i) => {
              const isMain = step.kind === 'main'
              const isBuffer = step.kind === 'buffer'
              const isGo = step.kind === 'go'
              const first = i === 0
              const last = i === option.steps.length - 1
              const spine = 'rgba(46,43,37,0.16)'
              return (
                <div key={step.id} style={{ display: 'flex', gap: 14 }}>
                  {/* The spine: a continuous line through every node. */}
                  <div
                    style={{
                      flex: 'none',
                      width: 38,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ width: 2, height: 6, background: first ? 'transparent' : spine }} />
                    <span
                      style={{
                        flex: 'none',
                        width: 38,
                        height: 38,
                        borderRadius: 999,
                        background: isGo
                          ? 'var(--color-accent)'
                          : isMain
                            ? 'var(--color-neutral-900)'
                            : isBuffer
                              ? 'var(--color-accent-2-200)'
                              : '#fff',
                        border: isGo || isMain ? 'none' : '1px solid rgba(46,43,37,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon
                        name={STEP_ICON[step.icon] || 'mapPin'}
                        size={17}
                        color={
                          isGo
                            ? 'var(--color-bg)'
                            : isMain
                              ? 'var(--color-neutral-100)'
                              : isBuffer
                                ? 'var(--color-accent-2-800)'
                                : 'var(--color-neutral-800)'
                        }
                      />
                    </span>
                    <span style={{ width: 2, flex: 1, minHeight: 6, background: last ? 'transparent' : spine }} />
                  </div>

                  {/* Row content: quiet typography for routine steps, an inset
                      dark panel for the flight, a slim pill for the buffer. */}
                  <div style={{ flex: 1, minWidth: 0, padding: last ? '2px 0 10px' : '2px 0 16px' }}>
                    {isMain ? (
                      <div
                        className="glass-dark"
                        style={{
                          borderRadius: 16,
                          padding: '13px 16px',
                          backgroundColor: 'rgba(36,33,28,0.92)',
                        }}
                      >
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
                          <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{step.label}</p>
                          <span style={{ fontSize: 12, opacity: 0.75 }}>{step.time}</span>
                        </div>
                        <p style={{ fontSize: 12, margin: '4px 0 0', opacity: 0.78 }}>
                          {step.location}
                          {step.location && step.detail ? ' · ' : ''}
                          {step.detail}
                          {step.cost ? ' · ' + step.cost : ''}
                        </p>
                      </div>
                    ) : isBuffer ? (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: 8,
                          borderRadius: 999,
                          padding: '9px 16px',
                          background: 'rgba(205,234,227,0.8)',
                        }}
                      >
                        <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: 'var(--color-accent-2-800)' }}>
                          {step.label}
                        </p>
                        <span style={{ fontSize: 12, color: 'var(--color-accent-2-700)' }}>{step.location}</span>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
                          <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
                            {step.label}
                            {step.cost ? (
                              <span style={{ color: 'var(--color-accent-700)', fontWeight: 700 }}>
                                {' · ' + step.cost}
                              </span>
                            ) : null}
                          </p>
                          <span style={{ fontSize: 12, color: 'var(--color-neutral-600)', whiteSpace: 'nowrap' }}>
                            {step.time}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, margin: '3px 0 0', color: 'var(--color-neutral-700)' }}>
                          {step.location}
                          {step.location && step.detail ? ' · ' : ''}
                          {step.detail}
                        </p>
                      </>
                    )}
                    {step.note && (
                      <p
                        style={{
                          fontSize: 11,
                          lineHeight: 1.5,
                          color: 'var(--color-accent-800)',
                          background: 'rgba(255,225,208,0.65)',
                          borderRadius: 12,
                          padding: '8px 10px',
                          margin: '8px 0 0',
                        }}
                      >
                        {step.note}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div
            className="glass-strong"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 12,
              marginTop: 16,
              borderRadius: 20,
              padding: 14,
            }}
          >
            <div style={{ flex: '1 1 120px' }}>
              <p style={{ fontSize: 11, color: 'var(--color-neutral-600)', margin: 0 }}>
                Total · {under >= 0 ? '$' + under + ' under budget' : '$' + Math.abs(under) + ' over'}
              </p>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: 24, lineHeight: 1, margin: '3px 0 0' }}>
                ${option.cost}
              </p>
            </div>
            <button
              className="hv-accent"
              onClick={goLocked}
              style={{
                flex: '1 1 200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '14px 20px',
                border: 0,
                borderRadius: 999,
                background: 'var(--color-accent)',
                color: 'var(--color-bg)',
                fontFamily: 'var(--font-heading)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              <Icon name="lock" size={15} />
              Lock in this plan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
