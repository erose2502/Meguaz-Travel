import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import Spinner from './Spinner'
import { searchCommunity, setFollowing, type CommunityUser, type SessionUser } from '../lib/api'

type Props = {
  user: SessionUser | null
  goAccount: () => void
}

function Avatar({ name, url, size = 44 }: { name: string; url: string | null; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
  return (
    <span
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: 999,
        overflow: 'hidden',
        background: 'var(--color-accent-2-300)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-heading)',
        fontSize: size / 3,
        color: 'var(--color-accent-2-900)',
      }}
    >
      {url ? (
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        initials || '?'
      )}
    </span>
  )
}

export default function CommunityScreen({ user, goAccount }: Props) {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<CommunityUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      setLoading(true)
      setError(null)
      searchCommunity(query.trim(), controller.signal)
        .then((r) => setUsers(r.users))
        .catch((err) => {
          if ((err as Error).name !== 'AbortError') setError('Could not reach the community.')
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 350)
    return () => {
      clearTimeout(debounce.current)
      controller.abort()
    }
  }, [query, user])

  const toggle = (target: CommunityUser) => {
    // Optimistic flip; restore on failure.
    setUsers((prev) =>
      prev.map((u) => (u.id === target.id ? { ...u, following: !u.following } : u)),
    )
    setFollowing(target.id, !target.following).catch(() => {
      setUsers((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, following: target.following } : u)),
      )
    })
  }

  if (!user) {
    return (
      <div data-screen-label="Community" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="glass" style={{ borderRadius: 22, padding: 24, textAlign: 'center' }}>
          <span
            className="glass-accent"
            style={{
              width: 54,
              height: 54,
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="heart" size={22} color="var(--color-accent-800)" />
          </span>
          <h1 style={{ fontSize: 22, margin: '12px 0 6px' }}>Travel is better together</h1>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: 'var(--color-neutral-700)',
              margin: '0 auto 16px',
              maxWidth: '44ch',
            }}
          >
            Sign in to find other travellers, follow their journeys, and share destination reviews.
          </p>
          <button
            className="hv-accent"
            onClick={goAccount}
            style={{
              border: 0,
              borderRadius: 999,
              padding: '12px 22px',
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-heading)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Sign in or create an account
          </button>
        </div>
      </div>
    )
  }

  return (
    <div data-screen-label="Community" style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 'clamp(26px,3.4vw,40px)', lineHeight: 1.05, margin: '0 0 6px' }}>Community</h1>
      <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-neutral-700)', margin: '0 0 14px' }}>
        Find travellers by name and follow them. Their destination reviews show up across the app.
      </p>

      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Icon
          name="user"
          size={15}
          color="var(--color-neutral-600)"
          style={{ position: 'absolute', left: 14, top: 13, pointerEvents: 'none' }}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search travellers by name"
          autoComplete="off"
          style={{
            width: '100%',
            height: 42,
            padding: '0 14px 0 38px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.75)',
            background: 'rgba(255,255,255,0.62)',
            font: 'inherit',
            fontSize: 14,
            outline: 'none',
          }}
        />
      </div>

      {error && (
        <p style={{ fontSize: 13, color: 'var(--color-accent-800)', margin: '0 0 10px' }}>{error}</p>
      )}
      {loading && <Spinner size={16} label="Searching" />}

      {!loading && users.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>
          {query.trim()
            ? 'Nobody by that name yet.'
            : "You're not following anyone yet — search a name to get started."}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {users.map((u) => (
          <div
            key={u.id}
            className="glass"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              borderRadius: 18,
              padding: '12px 14px',
            }}
          >
            <Avatar name={u.name} url={u.avatarUrl} />
            <p style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, margin: 0 }}>{u.name}</p>
            <button
              className={u.following ? 'hv-white' : 'hv-accent'}
              onClick={() => toggle(u)}
              style={{
                flex: 'none',
                border: u.following ? '1px solid var(--color-divider)' : 0,
                borderRadius: 999,
                padding: '9px 16px',
                background: u.following ? 'rgba(255,255,255,0.6)' : 'var(--color-accent)',
                color: u.following ? 'var(--color-text)' : 'var(--color-bg)',
                fontFamily: 'var(--font-heading)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {u.following ? 'Following' : 'Follow'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
