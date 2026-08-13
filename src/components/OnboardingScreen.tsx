import Icon from './Icon'
import type { Priority } from '../types'

type Props = {
  priority: Priority
  onPriority: (p: Priority) => void
  goHome: () => void
}

const OPTIONS: { value: Priority; label: string }[] = [
  { value: 'Save money', label: 'Save money' },
  { value: 'Balanced', label: 'Balanced' },
  { value: 'Save time', label: 'Save time' },
]

export default function OnboardingScreen({ priority, onPriority, goHome }: Props) {
  return (
    <div
      data-screen-label="Onboarding"
      style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(14px,1.8vw,24px)', alignItems: 'stretch' }}
    >
      <div
        style={{
          flex: '1 1 320px',
          minHeight: 'clamp(240px,30vw,520px)',
          position: 'relative',
          borderRadius: 'clamp(24px,2.6vw,34px)',
          overflow: 'hidden',
        }}
      >
        <img
          className="washed"
          src="https://images.unsplash.com/photo-1518965883985-f0054cf02694?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200"
          alt="Travellers silhouetted in an airport terminal at golden hour"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <span
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg,rgba(38,36,31,0.45) 0%,rgba(38,36,31,0.1) 45%,rgba(38,36,31,0.65) 100%)',
          }}
        />
        <div
          style={{
            position: 'relative',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 'clamp(20px,2.6vw,32px)',
            color: 'var(--color-neutral-100)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(22px,2.4vw,28px)' }}>Meguaz</span>
          <div>
            <h1
              style={{
                fontSize: 'clamp(28px,3.6vw,44px)',
                lineHeight: 1.06,
                margin: '0 0 10px',
                color: 'var(--color-neutral-100)',
              }}
            >
              Travel, minus
              <br />
              the stress.
            </h1>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.55,
                color: 'rgba(249,244,237,0.8)',
                margin: 0,
                maxWidth: '42ch',
              }}
            >
              Meguaz plans your whole trip around your budget and your time — so you spend less, leave on time, and
              never sweat the bottlenecks.
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          flex: '1 1 340px',
          borderRadius: 'clamp(24px,2.6vw,34px)',
          padding: 'clamp(18px,2.4vw,32px)',
          background: 'rgba(255,252,246,0.56)',
          backdropFilter: 'blur(30px) saturate(185%)',
          WebkitBackdropFilter: 'blur(30px) saturate(185%)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.92), 0 28px 56px -26px rgba(46,43,37,0.45)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <span className="tag tag-accent" style={{ alignSelf: 'flex-start' }}>
          Step 2 of 3 · Home base
        </span>
        <h2 style={{ fontSize: 'clamp(24px,2.8vw,34px)', lineHeight: 1.1, margin: '16px 0 10px' }}>
          Where do you usually leave from?
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-neutral-700)', margin: 0 }}>
          We use your home address to calculate realistic departure times, accounting for traffic and transit options
          near you.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 22,
            padding: '14px 20px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.8)',
          }}
        >
          <Icon name="mapPin" size={19} color="var(--color-accent-700)" style={{ flex: 'none' }} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>742 Evergreen Terrace, San Francisco</span>
        </div>

        <p
          style={{
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--color-neutral-600)',
            margin: '26px 0 10px',
          }}
        >
          How do you like to travel?
        </p>
        <div className="seg" style={{ display: 'flex', width: '100%', background: 'rgba(255,255,255,0.5)' }}>
          {OPTIONS.map((option) => (
            <label
              key={option.value}
              className="seg-opt"
              style={{ flex: 1, justifyContent: 'center', fontWeight: 600 }}
            >
              <input
                type="radio"
                name="mg-onb-priority"
                checked={priority === option.value}
                onChange={() => onPriority(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
        <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--color-neutral-600)', margin: '12px 0 0' }}>
          Asked once. Every plan is scored against it — change it per trip whenever you like.
        </p>

        <div style={{ flex: 1, minHeight: 24 }} />

        <button
          className="hv-accent"
          onClick={goHome}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            marginTop: 20,
            padding: 17,
            border: 0,
            borderRadius: 999,
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
            fontFamily: 'var(--font-heading)',
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          Save home base
          <Icon name="arrowRight" size={18} />
        </button>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 18 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: 'rgba(46,43,37,0.2)' }} />
          <span style={{ width: 22, height: 7, borderRadius: 999, background: 'var(--color-accent)' }} />
          <span style={{ width: 7, height: 7, borderRadius: 999, background: 'rgba(46,43,37,0.2)' }} />
        </div>
      </div>
    </div>
  )
}
