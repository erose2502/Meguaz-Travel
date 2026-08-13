import Icon from './Icon'
import Spinner from './Spinner'
import type { FlightOffer } from '../lib/api'

type Props = {
  originAirport: string
  destCode: string
  destCity: string
  budget: number
  offers: FlightOffer[] | null
  loading: boolean
  error: string | null
}

/**
 * A reality check on the brief, not a shopping list.
 *
 * The previous version listed three bookable fares, which anchored the
 * traveller on a flight-only price seconds before the solver quoted them a
 * door-to-door total — two numbers for one trip. This says one thing instead:
 * whether the destination, date and budget they just entered hang together,
 * and how much of the cap the flight leaves for everything else.
 */
export default function FarePulse(props: Props) {
  const { originAirport, destCode, destCity, budget, offers, loading, error } = props

  const cheapest = offers?.length
    ? offers.reduce((min, o) => (Number(o.totalAmount) < Number(min.totalAmount) ? o : min))
    : null
  const price = cheapest ? Math.round(Number(cheapest.totalAmount)) : null
  const airlines = offers ? new Set(offers.map((o) => o.owner)).size : 0
  const hasNonstop = offers?.some((o) => (o.slices[0]?.segments ?? 2) === 1) ?? false
  const remaining = price != null ? budget - price : null
  const overBudget = remaining != null && remaining < 0
  const tight = remaining != null && remaining >= 0 && remaining < budget * 0.25

  return (
    <div
      className={overBudget ? 'glass-accent' : 'glass'}
      style={{
        marginTop: 10,
        borderRadius: 18,
        padding: '12px 16px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          flex: 'none',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon
          name="plane"
          size={15}
          color={overBudget ? 'var(--color-accent-800)' : 'var(--color-accent-700)'}
        />
      </span>

      {loading && (
        <span style={{ flex: 1 }}>
          <Spinner size={13} label={'Checking fares to ' + destCity + '…'} />
        </span>
      )}

      {!loading && error && (
        <span style={{ flex: 1, fontSize: 13, color: 'var(--color-neutral-700)' }}>
          Live fares are unavailable right now — the planner will still price your journey.
        </span>
      )}

      {!loading && !error && offers && offers.length === 0 && (
        <span style={{ flex: 1, fontSize: 13, color: 'var(--color-neutral-700)' }}>
          No fares found for that date. Try moving the date a day or two.
        </span>
      )}

      {!loading && !error && price != null && (
        <>
          <span style={{ flex: '1 1 280px', minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>
              Flights {originAirport} → {destCode} start at ${price}
              {hasNonstop ? ' nonstop' : ''}
              {airlines > 1 ? ' · ' + airlines + ' airlines' : ''}
            </span>
            <span
              style={{
                display: 'block',
                fontSize: 12,
                lineHeight: 1.5,
                color: overBudget ? 'var(--color-accent-800)' : 'var(--color-neutral-700)',
                marginTop: 2,
              }}
            >
              {overBudget
                ? 'That is $' +
                  Math.abs(remaining!) +
                  ' over your $' +
                  budget +
                  ' cap before ground transport. Raise the cap or try another date.'
                : tight
                  ? 'That leaves about $' +
                    remaining +
                    ' of your $' +
                    budget +
                    ' cap for getting to and from the airports — tight but workable.'
                  : 'That leaves about $' +
                    remaining +
                    ' of your $' +
                    budget +
                    ' cap for getting to and from the airports.'}
            </span>
          </span>

          <span
            className={overBudget ? 'tag tag-accent' : 'tag tag-accent-2'}
            style={{ flex: 'none' }}
          >
            {overBudget ? 'Over cap' : tight ? 'Tight fit' : 'Within budget'}
          </span>
        </>
      )}
    </div>
  )
}
