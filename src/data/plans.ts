import { DESTINATIONS, type Destination } from './destinations'
import { DEST_HERO_CLIPS, PLAN_IMAGES } from './media'

// Curated entry points into the solver. Every card resolves to a real
// destination code + trip length, so clicking one drops straight into a live
// solve — these are shortcuts, not brochures.

export type FeaturedPlan = {
  img: string
  alt: string
  title: string
  stops: string
  nights: number
  code: string // destination code the solver starts from
  estimate: string // indicative, the solve replaces it with live numbers
}

export const FEATURED_PLANS: FeaturedPlan[] = [
  {
    img: PLAN_IMAGES.japan,
    alt: 'Pagoda framed by cherry blossom in Kyoto',
    title: '10-Day Adventure in Japan',
    stops: 'Tokyo · Kyoto · Osaka · Nara',
    nights: 10,
    code: 'NRT',
    estimate: 'from ~$2,145',
  },
  {
    img: PLAN_IMAGES.aegean,
    alt: 'White buildings overlooking the blue Aegean sea in Santorini',
    title: '7-Day Aegean Escape',
    stops: 'Athens · Santorini · Naxos',
    nights: 7,
    code: 'ATH',
    estimate: 'from ~$1,780',
  },
  {
    img: PLAN_IMAGES.fjords,
    alt: 'Dramatic mountains rising over a Norwegian fjord',
    title: '6-Day Fjords & Lights',
    stops: 'Bergen · Flåm · Tromsø',
    nights: 6,
    code: 'OSL',
    estimate: 'from ~$2,460',
  },
]

export type Spotlight = Destination & { clip: string }

/** Destinations with a generated cinematic clip — the video grid on Plans. */
export const SPOTLIGHTS: Spotlight[] = Object.entries(DEST_HERO_CLIPS)
  .map(([code, clip]) => {
    const dest = DESTINATIONS.find((d) => d.code === code)
    return dest ? { ...dest, clip } : null
  })
  .filter((d): d is Spotlight => d !== null)
