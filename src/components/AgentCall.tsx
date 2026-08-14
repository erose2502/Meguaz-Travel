import { useEffect, useRef, useState } from 'react'
import {
  BarVisualizer,
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
  useVoiceAssistant,
} from '@livekit/components-react'
import { RoomEvent } from 'livekit-client'
import '@livekit/components-styles'
import Icon from './Icon'
import type { CallState } from '../types'
import { reportError } from '../lib/monitoring'

export type AgentBrief = {
  to?: string
  arrive?: string
  nights?: number
  budget?: number
  adults?: number
}

type Props = {
  call: CallState
  onEnd: () => void
  /** The agent solved a trip — fill the planner underneath the call. */
  onBrief: (brief: AgentBrief) => void
  /** Scene art for the destination being discussed, when one is chosen. */
  scene: string | null
}

// Real voice session with the self-hosted Meguaz agent (LiveKit SFU + worker
// on EC2). The backend mints a short-lived room token; the browser joins over
// WSS and the agent greets in audio. The agent's solve_trip tool pushes the
// brief back over the room's data channel, so the planner fills in live
// behind this card while the agent talks the traveller through the lanes.
export default function AgentCall({ onEnd, onBrief, scene }: Props) {
  const [conn, setConn] = useState<{ token: string; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })
        if (!res.ok) {
          const detail = await res.json().catch(() => null)
          throw new Error(detail?.error || 'Voice service unavailable (' + res.status + ')')
        }
        const data = await res.json()
        if (!cancelled) setConn(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not reach the voice service')
          reportError(err, 'agent-call-token')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 'clamp(16px,3vw,44px)',
        background: 'rgba(46,43,37,0.32)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <div
        style={{
          width: 'min(480px, 100%)',
          borderRadius: 36,
          overflow: 'hidden',
          background: 'rgba(255,253,248,0.9)',
          backdropFilter: 'blur(30px) saturate(185%)',
          WebkitBackdropFilter: 'blur(30px) saturate(185%)',
          border: '1px solid rgba(255,255,255,0.85)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95), 0 36px 72px -28px rgba(46,43,37,0.58)',
        }}
      >
        {scene && (
          <div
            aria-hidden
            style={{
              height: 92,
              background:
                'linear-gradient(rgba(13,42,45,0.12), rgba(255,253,248,0.94)), url(' +
                scene +
                ') center 35%/cover',
            }}
          />
        )}
        <div style={{ padding: 'clamp(18px,2.4vw,26px)', paddingTop: scene ? 12 : undefined }}>
          {error ? (
            <FailedCall message={error} onEnd={onEnd} />
          ) : !conn ? (
            <CallShell status="Waking your concierge…" state="connecting">
              <Caption text="A real voice agent is spinning up — a second or two." dim />
            </CallShell>
          ) : (
            <LiveKitRoom
              serverUrl={conn.url}
              token={conn.token}
              connect
              audio
              video={false}
              onDisconnected={onEnd}
              onError={(err) => {
                setError('Voice connection dropped — try again in a moment.')
                reportError(err, 'agent-call-room')
              }}
            >
              <LiveCall onEnd={onEnd} onBrief={onBrief} />
              <RoomAudioRenderer />
            </LiveKitRoom>
          )}
        </div>
      </div>
    </div>
  )
}

type OrbState = 'connecting' | 'listening' | 'thinking' | 'speaking'

/** The agent's presence: a lagoon orb that breathes while listening, shimmers
 * while thinking, and ripples while speaking — state you can read at a glance
 * from across the room. */
function Orb({ state }: { state: OrbState }) {
  return (
    <span
      style={{
        position: 'relative',
        width: 52,
        height: 52,
        flex: 'none',
        borderRadius: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at 32% 28%, var(--color-accent-2-300), var(--color-accent-2-700) 72%)',
        boxShadow: '0 6px 18px -6px var(--color-accent-2-700)',
        animation:
          state === 'thinking'
            ? 'mg-orb-breathe 0.9s ease-in-out infinite'
            : 'mg-orb-breathe 2.6s ease-in-out infinite',
      }}
    >
      {state === 'speaking' && (
        <>
          <span className="mg-orb-ring" />
          <span className="mg-orb-ring" style={{ animationDelay: '0.55s' }} />
        </>
      )}
      <span
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 18,
          color: 'var(--color-bg)',
        }}
      >
        M
      </span>
    </span>
  )
}

function CallShell({
  status,
  state,
  children,
}: {
  status: string
  state: OrbState
  children: React.ReactNode
}) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Orb state={state} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: 20, lineHeight: 1.15, margin: 0 }}>
            Meguaz travel desk
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-neutral-700)', margin: '3px 0 0' }}>{status}</p>
        </div>
      </div>
      {children}
    </>
  )
}

/** What the agent is saying, as it says it — fixed footprint so the card
 * never resizes mid-sentence. */
function Caption({ text, dim = false }: { text: string; dim?: boolean }) {
  return (
    <p
      style={{
        minHeight: 63,
        margin: '16px 0 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        fontSize: 14.5,
        lineHeight: 1.45,
        fontStyle: 'italic',
        color: dim ? 'var(--color-neutral-600)' : 'var(--color-text)',
        overflow: 'hidden',
      }}
    >
      {text}
    </p>
  )
}

function LiveCall({ onEnd, onBrief }: { onEnd: () => void; onBrief: (b: AgentBrief) => void }) {
  const { state, audioTrack, agentTranscriptions } = useVoiceAssistant()
  const { localParticipant } = useLocalParticipant()
  const room = useRoomContext()
  const [muted, setMuted] = useState(false)
  const [plannerCity, setPlannerCity] = useState<string | null>(null)
  const onBriefRef = useRef(onBrief)
  onBriefRef.current = onBrief

  // The agent's solve_trip pushes the brief here; the planner fills behind
  // the call while the agent keeps talking.
  useEffect(() => {
    const onData = (payload: Uint8Array, _p?: unknown, _k?: unknown, topic?: string) => {
      if (topic !== 'meguaz') return
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload)) as AgentBrief & { type?: string }
        if (msg.type === 'brief') {
          setPlannerCity(msg.to ?? null)
          onBriefRef.current(msg)
        }
      } catch {
        /* not ours */
      }
    }
    room.on(RoomEvent.DataReceived, onData)
    return () => {
      room.off(RoomEvent.DataReceived, onData)
    }
  }, [room])

  const live = state === 'listening' || state === 'thinking' || state === 'speaking'
  const orb: OrbState = live ? (state as OrbState) : 'connecting'
  const status =
    state === 'speaking'
      ? 'Meguaz is speaking'
      : state === 'listening'
        ? 'Live · listening'
        : state === 'thinking'
          ? 'Checking real prices…'
          : 'Joining the call…'

  const lastLine = agentTranscriptions.length
    ? agentTranscriptions[agentTranscriptions.length - 1].text
    : ''

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    void localParticipant.setMicrophoneEnabled(!next).catch(() => setMuted(!next))
  }

  return (
    <CallShell status={status} state={orb}>
      <Caption
        text={
          lastLine ||
          (live
            ? 'Say where you’re headed, your budget, and when you need to arrive.'
            : 'One moment — your agent is joining.')
        }
        dim={!lastLine}
      />

      <div style={{ height: 52, margin: '8px 0 0' }}>
        <BarVisualizer
          state={state}
          trackRef={audioTrack}
          barCount={9}
          style={{
            height: '100%',
            width: '100%',
            ['--lk-bar-color' as string]: 'var(--color-accent)',
            ['--lk-bar-color-active' as string]: 'var(--color-accent)',
          }}
        />
      </div>

      {plannerCity && (
        <div
          className="tag tag-accent-2"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            justifyContent: 'center',
            marginTop: 12,
            padding: '8px 14px',
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          <Icon name="check" size={14} />
          Planner filled with {plannerCity} — it&rsquo;s behind this card
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
        <button
          className="hv-white"
          onClick={toggleMute}
          style={{
            flex: '1 1 140px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: 15,
            border: '1px solid var(--color-divider)',
            borderRadius: 999,
            background: muted ? 'var(--color-accent-200)' : 'rgba(255,255,255,0.6)',
            fontFamily: 'var(--font-heading)',
            fontSize: 14,
            color: 'var(--color-text)',
            cursor: 'pointer',
          }}
        >
          <Icon name="mic" size={16} />
          {muted ? 'Unmute' : 'Mute'}
        </button>
        <button
          className="hv-accent-900"
          onClick={onEnd}
          style={{
            flex: '1 1 140px',
            padding: 15,
            border: 0,
            borderRadius: 999,
            background: 'var(--color-accent-800)',
            color: 'var(--color-accent-100)',
            fontFamily: 'var(--font-heading)',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          End call
        </button>
      </div>
    </CallShell>
  )
}

function FailedCall({ message, onEnd }: { message: string; onEnd: () => void }) {
  return (
    <CallShell status="Couldn't connect" state="connecting">
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.55,
          color: 'var(--color-accent-800)',
          background: 'var(--color-accent-100)',
          borderRadius: 12,
          padding: '10px 12px',
          margin: '16px 0 0',
        }}
      >
        {message}
      </p>
      <button
        className="hv-white"
        onClick={onEnd}
        style={{
          marginTop: 14,
          width: '100%',
          padding: 14,
          border: '1px solid var(--color-divider)',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.6)',
          fontFamily: 'var(--font-heading)',
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        Close
      </button>
    </CallShell>
  )
}
