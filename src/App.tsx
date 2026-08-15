import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import BackdropReel from './components/BackdropReel'
import Header from './components/Header'
import Icon from './components/Icon'
import MobileNav from './components/MobileNav'
import HomeScreen from './components/HomeScreen'
import PlansScreen from './components/PlansScreen'
import PlannerScreen from './components/PlannerScreen'
import JourneyScreen from './components/JourneyScreen'
import LockedScreen from './components/LockedScreen'
import TripsScreen from './components/TripsScreen'
import CommunityScreen from './components/CommunityScreen'
import ProfileScreen from './components/ProfileScreen'
import OnboardingScreen from './components/OnboardingScreen'
import PhrasesScreen, { type PhraseCard } from './components/PhrasesScreen'
import BriefingScreen from './components/BriefingScreen'
import AuthGate from './components/AuthGate'
import BookingSheet from './components/BookingSheet'
import LegalScreen from './components/LegalScreen'
import ConsentBanner from './components/ConsentBanner'
import MusicDock from './components/MusicDock'
import { DESTINATIONS, type Destination } from './data/destinations'
import { DEST_HERO_CLIPS } from './data/media'
import { PHRASES, SPEECH_TAGS } from './data/phrases'
import { sceneUrls } from './data/scenes'
import { searchDestinations } from './lib/search'
import {
  createTrip,
  destinationGuideFor,
  searchAirports,
  track,
  type BookingResult,
  type CabinClass,
  type DestinationGuide,
  type PlanOption,
  type TransferMode,
  type TripBrief,
} from './lib/api'
import { initPixel } from './lib/pixel'
import { useLiveLeaveBy, useTripPlan } from './lib/useTripPlan'
import { useHomeCity } from './lib/useHomeCity'
import { useAccount } from './lib/useAccount'
import { useTrips } from './lib/useTrips'
import type { Priority, Screen } from './types'

type AppProps = {
  defaultPriority?: Priority
  mobileBreakpoint?: number
  sceneClipUrls?: string
  /** City the traveller departs from; the solver resolves it to an airport. */
  homeCity?: string
}

type Bloom = {
  size: number
  blur: number
  opacity: number
  color: string
  top?: number | string
  left?: number | string
  right?: number | string
  bottom?: number | string
}

// Oasis atmosphere: sun-warmed sand up top, lagoon water gathering low.
const BLOOMS: Bloom[] = [
  { size: 640, blur: 110, opacity: 0.62, color: '#ffb384', top: -180, left: -140 },
  { size: 420, blur: 100, opacity: 0.45, color: '#f6cf8f', top: '6%', left: '34%' },
  { size: 580, blur: 120, opacity: 0.5, color: '#8fd0c5', top: '34%', right: -200 },
  { size: 500, blur: 110, opacity: 0.5, color: '#ffc9a8', bottom: -240, left: '26%' },
  { size: 380, blur: 120, opacity: 0.4, color: '#5fa8a0', bottom: '10%', right: '20%' },
]

const STYLE_TO_PRIORITY: Record<string, Priority> = {
  saver: 'Save money',
  balanced: 'Balanced',
  comfort: 'Save time',
}
const PRIORITY_TO_STYLE: Record<Priority, 'saver' | 'balanced' | 'comfort'> = {
  'Save money': 'saver',
  Balanced: 'balanced',
  'Save time': 'comfort',
}

function isoInDays(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// A shared plan link recreates the brief: /?to=LIS&arrive=2026-09-10&nights=5&budget=900
function sharedBrief() {
  if (typeof window === 'undefined') return null
  const q = new URLSearchParams(window.location.search)
  const to = q.get('to')?.toUpperCase()
  const dest = to ? DESTINATIONS.find((d) => d.code === to) : null
  if (!dest) return null
  const num = (k: string, min: number, max: number, fallback: number) => {
    const v = Number(q.get(k))
    return Number.isFinite(v) && v >= min && v <= max ? Math.round(v) : fallback
  }
  const arrive = q.get('arrive')
  return {
    code: dest.code,
    arriveBy: arrive && /^\d{4}-\d{2}-\d{2}$/.test(arrive) && arrive > isoInDays(0) ? arrive : isoInDays(14),
    nights: num('nights', 1, 90, 5),
    budget: num('budget', 50, 100000, 900),
    adults: num('adults', 1, 9, 1),
  }
}
const SHARED = sharedBrief()

export default function App({
  defaultPriority = 'Balanced',
  mobileBreakpoint = 768,
  sceneClipUrls = '',
  homeCity = 'San Francisco',
}: AppProps) {
  // Arriving via a shared plan link drops straight into that trip's solve.
  const [screen, setScreen] = useState<Screen>(SHARED ? 'planner' : 'home')
  const [priority, setPriority] = useState<Priority>(defaultPriority)
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1200 : window.innerWidth))
  const [query, setQuery] = useState('')
  const [destCode, setDestCode] = useState<string | null>(SHARED?.code ?? null)
  // Destinations picked through the airport-search fallback rather than the
  // curated index — persisted so saved trips and reloads still resolve them.
  const [extraDests, setExtraDests] = useState<Record<string, Destination>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      return JSON.parse(localStorage.getItem('mg-extra-dests') || '{}')
    } catch {
      return {}
    }
  })
  const [shown, setShown] = useState<Record<string, boolean>>({})
  const [learned, setLearned] = useState<Record<string, boolean>>({})

  // The editable trip brief that every backend call is built from.
  const [arriveBy, setArriveBy] = useState(() => SHARED?.arriveBy ?? isoInDays(14))
  const [nights, setNights] = useState(SHARED?.nights ?? 5)
  const [budget, setBudget] = useState(SHARED?.budget ?? 900)
  const [adults, setAdults] = useState(SHARED?.adults ?? 1)
  const [planActive, setPlanActive] = useState(!!SHARED)
  const [selected, setSelected] = useState<PlanOption | null>(null)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [booking, setBooking] = useState<BookingResult | null>(null)
  // Per-destination intel (fun facts for the hero, attractions for the
  // briefing) — one server-cached research call per city per month.
  const [guide, setGuide] = useState<DestinationGuide | null>(null)

  const [companions, setCompanions] = useState<string[]>([])
  const [cabinClass, setCabinClass] = useState<CabinClass>('economy')
  const [transfer, setTransfer] = useState<TransferMode>('rideshare')
  const [checkedBag, setCheckedBag] = useState(false)
  const [originIata, setOriginIata] = useState<string | null>(null)
  const account = useAccount()
  const tripsState = useTrips(!!account.user)
  const prefsApplied = useRef(false)

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Meta Pixel loads only when the server has an id configured (/api/config).
  useEffect(() => {
    void initPixel()
  }, [])

  // Motion: each screen's sections rise into place; the ambient blooms drift
  // like light on water. Both stand down for prefers-reduced-motion.
  const stageRef = useRef<HTMLDivElement>(null)
  const reducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (reducedMotion()) return
    const surface = stageRef.current?.querySelector('[data-screen-label]')
    if (!surface) return
    const kids = Array.from(surface.children).slice(0, 12)
    const tween = gsap.fromTo(
      kids,
      { autoAlpha: 0, y: 16 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.06,
        ease: 'power2.out',
        // NEVER 'all': that wipes React's inline styles (display:grid, etc.)
        // off the animated elements and React won't re-apply them.
        clearProps: 'transform,opacity,visibility',
      },
    )
    return () => {
      tween.kill()
    }
  }, [screen])

  useEffect(() => {
    if (reducedMotion()) return
    const tweens = gsap.utils.toArray<HTMLElement>('.mg-bloom').map((el, i) =>
      gsap.to(el, {
        x: (i % 2 ? -1 : 1) * 42,
        y: (i % 3 ? 1 : -1) * 32,
        duration: 16 + i * 4,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      }),
    )
    return () => tweens.forEach((t) => t.kill())
  }, [])

  const go = (next: Screen) => () => {
    if (next === 'planner') setPlanActive(true)
    setScreen(next)
    window.scrollTo(0, 0)
  }


  const isMobile = width < mobileBreakpoint
  const dest = destCode
    ? (DESTINATIONS.find((d) => d.code === destCode) ?? extraDests[destCode] ?? null)
    : null

  useEffect(() => {
    localStorage.setItem('mg-extra-dests', JSON.stringify(extraDests))
  }, [extraDests])

  // The curated index is one gateway per country — it cannot cover domestic
  // routes or second cities. Anything it misses falls through to the full
  // airport search, so every commercial airport is a valid destination.
  const [airportMatches, setAirportMatches] = useState<Destination[]>([])
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setAirportMatches([])
      return
    }
    const controller = new AbortController()
    const t = window.setTimeout(() => {
      searchAirports(q, null, controller.signal)
        .then((r) =>
          setAirportMatches(
            r.airports.map((a) => ({
              city: a.name,
              country: '',
              code: a.iata,
              cc: '',
              lang: '',
              hrs: 0,
              price: 0,
            })),
          ),
        )
        .catch(() => {})
    }, 220)
    return () => {
      controller.abort()
      window.clearTimeout(t)
    }
  }, [query])

  const matches = useMemo(() => {
    const local = searchDestinations(query, DESTINATIONS)
    const seen = new Set(local.map((d) => d.code))
    return [...local, ...airportMatches.filter((d) => !seen.has(d.code))].slice(0, 8)
  }, [query, airportMatches])

  const pickDest = (d: Destination) => {
    if (!DESTINATIONS.some((x) => x.code === d.code)) {
      setExtraDests((prev) => ({ ...prev, [d.code]: d }))
    }
    setDestCode(d.code)
  }
  // Generated Seedream/Z-Image scenes, served from our own media dir — no
  // third-party image API at runtime.
  const scenes = dest ? sceneUrls(dest.code) : []

  const home = useHomeCity(homeCity)
  // An IATA code is unambiguous; a city name is not ("Reading" resolves to
  // Redding, California). Prefer the chosen airport whenever we have one.
  const departure = originIata || home.airports[0]?.iata || home.resolvedCity
  // Only send coordinates when they actually describe the departure airport.
  // Falling back to a home-city name while still sending the device location
  // makes the solver price a drive between two unrelated places.
  const departureIsNearby = home.airports.some((a) => a.iata === departure)
  const brief: TripBrief = {
    from: departure,
    to: dest?.city ?? '',
    arriveBy,
    budget,
    adults,
    nights,
    airportTransfer: transfer,
    cabinClass,
    checkedBag,
    ...(home.coords && departureIsNearby ? { originCoords: home.coords } : {}),
  }
  const { plan, loading, refreshing, error, lastUpdated, refresh } = useTripPlan(brief, planActive)
  const live = useLiveLeaveBy(selected, screen === 'journey')

  useEffect(() => {
    const profile = account.profile
    if (!profile || prefsApplied.current) return
    prefsApplied.current = true
    if (profile.home_airport) setOriginIata(profile.home_airport)
    if (profile.travel_style && STYLE_TO_PRIORITY[profile.travel_style]) {
      setPriority(STYLE_TO_PRIORITY[profile.travel_style])
    }
    if (profile.preferred_cabin) setCabinClass(profile.preferred_cabin)
    if (profile.default_budget_usd) setBudget(Number(profile.default_budget_usd))
  }, [account.profile])

  // Booking is what teaches the planner how this traveller actually travels.
  const rememberPreferences = () => {
    if (!account.user) return
    account
      .savePreferences({
        homeAirport: originIata || home.airports[0]?.iata || null,
        travelStyle: PRIORITY_TO_STYLE[priority],
        preferredCabin: cabinClass,
        defaultBudgetUsd: budget,
      })
      .catch(() => {
        /* preferences are a nicety; never block the booking on them */
      })
  }

  const LANE: Record<string, 'saver' | 'balanced' | 'comfort'> = {
    money: 'saver',
    balanced: 'balanced',
    time: 'comfort',
  }

  const persistTrip = (booked?: BookingResult | null) => {
    if (!account.user || !selected || !dest) return
    createTrip({
      title: departure + ' → ' + dest.city,
      destination: dest.city,
      origin: departure,
      arriveBy,
      adults,
      budgetUsd: budget,
      estimatedTotalUsd: booked?.total ?? selected.cost,
      costLane: LANE[selected.fits] ?? 'balanced',
      brief: {
        cabinClass,
        nights,
        airportTransfer: transfer,
        leaveBy: selected.leaveBy,
        doorToDoor: selected.doorToDoor,
        offerId: selected.offerId,
        route: selected.name,
        destinationCode: dest.code,
        ...(booked
          ? {
              orderId: booked.orderId,
              bookingReference: booked.bookingReference,
              liveMode: booked.liveMode,
            }
          : {}),
      },
    })
      .then(() => tripsState.reload())
      .catch(() => {
        /* the plan is still locked on screen; the save can be retried */
      })
  }

  // Lock = book. Signed-in travellers get the passenger sheet; everyone else
  // signs in first and lands back here.
  const lockPlan = () => {
    track('InitiateCheckout', selected ? { value: selected.cost, currency: 'USD' } : undefined)
    if (account.user) {
      setBooking(null)
      setBookingOpen(true)
    } else {
      go('account')()
    }
  }

  const finishBooked = (result: BookingResult) => {
    setBooking(result)
    setBookingOpen(false)
    rememberPreferences()
    persistTrip(result)
    go('locked')()
  }

  const finishSkipped = () => {
    setBooking(null)
    setBookingOpen(false)
    rememberPreferences()
    persistTrip(null)
    go('locked')()
  }

  // A fresh solve invalidates the previously selected option.
  useEffect(() => {
    if (!plan) return
    setSelected((prev) => (prev ? plan.options.find((o) => o.id === prev.id) || prev : null))
  }, [plan])

  const originAirport = plan?.options[0]?.originAirport || originIata || home.airports[0]?.iata || 'SFO'

  // Fetch the destination guide when a city is chosen (server caches 30 days).
  useEffect(() => {
    setGuide(null)
    if (!dest) return
    const controller = new AbortController()
    destinationGuideFor(dest.city, dest.country || dest.city, controller.signal)
      .then(setGuide)
      .catch(() => {
        /* generic facts and no attractions section — never an error state */
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest?.code])

  // A curated plan card is a pre-filled brief: set the destination (and trip
  // length when the plan carries one) and go straight into a live solve. No
  // fares are fetched until this moment — browsing is free.
  const pickPlan = (code: string, planNights?: number) => {
    setDestCode(code)
    if (planNights) setNights(planNights)
    go('planner')()
  }

  const list = dest ? PHRASES[dest.lang] || [] : []
  const phrases: PhraseCard[] = list.map((p, i) => {
    const key = (dest?.lang ?? '') + i
    return {
      ...p,
      n: String(i + 1),
      shown: !!shown[key],
      learned: !!learned[key],
      toggleShown: () => setShown((prev) => ({ ...prev, [key]: !prev[key] })),
      toggleLearned: () => setLearned((prev) => ({ ...prev, [key]: !prev[key] })),
    }
  })
  const learnedCount = phrases.filter((p) => p.learned).length

  const clips = sceneClipUrls
    .split(/[\s,]+/)
    .filter((u) => /^https?:\/\//.test(u))
    .slice(0, 3)
    .map((src, i) => ({
      src,
      label: 'Scene ' + (i + 1),
      note: [
        'Arriving in ' + (dest?.city ?? '') + ' — the view that meets you first.',
        'Street level in ' + (dest?.city ?? '') + ', where the trip actually happens.',
        (dest?.city ?? '') + '’s landmarks, worth the detour on your way through.',
      ][i],
    }))

  return (
    <div
      className="mg-viewport-fill"
      style={{
        position: 'relative',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-body)',
        // clip, not hidden: hidden would make this div a scroll container and
        // break the sticky header inside it.
        overflowX: 'clip',
      }}
    >
      {/* The living background: cinematic reel → oasis blooms → legibility
          veil. All fixed; every screen floats above the same moving light. */}
      <BackdropReel
        scenes={scenes}
        destCity={dest?.city ?? null}
        destClip={dest ? (DEST_HERO_CLIPS[dest.code] ?? null) : null}
      />
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {BLOOMS.map((bloom, i) => (
          <span
            key={i}
            className="mg-bloom"
            style={{
              position: 'absolute',
              width: bloom.size,
              height: bloom.size,
              top: bloom.top,
              left: bloom.left,
              right: bloom.right,
              bottom: bloom.bottom,
              borderRadius: '50%',
              background: bloom.color,
              filter: 'blur(' + bloom.blur + 'px)',
              opacity: bloom.opacity * 0.55,
            }}
          />
        ))}
      </div>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          transition: 'background 600ms ease',
          // Home earns the cinematic view; every working screen sits on a much
          // calmer wash so panels and text stay crisp over the moving footage.
          background:
            screen === 'home'
              ? 'linear-gradient(180deg, rgba(24,20,16,0.38) 0%, rgba(24,20,16,0.12) 24%, rgba(245,234,216,0.55) 52%, rgba(245,234,216,0.86) 76%, rgba(245,234,216,0.93) 100%)'
              : 'linear-gradient(180deg, rgba(24,20,16,0.2) 0%, rgba(245,234,216,0.8) 22%, rgba(245,234,216,0.94) 55%, rgba(245,234,216,0.96) 100%)',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Header
          screen={screen}
          isWide={!isMobile}
          onNavigate={(next) => go(next)()}
          user={account.user}
          avatarUrl={account.profile?.avatar_url ?? null}
          onAccount={account.user ? go('profile') : go('account')}
        />

        <div
          ref={stageRef}
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: 'clamp(12px,1.6vw,20px) clamp(12px,2vw,24px) ' + (isMobile ? '110px' : '48px'),
          }}
        >
          {screen === 'home' && (
            <HomeScreen
              dest={dest}
              query={query}
              onQuery={setQuery}
              matches={matches}
              onPick={pickDest}
              arriveBy={arriveBy}
              onArriveBy={setArriveBy}
              nights={nights}
              onNights={setNights}
              budget={budget}
              onBudget={setBudget}
              adults={adults}
              onAdults={setAdults}
              companions={companions}
              onCompanions={setCompanions}
              originCity={home.resolvedCity}
              originIsLive={home.status === 'resolved'}
              originLocating={home.status === 'locating'}
              airports={home.airports}
              originIata={originIata}
              onOriginIata={setOriginIata}
              originCoords={home.coords}
              cabinClass={cabinClass}
              onCabinClass={setCabinClass}
              transfer={transfer}
              onTransfer={setTransfer}
              checkedBag={checkedBag}
              onCheckedBag={setCheckedBag}
              onSolve={go('planner')}
              solving={loading}
              originAirport={originAirport}
              priority={priority}
              trips={tripsState.trips}
              signedIn={!!account.user}
              destFacts={guide?.facts ?? []}
              hasPhrasePack={!!dest && !!PHRASES[dest.lang]}
              phraseKicker={(dest?.lang ?? '') + ' · six phrases'}
              phrasesSaved={learnedCount}
              phrasesTotal={phrases.length}
              sceneSubhead={
                clips.length
                  ? 'Your generated clips — looping preview'
                  : 'Cinematic scenes · generated'
              }
              clips={clips}
              scenes={scenes}
              showStills={clips.length === 0 && scenes.length >= 3}
              scenesLoading={false}
              goPlanner={go('planner')}
              goPlans={go('plans')}
              onPickPlan={pickPlan}
              goJourney={go('journey')}
              goPhrases={go('phrases')}
              goTrips={go('trips')}
              goBriefing={go('briefing')}
            />
          )}

          {screen === 'plans' && <PlansScreen onPick={pickPlan} goHome={go('home')} />}

          {screen === 'planner' && (
            <PlannerScreen
              plan={plan}
              loading={loading}
              refreshing={refreshing}
              error={error}
              lastUpdated={lastUpdated}
              onRefresh={refresh}
              priority={priority}
              onPriority={setPriority}
              arriveBy={arriveBy}
              nights={nights}
              budget={budget}
              onSelect={(option) => {
                setSelected(option)
                go('journey')()
              }}
              goHome={go('home')}
            />
          )}

          {screen === 'journey' && (
            <JourneyScreen
              option={selected}
              routeLabel={plan?.routeLabel ?? ''}
              budget={budget}
              live={live}
              dest={dest ? { city: dest.city, code: dest.code } : null}
              goPlanner={go('planner')}
              goLocked={lockPlan}
            />
          )}

          {screen === 'locked' && (
            <LockedScreen
              option={selected}
              budget={budget}
              leaveBy={live.leaveBy}
              dest={dest}
              arriveBy={arriveBy}
              nights={nights}
              userEmail={account.user?.email ?? null}
              booking={booking}
              hasPhrasePack={!!dest && !!PHRASES[dest.lang]}
              phrasesSaved={learnedCount}
              phrasesTotal={phrases.length}
              daysUntil={Math.round(
                (Date.parse(arriveBy + 'T00:00:00') - new Date().setHours(0, 0, 0, 0)) / 86_400_000,
              )}
              goPhrases={go('phrases')}
              goBriefing={go('briefing')}
              goHome={go('home')}
            />
          )}

          {screen === 'trips' && (
            <TripsScreen
              user={account.user}
              trips={tripsState.trips}
              loading={tripsState.loading}
              error={tripsState.error}
              onReload={tripsState.reload}
              onDelete={tripsState.remove}
              goPlanner={go('planner')}
              goAccount={go('account')}
            />
          )}

          {screen === 'profile' && (
            <ProfileScreen
              user={account.user}
              profile={account.profile}
              loading={account.loading}
              tripCount={tripsState.trips.length}
              airports={home.airports}
              coords={home.coords}
              onSave={account.savePreferences}
              onSignOut={account.signOut}
              onAvatarUploaded={account.refreshProfile}
              goAccount={go('account')}
              goPhrases={go('phrases')}
              goOnboarding={go('onboarding')}
            />
          )}

          {screen === 'community' && (
            <CommunityScreen user={account.user} goAccount={go('account')} />
          )}

          {screen === 'onboarding' && (
            <OnboardingScreen priority={priority} onPriority={setPriority} goHome={go('home')} />
          )}

          {screen === 'phrases' && dest && (
            <PhrasesScreen
              destCity={dest.city}
              phraseKicker={dest.lang + ' · six phrases'}
              learnedLabel={
                phrases.length ? learnedCount + ' of ' + phrases.length + ' saved' : 'No phrase pack for this trip'
              }
              phraseHint={
                phrases.length
                  ? 'Tap a card to check yourself, then save it.'
                  : dest.city + ' speaks ' + dest.lang + ' — nothing new to learn for this trip.'
              }
              progressWidth={(phrases.length ? Math.round((learnedCount / phrases.length) * 100) : 0) + '%'}
              phrases={phrases}
              speechLanguage={SPEECH_TAGS[dest.lang]?.split('-')[0]}
              goHome={go('home')}
            />
          )}

          {screen === 'briefing' && dest && (
            <BriefingScreen
              dest={dest}
              signedIn={!!account.user}
              attractions={guide?.attractions ?? []}
              originCoords={home.coords}
              originLabel={home.status === 'resolved' ? home.resolvedCity : 'your area'}
              goHome={go('home')}
              goPhrases={go('phrases')}
              goAccount={go('account')}
            />
          )}

          {screen === 'account' && (
            <AuthGate
              option={selected}
              destCity={dest?.city ?? 'your destination'}
              onSignIn={account.signIn}
              onSignUp={account.signUp}
              onDone={() => {
                // Signed in mid-lock: return to the plan and open the booking
                // sheet so the purchase continues where it left off.
                go('journey')()
                setBooking(null)
                setBookingOpen(true)
              }}
              onBack={go('journey')}
              onLegal={(page) => go(page)()}
            />
          )}

          {(screen === 'terms' || screen === 'privacy') && (
            <LegalScreen page={screen} onSwitch={(page) => go(page)()} goHome={go('home')} />
          )}

          <footer
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              padding: '26px 0 6px',
              fontSize: 12,
              color: 'var(--color-neutral-600)',
            }}
          >
            <a
              href="https://www.instagram.com/elijah.rose25"
              target="_blank"
              rel="noreferrer"
              aria-label="Meguaz on Instagram — @elijah.rose25"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                color: 'var(--color-neutral-700)',
                textDecoration: 'none',
                fontWeight: 700,
              }}
            >
              <Icon name="instagram" size={15} color="var(--color-accent-700)" />
              @elijah.rose25
            </a>
            <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
            <span>© {new Date().getFullYear()} Meguaz</span>
            {(
              [
                ['terms', 'Terms of Service'],
                ['privacy', 'Privacy & Cookies'],
              ] as const
            ).map(([target, label]) => (
              <button
                key={target}
                onClick={go(target)}
                style={{
                  border: 0,
                  background: 'transparent',
                  padding: 0,
                  font: 'inherit',
                  fontSize: 12,
                  color: 'var(--color-neutral-700)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
            </span>
          </footer>
        </div>

        {bookingOpen && selected && dest && (
          <BookingSheet
            option={selected}
            destCity={dest.city}
            adults={adults}
            email={account.user?.email ?? ''}
            onClose={() => setBookingOpen(false)}
            onBooked={finishBooked}
            onSkip={finishSkipped}
          />
        )}

        {dest && <MusicDock city={dest.city} country={dest.country} raised={isMobile} />}

        <ConsentBanner onPrivacy={go('privacy')} />

        {isMobile && <MobileNav screen={screen} onNavigate={(next) => go(next)()} />}
      </div>
    </div>
  )
}
