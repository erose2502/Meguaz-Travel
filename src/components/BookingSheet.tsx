import { useState, type CSSProperties } from 'react'
import Icon from './Icon'
import Spinner from './Spinner'
import { bookFlight, ApiError, type BookingPassenger, type BookingResult, type PlanOption } from '../lib/api'

type Props = {
  option: PlanOption
  destCity: string
  adults: number
  email: string
  onClose: () => void
  onBooked: (result: BookingResult) => void
  /** Keep the plan without buying — the pre-booking behaviour. */
  onSkip: () => void
}

const FIELD: CSSProperties = {
  width: '100%',
  height: 40,
  padding: '0 12px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.75)',
  background: 'rgba(255,255,255,0.7)',
  font: 'inherit',
  fontSize: 14,
  color: 'var(--color-text)',
  outline: 'none',
}

const LABEL: CSSProperties = {
  display: 'block',
  fontSize: 10,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  color: 'var(--color-neutral-600)',
  margin: '0 0 5px',
}

const emptyPassenger = (): BookingPassenger => ({
  firstName: '',
  lastName: '',
  dob: '',
  gender: 'f',
  title: 'ms',
})

/** Passenger details → real Duffel order. Test keys issue test PNRs, no money. */
export default function BookingSheet({ option, destCity, adults, email, onClose, onBooked, onSkip }: Props) {
  const [passengers, setPassengers] = useState<BookingPassenger[]>(
    Array.from({ length: adults }, emptyPassenger),
  )
  const [contactEmail, setContactEmail] = useState(email)
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setP = (i: number, patch: Partial<BookingPassenger>) =>
    setPassengers((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy || !option.offerId) return
    setBusy(true)
    setError(null)
    try {
      const result = await bookFlight({
        offerId: option.offerId,
        email: contactEmail,
        phone,
        passengers,
        approvedAmount: option.cost,
      })
      onBooked(result)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Booking failed — nothing was charged')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 65,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(12px,3vw,40px)',
        background: 'rgba(46,43,37,0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        overflowY: 'auto',
      }}
    >
      <form
        onSubmit={submit}
        className="glass-strong grain"
        style={{
          width: 'min(560px, 100%)',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: 26,
          padding: 'clamp(18px,2.4vw,26px)',
          backgroundColor: 'rgba(255,252,247,0.95)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--color-accent-700)',
                margin: 0,
              }}
            >
              Final step · who&rsquo;s flying?
            </p>
            <h2 style={{ fontSize: 'clamp(20px,2.4vw,26px)', lineHeight: 1.1, margin: '4px 0 0' }}>
              Book {destCity} · ${option.cost}
            </h2>
            <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--color-neutral-700)', margin: '6px 0 0' }}>
              Names must match passports exactly. The fare is confirmed at the current price — if it
              moved, we stop and show you before anything is charged.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking"
            style={{
              flex: 'none',
              border: 0,
              background: 'transparent',
              fontSize: 20,
              lineHeight: 1,
              color: 'var(--color-neutral-600)',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {passengers.map((p, i) => (
          <div
            key={i}
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.5)',
              border: '1px solid var(--color-divider)',
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 10px' }}>
              Traveller {i + 1}
              {i === 0 ? ' · lead' : ''}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '86px 1fr 1fr', gap: 10 }}>
              <div>
                <label style={LABEL}>Title</label>
                <select
                  value={p.title}
                  onChange={(e) => setP(i, { title: e.target.value as BookingPassenger['title'] })}
                  style={{ ...FIELD, cursor: 'pointer' }}
                >
                  <option value="ms">Ms</option>
                  <option value="mr">Mr</option>
                  <option value="mrs">Mrs</option>
                  <option value="miss">Miss</option>
                </select>
              </div>
              <div>
                <label style={LABEL}>First name</label>
                <input required value={p.firstName} onChange={(e) => setP(i, { firstName: e.target.value })} style={FIELD} />
              </div>
              <div>
                <label style={LABEL}>Last name</label>
                <input required value={p.lastName} onChange={(e) => setP(i, { lastName: e.target.value })} style={FIELD} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10, marginTop: 10 }}>
              <div>
                <label style={LABEL}>Date of birth</label>
                <input
                  required
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={p.dob}
                  onChange={(e) => setP(i, { dob: e.target.value })}
                  style={FIELD}
                />
              </div>
              <div>
                <label style={LABEL}>Gender</label>
                <select
                  value={p.gender}
                  onChange={(e) => setP(i, { gender: e.target.value as 'm' | 'f' })}
                  style={{ ...FIELD, cursor: 'pointer' }}
                >
                  <option value="f">Female</option>
                  <option value="m">Male</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
          <div>
            <label style={LABEL}>Contact email</label>
            <input
              required
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              style={FIELD}
            />
          </div>
          <div>
            <label style={LABEL}>Phone (with country code)</label>
            <input
              required
              type="tel"
              placeholder="+14155550123"
              pattern="\+[1-9][0-9]{6,14}"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={FIELD}
            />
          </div>
        </div>

        {error && (
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.5,
              color: 'var(--color-accent-800)',
              background: 'var(--color-accent-100)',
              borderRadius: 12,
              padding: '10px 12px',
              margin: '12px 0 0',
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          className="hv-accent"
          disabled={busy}
          style={{
            width: '100%',
            marginTop: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: 15,
            border: 0,
            borderRadius: 999,
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
            fontFamily: 'var(--font-heading)',
            fontSize: 15,
            cursor: busy ? 'progress' : 'pointer',
          }}
        >
          {busy ? <Spinner size={14} color="var(--color-bg)" /> : <Icon name="lock" size={15} />}
          {busy ? 'Booking with the airline…' : 'Confirm & book · $' + option.cost}
        </button>
        <button
          type="button"
          className="hv-soft"
          onClick={onSkip}
          style={{
            width: '100%',
            marginTop: 8,
            padding: 12,
            border: '1px solid var(--color-divider)',
            borderRadius: 999,
            background: 'transparent',
            fontFamily: 'var(--font-heading)',
            fontSize: 13,
            color: 'var(--color-neutral-700)',
            cursor: 'pointer',
          }}
        >
          Skip for now — just save the plan
        </button>
      </form>
    </div>
  )
}
