type Props = {
  size?: number
  color?: string
  label?: string
}

/** Indeterminate progress. Pair it with text saying what is being waited on. */
export default function Spinner({ size = 16, color = 'var(--color-accent)', label }: Props) {
  return (
    <span
      role="status"
      aria-label={label || 'Loading'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
    >
      <span
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: Math.max(2, Math.round(size / 8)) + 'px solid rgba(46,43,37,0.16)',
          borderTopColor: color,
          display: 'inline-block',
          animation: 'mg-spin 720ms linear infinite',
        }}
      />
      {label && <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>{label}</span>}
    </span>
  )
}

/** Placeholder block for content that is still loading. */
export function Skeleton({ height = 56, radius = 14 }: { height?: number; radius?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        height,
        borderRadius: radius,
        background:
          'linear-gradient(90deg, rgba(255,255,255,0.28) 25%, rgba(255,255,255,0.62) 37%, rgba(255,255,255,0.28) 63%)',
        backgroundSize: '400% 100%',
        animation: 'mg-shimmer 1.3s ease-in-out infinite',
      }}
    />
  )
}
