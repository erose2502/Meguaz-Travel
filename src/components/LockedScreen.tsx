import { useState } from 'react'
import Icon from './Icon'
import TripPrep from './TripPrep'
import { shareStoryCard } from '../lib/shareCard'
import type { BookingResult, PlanOption } from '../lib/api'
import type { Destination } from '../data/destinations'

type Props = {
  option: PlanOption | null
  budget: number
  leaveBy: string
  dest: Destination | null
  arriveBy: string
  nights: number
  userEmail: string | null
  booking: BookingResult | null
  hasPhrasePack: boolean
  phrasesSaved: number
  phrasesTotal: number
  daysUntil: number | null
  goPhrases: () => void
  goBriefing: () => void
  goHome: () => void
}

/** ICS-safe local datetime: the departure date with a HH:MM wall time. */
function icsStamp(dateIso: string, hhmm: string) {
  return dateIso.replace(/-/g, '') + 'T' + hhmm.replace(':', '') + '00'
}

function downloadIcs(option: PlanOption, dest: Destination, leaveBy: string) {
  const departDate = option.departAt.slice(0, 10)
  const departTime = option.departAt.slice(11, 16)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Meguaz//Trip Plan//EN',
    'BEGIN:VEVENT',
    'UID:meguaz-leave-' + option.offerId + '@meguaz.com',
    'DTSTART:' + icsStamp(departDate, leaveBy || option.leaveBy),
    'DTEND:' + icsStamp(departDate, departTime),
    'SUMMARY:Leave home — ' + dest.city + ' trip',
    'DESCRIPTION:Door-to-gate plan by Meguaz. Flight departs ' + departTime + ' from ' + option.originAirport + '.',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'UID:meguaz-flight-' + option.offerId + '@meguaz.com',
    'DTSTART:' + icsStamp(departDate, departTime),
    'DTEND:' + icsStamp(departDate, departTime),
    'SUMMARY:Flight ' + option.originAirport + ' → ' + dest.code,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'meguaz-' + dest.code.toLowerCase() + '.ics'
  a.click()
  URL.revokeObjectURL(url)
}

export default function LockedScreen({
  option,
  budget,
  leaveBy,
  dest,
  arriveBy,
  nights,
  userEmail,
  booking,
  hasPhrasePack,
  phrasesSaved,
  phrasesTotal,
  daysUntil,
  goPhrases,
  goBriefing,
  goHome,
}: Props) {
  const under = option ? budget - option.cost : 0
  const departure = leaveBy || option?.leaveBy || '—'
  const [shared, setShared] = useState(false)
  const [cardState, setCardState] = useState<'idle' | 'busy' | 'done'>('idle')

  const storyCard = async () => {
    if (!dest || cardState === 'busy') return
    setCardState('busy')
    try {
      const outcome = await shareStoryCard({
        city: dest.city,
        country: dest.country,
        code: dest.code,
        nights,
        cost: option?.cost ?? null,
        arriveBy,
      })
      if (outcome === 'downloaded') {
        setCardState('done')
        setTimeout(() => setCardState('idle'), 2500)
        return
      }
    } catch {
      /* user dismissed the share sheet */
    }
    setCardState('idle')
  }

  const shareTrip = async () => {
    if (!dest) return
    const url =
      window.location.origin +
      '/?to=' + dest.code +
      '&arrive=' + arriveBy +
      '&nights=' + nights +
      '&budget=' + budget
    const payload = {
      title: 'Meguaz — ' + dest.city + ' plan',
      text: 'My ' + dest.city + ' trip, solved door to gate' + (option ? ' for $' + option.cost : '') + ':',
      url,
    }
    try {
      if (navigator.share) {
        await navigator.share(payload)
      } else {
        await navigator.clipboard.writeText(url)
        setShared(true)
        setTimeout(() => setShared(false), 2500)
      }
    } catch {
      /* user dismissed the share sheet */
    }
  }

  const stats = option
    ? [
        { value: (under >= 0 ? '$' + under : '-$' + Math.abs(under)), label: 'against your $' + budget + ' cap' },
        { value: option.bufferMin + ' min', label: 'buffer secured before boarding' },
        { value: option.doorToDoor, label: 'door to door' },
      ]
    : []

  return (
    <div data-screen-label="Plan locked" style={{ maxWidth: 720, margin: '0 auto' }}>
      <span
        className="glass-sage"
        style={{
          width: 64,
          height: 64,
          borderRadius: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="check" size={30} color="var(--color-accent-2-800)" />
      </span>
      <p
        style={{
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-accent-700)',
          margin: '16px 0 6px',
        }}
      >
        {booking ? 'Flight booked' : 'Plan locked'}
      </p>
      <h1 style={{ fontSize: 'clamp(26px,3.6vw,42px)', lineHeight: 1.05, margin: '0 0 8px' }}>
        {booking ? 'You’re on the flight.' : 'Your journey is handled.'}
      </h1>
      {booking && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, margin: '0 0 8px' }}>
          <span className="tag tag-accent-2" style={{ fontSize: 13, padding: '5px 14px', fontWeight: 700 }}>
            Reference · {booking.bookingReference ?? booking.orderId.slice(0, 10)}
          </span>
          {!booking.liveMode && (
            <span className="tag tag-accent" title="Booked against the test environment — no real ticket was issued">
              Test booking — no real ticket
            </span>
          )}
        </div>
      )}
      <p style={{ fontSize: 14, color: 'var(--color-neutral-700)', margin: 0 }}>
        {option
          ? booking
            ? '$' + booking.total + ' ' + booking.currency + ' confirmed with the airline' + (userEmail ? ' — details in your trips (' + userEmail + ').' : '.')
            : userEmail
              ? 'Every leg timed against live fares — saved to your trips (' + userEmail + '). Complete the booking with the airline before fares move.'
              : 'Every leg timed against live fares. Sign in to keep this plan in your trips.'
          : 'Pick a route first and the locked plan appears here.'}
      </p>

      <div
        className="glass-accent"
        style={{
          marginTop: 18,
          borderRadius: 22,
          padding: 20,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div style={{ flex: '1 1 200px' }}>
          <p
            style={{
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-accent-800)',
              margin: 0,
            }}
          >
            Leave home by
          </p>
          <p
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(38px,5vw,60px)',
              lineHeight: 1,
              color: 'var(--color-accent-800)',
              margin: '6px 0 0',
            }}
          >
            {departure}
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-accent-800)', opacity: 0.8, margin: '6px 0 0' }}>
            We&rsquo;ll move it if traffic does
          </p>
        </div>
        <Icon name="clock" size={48} color="var(--color-accent-700)" style={{ flex: 'none' }} />
      </div>

      {stats.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))',
            gap: 12,
            marginTop: 12,
          }}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="glass" style={{ borderRadius: 20, padding: 16 }}>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: 26, lineHeight: 1, margin: 0 }}>
                {stat.value}
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-neutral-700)', margin: '6px 0 0' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {option && (
        <div className="glass-soft" style={{ marginTop: 12, borderRadius: 20, padding: '4px 18px' }}>
          {option.costBreakdown.map((line, i) => (
            <div
              key={line.label}
              style={{
                display: 'flex',
                gap: 12,
                padding: '12px 0',
                borderBottom:
                  i < option.costBreakdown.length - 1 ? '1px solid var(--color-divider)' : undefined,
              }}
            >
              <span style={{ flex: 1, fontSize: 13, color: 'var(--color-neutral-700)' }}>{line.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>${line.amount}</span>
            </div>
          ))}
        </div>
      )}

      {dest && option && (
        <TripPrep
          dest={dest}
          hasPhrasePack={hasPhrasePack}
          phrasesSaved={phrasesSaved}
          phrasesTotal={phrasesTotal}
          daysUntil={daysUntil}
          goPhrases={goPhrases}
          goBriefing={goBriefing}
        />
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
        <button
          className="glass hv-white"
          onClick={() => option && dest && downloadIcs(option, dest, leaveBy)}
          disabled={!option || !dest}
          style={{
            flex: '1 1 150px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: 13,
            borderRadius: 999,
            fontFamily: 'var(--font-heading)',
            fontSize: 13,
            color: 'var(--color-text)',
            cursor: 'pointer',
            opacity: option && dest ? 1 : 0.5,
          }}
        >
          <Icon name="download" size={15} />
          Add to calendar
        </button>
        <button
          className="glass hv-white"
          onClick={shareTrip}
          disabled={!dest}
          style={{
            flex: '1 1 150px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: 13,
            borderRadius: 999,
            fontFamily: 'var(--font-heading)',
            fontSize: 13,
            color: shared ? 'var(--color-accent-2-700)' : 'var(--color-text)',
            cursor: 'pointer',
            opacity: dest ? 1 : 0.5,
          }}
        >
          <Icon name={shared ? 'check' : 'share'} size={15} />
          {shared ? 'Link copied' : 'Share'}
        </button>
        <button
          className="glass hv-white"
          onClick={storyCard}
          disabled={!dest || cardState === 'busy'}
          title="A story-sized poster of this trip — the share sheet opens straight into Instagram"
          style={{
            flex: '1 1 150px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: 13,
            borderRadius: 999,
            fontFamily: 'var(--font-heading)',
            fontSize: 13,
            color: cardState === 'done' ? 'var(--color-accent-2-700)' : 'var(--color-text)',
            cursor: 'pointer',
            opacity: dest ? 1 : 0.5,
          }}
        >
          <Icon name={cardState === 'done' ? 'check' : 'instagram'} size={15} />
          {cardState === 'busy' ? 'Rendering…' : cardState === 'done' ? 'Card saved' : 'Story card'}
        </button>
        <button
          className="hv-accent"
          onClick={goHome}
          style={{
            flex: '2 1 200px',
            padding: 13,
            border: 0,
            borderRadius: 999,
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
            fontFamily: 'var(--font-heading)',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Back to home
        </button>
      </div>
    </div>
  )
}
