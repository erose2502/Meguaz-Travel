import Icon, { type IconName } from './Icon'
import type { Screen } from '../types'

type Props = {
  screen: Screen
  onNavigate: (screen: Screen) => void
}

const TABS: { id: Screen; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'trips', label: 'Trips', icon: 'ticket' },
  { id: 'community', label: 'Community', icon: 'heart' },
  { id: 'profile', label: 'Profile', icon: 'user' },
]

export default function MobileNav({ screen, onNavigate }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 16px 22px',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: 8,
          borderRadius: 999,
          background: 'rgba(255,252,246,0.6)',
          backdropFilter: 'blur(30px) saturate(185%)',
          WebkitBackdropFilter: 'blur(30px) saturate(185%)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.92), 0 24px 46px -18px rgba(46,43,37,0.48)',
        }}
      >
        {TABS.map((tab) => {
          const on = screen === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              aria-label={tab.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                // Four tabs must fit a small phone: labels only on the active one.
                padding: on ? '12px 16px' : '12px 13px',
                border: 0,
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                background: on ? 'var(--color-accent)' : 'transparent',
                color: on ? 'var(--color-bg)' : 'var(--color-text)',
              }}
            >
              <Icon name={tab.icon} size={19} />
              {on && tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
