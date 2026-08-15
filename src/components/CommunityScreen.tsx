import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import Spinner from './Spinner'
import { img } from '../data/media'
import {
  searchCommunity,
  setFollowing,
  type CommunityFeedItem,
  type CommunityUser,
  type SessionUser,
} from '../lib/api'
import { DESTINATIONS } from '../data/destinations'
import { sceneUrls } from '../data/scenes'

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

function Stars({ value }: { value: number }) {
  return (
    <span aria-label={value + ' out of 5 stars'} style={{ color: '#E8A33D', fontSize: 13, letterSpacing: 2 }}>
      {'★'.repeat(value)}
      <span style={{ color: 'var(--color-divider)' }}>{'★'.repeat(5 - value)}</span>
    </span>
  )
}

function ago(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60_000))
  if (mins < 60) return mins + 'm ago'
  const hours = Math.round(mins / 60)
  if (hours < 24) return hours + 'h ago'
  const days = Math.round(hours / 24)
  return days < 30 ? days + 'd ago' : Math.round(days / 30) + 'mo ago'
}

function cityFor(code: string): string {
  return DESTINATIONS.find((d) => d.code === code)?.city ?? code
}

/** A traveller's review as a postcard: the destination's scene sets the mood,
 * the stars and words carry the opinion. */
function FeedCard({ item }: { item: CommunityFeedItem }) {
  const [imgDead, setImgDead] = useState(false)
  const raw = sceneUrls(item.destinationCode)[1] ?? sceneUrls(item.destinationCode)[0] ?? null
  const scene = raw ? img(raw) : null
  return (
    <article className="glass" style={{ borderRadius: 20, overflow: 'hidden' }}>
      <div
        style={{
          position: 'relative',
          height: 110,
          background: 'linear-gradient(135deg, var(--color-accent-2-300), var(--color-accent-2-700))',
        }}
      >
        {scene && !imgDead && (
          <img
            src={scene}
            alt=""
            loading="lazy"
            onError={() => setImgDead(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
        <span
          style={{
            position: 'absolute',
            left: 12,
            bottom: 10,
            padding: '4px 12px',
            borderRadius: 999,
            background: 'rgba(24,20,16,0.55)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            color: '#fff',
            fontFamily: 'var(--font-heading)',
            fontSize: 13,
          }}
        >
          {cityFor(item.destinationCode)}
        </span>
      </div>
      <div style={{ padding: '12px 14px 14px' }}>
        <Stars value={item.rating} />
        {item.title && <p style={{ fontSize: 14, fontWeight: 700, margin: '6px 0 0' }}>{item.title}</p>}
        {item.body && (
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: 'var(--color-neutral-700)',
              margin: '6px 0 0',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {item.body}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <Avatar name={item.author.name} url={item.author.avatarUrl} size={26} />
          <span style={{ fontSize: 12, fontWeight: 700 }}>{item.author.name}</span>
          <span style={{ fontSize: 11.5, color: 'var(--color-neutral-600)', marginLeft: 'auto' }}>
            {ago(item.createdAt)}
          </span>
        </div>
      </div>
    </article>
  )
}

function FollowButton({ u, onToggle }: { u: CommunityUser; onToggle: (u: CommunityUser) => void }) {
  return (
    <button
      className={u.following ? 'hv-white' : 'hv-accent'}
      onClick={() => onToggle(u)}
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
  )
}

export default function CommunityScreen({ user, goAccount }: Props) {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<CommunityUser[]>([])
  const [discover, setDiscover] = useState<CommunityUser[]>([])
  const [feed, setFeed] = useState<CommunityFeedItem[]>([])
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
        .then((r) => {
          setUsers(r.users)
          // Only the empty-query response carries the discovery payload;
          // keep the last one on screen while a search is being typed.
          if (r.discover) setDiscover(r.discover)
          if (r.feed) setFeed(r.feed)
        })
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
    // Optimistic flip everywhere the person appears; restore on failure.
    const flip = (list: CommunityUser[], to: boolean) =>
      list.map((u) => (u.id === target.id ? { ...u, following: to } : u))
    setUsers((prev) => flip(prev, !target.following))
    setDiscover((prev) => flip(prev, !target.following))
    setFollowing(target.id, !target.following).catch(() => {
      setUsers((prev) => flip(prev, target.following))
      setDiscover((prev) => flip(prev, target.following))
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

  const searching = query.trim().length > 0

  return (
    <div data-screen-label="Community" style={{ maxWidth: 860, margin: '0 auto' }}>
      <h1 style={{ fontSize: 'clamp(26px,3.4vw,40px)', lineHeight: 1.05, margin: '0 0 6px' }}>Community</h1>
      <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-neutral-700)', margin: '0 0 14px' }}>
        Follow other travellers — their destination reviews show up across the app.
      </p>

      <div style={{ position: 'relative', marginBottom: 16 }}>
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

      {/* Search results, or the travellers you follow */}
      {(searching || users.length > 0) && (
        <section style={{ marginBottom: 22 }}>
          {!searching && users.length > 0 && (
            <h2 style={{ fontSize: 17, margin: '0 0 10px' }}>Travellers you follow</h2>
          )}
          {!loading && searching && users.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>Nobody by that name yet.</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {users.map((u) => (
              <div
                key={u.id}
                className="glass"
                style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 18, padding: '12px 14px' }}
              >
                <Avatar name={u.name} url={u.avatarUrl} />
                <p style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, margin: 0 }}>{u.name}</p>
                <FollowButton u={u} onToggle={toggle} />
              </div>
            ))}
          </div>
        </section>
      )}

      {!searching && (
        <>
          {/* Fresh faces — every new account shows up here immediately */}
          {discover.length > 0 && (
            <section style={{ marginBottom: 22 }}>
              <h2 style={{ fontSize: 17, margin: '0 0 10px' }}>New travellers</h2>
              <div className="mg-rail" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
                {discover.map((u) => (
                  <div
                    key={u.id}
                    className="glass"
                    style={{
                      flex: '0 0 168px',
                      scrollSnapAlign: 'start',
                      borderRadius: 18,
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      textAlign: 'center',
                    }}
                  >
                    <Avatar name={u.name} url={u.avatarUrl} size={52} />
                    <p
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        margin: 0,
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {u.name}
                    </p>
                    <FollowButton u={u} onToggle={toggle} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* The pulse: latest reviews as destination postcards */}
          <section>
            <h2 style={{ fontSize: 17, margin: '0 0 10px' }}>Latest from travellers</h2>
            {feed.length === 0 ? (
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-neutral-600)' }}>
                No reviews yet — rate a destination you know from its briefing page and yours will be
                the first postcard here.
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: 12,
                }}
              >
                {feed.map((item) => (
                  <FeedCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
