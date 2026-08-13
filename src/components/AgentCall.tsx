import { useEffect, useState } from 'react'
import {
  BarVisualizer,
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useVoiceAssistant,
} from '@livekit/components-react'
import '@livekit/components-styles'
import Icon from './Icon'
import type { CallState } from '../types'
import { reportError } from '../lib/monitoring'

type Props = {
  call: CallState
  onEnd: () => void
}

// Real voice session with the self-hosted Meguaz agent (LiveKit SFU + worker
// on EC2 — docs/ec2-deploy.md). The backend mints a short-lived room token;
// the browser joins over WSS and the agent greets in audio. The old version of
// this card was a 1.6-second timer pretending to connect.
export default function AgentCall({ onEnd }: Props) {
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
          width: 'min(460px, 100%)',
          borderRadius: 36,
          padding: 'clamp(20px,2.4vw,28px)',
          background: 'rgba(255,253,248,0.88)',
          backdropFilter: 'blur(30px) saturate(185%)',
          WebkitBackdropFilter: 'blur(30px) saturate(185%)',
          border: '1px solid rgba(255,255,255,0.85)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95), 0 36px 72px -28px rgba(46,43,37,0.58)',
        }}
      >
        {error ? (
          <FailedCall message={error} onEnd={onEnd} />
        ) : !conn ? (
          <CallShell status="Connecting you to the travel desk…">
            <IdleBars />
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
            <LiveCall onEnd={onEnd} />
            <RoomAudioRenderer />
          </LiveKitRoom>
        )}
      </div>
    </div>
  )
}

function CallShell({ status, children }: { status: string; children: React.ReactNode }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span
          style={{
            width: 52,
            height: 52,
            flex: 'none',
            borderRadius: 999,
            background: 'var(--color-accent-2-300)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-heading)',
            fontSize: 18,
            color: 'var(--color-accent-2-900)',
          }}
        >
          M
        </span>
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

function IdleBars() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 6,
        height: 64,
        margin: '20px 0 4px',
      }}
    >
      {[18, 34, 52, 28, 44, 20, 36].map((h, i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: h,
            borderRadius: 999,
            background: 'var(--color-accent-300)',
            animation: `mg-wave 1.1s ease-in-out ${i * 0.09}s infinite`,
            transformOrigin: 'bottom',
          }}
        />
      ))}
    </div>
  )
}

function LiveCall({ onEnd }: { onEnd: () => void }) {
  const { state, audioTrack } = useVoiceAssistant()
  const { localParticipant } = useLocalParticipant()
  const [muted, setMuted] = useState(false)

  const status =
    state === 'speaking'
      ? 'Meguaz is speaking'
      : state === 'listening'
        ? 'Live now · listening'
        : state === 'thinking'
          ? 'Solving your trip…'
          : 'Waiting for your agent to join…'

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    void localParticipant.setMicrophoneEnabled(!next).catch(() => setMuted(!next))
  }

  return (
    <CallShell status={status}>
      <div style={{ height: 72, margin: '20px 0 4px' }}>
        <BarVisualizer
          state={state}
          trackRef={audioTrack}
          barCount={7}
          style={{
            height: '100%',
            width: '100%',
            ['--lk-bar-color' as string]: 'var(--color-accent)',
            ['--lk-bar-color-active' as string]: 'var(--color-accent)',
          }}
        />
      </div>

      <p
        style={{
          fontSize: 13,
          lineHeight: 1.55,
          color: 'var(--color-neutral-700)',
          margin: '0 0 4px',
          textAlign: 'center',
        }}
      >
        Tell Meguaz where you&rsquo;re headed, your budget, and when you need to arrive. Booking
        always finishes in the app.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
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
    <CallShell status="Couldn't connect">
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
