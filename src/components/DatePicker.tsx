import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

type Props = {
  value: string // YYYY-MM-DD
  onChange: (value: string) => void
  label?: string
  id?: string
}

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function toIso(y: number, m: number, d: number) {
  return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0')
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m: (m || 1) - 1, d: d || 1 }
}

/** Monday-first offset for the 1st of the month. */
function leadingBlanks(year: number, month: number) {
  const jsDay = new Date(year, month, 1).getDay() // 0 = Sunday
  return (jsDay + 6) % 7
}

export function formatFriendly(iso: string) {
  if (!iso) return ''
  const { y, m, d } = parseIso(iso)
  const date = new Date(y, m, d)
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
  return weekday + ', ' + MONTHS[m].slice(0, 3) + ' ' + d
}

export default function DatePicker({ value, onChange, id = 'mg-date' }: Props) {
  const [open, setOpen] = useState(false)
  const initial = parseIso(value || new Date().toISOString().slice(0, 10))
  const [view, setView] = useState({ y: initial.y, m: initial.m })
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
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
  }, [open])

  useEffect(() => {
    if (open) {
      const p = parseIso(value || new Date().toISOString().slice(0, 10))
      setView({ y: p.y, m: p.m })
    }
  }, [open, value])

  const todayIso = new Date().toISOString().slice(0, 10)
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const blanks = leadingBlanks(view.y, view.m)

  const step = (delta: number) => {
    const next = new Date(view.y, view.m + delta, 1)
    setView({ y: next.getFullYear(), m: next.getMonth() })
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
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
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <Icon name="calendar" size={15} color="var(--color-neutral-600)" />
        <span style={{ flex: 1 }}>{formatFriendly(value) || 'Pick a date'}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose arrival date"
          className="popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 60,
            width: 268,
            borderRadius: 20,
            padding: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous month"
              className="hv-white"
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.7)',
                background: 'rgba(255,255,255,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transform: 'rotate(180deg)',
              }}
            >
              <Icon name="chevronRight" size={14} color="var(--color-neutral-700)" />
            </button>
            <span
              style={{
                flex: 1,
                textAlign: 'center',
                fontFamily: 'var(--font-heading)',
                fontSize: 15,
              }}
            >
              {MONTHS[view.m]} {view.y}
            </span>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next month"
              className="hv-white"
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.7)',
                background: 'rgba(255,255,255,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Icon name="chevronRight" size={14} color="var(--color-neutral-700)" />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {DAY_LETTERS.map((letter, i) => (
              <span
                key={i}
                style={{
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: 'var(--color-neutral-600)',
                  padding: '2px 0',
                }}
              >
                {letter}
              </span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              if (day === null) return <span key={'b' + i} />
              const iso = toIso(view.y, view.m, day)
              const isPast = iso < todayIso
              const isSelected = iso === value
              const isToday = iso === todayIso
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={isPast}
                  onClick={() => {
                    onChange(iso)
                    setOpen(false)
                  }}
                  style={{
                    height: 32,
                    borderRadius: 10,
                    border: isToday && !isSelected ? '1px solid var(--color-accent-400)' : '1px solid transparent',
                    background: isSelected ? 'var(--color-accent)' : 'transparent',
                    color: isSelected
                      ? 'var(--color-bg)'
                      : isPast
                        ? 'var(--color-neutral-400)'
                        : 'var(--color-text)',
                    fontSize: 13,
                    fontWeight: isSelected ? 700 : 500,
                    cursor: isPast ? 'not-allowed' : 'pointer',
                    transition: 'background 140ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isPast) e.currentTarget.style.background = 'rgba(255,255,255,0.7)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {day}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              onChange(todayIso)
              setOpen(false)
            }}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '8px 0',
              borderRadius: 999,
              border: '1px solid var(--color-divider)',
              background: 'rgba(255,255,255,0.5)',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--color-neutral-700)',
              cursor: 'pointer',
            }}
          >
            Today
          </button>
        </div>
      )}
    </div>
  )
}
