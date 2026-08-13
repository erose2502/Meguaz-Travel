import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { destinationMusic, type DestinationMix } from '../lib/api'

type Props = {
  city: string
  country: string
  /** Lift above the mobile tab bar. */
  raised: boolean
}

/**
 * Floating destination-soundtrack dock. Collapsed it's a pill ("Sounds of
 * Tokyo"); expanded it plays a curated YouTube ambience mix. The video stays
 * visible while playing — YouTube's terms require the player on screen — and
 * nothing loads (and no quota is spent) until the traveller opens it.
 */
export default function MusicDock({ city, country, raised }: Props) {
  const [open, setOpen] = useState(false)
  // Playback survives collapsing: the iframe stays mounted (audio continues)
  // while the card visually folds away, so booking continues to music.
  const [playing, setPlaying] = useState(false)
  const [mix, setMix] = useState<DestinationMix | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle')
  const requestedFor = useRef<string | null>(null)

  // New destination: stop and forget the previous city's mix.
  useEffect(() => {
    setOpen(false)
    setPlaying(false)
    setMix(null)
    setState('idle')
    requestedFor.current = null
  }, [city])

  const expand = () => {
    setOpen(true)
    setPlaying(true)
    if (requestedFor.current === city) return
    requestedFor.current = city
    setState('loading')
    destinationMusic(city, country)
      .then((r) => {
        setMix(r.mix)
        setState(r.mix ? 'ready' : 'failed')
      })
      .catch(() => setState('failed'))
  }

  const stop = () => {
    setPlaying(false)
    setOpen(false)
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: raised ? 12 : 'clamp(12px,2vw,24px)',
        // On mobile the control sits beside the tab bar, not above it.
        bottom: raised ? 26 : 'clamp(12px,2vw,24px)',
        zIndex: 45,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
      }}
    >
      {(open || playing) && (
        <div
          className="glass-strong grain"
          style={
            open
              ? {
                  width: 'min(300px, calc(100vw - 32px))',
                  borderRadius: 20,
                  padding: 12,
                  backgroundColor: 'rgba(255,252,247,0.92)',
                }
              : {
                  // Collapsed while playing: fold the card away visually but
                  // keep the iframe mounted so the audio never stops.
                  position: 'absolute',
                  width: 1,
                  height: 1,
                  overflow: 'hidden',
                  opacity: 0,
                  pointerEvents: 'none',
                }
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Icon name="volume" size={14} color="var(--color-accent-700)" style={{ flex: 'none' }} />
            <p
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 12,
                fontWeight: 700,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {state === 'ready' && mix ? mix.title : 'Sounds of ' + city}
            </p>
            <button
              onClick={() => setOpen(false)}
              aria-label="Minimize — keep the music playing"
              title="Minimize — keep playing"
              style={{
                flex: 'none',
                border: 0,
                background: 'transparent',
                fontSize: 15,
                lineHeight: 1,
                color: 'var(--color-neutral-600)',
                cursor: 'pointer',
                padding: 2,
              }}
            >
              —
            </button>
            <button
              onClick={stop}
              aria-label="Stop the music"
              title="Stop"
              style={{
                flex: 'none',
                border: 0,
                background: 'transparent',
                fontSize: 16,
                lineHeight: 1,
                color: 'var(--color-neutral-600)',
                cursor: 'pointer',
                padding: 2,
              }}
            >
              ×
            </button>
          </div>

          {state === 'loading' && (
            <p style={{ fontSize: 12, color: 'var(--color-neutral-600)', margin: '4px 0' }}>
              Finding the right soundtrack for {city}…
            </p>
          )}
          {state === 'failed' && (
            <p style={{ fontSize: 12, color: 'var(--color-neutral-600)', margin: '4px 0' }}>
              No mix found right now — try again later.
            </p>
          )}
          {state === 'ready' && mix && (
            <>
              <div style={{ borderRadius: 14, overflow: 'hidden', background: '#000' }}>
                <iframe
                  title={'Destination music for ' + city}
                  src={
                    'https://www.youtube-nocookie.com/embed/' +
                    mix.videoId +
                    '?autoplay=1&rel=0&modestbranding=1'
                  }
                  width="100%"
                  height="158"
                  style={{ border: 0, display: 'block' }}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <p style={{ fontSize: 10, color: 'var(--color-neutral-600)', margin: '6px 0 0' }}>
                {mix.channel} · via YouTube
              </p>
            </>
          )}
        </div>
      )}

      <button
        className="glass-strong hv-white"
        onClick={() => (open ? setOpen(false) : expand())}
        aria-label={
          open
            ? 'Minimize the music player — keeps playing'
            : playing
              ? 'Show the music player'
              : 'Play sounds of ' + city
        }
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: raised ? 0 : 8,
          // Mobile: a circle beside the tab bar. Desktop: the labelled pill.
          width: raised ? 50 : undefined,
          height: raised ? 50 : undefined,
          padding: raised ? 0 : '11px 16px',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.7)',
          backgroundColor: 'rgba(255,252,247,0.85)',
          fontFamily: 'var(--font-heading)',
          fontSize: 13,
          color: 'var(--color-text)',
          cursor: 'pointer',
          boxShadow: '0 16px 36px -18px rgba(46,43,37,0.5)',
        }}
      >
        {playing ? (
          <span style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: raised ? 18 : 14 }} aria-hidden="true">
            {(raised ? [9, 16, 12, 15, 8] : [8, 13, 10]).map((h, i) => (
              <span
                key={i}
                style={{
                  width: 3,
                  height: h,
                  borderRadius: 999,
                  background: 'var(--color-accent)',
                  animation: `mg-wave 1.1s ease-in-out ${i * 0.13}s infinite`,
                  transformOrigin: 'bottom',
                }}
              />
            ))}
          </span>
        ) : (
          <Icon name="volume" size={raised ? 20 : 15} color="var(--color-accent-700)" />
        )}
        {!raised && (open ? 'Minimize' : playing ? 'Playing · ' + city : 'Sounds of ' + city)}
      </button>
    </div>
  )
}
