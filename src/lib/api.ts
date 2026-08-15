// Client for the Meguaz backend (the Next app under web/). Vite proxies /api
// to it in development, so these are same-origin calls and no key is exposed.

export type Priority = 'money' | 'balanced' | 'time'

export type PlanLeg = { type: 'home' | 'car' | 'flight' | 'train'; label: string; time: string }

export type TimelineStep = {
  id: string
  icon: 'home' | 'car' | 'flight' | 'checkin' | 'buffer' | 'door' | 'train'
  time: string
  label: string
  location: string
  detail: string
  cost: string | null
  kind: 'go' | 'normal' | 'buffer' | 'main'
  note: string | null
}

export type CostLine = { label: string; amount: number; color: string }

export type PlanOption = {
  id: string
  name: string
  tagline: string
  cost: number
  doorToDoor: string
  leaveBy: string
  buffer: number
  bufferMin: number
  bufferLabel: string
  tradeoff: string
  legs: PlanLeg[]
  fits: Priority
  steps: TimelineStep[]
  costBreakdown: CostLine[]
  offerId: string | null
  /** Fare's per-traveller baggage allowance + any estimated fee added. */
  bags: { carryOn: number; checked: number; feeAdded: number }
  etaFromLocation: boolean
  etaTrafficAware: boolean
  originAirport: string
  departAt: string
  preTransferMin: number
}

export type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first'

export type TransferMode = 'rideshare' | 'drive' | 'dropoff' | 'transit'

export type TripBrief = {
  from: string
  to: string
  arriveBy: string
  budget: number
  adults: number
  /** Trip length in nights; the solver prices the return leg when present. */
  nights?: number
  /** How the traveller gets to the departure airport; defaults to rideshare. */
  airportTransfer?: TransferMode
  cabinClass?: CabinClass
  /** Checked bag wanted: prices the fee when the fare includes none. */
  checkedBag?: boolean
  originCoords?: { lat: number; lng: number }
}

export type NearbyAirport = {
  iata: string
  name: string
  lat: number
  lng: number
  distanceKm: number | null
}

export type StayEstimate = {
  nightlyUsd: number
  nights: number
  totalUsd: number
  kind: 'airbnb' | 'resort' | 'hotel'
}

export type SolveResponse = {
  brief: TripBrief
  routeLabel: string
  meetsDeadline: boolean
  /** Return-leg date when the brief carried a trip length. */
  returnDate: string | null
  /** Median nightly stay estimate for the window, when nights were given. */
  stay: StayEstimate | null
  /** Warning that a closer departure airport exists, when the ride is extreme. */
  originAdvice: string | null
  options: PlanOption[]
}

export type FlightOffer = {
  id: string
  totalAmount: string
  totalCurrency: string
  owner: string
  slices: Array<{
    origin: string
    destination: string
    departingAt: string
    arrivingAt: string
    durationMinutes: number | null
    segments: number
    carriers: string[]
  }>
}

export type DriveEta = { minutes: number; trafficAware: boolean }

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new ApiError(detail?.error || 'Request failed (' + res.status + ')', res.status)
  }
  return res.json() as Promise<T>
}

export function solvePlan(brief: TripBrief, signal?: AbortSignal) {
  return post<SolveResponse>('/api/plan/solve', brief, signal)
}

export function nearbyAirports(coords: { lat: number; lng: number }, signal?: AbortSignal) {
  return post<{ airports: NearbyAirport[] }>('/api/location/airports', coords, signal)
}

/** Any airport by name or IATA, ranked by relevance then proximity. */
export function searchAirports(
  query: string,
  coords?: { lat: number; lng: number } | null,
  signal?: AbortSignal,
) {
  return post<{ airports: NearbyAirport[] }>(
    '/api/location/airports',
    { query, ...(coords ?? {}) },
    signal,
  )
}

export function searchFlights(
  params: {
    origin: string
    destination: string
    departureDate: string
    adults: number
    cabinClass?: CabinClass
  },
  signal?: AbortSignal,
) {
  return post<{ offers: FlightOffer[] }>('/api/flights/search', params, signal)
}

export type ReverseGeocode = { city: string | null; region: string | null; country: string | null }

export function reverseGeocode(coords: { lat: number; lng: number }, signal?: AbortSignal) {
  return post<ReverseGeocode>('/api/location/reverse', coords, signal)
}

export function driveEta(
  params: { from: { lat: number; lng: number }; airport: string; departAt?: string },
  signal?: AbortSignal,
) {
  return post<DriveEta>('/api/location/eta', params, signal)
}

/** Great-circle flight estimate from the traveller's location to an airport. */
export function flightEta(
  coords: { lat: number; lng: number },
  airport: string,
  signal?: AbortSignal,
) {
  return post<{ distanceKm: number; hours: number }>(
    '/api/location/flight-eta',
    { ...coords, airport },
    signal,
  )
}

// ── Destination music ───────────────────────────────────────────────────────

export type DestinationMix = { videoId: string; title: string; channel: string }

export async function destinationMusic(city: string, country: string, signal?: AbortSignal) {
  const res = await fetch(
    '/api/music?city=' + encodeURIComponent(city) + '&country=' + encodeURIComponent(country),
    { signal },
  )
  if (!res.ok) throw new ApiError('Music unavailable', res.status)
  return (await res.json()) as { mix: DestinationMix | null }
}

// ── Destination guide (attractions + fun facts) ─────────────────────────────

export type Attraction = {
  name: string
  kind: string
  rating: number | null
  why: string
  wiki: string | null
}

export type DestinationGuide = { attractions: Attraction[]; facts: string[] }

export async function destinationGuideFor(city: string, country: string, signal?: AbortSignal) {
  const res = await fetch(
    '/api/attractions?city=' + encodeURIComponent(city) + '&country=' + encodeURIComponent(country),
    { signal },
  )
  if (!res.ok) throw new ApiError('Guide unavailable', res.status)
  return (await res.json()) as DestinationGuide
}

// ── Destination weather ─────────────────────────────────────────────────────

export type DayForecast = {
  date: string
  maxC: number
  minC: number
  code: number
  precipProb: number | null
}

export type Weather = {
  current: { tempC: number; code: number }
  daily: DayForecast[]
}

export async function weatherForecast(code: string, signal?: AbortSignal) {
  const res = await fetch('/api/weather?code=' + encodeURIComponent(code), { signal })
  if (!res.ok) throw new ApiError('Weather unavailable', res.status)
  return (await res.json()) as Weather
}

// ── Trending destinations ───────────────────────────────────────────────────

export type TrendingCity = { city: string; country: string; reason: string }

export async function trendingDestinations(signal?: AbortSignal) {
  const res = await fetch('/api/trends', { signal })
  if (!res.ok) throw new ApiError('Trends unavailable', res.status)
  return (await res.json()) as { trending: TrendingCity[] }
}

// ── Destination food guide ──────────────────────────────────────────────────

export type FoodSpot = {
  name: string
  kind: string
  dish: string
  area: string | null
  priceLevel: '$' | '$$' | '$$$' | null
  note: string | null
}

export function foodSuggestions(city: string, country: string, signal?: AbortSignal) {
  return post<{ spots: FoodSpot[] }>('/api/food', { city, country }, signal)
}

// ── Account & personalization ───────────────────────────────────────────────

export type SessionUser = { id: string; email: string | null; displayName: string | null }

export type Profile = {
  id: string
  display_name: string | null
  avatar_url: string | null
  home_airport: string | null
  travel_style: 'saver' | 'balanced' | 'comfort' | null
  preferred_cabin: CabinClass | null
  default_budget_usd: number | null
  airport_buffer_min: number | null
}

export type Preferences = {
  displayName?: string | null
  homeAirport?: string | null
  travelStyle?: 'saver' | 'balanced' | 'comfort' | null
  preferredCabin?: CabinClass | null
  defaultBudgetUsd?: number | null
  airportBufferMin?: number | null
}

export async function getSession(signal?: AbortSignal) {
  const res = await fetch('/api/auth', { signal })
  if (!res.ok) return { user: null as SessionUser | null }
  return (await res.json()) as { user: SessionUser | null }
}

export function signIn(email: string, password: string) {
  return post<{ user: SessionUser | null }>('/api/auth', { action: 'signin', email, password })
}

export function signUp(email: string, password: string, displayName?: string) {
  return post<{ user: SessionUser | null; confirmationRequired?: boolean }>('/api/auth', {
    action: 'signup',
    email,
    password,
    displayName,
  })
}

export function signOut() {
  return post<{ user: null }>('/api/auth', { action: 'signout' })
}

export async function getProfile(signal?: AbortSignal) {
  const res = await fetch('/api/profile', { signal })
  if (!res.ok) return { profile: null as Profile | null }
  return (await res.json()) as { profile: Profile | null }
}

export async function saveProfile(prefs: Preferences) {
  const res = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new ApiError(detail?.error || 'Could not save preferences', res.status)
  }
  return (await res.json()) as { profile: Profile | null; partial?: boolean }
}

export async function uploadAvatar(file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/profile/avatar', { method: 'POST', body: form })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new ApiError(detail?.error || 'Could not update your avatar', res.status)
  }
  return (await res.json()) as { avatarUrl: string }
}

// ── Community ───────────────────────────────────────────────────────────────

export type CommunityUser = {
  id: string
  name: string
  avatarUrl: string | null
  following: boolean
}

export type CommunityFeedItem = {
  id: string
  destinationCode: string
  rating: number
  title: string | null
  body: string | null
  createdAt: string
  author: { name: string; avatarUrl: string | null }
}

export async function searchCommunity(q: string, signal?: AbortSignal) {
  const res = await fetch('/api/community?q=' + encodeURIComponent(q), { signal })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new ApiError(detail?.error || 'Community unavailable', res.status)
  }
  // discover + feed only arrive on the empty-query "home" response.
  return (await res.json()) as {
    users: CommunityUser[]
    discover?: CommunityUser[]
    feed?: CommunityFeedItem[]
  }
}

export function setFollowing(userId: string, follow: boolean) {
  return post<{ ok: true }>('/api/community', { action: follow ? 'follow' : 'unfollow', userId })
}

// ── Destination reviews ─────────────────────────────────────────────────────

export type Review = {
  id: string
  rating: number
  title: string | null
  body: string | null
  createdAt: string
  mine: boolean
  author: { name: string; avatarUrl: string | null }
}

export async function listReviews(code: string, signal?: AbortSignal) {
  const res = await fetch('/api/reviews?code=' + encodeURIComponent(code), { signal })
  if (!res.ok) throw new ApiError('Could not load reviews', res.status)
  return (await res.json()) as { reviews: Review[]; average: number | null; count: number }
}

export function submitReview(code: string, rating: number, title?: string, body?: string) {
  return post<{ ok: true; id: string }>('/api/reviews', { code, rating, title, body })
}

export async function deleteReview(id: string) {
  const res = await fetch('/api/reviews?id=' + encodeURIComponent(id), { method: 'DELETE' })
  if (!res.ok) throw new ApiError('Could not delete the review', res.status)
  return (await res.json()) as { ok: true }
}

// ── Booking ─────────────────────────────────────────────────────────────────

export type BookingPassenger = {
  firstName: string
  lastName: string
  dob: string
  gender: 'm' | 'f'
  title: 'mr' | 'ms' | 'mrs' | 'miss'
}

export type BookingResult = {
  orderId: string
  bookingReference: string | null
  liveMode: boolean
  total: number
  currency: string
}

export function bookFlight(params: {
  offerId: string
  email: string
  phone: string
  passengers: BookingPassenger[]
  approvedAmount: number
  destCity?: string
  whatsappOptIn?: boolean
}) {
  return post<BookingResult>('/api/book', params)
}

// ── Public runtime config ───────────────────────────────────────────────────

export type AppConfig = { pixelId: string | null; facebookLogin: boolean }

let configPromise: Promise<AppConfig> | null = null

/** Server-driven feature flags; fetched once, shared by all callers. */
export function appConfig(): Promise<AppConfig> {
  configPromise ??= fetch('/api/config')
    .then((res) => (res.ok ? res.json() : { pixelId: null, facebookLogin: false }))
    .catch(() => ({ pixelId: null, facebookLogin: false }))
  return configPromise
}

// ── Ad-funnel tracking (Meta) ───────────────────────────────────────────────

export type TrackEvent = 'Search' | 'ViewContent' | 'InitiateCheckout'

/**
 * Fire one funnel event to the browser Pixel (when loaded) and the server
 * Conversions API with a shared event id, so Meta dedupes the pair. Purchase
 * is server-only — /api/book emits it where a real order exists.
 * Fire-and-forget: analytics never surfaces as a user-facing failure.
 */
export function track(event: TrackEvent, data?: { value?: number; currency?: string }) {
  try {
    const eventId = crypto.randomUUID()
    const fbq = (window as { fbq?: (...args: unknown[]) => void }).fbq
    if (fbq) fbq('track', event, data ?? {}, { eventID: eventId })
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, eventId, url: window.location.href, ...data }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* never let tracking throw into app code */
  }
}

// ── Saved trips ─────────────────────────────────────────────────────────────

export type Trip = {
  id: string
  title: string
  destination: string
  start_date: string | null
  party_adults: number
  budget_usd: number | null
  estimated_total_usd: number | null
  cost_lane: 'saver' | 'balanced' | 'comfort' | null
  status: string
  brief: Record<string, unknown> | null
  created_at: string
}

export type NewTrip = {
  title: string
  destination: string
  origin: string
  arriveBy: string
  adults: number
  budgetUsd: number
  estimatedTotalUsd: number
  costLane: 'saver' | 'balanced' | 'comfort'
  brief?: Record<string, unknown>
}

export async function listTrips(signal?: AbortSignal) {
  const res = await fetch('/api/trips', { signal })
  if (!res.ok) throw new ApiError('Could not load your trips', res.status)
  return (await res.json()) as { trips: Trip[] }
}

export function createTrip(trip: NewTrip) {
  return post<{ trip: Trip }>('/api/trips', trip)
}

export async function deleteTrip(id: string) {
  const res = await fetch('/api/trips?id=' + encodeURIComponent(id), { method: 'DELETE' })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new ApiError(detail?.error || 'Could not delete this trip', res.status)
  }
  return (await res.json()) as { ok: true }
}

// ── Stays ───────────────────────────────────────────────────────────────────

export type StayPreference = 'home' | 'resort'

export type AirbnbResult = {
  id: string
  name: string
  rating: number | null
  pricePerNight: number | null
  totalPrice: number | null
  currency: string | null
  photoUrl: string | null
  url: string | null
  bookable: false
}

export type StaysResponse = {
  kind: 'airbnb' | 'resort' | 'hotel'
  bookableInApp: boolean
  results: AirbnbResult[]
}

export function searchStays(
  params: {
    preference: StayPreference
    location: string
    checkIn: string
    checkOut: string
    adults: number
  },
  signal?: AbortSignal,
) {
  return post<StaysResponse>('/api/stays/search', params, signal)
}
