import { useEffect, useRef, useState } from 'react'
import { HERO_REEL, HERO_REEL_LITE, img, type HeroSlide } from '../data/media'

type Props = {
  /** Destination stills; take over the reel once a destination is chosen. */
  scenes: string[]
  destCity: string | null
  /** Generated cinematic clip for the chosen destination, when we have one. */
  destClip?: string | null
}

const HOLD_MS = 9000

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

/** Phones and data-saver connections get the photo reel — the videos are
    megabytes each and were measured strangling first load on mobile. */
function liteMedia() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(max-width: 767px)').matches) return true
  const conn = (navigator as { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  return conn?.saveData === true || conn?.effectiveType === '2g' || conn?.effectiveType === '3g'
}

/**
 * The app's living background: the cinematic reel fills the whole viewport,
 * fixed behind every screen. A veil above it (rendered by App) keeps content
 * legible; this layer only manages the media and its slow crossfade.
 */
export default function BackdropReel({ scenes, destCity, destClip = null }: Props) {
  const [lite] = useState(liteMedia)
  const sceneSlides: HeroSlide[] = scenes.slice(0, 3).map((src, i) => ({
    src,
    alt: ['Arriving in ', 'Streets of ', 'Landmarks of '][i] + (destCity ?? ''),
  }))
  const slides: HeroSlide[] =
    destClip && !lite
      ? [{ src: destClip, alt: 'Cinematic aerial of ' + (destCity ?? 'your destination'), video: true }, ...sceneSlides.slice(0, 2)]
      : sceneSlides.length > 0
        ? sceneSlides
        : lite
          ? HERO_REEL_LITE
          : HERO_REEL

  const [index, setIndex] = useState(0)
  const key = slides.map((s) => s.src).join('|')

  useEffect(() => setIndex(0), [key])

  useEffect(() => {
    if (slides.length < 2 || prefersReducedMotion()) return
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setIndex((i) => (i + 1) % slides.length)
      }
    }, HOLD_MS)
    return () => clearInterval(id)
  }, [key, slides.length])

  // Videos are ~5MB each. First paint only streams the ACTIVE slide; the one
  // on deck starts preloading a few seconds later, once the page has settled —
  // otherwise two videos race the bundle and fonts down one connection.
  const warmed = useRef(new Set<number>())
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    warmed.current.clear()
  }, [key])
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 6000)
    return () => clearTimeout(t)
  }, [])
  const nextIndex = (index + 1) % slides.length
  const shouldMount = (i: number) => {
    if (i === index || (settled && i === nextIndex) || warmed.current.has(i)) {
      warmed.current.add(i)
      return true
    }
    return false
  }

  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      {/* Instant ground: a ~300KB still paints immediately, so the page never
          shows a void while the first video streams in over it. */}
      <img
        src={img('/media/plan-fjords.jpg')}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {slides.map((slide, i) => (
        <div
          key={slide.src}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: i === index ? 1 : 0,
            transition: 'opacity 1600ms ease',
            willChange: 'opacity',
          }}
        >
          {slide.video
            ? shouldMount(i) && (
                <video
                  src={slide.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              )
            : shouldMount(i) && (
                <img
                  src={slide.src}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              )}
        </div>
      ))}
    </div>
  )
}
