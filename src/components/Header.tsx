import Icon, { type IconName } from './Icon'
import type { Screen } from '../types'
import type { SessionUser } from '../lib/api'

type Props = {
  screen: Screen
  isWide: boolean
  onNavigate: (screen: Screen) => void
  user: SessionUser | null
  avatarUrl: string | null
  onAccount: () => void
}

const TABS: { id: Screen; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'trips', label: 'Trips', icon: 'ticket' },
  { id: 'community', label: 'Community', icon: 'heart' },
  { id: 'profile', label: 'Profile', icon: 'user' },
]

export default function Header({ screen, isWide, onNavigate, user, avatarUrl, onAccount }: Props) {
  const initials = (user?.displayName || user?.email || '')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        // viewport-fit=cover lets the page under the notch; the header pads
        // itself back out of the status bar.
        padding: 'clamp(10px,1.6vw,18px) clamp(14px,3vw,40px)',
        paddingTop: 'calc(clamp(10px,1.6vw,18px) + env(safe-area-inset-top, 0px))',
        background: 'rgba(250,242,229,0.52)',
        backdropFilter: 'blur(34px) saturate(200%)',
        WebkitBackdropFilter: 'blur(34px) saturate(200%)',
        borderBottom: '1px solid rgba(255,255,255,0.45)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75), 0 12px 28px -22px rgba(46,43,37,0.5)',
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(12px,2vw,28px)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(20px,2.4vw,26px)',
            letterSpacing: '-0.02em',
          }}
        >
          Meguaz
        </span>

        {/* Centered between wordmark and account — hugging the wordmark left
            a dead field across the middle of the bar. */}
        {isWide && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto' }}>
            {TABS.map((tab) => {
              const on = screen === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => onNavigate(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 16px',
                    border: 0,
                    borderRadius: 999,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: on ? 'var(--color-accent)' : 'transparent',
                    color: on ? 'var(--color-bg)' : 'var(--color-text)',
                  }}
                >
                  <Icon name={tab.icon} size={17} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        )}

        <span style={{ marginLeft: isWide ? 0 : 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <button
              onClick={onAccount}
              title={user.displayName ?? user.email ?? 'Your account'}
              aria-label="Your account"
              style={{
                width: 38,
                height: 38,
                border: 0,
                borderRadius: 999,
                overflow: 'hidden',
                padding: 0,
                background: 'var(--color-accent-2-300)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-heading)',
                fontSize: 13,
                color: 'var(--color-accent-2-900)',
                cursor: 'pointer',
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                initials || 'A'
              )}
            </button>
          ) : (
            <button
              className="hv-accent"
              onClick={onAccount}
              style={{
                border: 0,
                borderRadius: 999,
                padding: '10px 18px',
                background: 'var(--color-accent)',
                color: 'var(--color-bg)',
                fontFamily: 'var(--font-heading)',
                fontSize: 14,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              Sign in
            </button>
          )}
        </span>
      </div>
    </div>
  )
}
