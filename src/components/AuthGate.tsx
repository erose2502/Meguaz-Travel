import { useState, type CSSProperties } from 'react'
import Icon from './Icon'
import Spinner from './Spinner'
import { BACKDROPS } from '../data/media'
import type { PlanOption } from '../lib/api'

type Props = {
  option: PlanOption | null
  destCity: string
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<{ confirmationRequired: boolean }>
  onDone: () => void
  onBack: () => void
  onLegal: (page: 'terms' | 'privacy') => void
}

const FIELD: CSSProperties = {
  width: '100%',
  height: 42,
  padding: '0 14px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.75)',
  background: 'rgba(255,255,255,0.62)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
  font: 'inherit',
  fontSize: 14,
  color: 'var(--color-text)',
  outline: 'none',
}

const LABEL: CSSProperties = {
  display: 'block',
  fontSize: 10,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  color: 'var(--color-neutral-600)',
  margin: '0 0 5px',
}

function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

export default function AuthGate({ option, destCity, onSignIn, onSignUp, onDone, onBack, onLegal }: Props) {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        await onSignIn(email, password)
        onDone()
      } else {
        const { confirmationRequired } = await onSignUp(email, password, name || undefined)
        if (confirmationRequired) setCheckEmail(true)
        else onDone()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  if (checkEmail) {
    return (
      <div data-screen-label="Confirm email" style={{ maxWidth: 460, margin: '0 auto' }}>
        <div className="glass-strong grain" style={{ borderRadius: 24, padding: 24, textAlign: 'center' }}>
          <span
            className="glass-sage"
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="check" size={26} color="var(--color-accent-2-800)" />
          </span>
          <h1 style={{ fontSize: 24, margin: '14px 0 8px' }}>Check your inbox</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-neutral-700)', margin: 0 }}>
            We sent a confirmation link to <strong>{email}</strong>. Open it and your plan to {destCity} will be
            waiting.
          </p>
          <button
            className="hv-white glass"
            onClick={onBack}
            style={{
              marginTop: 18,
              padding: '12px 20px',
              borderRadius: 999,
              fontFamily: 'var(--font-heading)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Back to the plan
          </button>
        </div>
      </div>
    )
  }

  return (
    <div data-screen-label="Account" style={{ maxWidth: 460, margin: '0 auto' }}>
      <button
        className="glass hv-white"
        onClick={onBack}
        style={{
          width: 38,
          height: 38,
          borderRadius: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          marginBottom: 14,
        }}
        aria-label="Back"
      >
        <Icon name="arrowLeft" size={16} color="var(--color-text)" />
      </button>

      <div
        className="glass-strong grain"
        style={{
          borderRadius: 24,
          padding: 24,
          // Generated wanderlust flat-lay under a warm wash that keeps the
          // form fully readable.
          background:
            'linear-gradient(rgba(255,253,248,0.87), rgba(255,253,248,0.93)), url(' +
            BACKDROPS.auth +
            ') center/cover',
        }}
      >
        <p
          style={{
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--color-accent-700)',
            margin: 0,
          }}
        >
          One step from booked
        </p>
        <h1 style={{ fontSize: 'clamp(24px,3vw,32px)', lineHeight: 1.1, margin: '6px 0 8px' }}>
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h1>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-neutral-700)', margin: '0 0 4px' }}>
          {option
            ? 'Your ' +
              option.name.replace('The ', '').toLowerCase() +
              ' to ' +
              destCity +
              ' at $' +
              option.cost +
              ' is held while you sign in. We keep your plans, and remember how you like to travel next time.'
            : 'We keep your plans, and remember how you like to travel next time.'}
        </p>

        <button
          type="button"
          className="hv-white"
          onClick={() => {
            // Server route mints the provider URL and 302s to Google; the
            // callback returns the browser to this exact app origin.
            window.location.assign(
              '/api/auth/google?next=' + encodeURIComponent(window.location.origin + '/'),
            )
          }}
          style={{
            marginTop: 16,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: 13,
            borderRadius: 999,
            border: '1px solid var(--color-divider)',
            background: 'rgba(255,255,255,0.85)',
            fontFamily: 'var(--font-heading)',
            fontSize: 14,
            color: 'var(--color-text)',
            cursor: 'pointer',
          }}
        >
          <GoogleMark />
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 0' }}>
          <span style={{ flex: 1, height: 1, background: 'var(--color-divider)' }} />
          <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>or with email</span>
          <span style={{ flex: 1, height: 1, background: 'var(--color-divider)' }} />
        </div>

        <form onSubmit={submit} style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <div>
              <label style={LABEL} htmlFor="mg-name">
                Name
              </label>
              <input
                id="mg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Alex Rivera"
                style={FIELD}
              />
            </div>
          )}
          <div>
            <label style={LABEL} htmlFor="mg-email">
              Email
            </label>
            <input
              id="mg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              style={FIELD}
            />
          </div>
          <div>
            <label style={LABEL} htmlFor="mg-password">
              Password
            </label>
            <input
              id="mg-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder="At least 8 characters"
              style={FIELD}
            />
          </div>

          {error && (
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.5,
                color: 'var(--color-accent-800)',
                background: 'var(--color-accent-100)',
                borderRadius: 12,
                padding: '10px 12px',
                margin: 0,
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="hv-accent"
            disabled={busy}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 14,
              border: 0,
              borderRadius: 999,
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-heading)',
              fontSize: 15,
              cursor: busy ? 'progress' : 'pointer',
              opacity: busy ? 0.75 : 1,
            }}
          >
            {busy && <Spinner size={14} color="var(--color-bg)" />}
            {busy ? 'One moment…' : mode === 'signup' ? 'Create account & continue' : 'Sign in & continue'}
          </button>

          {mode === 'signup' && (
            <p
              style={{
                fontSize: 11.5,
                lineHeight: 1.55,
                color: 'var(--color-neutral-600)',
                margin: 0,
                textAlign: 'center',
              }}
            >
              By creating an account you agree to the{' '}
              <button
                type="button"
                onClick={() => onLegal('terms')}
                style={{
                  border: 0,
                  background: 'transparent',
                  padding: 0,
                  font: 'inherit',
                  fontWeight: 700,
                  color: 'var(--color-accent-700)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={() => onLegal('privacy')}
                style={{
                  border: 0,
                  background: 'transparent',
                  padding: 0,
                  font: 'inherit',
                  fontWeight: 700,
                  color: 'var(--color-accent-700)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Privacy Policy
              </button>
              .
            </p>
          )}
        </form>

        <p style={{ fontSize: 13, color: 'var(--color-neutral-700)', margin: '14px 0 0', textAlign: 'center' }}>
          {mode === 'signup' ? 'Already travelling with us?' : 'New to Meguaz?'}{' '}
          <button
            onClick={() => {
              setMode(mode === 'signup' ? 'signin' : 'signup')
              setError(null)
            }}
            style={{
              border: 0,
              background: 'transparent',
              color: 'var(--color-accent-700)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {mode === 'signup' ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </div>
    </div>
  )
}
