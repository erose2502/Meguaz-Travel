import { useEffect, useState } from 'react'
import Icon, { type IconName } from './Icon'
import type { Destination } from '../data/destinations'
import { formatDuration } from '../data/destinations'
import { COUNTRY_ESSENTIALS } from '../data/countryEssentials'
import { useCityIntro } from '../lib/countryFacts'
import { PHRASES } from '../data/phrases'
import {
  deleteReview,
  foodSuggestions,
  listReviews,
  submitReview,
  type FoodSpot,
  type Review,
} from '../lib/api'

type Props = {
  dest: Destination
  signedIn: boolean
  goHome: () => void
  goPhrases: () => void
  goAccount: () => void
}

function Stars({
  value,
  size = 16,
  onPick,
}: {
  value: number
  size?: number
  onPick?: (n: number) => void
}) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }} role={onPick ? 'radiogroup' : undefined}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onPick}
          onClick={() => onPick?.(n)}
          aria-label={n + ' star' + (n > 1 ? 's' : '')}
          style={{
            border: 0,
            background: 'transparent',
            padding: 0,
            cursor: onPick ? 'pointer' : 'default',
            fontSize: size,
            lineHeight: 1,
            color: n <= value ? 'var(--color-accent)' : 'rgba(46,43,37,0.22)',
          }}
        >
          ★
        </button>
      ))}
    </span>
  )
}

function Fact({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="glass-soft" style={{ borderRadius: 24, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name={icon} size={15} color="var(--color-accent-700)" />
        <span
          style={{
            fontSize: 10,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: 'var(--color-neutral-600)',
          }}
        >
          {label}
        </span>
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, margin: '8px 0 0', lineHeight: 1.3 }}>{value}</p>
    </div>
  )
}

export default function BriefingScreen({ dest, signedIn, goHome, goPhrases, goAccount }: Props) {
  const { intro } = useCityIntro(dest)
  const essentials = COUNTRY_ESSENTIALS[dest.cc]
  const hasPack = !!PHRASES[dest.lang]

  // "Eat like a local" — researched once per city and cached server-side for a
  // month; the section simply doesn't render if the lookup fails.
  const [food, setFood] = useState<FoodSpot[] | null>(null)
  const [foodLoading, setFoodLoading] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    setFood(null)
    setFoodLoading(true)
    foodSuggestions(dest.city, dest.country, controller.signal)
      .then((r) => setFood(r.spots))
      .catch(() => setFood(null))
      .finally(() => {
        if (!controller.signal.aborted) setFoodLoading(false)
      })
    return () => controller.abort()
  }, [dest.city, dest.country])

  // Traveller reviews — Yelp-style stars, stored in Supabase, public to read.
  const [reviews, setReviews] = useState<Review[]>([])
  const [average, setAverage] = useState<number | null>(null)
  const [myRating, setMyRating] = useState(0)
  const [myTitle, setMyTitle] = useState('')
  const [myBody, setMyBody] = useState('')
  const [savingReview, setSavingReview] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  const loadReviews = (signal?: AbortSignal) =>
    listReviews(dest.code, signal)
      .then((r) => {
        setReviews(r.reviews)
        setAverage(r.average)
        const mine = r.reviews.find((rev) => rev.mine)
        if (mine) {
          setMyRating(mine.rating)
          setMyTitle(mine.title ?? '')
          setMyBody(mine.body ?? '')
        }
      })
      .catch(() => {
        /* reviews are additive; the briefing works without them */
      })

  useEffect(() => {
    const controller = new AbortController()
    setReviews([])
    setAverage(null)
    setMyRating(0)
    setMyTitle('')
    setMyBody('')
    loadReviews(controller.signal)
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest.code])

  const saveReview = async () => {
    if (myRating < 1) {
      setReviewError('Pick a star rating first')
      return
    }
    setSavingReview(true)
    setReviewError(null)
    try {
      await submitReview(dest.code, myRating, myTitle.trim() || undefined, myBody.trim() || undefined)
      await loadReviews()
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Could not save your review')
    } finally {
      setSavingReview(false)
    }
  }

  const money = essentials
    ? essentials.currencySymbol + ' ' + essentials.currencyCode + ' · ' + essentials.currency
    : ''

  return (
    <div data-screen-label="Briefing" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 'clamp(16px,2vw,26px)' }}>
        <button
          className="glass hv-white"
          onClick={goHome}
          aria-label="Back to home"
          style={{
            width: 44,
            height: 44,
            flex: 'none',
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Icon name="arrowLeft" size={18} color="var(--color-text)" />
        </button>
        <div>
          <p
            style={{
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-accent-700)',
              margin: 0,
            }}
          >
            Know before you go
          </p>
          <h1 style={{ fontSize: 'clamp(26px,3.4vw,44px)', lineHeight: 1.08, margin: '4px 0 0' }}>
            {dest.city} briefing
          </h1>
        </div>
      </div>

      {/* Orientation */}
      <div className="glass-strong grain" style={{ borderRadius: 'clamp(24px,2.6vw,34px)', padding: 'clamp(18px,2.2vw,26px)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              width: 46,
              height: 32,
              borderRadius: 8,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundImage: 'url("https://flagcdn.com/w160/' + dest.cc + '.png")',
              backgroundColor: 'var(--color-neutral-300)',
              boxShadow: 'var(--shadow-sm)',
              outline: '1.5px solid rgba(255,255,255,0.85)',
            }}
          />
          <div style={{ flex: '1 1 200px' }}>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(20px,2.2vw,26px)', margin: 0 }}>
              {dest.city}, {dest.country}
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-neutral-700)', margin: '3px 0 0' }}>
              {formatDuration(dest.hrs)} from San Francisco · fares from ${dest.price} · {dest.code}
            </p>
          </div>
          <span className="tag tag-accent-2">{dest.lang} spoken</span>
        </div>

        {intro && (
          <>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.65,
                color: 'var(--color-neutral-800)',
                margin: '16px 0 0',
              }}
            >
              {intro.extract}
            </p>
            {intro.url && (
              <a
                href={intro.url}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, display: 'inline-block', marginTop: 10 }}
              >
                Read more on Wikipedia →
              </a>
            )}
          </>
        )}
        {!intro && (
          <p style={{ fontSize: 13, color: 'var(--color-neutral-600)', margin: '16px 0 0' }}>
            Loading an orientation for {dest.city}…
          </p>
        )}
      </div>

      {/* Country facts */}
      <h2 style={{ fontSize: 'clamp(20px,2.2vw,26px)', margin: 'clamp(22px,2.6vw,30px) 0 clamp(10px,1.4vw,14px)' }}>
        The practical stuff
      </h2>
      {!essentials && (
        <p style={{ fontSize: 13, color: 'var(--color-neutral-600)', margin: '0 0 12px' }}>
          We have not written a verified briefing for {dest.country} yet — only facts we can stand behind get
          published here.
        </p>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
          gap: 'clamp(10px,1.2vw,14px)',
        }}
      >
        {money && <Fact icon="wallet" label="Currency" value={money} />}
        {essentials && <Fact icon="headset" label="Dial code" value={essentials.dial} />}
        {essentials && (
          <Fact icon="car" label="Traffic" value={'Drives on the ' + essentials.drives} />
        )}
        {essentials && <Fact icon="sparkle" label="Power" value={essentials.plugs + ' · ' + essentials.voltage} />}
        {essentials && <Fact icon="bell" label="Emergency" value={essentials.emergency} />}
      </div>

      {/* Tipping — the one that actually causes awkwardness */}
      {essentials && (
        <div
          className="glass-sage"
          style={{
            marginTop: 'clamp(12px,1.6vw,18px)',
            borderRadius: 'clamp(22px,2.4vw,30px)',
            padding: 'clamp(16px,2vw,22px)',
            display: 'flex',
            gap: 14,
          }}
        >
          <Icon
            name="creditCard"
            size={20}
            color="var(--color-accent-2-800)"
            style={{ flex: 'none', marginTop: 2 }}
          />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Tipping in {dest.country}</p>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-neutral-800)', margin: '4px 0 0' }}>
              {essentials.tipping}
            </p>
          </div>
        </div>
      )}

      {/* Eat like a local — one cached research call per city per month */}
      {(foodLoading || (food && food.length > 0)) && (
        <>
          <h2 style={{ fontSize: 'clamp(20px,2.2vw,26px)', margin: 'clamp(22px,2.6vw,30px) 0 clamp(10px,1.4vw,14px)' }}>
            Eat like a local
          </h2>
          {foodLoading && (
            <p style={{ fontSize: 13, color: 'var(--color-neutral-600)', margin: '0 0 12px' }}>
              Asking around {dest.city} for the places locals actually queue for…
            </p>
          )}
          {food && food.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
                gap: 'clamp(10px,1.2vw,14px)',
              }}
            >
              {food.map((spot) => (
                <div key={spot.name} className="glass-soft" style={{ borderRadius: 24, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <p style={{ fontFamily: 'var(--font-heading)', fontSize: 16, lineHeight: 1.2, margin: 0, flex: 1 }}>
                      {spot.name}
                    </p>
                    {spot.priceLevel && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent-700)', flex: 'none' }}>
                        {spot.priceLevel}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--color-accent-2-800)', fontWeight: 700, margin: '4px 0 0' }}>
                    Order the {spot.dish}
                  </p>
                  <p style={{ fontSize: 11.5, color: 'var(--color-neutral-600)', margin: '3px 0 0' }}>
                    {spot.kind}
                    {spot.area ? ' · ' + spot.area : ''}
                  </p>
                  {spot.note && (
                    <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--color-neutral-700)', margin: '6px 0 0' }}>
                      {spot.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Traveller reviews */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          gap: 10,
          margin: 'clamp(22px,2.6vw,30px) 0 clamp(10px,1.4vw,14px)',
        }}
      >
        <h2 style={{ fontSize: 'clamp(20px,2.2vw,26px)', margin: 0 }}>Traveller reviews</h2>
        {average !== null && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Stars value={Math.round(average)} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{average}</span>
            <span style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>
              · {reviews.length} review{reviews.length === 1 ? '' : 's'}
            </span>
          </span>
        )}
      </div>

      {signedIn ? (
        <div className="glass-strong" style={{ borderRadius: 22, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>
              {reviews.some((r) => r.mine) ? 'Update your review' : 'Been to ' + dest.city + '?'}
            </p>
            <Stars value={myRating} size={22} onPick={setMyRating} />
          </div>
          <input
            value={myTitle}
            onChange={(e) => setMyTitle(e.target.value)}
            placeholder="Sum it up in a line (optional)"
            maxLength={120}
            style={{
              width: '100%',
              marginTop: 10,
              height: 38,
              padding: '0 12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.75)',
              background: 'rgba(255,255,255,0.62)',
              font: 'inherit',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <textarea
            value={myBody}
            onChange={(e) => setMyBody(e.target.value)}
            placeholder="What should other travellers know?"
            maxLength={2000}
            rows={3}
            style={{
              width: '100%',
              marginTop: 8,
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.75)',
              background: 'rgba(255,255,255,0.62)',
              font: 'inherit',
              fontSize: 14,
              outline: 'none',
              resize: 'vertical',
            }}
          />
          {reviewError && (
            <p style={{ fontSize: 12, color: 'var(--color-accent-800)', margin: '8px 0 0' }}>{reviewError}</p>
          )}
          <button
            className="hv-accent"
            onClick={saveReview}
            disabled={savingReview}
            style={{
              marginTop: 10,
              border: 0,
              borderRadius: 999,
              padding: '11px 20px',
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-heading)',
              fontSize: 13,
              cursor: savingReview ? 'progress' : 'pointer',
            }}
          >
            {savingReview ? 'Saving…' : 'Post review'}
          </button>
        </div>
      ) : (
        <button
          onClick={goAccount}
          className="glass hv-white"
          style={{
            width: '100%',
            borderRadius: 18,
            padding: '12px 16px',
            marginBottom: 12,
            fontSize: 13,
            color: 'var(--color-neutral-700)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          Been to {dest.city}? <strong>Sign in</strong> to leave a star rating and review.
        </button>
      )}

      {reviews.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--color-neutral-600)', margin: '0 0 8px' }}>
          No reviews for {dest.city} yet — be the first.
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reviews.map((r) => (
          <div key={r.id} className="glass-soft" style={{ borderRadius: 18, padding: '14px 16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 30,
                  height: 30,
                  flex: 'none',
                  borderRadius: 999,
                  overflow: 'hidden',
                  background: 'var(--color-accent-2-300)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-heading)',
                  fontSize: 12,
                  color: 'var(--color-accent-2-900)',
                }}
              >
                {r.author.avatarUrl ? (
                  <img
                    src={r.author.avatarUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  r.author.name[0]?.toUpperCase() || '?'
                )}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{r.author.name}</span>
              <Stars value={r.rating} size={13} />
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-neutral-600)' }}>
                {new Date(r.createdAt).toLocaleDateString()}
              </span>
              {r.mine && (
                <button
                  onClick={() => deleteReview(r.id).then(() => loadReviews())}
                  aria-label="Delete your review"
                  title="Delete your review"
                  style={{
                    border: 0,
                    background: 'transparent',
                    padding: 2,
                    cursor: 'pointer',
                    color: 'var(--color-neutral-600)',
                    fontSize: 12,
                    textDecoration: 'underline',
                  }}
                >
                  Delete
                </button>
              )}
            </div>
            {r.title && <p style={{ fontSize: 14, fontWeight: 700, margin: '8px 0 0' }}>{r.title}</p>}
            {r.body && (
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-neutral-800)', margin: '4px 0 0' }}>
                {r.body}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Phrase hand-off */}
      <div
        className="glass-accent"
        style={{
          marginTop: 'clamp(12px,1.6vw,18px)',
          borderRadius: 'clamp(22px,2.4vw,30px)',
          padding: 'clamp(16px,2vw,22px)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <Icon name="languages" size={22} color="var(--color-accent-800)" style={{ flex: 'none' }} />
        <div style={{ flex: '1 1 220px' }}>
          <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
            {hasPack ? 'Six phrases for ' + dest.lang : dest.lang + ' phrase pack coming soon'}
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-neutral-800)', margin: '3px 0 0' }}>
            {hasPack
              ? 'Greeting, thank you, and the four questions that get you from the gate to the hotel — with audio.'
              : 'We only ship phrase packs we can vouch for. This one is not written yet.'}
          </p>
        </div>
        {hasPack && (
          <button
            className="hv-accent-900"
            onClick={goPhrases}
            style={{
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '13px 22px',
              border: 0,
              borderRadius: 999,
              background: 'var(--color-accent-800)',
              color: 'var(--color-accent-100)',
              fontFamily: 'var(--font-heading)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Learn them
            <Icon name="arrowRight" size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
