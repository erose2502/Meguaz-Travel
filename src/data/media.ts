// Generated brand media (Higgsfield: Seedance 2.0 video, GPT Image 2 stills),
// served from public/media. Paths are stable; regenerating a clip only needs
// the same filename.

export type HeroSlide = { src: string; alt: string; video?: boolean }

/** Default hero reel before a destination is picked — a spread of climates. */
export const HERO_REEL: HeroSlide[] = [
  {
    src: '/media/default-summit.mp4',
    alt: 'Golden-hour aerial drifting over a mountain summit above a sea of clouds',
    video: true,
  },
  { src: '/media/default-paris.mp4', alt: 'Evening light over Paris rooftops', video: true },
  { src: '/media/default-coast.mp4', alt: 'Coastal cliffs meeting a turquoise sea', video: true },
  { src: '/media/default-tokyo.mp4', alt: 'Neon-lit street on a rainy night in Tokyo', video: true },
  { src: '/media/default-dunes.mp4', alt: 'Desert dunes rippling at sunset', video: true },
]

/** Photo counterparts for phones and data-saver connections. The video reel
    costs megabytes before the traveller has done anything; these stills give
    the same mood for ~200KB apiece, and the crossfade still breathes. */
export const HERO_REEL_LITE: HeroSlide[] = [
  { src: '/media/scenes/CDG-1.jpg', alt: 'Evening light over Paris rooftops' },
  { src: '/media/scenes/NRT-1.jpg', alt: 'Neon-lit street in Tokyo' },
  { src: '/media/scenes/ATH-1.jpg', alt: 'Aegean coast at golden hour' },
]

/** Cinematic clip that takes over the hero when one of these is the destination. */
export const DEST_HERO_CLIPS: Record<string, string> = {
  NRT: '/media/dest-nrt.mp4',
  CDG: '/media/dest-cdg.mp4',
  LHR: '/media/dest-lhr.mp4',
  FCO: '/media/dest-fco.mp4',
  ATH: '/media/dest-ath.mp4',
  DXB: '/media/dest-dxb.mp4',
}

/** Soft backdrops behind the sign-in card and the signed-out profile card. */
export const BACKDROPS = {
  auth: '/media/auth-backdrop.jpg',
  profile: '/media/profile-backdrop.jpg',
}

/** Editorial stills for the sample plan cards on Home. */
export const PLAN_IMAGES = {
  japan: '/media/plan-japan.jpg',
  aegean: '/media/plan-aegean.jpg',
  fjords: '/media/plan-fjords.jpg',
}
