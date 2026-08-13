import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { HERO_REEL, type HeroSlide } from '../data/media'

type Slide = HeroSlide

type Props = {
  /** Photography of the chosen destination; takes over from the default reel. */
  scenes: string[]
  destCity: string | null
  /** Generated cinematic clip for the chosen destination, when we have one. */
  destClip?: string | null
  /** Full-bleed cinematic mode: taller, edge to edge, deep bottom gradient. */
  immersive?: boolean
  children: React.ReactNode
}

// The reel shown before a destination is picked — generated cinematic clips
// spanning climates, so the page reads as "anywhere" rather than "a mountain".
const DEFAULT_SLIDES: Slide[] = HERO_REEL

const HOLD_MS = 6500

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

export default function HeroStage({ scenes, destCity, destClip = null, immersive = false, children }: Props) {
  const sceneSlides: Slide[] = scenes.slice(0, 3).map((src, i) => ({
    src,
    alt: ['Arriving in ', 'Streets of ', 'Landmarks of '][i] + (destCity ?? ''),
  }))
  // A generated cinematic clip of the destination leads; live photography
  // follows it in the reel. No destination at all → the default video reel.
  const slides: Slide[] = destClip
    ? [
        { src: destClip, alt: 'Cinematic aerial of ' + (destCity ?? 'your destination'), video: true },
        ...sceneSlides.slice(0, 2),
      ]
    : sceneSlides.length > 0
      ? sceneSlides
      : DEFAULT_SLIDES

  const [index, setIndex] = useState(0)
  const layerRefs = useRef<(HTMLDivElement | null)[]>([])
  const stage = useRef<HTMLDivElement>(null)
  const key = slides.map((s) => s.src).join('|')

  // Restart the reel whenever the source set changes (destination picked).
  useEffect(() => setIndex(0), [key])

  // Video slides are ~5MB each; mounting all five would pull ~25MB on page
  // load. Mount only the active clip and the one on deck (6.5s of preload
  // headroom), keeping clips that already played so revisits are instant.
  const warmed = useRef(new Set<number>())
  useEffect(() => {
    warmed.current.clear()
  }, [key])
  const nextIndex = (index + 1) % slides.length
  const shouldMount = (i: number) => {
    if (i === index || i === nextIndex || warmed.current.has(i)) {
      warmed.current.add(i)
      return true
    }
    return false
  }

  // Advance on a timer; pause while the tab is hidden so we do not animate
  // into an empty room.
  useEffect(() => {
    if (slides.length < 2 || prefersReducedMotion()) return
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setIndex((i) => (i + 1) % slides.length)
      }
    }, HOLD_MS)
    return () => clearInterval(id)
  }, [key, slides.length])

  // Crossfade to the active layer, and drift it slowly the whole time it is
  // on screen — stillness is what made this box feel dead.
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      layerRefs.current.forEach((layer, i) => {
        if (!layer) return
        const active = i === index
        if (prefersReducedMotion()) {
          gsap.set(layer, { autoAlpha: active ? 1 : 0, scale: 1, xPercent: 0 })
          return
        }
        gsap.to(layer, {
          autoAlpha: active ? 1 : 0,
          duration: 1.1,
          ease: 'power2.inOut',
        })
        if (active) {
          gsap.fromTo(
            layer,
            { scale: 1.04, xPercent: i % 2 === 0 ? -1 : 1 },
            { scale: 1.12, xPercent: 0, duration: HOLD_MS / 1000 + 1.2, ease: 'none' },
          )
        }
      })
    }, stage)
    return () => ctx.revert()
  }, [index, key])

  return (
    <div
      ref={stage}
      style={{
        position: 'relative',
        borderRadius: immersive ? '0 0 34px 34px' : 24,
        overflow: 'hidden',
        height: immersive ? 'clamp(400px, 54vh, 620px)' : 'clamp(200px,24vw,300px)',
        display: 'flex',
        alignItems: 'flex-end',
        boxShadow: '0 24px 48px -28px rgba(46,43,37,0.5)',
        background: 'var(--color-neutral-300)',
      }}
    >
      {slides.map((slide, i) => (
        <div
          key={slide.src}
          ref={(el) => {
            layerRefs.current[i] = el
          }}
          aria-hidden={i !== index}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: i === 0 ? 1 : 0,
            visibility: i === 0 ? 'visible' : 'hidden',
            willChange: 'transform, opacity',
          }}
        >
          {slide.video ? (
            shouldMount(i) && (
              <video
                className="washed"
                src={slide.src}
                autoPlay
                muted
                loop
                playsInline
                aria-label={i === index ? slide.alt : undefined}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )
          ) : (
            <img
              className="washed"
              src={slide.src}
              alt={i === index ? slide.alt : ''}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
        </div>
      ))}

      <span
        style={{
          position: 'absolute',
          inset: 0,
          background: immersive
            ? 'linear-gradient(180deg,rgba(28,24,20,0.12) 0%,rgba(28,24,20,0.06) 34%,rgba(28,24,20,0.28) 62%,rgba(24,20,16,0.82) 100%)'
            : 'linear-gradient(180deg,rgba(28,24,20,0.05) 0%,rgba(28,24,20,0.15) 45%,rgba(24,20,16,0.76) 100%)',
        }}
      />

      {slides.length > 1 && (
        <div
          style={{
            position: 'absolute',
            right: 16,
            bottom: 16,
            display: 'flex',
            gap: 6,
            zIndex: 2,
          }}
        >
          {slides.map((slide, i) => (
            <button
              key={slide.src}
              onClick={() => setIndex(i)}
              aria-label={'Show image ' + (i + 1)}
              style={{
                width: i === index ? 20 : 7,
                height: 7,
                padding: 0,
                border: 0,
                borderRadius: 999,
                background: i === index ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)',
                cursor: 'pointer',
                transition: 'width 320ms ease, background 320ms ease',
              }}
            />
          ))}
        </div>
      )}

      <div style={{ position: 'relative', padding: 'clamp(16px,2vw,28px)', color: 'var(--color-neutral-100)' }}>
        {children}
      </div>
    </div>
  )
}
