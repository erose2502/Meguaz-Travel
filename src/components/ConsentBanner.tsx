import { useEffect, useState } from 'react'

const STORAGE_KEY = 'mg-cookie-notice-v1'

type Props = {
  onPrivacy: () => void
}

// Cookie/data notice. Meguaz sets essential cookies only (auth session), so a
// clear notice with a link to the privacy policy is what's required — there is
// no ad tracking to opt into. Dismissal is remembered per browser.
export default function ConsentBanner({ onPrivacy }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      // Storage blocked (private mode) — show the notice each session.
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString())
    } catch {
      /* remembered for this session via state */
    }
    setVisible(false)
  }

  return (
    <div
      role="region"
      aria-label="Cookies and data notice"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 60,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        className="glass-strong grain"
        style={{
          pointerEvents: 'auto',
          maxWidth: 660,
          width: '100%',
          borderRadius: 18,
          padding: '14px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 18px 44px -20px rgba(46,43,37,0.45)',
        }}
      >
        <p style={{ flex: '1 1 320px', fontSize: 12.5, lineHeight: 1.55, margin: 0 }}>
          Meguaz uses essential cookies to keep you signed in — nothing for ads or cross-site
          tracking. Location and microphone are only used when you grant them, per request.{' '}
          <button
            onClick={onPrivacy}
            style={{
              border: 0,
              background: 'transparent',
              padding: 0,
              font: 'inherit',
              fontWeight: 700,
              color: 'var(--color-accent-700)',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Privacy & cookies
          </button>
        </p>
        <button
          className="hv-accent"
          onClick={dismiss}
          style={{
            flex: 'none',
            border: 0,
            borderRadius: 999,
            padding: '10px 18px',
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
            fontFamily: 'var(--font-heading)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Got it
        </button>
      </div>
    </div>
  )
}
