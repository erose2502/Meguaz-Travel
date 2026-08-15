import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

export type GlassOption<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: GlassOption<T>[]
  ariaLabel: string
  id?: string
  /** 'chip' = the 30px inline pill (brief-bar row); 'field' = the 40px form field. */
  variant?: 'field' | 'chip'
}

/**
 * The house replacement for every native <select>: the OS menu paints its own
 * chrome (blue highlight, square corners) over our warm glass, so options now
 * open in the same popover language as the airport picker — near-opaque panel,
 * accent check on the current choice, quiet hover wash.
 */
export default function GlassSelect<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  id,
  variant = 'field',
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, options, value])

  const chip = variant === 'chip'

  return (
    <div ref={boxRef} style={{ position: 'relative', display: chip ? 'inline-flex' : 'block' }}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault()
            setOpen(true)
          } else if (open && e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((i) => (i + 1) % options.length)
          } else if (open && e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => (i - 1 + options.length) % options.length)
          } else if (open && e.key === 'Enter') {
            e.preventDefault()
            onChange(options[active].value)
            setOpen(false)
          }
        }}
        style={
          chip
            ? {
                height: 30,
                padding: '0 10px',
                borderRadius: 999,
                border: '1px solid var(--color-divider)',
                background: 'rgba(255,255,255,0.6)',
                font: 'inherit',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--color-text)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }
            : {
                width: '100%',
                height: 40,
                padding: '0 12px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.75)',
                background: 'rgba(255,255,255,0.62)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
                font: 'inherit',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--color-text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                textAlign: 'left',
              }
        }
      >
        <span style={{ flex: chip ? undefined : 1, whiteSpace: 'nowrap' }}>{current?.label ?? '—'}</span>
        <Icon
          name="chevronRight"
          size={chip ? 11 : 13}
          color="var(--color-neutral-600)"
          style={{ transform: open ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 160ms ease', flex: 'none' }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 50,
            minWidth: chip ? 170 : '100%',
            borderRadius: 14,
            padding: 5,
          }}
        >
          {options.map((option, i) => {
            const selected = option.value === value
            return (
              <button
                key={option.value}
                role="option"
                aria-selected={selected}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 11px',
                  border: 0,
                  borderRadius: 10,
                  background: i === active ? 'var(--color-accent-100)' : 'transparent',
                  fontSize: 13,
                  fontWeight: selected ? 700 : 500,
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ width: 14, flex: 'none', display: 'inline-flex' }}>
                  {selected && <Icon name="check" size={13} color="var(--color-accent-700)" />}
                </span>
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
