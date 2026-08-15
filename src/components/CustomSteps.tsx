import { useEffect, useState } from 'react'
import Icon from './Icon'

export type CustomStep = { id: string; time: string; label: string }

type Props = {
  /** Stable key for this plan (dest + departure) so notes survive reloads. */
  planKey: string
}

const FIELD: React.CSSProperties = {
  border: '1px solid rgba(46,43,37,0.16)',
  borderRadius: 12,
  padding: '9px 12px',
  fontSize: 14,
  fontFamily: 'inherit',
  background: 'rgba(255,255,255,0.7)',
  color: 'inherit',
  minWidth: 0,
}

/**
 * The traveller's own plan items — dinner bookings, museum slots, "buy SIM at
 * arrivals" — living inside the journey instead of in a separate notes app.
 * Stored locally per plan; nothing leaves the device.
 */
export default function CustomSteps({ planKey }: Props) {
  const storageKey = 'mg-plan-notes:' + planKey
  const [items, setItems] = useState<CustomStep[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]')
    } catch {
      return []
    }
  })
  const [time, setTime] = useState('')
  const [label, setLabel] = useState('')

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items))
  }, [storageKey, items])

  const add = () => {
    const text = label.trim()
    if (!text) return
    setItems((prev) => [
      ...prev,
      { id: String(Date.now()), time: time.trim(), label: text.slice(0, 140) },
    ])
    setTime('')
    setLabel('')
  }

  return (
    <div className="glass grain" style={{ borderRadius: 22, padding: 16, marginTop: 14 }}>
      <p style={{ fontFamily: 'var(--font-heading)', fontSize: 18, margin: '0 0 2px' }}>
        Your additions
      </p>
      <p style={{ fontSize: 11.5, color: 'var(--color-neutral-600)', margin: '0 0 12px' }}>
        Reservations, reminders, plans of your own — kept with the trip so nothing lives in a
        separate tab.
      </p>

      {items.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '0 0 12px', padding: 0, display: 'grid', gap: 8 }}>
          {items.map((item) => (
            <li
              key={item.id}
              className="glass-soft"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                borderRadius: 14,
                padding: '10px 12px',
              }}
            >
              {item.time && (
                <span
                  style={{
                    flex: 'none',
                    fontSize: 11,
                    fontWeight: 800,
                    color: 'var(--color-accent-2-800)',
                    background: 'var(--color-accent-2-100)',
                    borderRadius: 999,
                    padding: '3px 10px',
                  }}
                >
                  {item.time}
                </span>
              )}
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{item.label}</span>
              <button
                onClick={() => setItems((prev) => prev.filter((x) => x.id !== item.id))}
                aria-label={'Remove ' + item.label}
                style={{
                  border: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  opacity: 0.55,
                }}
              >
                <Icon name="trash" size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={time}
          onChange={(e) => setTime(e.target.value)}
          placeholder="7:30 PM"
          aria-label="Time (optional)"
          style={{ ...FIELD, flex: '0 1 96px' }}
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
          placeholder="Dinner at Trattoria da Enzo — booked, conf #84121"
          aria-label="What's the plan?"
          style={{ ...FIELD, flex: '1 1 220px' }}
        />
        <button
          className="hv-accent"
          onClick={add}
          disabled={!label.trim()}
          style={{
            border: 0,
            borderRadius: 12,
            padding: '9px 18px',
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
            fontFamily: 'var(--font-heading)',
            fontSize: 14,
            cursor: label.trim() ? 'pointer' : 'default',
            opacity: label.trim() ? 1 : 0.55,
          }}
        >
          Add
        </button>
      </div>
    </div>
  )
}
