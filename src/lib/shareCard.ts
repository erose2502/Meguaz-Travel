// Renders a 1080×1920 story-sized trip card on a canvas and hands it to the
// native share sheet — where Instagram Stories appears on iOS/Android. The
// web has no direct "post to Stories" API; the share sheet IS the real path,
// with a plain download as the desktop fallback.

export type StoryCard = {
  city: string
  country: string
  code: string
  nights: number
  cost: number | null
  arriveBy: string // ISO date; rendered as "Sep 12" when parseable
}

const W = 1080
const H = 1920

async function loadScene(code: string): Promise<HTMLImageElement | null> {
  const img = new Image()
  img.src = '/media/scenes/' + code + '-1.jpg'
  try {
    await img.decode()
    return img
  } catch {
    return null // 9 island cities have no scenes yet — gradient fallback
  }
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight)
  const dw = img.naturalWidth * scale
  const dh = img.naturalHeight * scale
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)
}

function heading(): string {
  const face = getComputedStyle(document.documentElement)
    .getPropertyValue('--font-heading')
    .split(',')[0]
    .replace(/['"]/g, '')
    .trim()
  return face || 'Georgia'
}

export async function shareStoryCard(card: StoryCard): Promise<'shared' | 'downloaded'> {
  await document.fonts.ready
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')

  const scene = await loadScene(card.code)
  if (scene) {
    drawCover(ctx, scene)
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, '#0d3b3e')
    g.addColorStop(0.55, '#155e63')
    g.addColorStop(1, '#0a2a2d')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }

  // Veil top and bottom so the type reads on any scene.
  const veil = ctx.createLinearGradient(0, 0, 0, H)
  veil.addColorStop(0, 'rgba(10,20,22,0.6)')
  veil.addColorStop(0.32, 'rgba(10,20,22,0)')
  veil.addColorStop(0.6, 'rgba(10,20,22,0)')
  veil.addColorStop(1, 'rgba(8,16,18,0.82)')
  ctx.fillStyle = veil
  ctx.fillRect(0, 0, W, H)

  const face = heading()
  ctx.textAlign = 'center'

  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = '400 40px ' + face + ', Georgia, serif'
  ctx.fillText('M E G U A Z', W / 2, 150)

  const date = new Date(card.arriveBy + 'T00:00:00')
  const dateLabel = Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = '400 34px system-ui, sans-serif'
  if (dateLabel) ctx.fillText(dateLabel.toUpperCase(), W / 2, H - 460)

  // The destination is the whole poster — let it be huge.
  ctx.fillStyle = '#ffffff'
  ctx.font = '400 ' + (card.city.length > 10 ? 108 : 136) + 'px ' + face + ', Georgia, serif'
  ctx.fillText(card.city, W / 2, H - 330)

  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = '400 36px system-ui, sans-serif'
  const sub =
    card.nights +
    ' nights · ' +
    card.country +
    (card.cost != null ? ' · $' + card.cost + ' door to gate' : '')
  ctx.fillText(sub, W / 2, H - 250)

  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = '400 30px system-ui, sans-serif'
  ctx.fillText('planned on meguaz.com', W / 2, H - 130)

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.92))
  if (!blob) throw new Error('Could not render the card')
  const file = new File([blob], 'meguaz-' + card.code.toLowerCase() + '.jpg', {
    type: 'image/jpeg',
  })

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Meguaz — ' + card.city })
    return 'shared'
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
