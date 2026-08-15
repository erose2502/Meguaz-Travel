import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

type Props = {
  value: string // YYYY-MM-DD
  onChange: (value: string) => void
  label?: string
  id?: string
}

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

/** Local-calendar ISO. Never toISOString here: that converts to UTC, which
    after ~8 PM in the Americas is already *tomorrow* — it disabled "today",
    misplaced the today-dot, and made every quick-pick land one day off. */
function localIso(d: Date) {
  return toIso(d.getFullYear(), d.getMonth(), d.getDate())
}

export default function DatePicker({ value, onChange, id = 'mg-date' }: Props) {
  const [open, setOpen] = useState(false)
  const initial = parseIso(value || localIso(new Date()))
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
      const p = parseIso(value || localIso(new Date()))
      setView({ y: p.y, m: p.m })
    }
  }, [open, value])

  const todayIso = localIso(new Date())
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
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 60,
            width: 312,
            borderRadius: 22,
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span
              style={{
                flex: 1,
                fontFamily: 'var(--font-heading)',
                fontSize: 17,
                letterSpacing: '-0.01em',
              }}
            >
              {MONTHS[view.m]}{' '}
              <span style={{ color: 'var(--color-neutral-500)' }}>{view.y}</span>
            </span>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous month"
              className="hv-white"
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                border: '1px solid var(--color-divider)',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Icon name="arrowLeft" size={14} color="var(--color-neutral-700)" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next month"
              className="hv-white"
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                border: '1px solid var(--color-divider)',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Icon name="arrowRight" size={14} color="var(--color-neutral-700)" />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 6 }}>
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((letter) => (
              <span
                key={letter}
                style={{
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--color-neutral-500)',
                  padding: '2px 0',
                }}
              >
                {letter}
              </span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
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
                    position: 'relative',
                    height: 38,
                    borderRadius: 12,
                    border: 0,
                    background: isSelected ? 'var(--color-accent)' : 'transparent',
                    boxShadow: isSelected ? '0 6px 16px -6px rgba(140,73,26,0.55)' : 'none',
                    color: isSelected
                      ? 'var(--color-bg)'
                      : isPast
                        ? 'var(--color-neutral-400)'
                        : 'var(--color-text)',
                    fontSize: 13.5,
                    fontWeight: isSelected ? 700 : 500,
                    cursor: isPast ? 'default' : 'pointer',
                    transition: 'background 140ms ease, box-shadow 140ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isPast) e.currentTarget.style.background = 'var(--color-accent-100)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {day}
                  {isToday && !isSelected && (
                    <span
                      style={{
                        position: 'absolute',
                        left: '50%',
                        bottom: 4,
                        transform: 'translateX(-50%)',
                        width: 4,
                        height: 4,
                        borderRadius: 999,
                        background: 'var(--color-accent)',
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Nobody flies today — quick-picks that match how trips are planned.
              Picking one keeps the calendar open and flips it to that month so
              the traveller SEES the day light up; closing on tap made the chips
              feel dead. */}
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            {[
              { label: 'In a week', days: 7 },
              { label: 'Two weeks', days: 14 },
              { label: 'A month', days: 30 },
            ].map((chip) => {
              const d = new Date()
              d.setDate(d.getDate() + chip.days)
              const iso = localIso(d)
              const active = iso === value
              return (
                <button
                  key={chip.days}
                  type="button"
                  onClick={() => {
                    onChange(iso)
                    setView({ y: d.getFullYear(), m: d.getMonth() })
                  }}
                  className={active ? undefined : 'hv-white'}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 999,
                    border: active ? '1px solid var(--color-accent)' : '1px solid var(--color-divider)',
                    background: active ? 'var(--color-accent)' : 'transparent',
                    fontSize: 12,
                    fontWeight: 700,
                    color: active ? 'var(--color-bg)' : 'var(--color-neutral-700)',
                    cursor: 'pointer',
                    transition: 'background 140ms ease, color 140ms ease',
                  }}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
