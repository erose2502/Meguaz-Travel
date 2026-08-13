// Client-side error tracking. The browser reports to /api/errors (same-origin,
// no key in the bundle); the backend writes the structured log line and
// forwards to Sentry when a DSN is configured.

const MAX_REPORTS_PER_SESSION = 12
const seen = new Set<string>()
let sent = 0

export function reportError(err: unknown, source: string) {
  try {
    const message =
      err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err)
    if (!message) return

    // An error loop must not become a request loop: dedupe repeats and cap the
    // total number of reports one session can send.
    const signature = source + ':' + message.slice(0, 200)
    if (seen.has(signature) || sent >= MAX_REPORTS_PER_SESSION) return
    seen.add(signature)
    sent += 1

    const body = JSON.stringify({
      message: message.slice(0, 2000),
      stack: err instanceof Error && err.stack ? err.stack.slice(0, 8000) : undefined,
      source,
      url: window.location.href.slice(0, 500),
    })

    // sendBeacon survives page unloads; fetch is the fallback.
    if (!navigator.sendBeacon?.('/api/errors', new Blob([body], { type: 'application/json' }))) {
      void fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    // Reporting must never throw into the app it is watching.
  }
}

let initialized = false

/** Global capture: uncaught exceptions and unhandled promise rejections. */
export function initMonitoring() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  window.addEventListener('error', (event) => {
    reportError(event.error ?? event.message, 'window.onerror')
  })
  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, 'unhandledrejection')
  })
}
