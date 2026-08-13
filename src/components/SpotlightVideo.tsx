import { useRef } from 'react'

// Muted looping clip for destination cards; metadata preload keeps rails and
// grids light, and motion starts on hover (touch users see the poster frame).
export default function SpotlightVideo({
  src,
  alt,
  height = 'clamp(130px,13vw,170px)',
}: {
  src: string
  alt: string
  height?: string
}) {
  const ref = useRef<HTMLVideoElement>(null)
  return (
    <video
      ref={ref}
      src={src}
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={alt}
      onMouseEnter={() => ref.current?.play().catch(() => {})}
      onMouseLeave={() => ref.current?.pause()}
      style={{ width: '100%', height, objectFit: 'cover', display: 'block' }}
    />
  )
}
