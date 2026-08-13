import type { CSSProperties } from 'react'
import Icon from './Icon'
import SpotlightVideo from './SpotlightVideo'
import { FEATURED_PLANS, SPOTLIGHTS } from '../data/plans'
import { formatDuration } from '../data/destinations'

type Props = {
  /** Starts a live solve for this destination (and trip length when given). */
  onPick: (code: string, nights?: number) => void
  goHome: () => void
}

const SECTION_HEAD: CSSProperties = {
  fontSize: 'clamp(19px,2vw,25px)',
  margin: 'clamp(20px,2.2vw,28px) 0 clamp(8px,1vw,12px)',
}

export default function PlansScreen({ onPick, goHome }: Props) {
  return (
    <div data-screen-label="Plans">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <button
          className="glass hv-white"
          onClick={goHome}
          aria-label="Back to home"
          style={{
            width: 38,
            height: 38,
            flex: 'none',
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Icon name="arrowLeft" size={16} color="var(--color-text)" />
        </button>
        <div>
          <p
            style={{
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-accent-700)',
              margin: 0,
            }}
          >
            Pick one and Meguaz prices it live
          </p>
          <h1 style={{ fontSize: 'clamp(24px,3vw,36px)', lineHeight: 1.08, margin: '2px 0 0' }}>
            Personalized plans
          </h1>
        </div>
      </div>

      <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-neutral-700)', margin: '10px 0 0', maxWidth: '64ch' }}>
        Every card is a real starting brief — tap one and the planner prices flights, transfers and a
        stay for your dates, then you lock the plan and book. Nothing here is a brochure.
      </p>

      <h2 style={SECTION_HEAD}>Crafted itineraries</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'clamp(14px, 1.8vw, 24px)',
        }}
      >
        {FEATURED_PLANS.map((plan) => (
          <button
            key={plan.title}
            className="glass glass-lift"
            onClick={() => onPick(plan.code, plan.nights)}
            style={{ textAlign: 'left', padding: 0, borderRadius: 20, overflow: 'hidden', cursor: 'pointer' }}
          >
            <img
              className="washed"
              src={plan.img}
              alt={plan.alt}
              style={{ width: '100%', height: 'clamp(120px,12vw,150px)', objectFit: 'cover', display: 'block' }}
            />
            <div style={{ padding: 14 }}>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: 17, lineHeight: 1.15, margin: 0 }}>
                {plan.title}
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-neutral-600)', margin: '5px 0 0' }}>{plan.stops}</p>
              <p style={{ fontSize: 11, color: 'var(--color-neutral-600)', margin: '2px 0 0' }}>
                {plan.nights} nights · {plan.estimate}
              </p>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--color-accent-700)',
                }}
              >
                Price it for my dates
                <Icon name="arrowRight" size={13} color="var(--color-accent-700)" />
              </span>
            </div>
          </button>
        ))}
      </div>

      <h2 style={SECTION_HEAD}>Destination spotlights</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'clamp(14px, 1.8vw, 24px)',
        }}
      >
        {SPOTLIGHTS.map((d) => (
          <button
            key={d.code}
            className="glass glass-lift"
            onClick={() => onPick(d.code)}
            style={{ textAlign: 'left', padding: 0, borderRadius: 20, overflow: 'hidden', cursor: 'pointer' }}
          >
            <SpotlightVideo src={d.clip} alt={'Cinematic aerial of ' + d.city} />
            <div style={{ padding: 14, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--font-heading)', fontSize: 17, lineHeight: 1.15, margin: 0 }}>
                  {d.city}
                </p>
                <p style={{ fontSize: 11, color: 'var(--color-neutral-600)', margin: '4px 0 0' }}>
                  {d.country} · ~{formatDuration(d.hrs)} flight
                </p>
              </div>
              <p
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 16,
                  color: 'var(--color-accent-700)',
                  margin: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                from ${d.price}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
