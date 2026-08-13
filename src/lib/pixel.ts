// Loads the Meta Pixel only when the server has a pixel id configured
// (GET /api/config), so turning tracking on or off never needs a frontend
// rebuild — and no Meta script ever loads for deployments without one.

type Fbq = {
  (...args: unknown[]): void
  callMethod?: (...args: unknown[]) => void
  queue: unknown[][]
  push: unknown
  loaded: boolean
  version: string
}

export async function initPixel(): Promise<void> {
  try {
    const res = await fetch('/api/config')
    if (!res.ok) return
    const { pixelId } = (await res.json()) as { pixelId: string | null }
    const w = window as unknown as { fbq?: Fbq; _fbq?: Fbq }
    if (!pixelId || w.fbq) return

    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args)
      else fbq.queue.push(args)
    } as Fbq
    fbq.queue = []
    fbq.push = fbq
    fbq.loaded = true
    fbq.version = '2.0'
    w.fbq = fbq
    w._fbq = fbq

    const script = document.createElement('script')
    script.async = true
    script.src = 'https://connect.facebook.net/en_US/fbevents.js'
    document.head.appendChild(script)

    fbq('init', pixelId)
    fbq('track', 'PageView')
  } catch {
    /* tracking is never worth an error */
  }
}
