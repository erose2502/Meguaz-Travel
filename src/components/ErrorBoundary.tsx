import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportError } from '../lib/monitoring'

type Props = { children: ReactNode }
type State = { error: Error | null }

// One thrown render used to blank the whole app; now it lands here instead.
// The fallback keeps the brand surface, reports the error, and offers a way
// back that doesn't involve the browser's sad page.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, 'error-boundary')
    if (info.componentStack) {
      reportError(new Error('Component stack: ' + info.componentStack.slice(0, 1500)), 'error-boundary-stack')
    }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'var(--color-bg, #f9f4ed)',
          color: 'var(--color-text, #2e2b25)',
          fontFamily: 'var(--font-body, system-ui, sans-serif)',
        }}
      >
        <div
          style={{
            maxWidth: 420,
            textAlign: 'center',
            padding: '32px 28px',
            borderRadius: 24,
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.8)',
            boxShadow: '0 18px 40px -24px rgba(46,43,37,0.35)',
          }}
        >
          <p style={{ fontSize: 40, margin: '0 0 8px' }} aria-hidden="true">
            🧭
          </p>
          <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>We hit some turbulence</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: '#6b675e', margin: '0 0 18px' }}>
            Something went wrong on this screen. Your saved trips and plans are safe — the team has
            been notified automatically.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => this.setState({ error: null })}
              style={{
                border: '1px solid rgba(46,43,37,0.2)',
                borderRadius: 999,
                padding: '11px 20px',
                background: 'transparent',
                font: 'inherit',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                color: 'inherit',
              }}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                border: 0,
                borderRadius: 999,
                padding: '11px 22px',
                background: 'var(--color-accent, #b4551d)',
                color: 'var(--color-bg, #fff)',
                font: 'inherit',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reload the app
            </button>
          </div>
        </div>
      </div>
    )
  }
}
