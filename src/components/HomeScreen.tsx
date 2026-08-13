import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { gsap } from 'gsap'
import Icon, { type IconName } from './Icon'
import TripBriefBar from './TripBriefBar'
import SpotlightVideo from './SpotlightVideo'
import { formatDuration, type Destination } from '../data/destinations'
import { COUNTRY_ESSENTIALS } from '../data/countryEssentials'
import { FEATURED_PLANS, SPOTLIGHTS } from '../data/plans'
import type { CabinClass, NearbyAirport, TransferMode, Trip } from '../lib/api'
import type { Priority } from '../types'

type Props = {
  dest: Destination | null
  query: string
  onQuery: (value: string) => void
  matches: Destination[]
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
  onSolve: () => void
  solving: boolean
  originAirport: string
  priority: Priority
  trips: Trip[]
  signedIn: boolean
  /** Destination-specific fun facts; the ticker uses these once a city is picked. */
  destFacts: string[]
  hasPhrasePack: boolean
  phraseKicker: string
  phrasesSaved: number
  phrasesTotal: number
  sceneSubhead: string
  clips: { src: string; label: string; note: string }[]
  scenes: string[]
  showStills: boolean
  scenesLoading: boolean
  goPlanner: () => void
  goPlans: () => void
  onPickPlan: (code: string, nights?: number) => void
  goJourney: () => void
  goPhrases: () => void
  goTrips: () => void
  goBriefing: () => void
}

const SECTION_HEAD: CSSProperties = {
  fontSize: 'clamp(19px,2vw,25px)',
  margin: 'clamp(20px,2.2vw,28px) 0 clamp(8px,1vw,12px)',
}

const SCENE_LABELS = ['Scene 1 · Arrival', 'Scene 2 · Streets', 'Scene 3 · Landmarks']

// Rotating hero copy — small true things that make a traveller smile.
const FUN_FACTS = [
  'Personalized travel plans, crafted just for you.',
  'Fun fact: the shortest scheduled flight on earth lasts 57 seconds, in Orkney, Scotland.',
  "Fun fact: Japan's rail network is so punctual that a 1-minute delay comes with an apology.",
  'Fun fact: Singapore Changi has a butterfly garden between gates.',
  'Fun fact: there are more than 40,000 airports on the planet — you have options.',
  'Fun fact: the Trans-Siberian railway crosses eight time zones on one ticket.',
  "Fun fact: Iceland has no mosquitoes. None. Bring everything else, skip the spray.",
  'Fun fact: in Lisbon, the ginjinha shot glass is sometimes made of chocolate. Eat the glass.',
  'Fun fact: Venice builds on wooden piles driven a thousand years ago — still holding.',
  'Fun fact: the world’s deepest metro station is in Kyiv, 105 m under the city.',
]

function daysUntil(iso: string | null) {
  if (!iso) return null
  return Math.round((Date.parse(iso + 'T00:00:00') - new Date().setHours(0, 0, 0, 0)) / 86_400_000)
}

/**
 * Departure-board fact ticker: types each fact out character by character,
 * holds, then moves to the next. Fixed footprint — the chip never resizes, so
 * the layout below it never shifts.
 */
function FactTicker({ facts }: { facts: string[] }) {
  const [factIndex, setFactIndex] = useState(0)
  const [chars, setChars] = useState(0)
  const text = facts[factIndex]

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced || document.visibilityState !== 'visible') {
      setChars(text.length)
      const hold = setTimeout(() => setFactIndex((i) => (i + 1) % facts.length), 9000)
      return () => clearTimeout(hold)
    }
    setChars(0)
    let i = 0
    const type = setInterval(() => {
      i += 1
      setChars(i)
      if (i >= text.length) clearInterval(type)
    }, 24)
    const hold = setTimeout(
      () => setFactIndex((n) => (n + 1) % facts.length),
      text.length * 24 + 4200,
    )
    return () => {
      clearInterval(type)
      clearTimeout(hold)
    }
  }, [factIndex, text, facts.length])

  return (
    <p
      role="status"
      aria-label={text}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        margin: 0,
        width: 'min(620px, 100%)',
        minHeight: 52,
        padding: '9px 16px',
        borderRadius: 14,
        fontSize: 14,
        lineHeight: 1.5,
        color: 'var(--color-neutral-100)',
        background: 'rgba(24,20,16,0.42)',
        backdropFilter: 'blur(18px) saturate(150%)',
        WebkitBackdropFilter: 'blur(18px) saturate(150%)',
        border: '1px solid rgba(255,255,255,0.22)',
      }}
    >
      <span aria-hidden="true" style={{ color: 'var(--color-accent-300)', flex: 'none', marginTop: 1 }}>
        ✦
      </span>
      <span aria-hidden="true">
        {text.slice(0, chars)}
        <span className="mg-caret" />
      </span>
    </p>
  )
}

/**
 * Horizontal rail of plan cards: native swipe with snap points on touch,
 * arrow buttons on both sides for pointer devices, edges fade the arrows out.
 */
function PlansRail({ onPickPlan }: { onPickPlan: (code: string, nights?: number) => void }) {
  const railRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(true)

  const update = () => {
    const el = railRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 8)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
  }

  const nudge = (dir: 1 | -1) => {
    const el = railRef.current
    if (!el) return
    const card = el.firstElementChild as HTMLElement | null
    const step = (card?.offsetWidth ?? 320) + 16
    el.scrollBy({ left: dir * step * 2, behavior: 'smooth' })
  }

  const CARD: CSSProperties = {
    flex: '0 0 clamp(250px, 26vw, 340px)',
    textAlign: 'left',
    padding: 0,
    borderRadius: 22,
    overflow: 'hidden',
    cursor: 'pointer',
  }

  const arrowStyle = (side: 'left' | 'right'): CSSProperties => ({
    position: 'absolute',
    [side]: -6,
    top: '38%',
    zIndex: 5,
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 0,
    transition: 'opacity 200ms ease',
  })

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="mg-rail-arrow glass hv-white"
        onClick={() => nudge(-1)}
        aria-label="Scroll plans left"
        disabled={!canLeft}
        style={{ ...arrowStyle('left'), opacity: canLeft ? 1 : 0, pointerEvents: canLeft ? 'auto' : 'none' }}
      >
        <Icon name="arrowLeft" size={17} color="var(--color-text)" />
      </button>
      <button
        className="mg-rail-arrow glass hv-white"
        onClick={() => nudge(1)}
        aria-label="Scroll plans right"
        disabled={!canRight}
        style={{ ...arrowStyle('right'), opacity: canRight ? 1 : 0, pointerEvents: canRight ? 'auto' : 'none' }}
      >
        <Icon name="arrowRight" size={17} color="var(--color-text)" />
      </button>

      <div ref={railRef} className="mg-rail" onScroll={update} style={{ gap: 16, padding: '4px 2px 10px' }}>
        {FEATURED_PLANS.map((plan) => (
          <button
            key={plan.title}
            className="glass glass-lift"
            onClick={() => onPickPlan(plan.code, plan.nights)}
            style={CARD}
          >
            <img
              className="washed"
              src={plan.img}
              alt={plan.alt}
              style={{ width: '100%', height: 'clamp(140px,13vw,170px)', objectFit: 'cover', display: 'block' }}
            />
            <div style={{ padding: 16 }}>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: 17, lineHeight: 1.15, margin: 0 }}>
                {plan.title}
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-neutral-600)', margin: '5px 0 0' }}>{plan.stops}</p>
              <p style={{ fontSize: 11, color: 'var(--color-neutral-600)', margin: '2px 0 0' }}>
                {plan.nights} nights
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 19,
                  color: 'var(--color-accent-700)',
                  margin: '8px 0 0',
                }}
              >
                {plan.estimate}
              </p>
            </div>
          </button>
        ))}

        {SPOTLIGHTS.map((d) => (
          <button key={d.code} className="glass glass-lift" onClick={() => onPickPlan(d.code)} style={CARD}>
            <SpotlightVideo src={d.clip} alt={'Cinematic aerial of ' + d.city} height="clamp(140px,13vw,170px)" />
            <div style={{ padding: 16, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--font-heading)', fontSize: 17, lineHeight: 1.15, margin: 0 }}>
                  {d.city}
                </p>
                <p style={{ fontSize: 11, color: 'var(--color-neutral-600)', margin: '4px 0 0' }}>
                  {d.country} · ~{formatDuration(d.hrs)} flight
                </p>
              </div>
              <p
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 16,
                  color: 'var(--color-accent-700)',
                  margin: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                from ${d.price}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Headline whose words surface one by one — re-runs whenever the text changes. */
function AnimatedHeadline({ text }: { text: string }) {
  const ref = useRef<HTMLHeadingElement>(null)

  useLayoutEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const words = ref.current ? Array.from(ref.current.children) : []
    if (words.length === 0) return
    const tween = gsap.fromTo(
      words,
      { yPercent: 62, autoAlpha: 0, rotate: 2.5 },
      {
        yPercent: 0,
        autoAlpha: 1,
        rotate: 0,
        duration: 0.75,
        stagger: 0.08,
        ease: 'power3.out',
        clearProps: 'transform,opacity,visibility',
      },
    )
    return () => {
      tween.kill()
    }
  }, [text])

  return (
    <h1
      ref={ref}
      style={{
        fontSize: 'clamp(30px,4.6vw,56px)',
        lineHeight: 1.06,
        margin: '10px 0 10px',
        color: 'var(--color-neutral-100)',
        textShadow: '0 2px 24px rgba(0,0,0,0.5)',
      }}
    >
      {text.split(' ').map((word, i) => (
        <span key={word + i} style={{ display: 'inline-block', whiteSpace: 'pre' }}>
          {word + (i < text.split(' ').length - 1 ? ' ' : '')}
        </span>
      ))}
    </h1>
  )
}

export default function HomeScreen(props: Props) {
  const {
    dest,
    query,
    onQuery,
    matches,
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
    onSolve,
    solving,
    originAirport,
    priority,
    trips,
    signedIn,
    destFacts,
    hasPhrasePack,
    phraseKicker,
    phrasesSaved,
    phrasesTotal,
    sceneSubhead,
    clips,
    scenes,
    showStills,
    scenesLoading,
    goPlanner,
    goPlans,
    onPickPlan,
    goJourney,
    goPhrases,
    goTrips,
    goBriefing,
  } = props

  const essentials = dest ? COUNTRY_ESSENTIALS[dest.cc] : undefined

  // Live figures for the journey/trips cards — no invented numbers on screen.
  const upcoming = trips
    .filter((t) => {
      const days = daysUntil(t.start_date)
      return days !== null && days >= 0
    })
    .sort((a, b) => ((a.start_date ?? '') < (b.start_date ?? '') ? -1 : 1))
  const nextTrip = upcoming[0] ?? null
  const nextDays = nextTrip ? daysUntil(nextTrip.start_date) : null
  const nextLeaveBy =
    nextTrip && typeof nextTrip.brief?.leaveBy === 'string' ? (nextTrip.brief.leaveBy as string) : null

  const city = dest?.city ?? ''
  const sceneNotes = [
    'Arriving in ' + city + ' — the view that meets you first.',
    'Street level in ' + city + ', where the trip actually happens.',
    city + '’s landmarks, worth the detour on your way through.',
  ]

  const briefingFacts = [
    essentials && {
      icon: 'wallet' as IconName,
      label: 'Currency',
      value: essentials.currencySymbol + ' ' + essentials.currencyCode,
    },
    essentials && { icon: 'sparkle' as IconName, label: 'Sockets', value: essentials.plugs },
    essentials && { icon: 'bell' as IconName, label: 'Emergency', value: essentials.emergency.split(' ')[0] },
    essentials && {
      icon: 'car' as IconName,
      label: 'Traffic',
      value: essentials.drives === 'left' ? 'Drives left' : 'Drives right',
    },
  ].filter(Boolean) as { icon: IconName; label: string; value: string }[]

  return (
    <div data-screen-label="Home">
      {/* Headline floats directly on the living background; the reel itself is
          the whole app's backdrop (BackdropReel in App). */}
      <div style={{ padding: 'clamp(28px,7vh,84px) 0 clamp(18px,3vh,30px)' }}>
        <span
          style={{
            display: 'inline-flex',
            padding: '4px 12px',
            borderRadius: 999,
            fontSize: 11,
            letterSpacing: '0.06em',
            background: 'rgba(24,20,16,0.28)',
            backdropFilter: 'blur(14px) saturate(160%)',
            WebkitBackdropFilter: 'blur(14px) saturate(160%)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'var(--color-neutral-100)',
          }}
        >
          {priority} · your travel priority
        </span>
        <AnimatedHeadline text={dest ? dest.city + ', your way.' : 'Your journey, perfected.'} />
        <FactTicker
          key={dest && destFacts.length > 0 ? dest.code : 'general'}
          facts={dest && destFacts.length > 0 ? destFacts : FUN_FACTS}
        />
      </div>

      {/* Trip brief — the first solid surface on the water */}
      <div style={{ position: 'relative', zIndex: 6 }}>
        <TripBriefBar
          query={query}
          onQuery={onQuery}
          matches={matches}
          dest={dest}
          onPick={onPick}
          arriveBy={arriveBy}
          onArriveBy={onArriveBy}
          nights={nights}
          onNights={onNights}
          budget={budget}
          onBudget={onBudget}
          adults={adults}
          onAdults={onAdults}
          companions={companions}
          onCompanions={onCompanions}
          originCity={originCity}
          originIsLive={originIsLive}
          originLocating={originLocating}
          airports={airports}
          originIata={originIata}
          onOriginIata={onOriginIata}
          originCoords={originCoords}
          cabinClass={cabinClass}
          onCabinClass={onCabinClass}
          transfer={transfer}
          onTransfer={onTransfer}
          onSubmit={onSolve}
          submitting={solving}
        />
      </div>


      {/* Only what helps someone CHOOSE. The phrase pack and full briefing
          belong after booking, on the locked plan and the trip. */}
      {dest && (
        <button
          className="glass glass-lift"
          onClick={goBriefing}
          style={{
            width: '100%',
            marginTop: 10,
            borderRadius: 18,
            padding: '12px 16px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10,
            textAlign: 'left',
          }}
        >
          <Icon name="languages" size={15} color="var(--color-accent-700)" style={{ flex: 'none' }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>{dest.lang} spoken</span>
          {essentials && (
            <>
              <span style={{ color: 'var(--color-neutral-400)' }}>·</span>
              <span style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
                {essentials.currencySymbol} {essentials.currencyCode}
              </span>
            </>
          )}
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent-700)' }}>
              Read the {dest.city} briefing
            </span>
            <Icon name="chevronRight" size={14} color="var(--color-accent-700)" />
          </span>
        </button>
      )}

      {/* Destination scenes — rendered only when we have media to show */}
      {dest && (clips.length > 0 || showStills || scenesLoading) && (
      <>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 10,
          margin: 'clamp(20px,2.2vw,28px) 0 clamp(8px,1vw,12px)',
        }}
      >
        <h2 style={{ ...SECTION_HEAD, margin: 0 }}>{dest.city} in three scenes</h2>
        <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>{sceneSubhead}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
        {clips.length > 0 &&
          clips.map((c, i) => (
            <figure key={i} style={{ margin: 0 }}>
              <div
                style={{
                  position: 'relative',
                  height: 'clamp(130px,14vw,180px)',
                  borderRadius: 18,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.6)',
                  background: 'var(--color-neutral-200)',
                }}
              >
                <video
                  src={c.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <figcaption className="glass-soft" style={{ marginTop: 6, padding: '8px 12px', borderRadius: 12 }}>
                <p style={{ fontSize: 11, lineHeight: 1.45, color: 'var(--color-neutral-700)', margin: 0 }}>
                  {c.note}
                </p>
              </figcaption>
            </figure>
          ))}

        {showStills &&
          scenes.slice(0, 3).map((src, i) => (
            <figure key={src} style={{ margin: 0 }}>
              <div
                style={{
                  position: 'relative',
                  height: 'clamp(130px,14vw,180px)',
                  borderRadius: 18,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.6)',
                }}
              >
                <div
                  role="img"
                  aria-label={['Arriving in ', 'Streets of ', 'Landmarks of '][i] + dest.city}
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: 'var(--color-neutral-200)',
                    backgroundImage: 'url("' + src + '")',
                  }}
                />
              </div>
              <figcaption className="glass-soft" style={{ marginTop: 6, padding: '8px 12px', borderRadius: 12 }}>
                <p
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    color: 'var(--color-accent-700)',
                    margin: '0 0 2px',
                  }}
                >
                  {SCENE_LABELS[i]}
                </p>
                <p style={{ fontSize: 11, lineHeight: 1.45, color: 'var(--color-neutral-700)', margin: 0 }}>
                  {sceneNotes[i]}
                </p>
              </figcaption>
            </figure>
          ))}

        {scenesLoading && (
          <div
            className="glass-soft"
            style={{
              gridColumn: '1/-1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 'clamp(130px,14vw,180px)',
              borderRadius: 18,
              fontSize: 12,
              color: 'var(--color-neutral-600)',
            }}
          >
            Finding photography of {dest.city}…
          </div>
        )}
      </div>
      </>
      )}

      {/* Next journey + saved trips — only for signed-in travellers with data */}
      {signedIn && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
        {nextTrip && (
          <div
            className="glass-sage"
            style={{
              flex: '2 1 320px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              borderRadius: 20,
              padding: 16,
            }}
          >
            <span
              style={{
                width: 42,
                height: 42,
                flex: 'none',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="clock" size={19} color="var(--color-accent-2-800)" />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                  color: 'var(--color-accent-2-700)',
                  margin: 0,
                }}
              >
                Next journey ·{' '}
                {nextDays === 0 ? 'today' : nextDays === 1 ? 'tomorrow' : 'in ' + nextDays + ' days'}
              </p>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: 19, lineHeight: 1.15, margin: '3px 0 0' }}>
                {nextLeaveBy ? 'Leave home ' + nextLeaveBy : nextTrip.destination}
              </p>
            </div>
            <button
              className="hv-white"
              onClick={goJourney}
              aria-label="Open your next journey"
              style={{
                flex: 'none',
                width: 38,
                height: 38,
                border: 0,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Icon name="chevronRight" size={16} color="var(--color-accent-2-900)" />
            </button>
          </div>
        )}
        <button
          className="glass glass-lift"
          onClick={goTrips}
          style={{
            flex: '1 1 180px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderRadius: 20,
            padding: '12px 16px',
            textAlign: 'left',
          }}
        >
          <span
            style={{
              width: 34,
              height: 34,
              flex: 'none',
              borderRadius: 999,
              background: 'var(--color-accent-200)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="ticket" size={16} color="var(--color-accent-700)" />
          </span>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: 10,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: 'var(--color-neutral-600)',
                margin: 0,
              }}
            >
              Saved trips
            </p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 16, lineHeight: 1.15, margin: '2px 0 0' }}>
              {trips.length === 0
                ? 'None yet'
                : trips.length === 1
                  ? '1 journey'
                  : trips.length + ' journeys'}
            </p>
          </div>
        </button>
      </div>
      )}

      {/* Personalized plans */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          margin: 'clamp(20px,2.2vw,28px) 0 clamp(8px,1vw,12px)',
        }}
      >
        <h2 style={{ ...SECTION_HEAD, margin: 0, whiteSpace: 'nowrap' }}>Your personalized plans</h2>
        <button
          onClick={goPlans}
          style={{
            border: 0,
            background: 'transparent',
            color: 'var(--color-accent-700)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          View all
        </button>
      </div>

      <PlansRail onPickPlan={onPickPlan} />
    </div>
  )
}
