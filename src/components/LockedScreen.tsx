import Icon from './Icon'
import TripPrep from './TripPrep'
import type { PlanOption } from '../lib/api'
import type { Destination } from '../data/destinations'

type Props = {
  option: PlanOption | null
  budget: number
  leaveBy: string
  dest: Destination | null
  hasPhrasePack: boolean
  phrasesSaved: number
  phrasesTotal: number
  daysUntil: number | null
  goPhrases: () => void
  goBriefing: () => void
  goHome: () => void
}

export default function LockedScreen({
  option,
  budget,
  leaveBy,
  dest,
  hasPhrasePack,
  phrasesSaved,
  phrasesTotal,
  daysUntil,
  goPhrases,
  goBriefing,
  goHome,
}: Props) {
  const under = option ? budget - option.cost : 0
  const departure = leaveBy || option?.leaveBy || '—'

  const stats = option
    ? [
        { value: (under >= 0 ? '$' + under : '-$' + Math.abs(under)), label: 'against your $' + budget + ' cap' },
        { value: option.bufferMin + ' min', label: 'buffer secured before boarding' },
        { value: option.doorToDoor, label: 'door to door' },
      ]
    : []

  return (
    <div data-screen-label="Plan locked" style={{ maxWidth: 720, margin: '0 auto' }}>
      <span
        className="glass-sage"
        style={{
          width: 64,
          height: 64,
          borderRadius: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="check" size={30} color="var(--color-accent-2-800)" />
      </span>
      <p
        style={{
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-accent-700)',
          margin: '16px 0 6px',
        }}
      >
        Plan locked
      </p>
      <h1 style={{ fontSize: 'clamp(26px,3.6vw,42px)', lineHeight: 1.05, margin: '0 0 8px' }}>
        Your journey is handled.
      </h1>
      <p style={{ fontSize: 14, color: 'var(--color-neutral-700)', margin: 0 }}>
        {option
          ? 'Every leg timed against live fares. Confirmation sent to alex@email.com'
          : 'Pick a route first and the locked plan appears here.'}
      </p>

      <div
        className="glass-accent"
        style={{
          marginTop: 18,
          borderRadius: 22,
          padding: 20,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div style={{ flex: '1 1 200px' }}>
          <p
            style={{
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-accent-800)',
              margin: 0,
            }}
          >
            Leave home by
          </p>
          <p
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(38px,5vw,60px)',
              lineHeight: 1,
              color: 'var(--color-accent-800)',
              margin: '6px 0 0',
            }}
          >
            {departure}
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-accent-800)', opacity: 0.8, margin: '6px 0 0' }}>
            We&rsquo;ll move it if traffic does
          </p>
        </div>
        <Icon name="clock" size={48} color="var(--color-accent-700)" style={{ flex: 'none' }} />
      </div>

      {stats.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))',
            gap: 12,
            marginTop: 12,
          }}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="glass" style={{ borderRadius: 20, padding: 16 }}>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: 26, lineHeight: 1, margin: 0 }}>
                {stat.value}
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-neutral-700)', margin: '6px 0 0' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {option && (
        <div className="glass-soft" style={{ marginTop: 12, borderRadius: 20, padding: '4px 18px' }}>
          {option.costBreakdown.map((line, i) => (
            <div
              key={line.label}
              style={{
                display: 'flex',
                gap: 12,
                padding: '12px 0',
                borderBottom:
                  i < option.costBreakdown.length - 1 ? '1px solid var(--color-divider)' : undefined,
              }}
            >
              <span style={{ flex: 1, fontSize: 13, color: 'var(--color-neutral-700)' }}>{line.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>${line.amount}</span>
            </div>
          ))}
        </div>
      )}

      {dest && option && (
        <TripPrep
          dest={dest}
          hasPhrasePack={hasPhrasePack}
          phrasesSaved={phrasesSaved}
          phrasesTotal={phrasesTotal}
          daysUntil={daysUntil}
          goPhrases={goPhrases}
          goBriefing={goBriefing}
        />
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
        <button
          className="glass hv-white"
          style={{
            flex: '1 1 150px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: 13,
            borderRadius: 999,
            fontFamily: 'var(--font-heading)',
            fontSize: 13,
            color: 'var(--color-text)',
            cursor: 'pointer',
          }}
        >
          <Icon name="download" size={15} />
          Save plan
        </button>
        <button
          className="glass hv-white"
          style={{
            flex: '1 1 150px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: 13,
            borderRadius: 999,
            fontFamily: 'var(--font-heading)',
            fontSize: 13,
            color: 'var(--color-text)',
            cursor: 'pointer',
          }}
        >
          <Icon name="share" size={15} />
          Share
        </button>
        <button
          className="hv-accent"
          onClick={goHome}
          style={{
            flex: '2 1 200px',
            padding: 13,
            border: 0,
            borderRadius: 999,
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
            fontFamily: 'var(--font-heading)',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Back to home
        </button>
      </div>
    </div>
  )
}
