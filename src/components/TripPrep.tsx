import Icon, { type IconName } from './Icon'
import type { Destination } from '../data/destinations'
import { COUNTRY_ESSENTIALS } from '../data/countryEssentials'

type Props = {
  dest: Destination
  hasPhrasePack: boolean
  phrasesSaved: number
  phrasesTotal: number
  /** Days until departure, when the trip is booked. */
  daysUntil?: number | null
  goPhrases: () => void
  goBriefing: () => void
}

/**
 * Everything a traveller wants *after* the trip is real: the phrases, the
 * tipping norm, the plug type, the emergency number.
 *
 * This deliberately lives on the booked-plan and trip screens rather than the
 * search screen. Before booking the question is "can I get there, when, for
 * how much" — a language pack for a city someone merely typed is noise. Once
 * the trip exists it becomes the reason to come back before departure.
 */
export default function TripPrep(props: Props) {
  const { dest, hasPhrasePack, phrasesSaved, phrasesTotal, daysUntil, goPhrases, goBriefing } = props
  const essentials = COUNTRY_ESSENTIALS[dest.cc]

  const facts = [
    essentials && {
      icon: 'wallet' as IconName,
      value: essentials.currencySymbol + ' ' + essentials.currencyCode,
    },
    essentials && { icon: 'sparkle' as IconName, value: essentials.plugs },
    essentials && { icon: 'bell' as IconName, value: essentials.emergency.split(' ')[0] },
    essentials && {
      icon: 'car' as IconName,
      value: essentials.drives === 'left' ? 'Drives left' : 'Drives right',
    },
  ].filter(Boolean) as { icon: IconName; value: string }[]

  const when =
    daysUntil == null
      ? null
      : daysUntil <= 0
        ? 'You travel today'
        : daysUntil === 1
          ? 'You travel tomorrow'
          : daysUntil + ' days to get ready'

  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 10,
        }}
      >
        <h2 style={{ fontSize: 'clamp(19px,2vw,25px)', margin: 0 }}>Before you land in {dest.city}</h2>
        {when && <span style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>{when}</span>}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <button
          className="glass-accent glass-lift"
          onClick={goPhrases}
          style={{
            flex: '1 1 280px',
            textAlign: 'left',
            borderRadius: 20,
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <span
            style={{
              width: 44,
              height: 44,
              flex: 'none',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
            }}
          >
            <Icon name="languages" size={20} color="var(--color-accent-800)" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 10,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: 'var(--color-accent-800)',
                margin: 0,
              }}
            >
              {dest.lang}
            </p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 18, lineHeight: 1.15, margin: '3px 0 0' }}>
              {hasPhrasePack ? 'Learn six phrases' : 'Phrase pack in the works'}
            </p>
            {hasPhrasePack && phrasesTotal > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 999,
                    background: 'rgba(46,43,37,0.14)',
                    overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      height: '100%',
                      width: Math.round((phrasesSaved / phrasesTotal) * 100) + '%',
                      borderRadius: 999,
                      background: 'var(--color-accent-2-600)',
                      transition: 'width 240ms ease',
                    }}
                  />
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent-800)' }}>
                  {phrasesSaved}/{phrasesTotal}
                </span>
              </div>
            )}
          </div>
        </button>

        <button
          className="glass glass-lift"
          onClick={goBriefing}
          style={{ flex: '1 1 280px', textAlign: 'left', borderRadius: 20, padding: 16 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="bookOpen" size={18} color="var(--color-accent-2-700)" />
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 18, lineHeight: 1.15, margin: 0, flex: 1 }}>
              Know before you go
            </p>
            <Icon name="chevronRight" size={16} color="var(--color-neutral-500)" />
          </div>
          {facts.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {facts.map((fact) => (
                <span
                  key={fact.value}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    borderRadius: 999,
                    padding: '5px 10px',
                    background: 'rgba(255,255,255,0.55)',
                    border: '1px solid rgba(255,255,255,0.7)',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <Icon name={fact.icon} size={12} color="var(--color-neutral-600)" />
                  {fact.value}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--color-neutral-600)', margin: '10px 0 0' }}>
              A verified briefing for {dest.country} is still being written.
            </p>
          )}
        </button>
      </div>

      {/* ── Get trip-ready: digital arrives instantly, gear ships with an
             order-by date derived from departure. When shipping can't make
             it, the card says so and points at the airport alternative —
             a deadline you can trust beats a store that pretends. ── */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '18px 0 10px' }}>
        <h3 style={{ fontSize: 17, margin: 0 }}>Get trip-ready</h3>
        <span style={{ fontSize: 11.5, color: 'var(--color-neutral-600)' }}>
          digital instantly · gear in time for departure
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {prepItems(dest, essentials, daysUntil ?? null).map((item) => (
          <a
            key={item.title}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-soft glass-lift"
            style={{
              flex: '1 1 215px',
              minWidth: 200,
              borderRadius: 18,
              padding: '13px 15px',
              textDecoration: 'none',
              color: 'var(--color-text)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name={item.icon} size={16} color="var(--color-accent-700)" />
              <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{item.title}</span>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--color-neutral-700)', margin: '6px 0 8px', lineHeight: 1.45 }}>
              {item.note}
            </p>
            <span
              className={item.urgent ? 'tag tag-accent' : 'tag tag-accent-2'}
              style={{ fontSize: 10 }}
            >
              {item.timing}
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}

type PrepItem = {
  icon: IconName
  title: string
  note: string
  timing: string
  urgent: boolean
  href: string
}

/** Shipping needs about this many days of runway before departure. */
const SHIP_DAYS = 5

function prepItems(
  dest: Destination,
  essentials: (typeof COUNTRY_ESSENTIALS)[string] | undefined,
  daysUntil: number | null,
): PrepItem[] {
  const canShip = daysUntil == null || daysUntil >= SHIP_DAYS
  const orderBy = (() => {
    if (daysUntil == null || daysUntil < SHIP_DAYS) return null
    const d = new Date()
    d.setDate(d.getDate() + (daysUntil - SHIP_DAYS))
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  })()
  const shipTiming = canShip
    ? orderBy
      ? 'Order by ' + orderBy + ' · home delivery'
      : 'Ships in ~' + SHIP_DAYS + ' days'
    : 'Too tight to ship — buy at the airport'

  const items: PrepItem[] = [
    {
      icon: 'sparkle',
      title: dest.country ? dest.country + ' eSIM' : 'Travel eSIM',
      note: 'Data the moment you land — installs from an email in minutes, no store queue.',
      timing: 'Instant · digital delivery',
      urgent: false,
      href: 'https://www.airalo.com/',
    },
    {
      icon: 'shieldCheck',
      title: 'Travel insurance',
      note: 'Medical + trip cover, active from the day you fly. Digital certificate.',
      timing: 'Instant · digital delivery',
      urgent: false,
      href: 'https://safetywing.com/nomad-insurance',
    },
  ]

  if (essentials?.plugs) {
    items.push({
      icon: 'sparkle',
      title: 'Power adapter · ' + essentials.plugs.split('·')[0].trim(),
      note: dest.country + ' uses ' + essentials.plugs + ' — the one gadget people forget.',
      timing: shipTiming,
      urgent: !canShip,
      href:
        'https://www.amazon.com/s?k=' +
        encodeURIComponent('travel power adapter ' + essentials.plugs.split('·')[0].trim()),
    })
  }

  if (essentials && essentials.currencyCode !== 'USD') {
    items.push({
      icon: 'wallet',
      title: essentials.currencyCode + ' cash, ready at the airport',
      note: 'Reserve online at today’s rate, collect at your departure terminal.',
      timing: 'Reserve online · airport pickup',
      urgent: false,
      href: 'https://www.travelex.com/',
    })
  }

  items.push({
    icon: 'ticket',
    title: 'Packing upgrades',
    note: 'Cubes, luggage scale, AirTag — the difference between packing and repacking.',
    timing: shipTiming,
    urgent: !canShip,
    href: 'https://www.amazon.com/s?k=' + encodeURIComponent('packing cubes luggage scale travel'),
  })

  return items
}
