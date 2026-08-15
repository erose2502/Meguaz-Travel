import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { gsap } from 'gsap'
import Icon, { type IconName } from './Icon'
import Spinner, { Skeleton } from './Spinner'
import DatePicker from './DatePicker'
import GlassSelect from './GlassSelect'
import type { DepartWindow, PlanOption, SolveResponse } from '../lib/api'
import type { Priority } from '../types'

type Props = {
  plan: SolveResponse | null
  loading: boolean
  refreshing: boolean
  error: string | null
  lastUpdated: number | null
  onRefresh: () => void
  priority: Priority
  onPriority: (p: Priority) => void
  arriveBy: string
  onArriveBy: (value: string) => void
  nights: number
  onNights: (value: number) => void
  adults: number
  onAdults: (value: number) => void
  budget: number
  /** Commits a new budget cap; the solver re-prices the three routes. */
  onBudget: (budget: number) => void
  departWindow: DepartWindow
  onDepartWindow: (w: DepartWindow) => void
  onSelect: (option: PlanOption) => void
  goHome: () => void
}

const PANEL: CSSProperties = {
  borderRadius: 22,
  padding: 16,
}

const MICRO: CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--color-neutral-600)',
  margin: 0,
}

const LEG_ICON: Record<string, IconName> = {
  home: 'home',
  car: 'car',
  flight: 'plane',
  train: 'tram',
}

const API_PRIORITY: Record<Priority, 'money' | 'balanced' | 'time'> = {
  'Save money': 'money',
  Balanced: 'balanced',
  'Save time': 'time',
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={MICRO}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, margin: '2px 0 0' }}>{value}</p>
    </div>
  )
}

function BriefItem({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon name={icon} size={16} color="var(--color-accent-2-700)" style={{ flex: 'none' }} />
      <div>
        <p style={MICRO}>{label}</p>
        <p style={{ fontSize: 13, fontWeight: 700, margin: '1px 0 0', whiteSpace: 'nowrap' }}>{value}</p>
      </div>
    </div>
  )
}

/** The budget stays editable after the first solve — travellers discover the
    real fares and want to nudge the cap without restarting the brief. Commits
    on blur/Enter only: every commit spends a Duffel offer request. */
function BudgetItem({ budget, onBudget }: { budget: number; onBudget: (b: number) => void }) {
  const [draft, setDraft] = useState(String(budget))
  useEffect(() => setDraft(String(budget)), [budget])
  const commit = () => {
    const n = Math.round(Number(draft))
    if (Number.isFinite(n) && n >= 50 && n <= 100000 && n !== budget) onBudget(n)
    else setDraft(String(budget))
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon name="wallet" size={16} color="var(--color-accent-2-700)" style={{ flex: 'none' }} />
      <div>
        <p style={MICRO}>Budget cap</p>
        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 13, fontWeight: 700 }}>
          $
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            inputMode="numeric"
            aria-label="Budget cap in dollars"
            style={{
              width: Math.max(3, draft.length) + 'ch',
              border: 0,
              borderBottom: '1.5px dashed var(--color-accent-2-500)',
              background: 'transparent',
              font: 'inherit',
              fontWeight: 700,
              color: 'inherit',
              padding: '1px 1px 0',
            }}
          />
        </span>
      </div>
    </div>
  )
}

/** Compact −/+ count for the brief strip. */
function MiniCount({
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
  const btn = (disabled: boolean): CSSProperties => ({
    width: 24,
    height: 24,
    flex: 'none',
    borderRadius: 999,
    border: 0,
    background: disabled ? 'transparent' : 'rgba(255,255,255,0.85)',
    boxShadow: disabled ? 'none' : '0 1px 3px rgba(46,43,37,0.15)',
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1,
    color: disabled ? 'var(--color-neutral-400)' : 'var(--color-text)',
    cursor: disabled ? 'default' : 'pointer',
  })
  return (
    <span role="group" aria-label={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
      <button type="button" aria-label={'Fewer ' + label.toLowerCase()} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} style={btn(value <= min)}>
        −
      </button>
      <span style={{ fontSize: 13, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{value}</span>
      <button type="button" aria-label={'More ' + label.toLowerCase()} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} style={btn(value >= max)}>
        +
      </button>
    </span>
  )
}

function freshness(lastUpdated: number | null) {
  if (!lastUpdated) return ''
  const secs = Math.max(0, Math.round((Date.now() - lastUpdated) / 1000))
  if (secs < 60) return secs + 's ago'
  return Math.round(secs / 60) + 'm ago'
}

export default function PlannerScreen(props: Props) {
  const {
    plan,
    loading,
    refreshing,
    error,
    lastUpdated,
    onRefresh,
    priority,
    onPriority,
    arriveBy,
    onArriveBy,
    nights,
    onNights,
    adults,
    onAdults,
    budget,
    onBudget,
    departWindow,
    onDepartWindow,
    onSelect,
    goHome,
  } = props

  // The solver's priced return date wins; before a plan lands, derive it so the
  // brief strip never shows a blank while loading.
  const returnBy =
    plan?.returnDate ??
    new Date(Date.parse(arriveBy + 'T12:00:00') + nights * 86_400_000).toISOString().slice(0, 10)
  const stay = plan?.stay ?? null

  const wanted = API_PRIORITY[priority]
  // The option that matches the traveller's priority leads; changing the
  // priority re-sorts rather than making them hunt for the highlighted card.
  const options = useMemo(() => {
    const all = plan?.options ?? []
    return [...all].sort((a, b) => Number(b.fits === wanted) - Number(a.fits === wanted))
  }, [plan, wanted])

  // The orchestrated moment: three lanes deal onto the table like cards — on a
  // new route or a priority change, never on the silent 90-second re-solve.
  const gridRef = useRef<HTMLDivElement>(null)
  const dealKey = (plan?.routeLabel ?? 'none') + '|' + wanted + '|' + (options.length > 0)
  useLayoutEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const cards = gridRef.current ? Array.from(gridRef.current.children) : []
    if (cards.length === 0) return
    const tween = gsap.fromTo(
      cards,
      {
        autoAlpha: 0,
        y: 38,
        rotate: (i: number) => (i - 1) * 1.8,
        transformOrigin: '50% 100%',
      },
      {
        autoAlpha: 1,
        y: 0,
        rotate: 0,
        duration: 0.65,
        stagger: 0.14,
        ease: 'power3.out',
        // Only the animated properties — 'all' would strip the cards' inline
        // styles (padding, border, layout) once the tween completes.
        clearProps: 'transform,opacity,visibility',
      },
    )
    return () => {
      tween.kill()
    }
  }, [dealKey])

  return (
    <div data-screen-label="Planner">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <button
          className="glass hv-white"
          onClick={goHome}
          aria-label="Back to home"
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-accent-700)',
              margin: 0,
            }}
          >
            Step 1 of 2 · {options.length ? options.length + ' ways that fit' : 'Solve it'}
          </p>
          <h1 style={{ fontSize: 'clamp(22px,2.8vw,34px)', lineHeight: 1.08, margin: '2px 0 0' }}>
            {plan ? plan.routeLabel : 'Ways that work'}
          </h1>
        </div>
        <button
          className="glass hv-white"
          onClick={onRefresh}
          disabled={refreshing || loading}
          style={{
            flex: 'none',
            borderRadius: 999,
            padding: '8px 14px',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--color-neutral-700)',
            cursor: refreshing ? 'progress' : 'pointer',
          }}
        >
          {refreshing ? (
            <Spinner size={12} label="Refreshing" />
          ) : lastUpdated ? (
            'Fares ' + freshness(lastUpdated)
          ) : (
            'Refresh'
          )}
        </button>
      </div>

      {/* Brief strip — full width so the options below get the whole page */}
      <div
        className="glass-strong"
        style={{
          ...PANEL,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 'clamp(14px,2.4vw,28px)',
          marginBottom: 14,
          // Popovers (calendar, departs) must paint over the banners and
          // cards below; without this the strip has no stacking context and
          // later siblings win.
          position: 'relative',
          zIndex: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div>
            <p style={MICRO}>From</p>
            <p style={{ fontSize: 14, fontWeight: 700, margin: '2px 0 0' }}>{plan?.brief.from ?? '—'}</p>
          </div>
          <Icon name="arrowRight" size={15} color="var(--color-accent)" style={{ flex: 'none' }} />
          <div>
            <p style={MICRO}>To</p>
            <p style={{ fontSize: 14, fontWeight: 700, margin: '2px 0 0' }}>{plan?.brief.to ?? '—'}</p>
          </div>
        </div>

        {/* The whole brief stays editable after the first solve — real fares
            change minds, and going back to Home to change a date is a wall. */}
        <div style={{ flex: '0 1 168px', minWidth: 150 }}>
          <p style={MICRO}>Arrive by</p>
          <div style={{ marginTop: 3 }}>
            <DatePicker value={arriveBy} onChange={onArriveBy} id="mg-plan-date" />
          </div>
        </div>

        <div>
          <p style={MICRO}>Nights</p>
          <MiniCount value={nights} min={1} max={90} onChange={onNights} label="Nights" />
          <p style={{ fontSize: 10.5, color: 'var(--color-neutral-600)', margin: '3px 0 0' }}>
            back {returnBy}
          </p>
        </div>

        <div>
          <p style={MICRO}>Travellers</p>
          <MiniCount value={adults} min={1} max={9} onChange={onAdults} label="Travellers" />
        </div>

        <BudgetItem budget={budget} onBudget={onBudget} />

        <div>
          <p style={MICRO}>Departs</p>
          <div style={{ marginTop: 3 }}>
            <GlassSelect
              ariaLabel="Departure time window"
              variant="chip"
              value={departWindow}
              onChange={onDepartWindow}
              options={[
                { value: 'any', label: 'Any time' },
                { value: 'morning', label: 'Morning' },
                { value: 'afternoon', label: 'Afternoon' },
                { value: 'evening', label: 'Evening' },
              ]}
            />
          </div>
        </div>
        {stay && (
          <BriefItem
            icon="home"
            label={'Stay est. (' + stay.kind + ')'}
            value={'~$' + stay.nightlyUsd + '/night · $' + stay.totalUsd + ' total'}
          />
        )}

        {/* Grows to fill its row — pinned right it left a dead hole when the
            control count pushed it onto a second line. */}
        <div style={{ minWidth: 230, flex: '1 1 260px' }}>
          <p style={{ fontSize: 11, color: 'var(--color-neutral-700)', margin: '0 0 5px' }}>
            What matters most this trip?
          </p>
          <div className="seg" style={{ display: 'flex', width: '100%', background: 'rgba(255,255,255,0.5)' }}>
            {(['Save money', 'Balanced', 'Save time'] as Priority[]).map((option) => (
              <label key={option} className="seg-opt" style={{ flex: 1, justifyContent: 'center', fontWeight: 600 }}>
                <input
                  type="radio"
                  name="mg-app-priority"
                  checked={priority === option}
                  onChange={() => onPriority(option)}
                />
                {option === 'Save money' ? 'Money' : option === 'Save time' ? 'Time' : 'Balanced'}
              </label>
            ))}
          </div>
        </div>
      </div>

      {plan?.originAdvice && (
        <div
          className="glass-accent"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            borderRadius: 16,
            padding: '12px 14px',
            marginBottom: 12,
          }}
        >
          <Icon name="sparkle" size={16} color="var(--color-accent-800)" style={{ flex: 'none', marginTop: 1 }} />
          <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--color-accent-900, var(--color-accent-800))', margin: 0 }}>
            {plan.originAdvice} Change it under “Leaving from” on the home screen.
          </p>
        </div>
      )}

      {plan && !plan.meetsDeadline && (
        <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--color-accent-800)', margin: '0 0 12px' }}>
          Nothing lands before your arrive-by time. These are the closest options.
        </p>
      )}

      {plan && plan.matchesWindow === false && (
        <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--color-accent-800)', margin: '0 0 12px' }}>
          No {departWindow} departures on this route for that day — showing all departure times.
        </p>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="glass" style={{ ...PANEL, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Spinner size={20} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Searching live fares…</p>
              <p style={{ fontSize: 12, color: 'var(--color-neutral-700)', margin: '3px 0 0' }}>
                Pricing real airline offers, transfers and stays against your budget and arrival time.
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 12 }}>
            <div className="glass" style={PANEL}>
              <Skeleton height={150} />
            </div>
            <div className="glass" style={PANEL}>
              <Skeleton height={150} />
            </div>
            <div className="glass" style={PANEL}>
              <Skeleton height={150} />
            </div>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="glass-accent" style={PANEL}>
          <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Couldn&rsquo;t solve this trip</p>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-neutral-800)', margin: '4px 0 8px' }}>
            {error}
          </p>
          <button
            className="hv-accent"
            onClick={onRefresh}
            style={{
              border: 0,
              borderRadius: 999,
              padding: '10px 18px',
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-heading)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Options fill the full width; three abreast on a desktop screen */}
      <div
        ref={gridRef}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 12 }}
      >
        {options.map((route) => {
          const chosen = route.fits === wanted
          const under = budget - route.cost
          // The airport→city leg the solver actually priced, plus the live
          // alternatives it found (FlixBus, rail, local operators).
          const transit = route.steps.find((s) => s.id === 'rail') ?? null
          return (
            <div
              key={route.id}
              className="glass glass-lift"
              role="button"
              tabIndex={0}
              onClick={() => onSelect(route)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(route)
                }
              }}
              style={{
                ...PANEL,
                display: 'flex',
                flexDirection: 'column',
                border: '2px solid ' + (chosen ? 'var(--color-accent)' : 'transparent'),
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div>
                  {chosen && (
                    <span className="tag tag-accent" style={{ marginBottom: 6 }}>
                      Recommended for your priority
                    </span>
                  )}
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: 20, lineHeight: 1.15, margin: 0 }}>
                    {route.name}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--color-neutral-700)', margin: '3px 0 0' }}>
                    {route.tagline}
                  </p>
                  {route.airline && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        marginTop: 8,
                        padding: '4px 10px 4px 5px',
                        borderRadius: 999,
                        background: 'rgba(255,255,255,0.65)',
                        border: '1px solid rgba(46,43,37,0.1)',
                      }}
                    >
                      {route.airline.logo ? (
                        <img
                          src={route.airline.logo}
                          alt=""
                          width={18}
                          height={18}
                          loading="lazy"
                          style={{ borderRadius: 5, display: 'block' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <Icon name="plane" size={13} color="var(--color-neutral-600)" />
                      )}
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--color-neutral-800)' }}>
                        {route.airline.name}
                        {route.airline.iata ? ' · ' + route.airline.iata : ''}
                      </span>
                    </span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: 24, lineHeight: 1, margin: 0 }}>
                    ${route.cost}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: under >= 0 ? 'var(--color-accent-2-700)' : 'var(--color-accent-800)',
                      margin: '3px 0 0',
                    }}
                  >
                    {under >= 0 ? '$' + under + ' under budget' : '$' + Math.abs(under) + ' over budget'}
                  </p>
                  {stay && (
                    <p style={{ fontSize: 11, color: 'var(--color-neutral-600)', margin: '3px 0 0' }}>
                      + ~${stay.totalUsd} stay · {stay.nights} nights
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', marginTop: 12 }}>
                <Stat label="Door to door" value={route.doorToDoor} />
                <Stat label="Leave home" value={route.leaveBy} />
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'flex', gap: 3 }}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        style={{
                          width: 8,
                          height: 14,
                          borderRadius: 999,
                          background: i < route.buffer ? 'var(--color-accent-2-500)' : 'rgba(46,43,37,0.14)',
                        }}
                      />
                    ))}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--color-neutral-700)' }}>{route.bufferLabel}</span>
                </div>
              </div>

              {route.legs.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                  {route.legs.map((leg, i) => (
                    <span key={i} style={{ display: 'contents' }}>
                      {i > 0 && (
                        <span style={{ flex: 1, minWidth: 12, height: 1, background: 'rgba(46,43,37,0.16)' }} />
                      )}
                      <span
                        title={leg.label + (leg.time ? ' · ' + leg.time : '')}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 999,
                          background:
                            leg.type === 'flight' ? 'var(--color-accent-200)' : 'rgba(255,255,255,0.65)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon
                          name={LEG_ICON[leg.type] || 'plane'}
                          size={14}
                          color={
                            leg.type === 'flight' ? 'var(--color-accent-700)' : 'var(--color-neutral-800)'
                          }
                        />
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {transit && (
                <div
                  className="glass-soft"
                  style={{ marginTop: 12, borderRadius: 14, padding: '9px 12px' }}
                >
                  <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>
                    {transit.label}
                    {transit.cost ? ' · ' + transit.cost : ''}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-neutral-700)', margin: '2px 0 0' }}>
                    {transit.location}
                  </p>
                  {transit.note && (
                    <p
                      style={{
                        fontSize: 11,
                        lineHeight: 1.5,
                        color: 'var(--color-neutral-600)',
                        margin: '4px 0 0',
                      }}
                    >
                      {transit.note}
                    </p>
                  )}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 'auto',
                  paddingTop: 12,
                }}
              >
                <p
                  style={{
                    flex: '1 1 180px',
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: 'var(--color-neutral-700)',
                    margin: 0,
                  }}
                >
                  {route.tradeoff}
                </p>
                <button
                  className={chosen ? 'hv-accent' : 'hv-white'}
                  onClick={() => onSelect(route)}
                  style={{
                    flex: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '10px 16px',
                    borderRadius: 999,
                    border: chosen ? 0 : '1px solid var(--color-divider)',
                    background: chosen ? 'var(--color-accent)' : 'rgba(255,255,255,0.5)',
                    color: chosen ? 'var(--color-bg)' : 'var(--color-text)',
                    fontFamily: 'var(--font-heading)',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  See the plan
                  <Icon name="arrowRight" size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
