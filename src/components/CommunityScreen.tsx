import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import Spinner from './Spinner'
import { img } from '../data/media'
import {
  destinationGuideFor,
  searchCommunity,
  setFollowing,
  submitReview,
  type CommunityFeedItem,
  type CommunityUser,
  type DestinationGuide,
  type SessionUser,
} from '../lib/api'
import { DESTINATIONS, type Destination } from '../data/destinations'
import { searchDestinations } from '../lib/search'
import { sceneUrls } from '../data/scenes'
import { shareJournalCard } from '../lib/shareCard'

type Props = {
  user: SessionUser | null
  goAccount: () => void
  /** Drops the reader into the planner with this destination prefilled. */
  onPlan: (code: string) => void
}

// ── Travel intel: the feed is alive on day zero. Listicle cards built from
//    the destination-guide pipeline (server-cached per city per month), each
//    with one-tap hops to Shorts/TikTok for the video itch. ──────────────────

const INTEL_CODES = ['LHR', 'CDG', 'NRT', 'FCO', 'IST', 'MEX']
const INTEL_CACHE: Record<string, DestinationGuide> = {}

function IntelCard({ code, onPlan }: { code: string; onPlan: (code: string) => void }) {
  const dest = DESTINATIONS.find((d) => d.code === code)
  const [guide, setGuide] = useState<DestinationGuide | null>(INTEL_CACHE[code] ?? null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!dest || INTEL_CACHE[code]) return
    const controller = new AbortController()
    destinationGuideFor(dest.city, dest.country, controller.signal)
      .then((g) => {
        INTEL_CACHE[code] = g
        setGuide(g)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => controller.abort()
  }, [code, dest])

  if (!dest || failed) return null
  const scene = img(sceneUrls(code)[0] ?? '')
  const things = guide?.attractions.slice(0, 6) ?? []
  const fact = guide?.facts[0] ?? null

  return (
    <article className="glass" style={{ borderRadius: 22, overflow: 'hidden' }}>
      <div style={{ position: 'relative', height: 150 }}>
        {scene && (
          <img
            src={scene}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(rgba(12,20,20,0.05) 40%, rgba(12,20,20,0.62))',
          }}
        />
        <p
          style={{
            position: 'absolute',
            left: 16,
            bottom: 12,
            margin: 0,
            fontFamily: 'var(--font-heading)',
            fontSize: 21,
            color: '#fff',
            textShadow: '0 2px 12px rgba(0,0,0,0.4)',
          }}
        >
          {things.length > 0 ? things.length + ' things to do in ' + dest.city : dest.city}
        </p>
      </div>
      <div style={{ padding: '12px 16px 16px' }}>
        {guide === null ? (
          <div
            style={{
              height: 120,
              borderRadius: 12,
              background:
                'linear-gradient(100deg, var(--color-neutral-200) 40%, var(--color-neutral-100) 50%, var(--color-neutral-200) 60%)',
              backgroundSize: '300% 100%',
              animation: 'mg-shimmer 1.4s linear infinite',
            }}
          />
        ) : (
          <>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 7 }}>
              {things.map((a, i) => (
                <li key={a.name} style={{ display: 'flex', gap: 9, fontSize: 12.5, lineHeight: 1.45 }}>
                  <span
                    style={{
                      flex: 'none',
                      width: 19,
                      height: 19,
                      borderRadius: 999,
                      background: 'var(--color-accent-100)',
                      color: 'var(--color-accent-800)',
                      fontSize: 10.5,
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 1,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span>
                    <strong>{a.name}</strong>
                    <span style={{ color: 'var(--color-neutral-600)' }}> — {a.why}</span>
                  </span>
                </li>
              ))}
            </ol>
            {fact && (
              <p
                style={{
                  margin: '10px 0 0',
                  padding: '8px 11px',
                  borderRadius: 12,
                  background: 'var(--color-accent-2-100)',
                  color: 'var(--color-accent-2-800)',
                  fontSize: 11.5,
                  lineHeight: 1.5,
                }}
              >
                ✦ {fact}
              </p>
            )}
          </>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
          <button
            className="hv-accent"
            onClick={() => onPlan(dest.code)}
            style={{
              border: 0,
              borderRadius: 999,
              padding: '8px 16px',
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-heading)',
              fontSize: 12.5,
              cursor: 'pointer',
            }}
          >
            Plan {dest.city}
          </button>
          <a
            href={'https://www.youtube.com/results?search_query=' + encodeURIComponent(dest.city + ' travel shorts')}
            target="_blank"
            rel="noopener noreferrer"
            className="hv-white"
            style={{ border: '1px solid var(--color-divider)', borderRadius: 999, padding: '8px 14px', fontSize: 11.5, fontWeight: 700, color: 'var(--color-text)', textDecoration: 'none' }}
          >
            ▶ Shorts
          </a>
          <a
            href={'https://www.tiktok.com/search?q=' + encodeURIComponent(dest.city + ' travel')}
            target="_blank"
            rel="noopener noreferrer"
            className="hv-white"
            style={{ border: '1px solid var(--color-divider)', borderRadius: 999, padding: '8px 14px', fontSize: 11.5, fontWeight: 700, color: 'var(--color-text)', textDecoration: 'none' }}
          >
            ♪ TikTok
          </a>
        </div>
      </div>
    </article>
  )
}

function TravelIntel({ onPlan }: { onPlan: (code: string) => void }) {
  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '0 0 10px' }}>
        <h2 style={{ fontSize: 17, margin: 0 }}>Travel intel</h2>
        <span style={{ fontSize: 11.5, color: 'var(--color-neutral-600)' }}>
          fresh guides while the community grows
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 12 }}>
        {INTEL_CODES.map((code) => (
          <IntelCard key={code} code={code} onPlan={onPlan} />
        ))}
      </div>
    </section>
  )
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
/** Journal a trip straight from the community: pick where, rate it, write the
    entry. Posting drops it into the feed instantly — and every entry can be
    shared onward as a postcard. */
function JournalComposer({
  user,
  onPosted,
}: {
  user: SessionUser | null
  onPosted: (item: CommunityFeedItem) => void
}) {
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<Destination | null>(null)
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const matches = q.trim() && !picked ? searchDestinations(q, DESTINATIONS).slice(0, 5) : []

  const post = async () => {
    if (!picked || !body.trim() || posting) return
    setPosting(true)
    setError(null)
    try {
      await submitReview(picked.code, rating, title.trim() || undefined, body.trim())
      onPosted({
        id: 'local-' + Date.now(),
        destinationCode: picked.code,
        rating,
        title: title.trim() || null,
        body: body.trim(),
        createdAt: new Date().toISOString(),
        author: { name: user?.displayName || user?.email?.split('@')[0] || 'You', avatarUrl: null },
      })
      setPicked(null)
      setQ('')
      setTitle('')
      setBody('')
      setRating(5)
    } catch {
      setError('Could not post your entry — try again in a moment.')
    } finally {
      setPosting(false)
    }
  }

  const FIELD: React.CSSProperties = {
    border: '1px solid rgba(46,43,37,0.16)',
    borderRadius: 12,
    padding: '9px 12px',
    fontSize: 14,
    fontFamily: 'inherit',
    background: 'rgba(255,255,255,0.7)',
    color: 'inherit',
    minWidth: 0,
    outline: 'none',
  }

  return (
    <section className="glass grain" style={{ borderRadius: 22, padding: 16, marginBottom: 18 }}>
      <h2 style={{ fontSize: 17, margin: '0 0 2px' }}>Journal a trip</h2>
      <p style={{ fontSize: 12, color: 'var(--color-neutral-600)', margin: '0 0 12px' }}>
        Where were you, how was it, what should the next traveller know? Every entry becomes a
        postcard others can share.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ position: 'relative', flex: '1 1 190px' }}>
          {picked ? (
            <button
              onClick={() => {
                setPicked(null)
                setQ('')
              }}
              style={{
                ...FIELD,
                width: '100%',
                textAlign: 'left',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Icon name="mapPin" size={14} color="var(--color-accent-700)" />
              {picked.city} <span style={{ opacity: 0.5, fontWeight: 500 }}>· change</span>
            </button>
          ) : (
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Which city?"
              aria-label="Destination"
              style={{ ...FIELD, width: '100%' }}
            />
          )}
          {matches.length > 0 && (
            <div
              className="popover"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                zIndex: 40,
                borderRadius: 14,
                padding: 5,
              }}
            >
              {matches.map((d) => (
                <button
                  key={d.code}
                  onClick={() => setPicked(d)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    border: 0,
                    borderRadius: 10,
                    padding: '8px 11px',
                    background: 'transparent',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {d.city} <span style={{ opacity: 0.55 }}>· {d.country}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span role="radiogroup" aria-label="Rating" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '0 4px' }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              role="radio"
              aria-checked={rating === n}
              aria-label={n + ' stars'}
              onClick={() => setRating(n)}
              style={{
                border: 0,
                background: 'transparent',
                fontSize: 22,
                lineHeight: 1,
                padding: 2,
                cursor: 'pointer',
                color: n <= rating ? '#e0a33c' : 'var(--color-neutral-400)',
              }}
            >
              ★
            </button>
          ))}
        </span>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give the trip a name (optional)"
          aria-label="Entry title"
          style={{ ...FIELD, flex: '1 1 220px' }}
        />
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Three days of cliff walks and the best seafood of my life. Skip the funicular queue — walk up, it's twenty minutes and the view…"
        aria-label="Journal entry"
        rows={3}
        style={{ ...FIELD, width: '100%', marginTop: 8, resize: 'vertical', lineHeight: 1.55 }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
        {error && <span style={{ fontSize: 12, color: 'var(--color-accent-800)' }}>{error}</span>}
        <button
          className="hv-accent"
          onClick={post}
          disabled={!picked || !body.trim() || posting}
          style={{
            marginLeft: 'auto',
            border: 0,
            borderRadius: 999,
            padding: '10px 22px',
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
            fontFamily: 'var(--font-heading)',
            fontSize: 14,
            cursor: !picked || !body.trim() || posting ? 'default' : 'pointer',
            opacity: !picked || !body.trim() || posting ? 0.55 : 1,
          }}
        >
          {posting ? 'Posting…' : 'Post to the community'}
        </button>
      </div>
    </section>
  )
}

function FeedCard({ item }: { item: CommunityFeedItem }) {
  const [imgDead, setImgDead] = useState(false)
  const [sharing, setSharing] = useState(false)
  const share = async () => {
    setSharing(true)
    try {
      await shareJournalCard({
        code: item.destinationCode,
        city: cityFor(item.destinationCode),
        rating: item.rating,
        title: item.title,
        body: item.body,
        author: item.author.name,
      })
    } catch {
      /* dismissed the sheet */
    } finally {
      setSharing(false)
    }
  }
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
          <button
            onClick={share}
            disabled={sharing}
            aria-label="Share this postcard"
            title="Share as a postcard"
            style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              border: '1px solid rgba(46,43,37,0.14)',
              borderRadius: 999,
              padding: '5px 11px',
              background: 'rgba(255,255,255,0.6)',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--color-text)',
              cursor: sharing ? 'progress' : 'pointer',
            }}
          >
            <Icon name="share" size={12} color="var(--color-accent-700)" />
            {sharing ? '…' : 'Share'}
          </button>
          <span style={{ fontSize: 11.5, color: 'var(--color-neutral-600)' }}>
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

export default function CommunityScreen({ user, goAccount, onPlan }: Props) {
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
    // Signed out, the tab still breathes: travel intel is public. Only the
    // people features (follow, journal) wait behind the account.
    return (
      <div data-screen-label="Community" style={{ maxWidth: 980, margin: '0 auto' }}>
        <div className="glass" style={{ borderRadius: 22, padding: 24, textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
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
        <TravelIntel onPlan={onPlan} />
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

          <JournalComposer
            user={user}
            onPosted={(item) => setFeed((prev) => [item, ...prev])}
          />

          <TravelIntel onPlan={onPlan} />

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
