import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import {
  ArrowLeft,
  House,
  Car,
  AirplaneTilt,
  Train,
  Clock,
  Wallet,
  CalendarBlank,
  ShieldCheck,
  Coins,
  Timer,
  ArrowRight,
  Check,
} from '@phosphor-icons/react'

type Priority = 'money' | 'balanced' | 'time'

const BUDGET_CAP = 900

const legIcons = { home: House, car: Car, flight: AirplaneTilt, train: Train }

interface Option {
  id: string
  name: string
  tagline: string
  cost: number
  doorToDoor: string
  leaveBy: string
  buffer: number // 1..5 — how much breathing room
  bufferLabel: string
  tradeoff: string
  legs: { type: keyof typeof legIcons; label: string; time: string }[]
  fits: Priority
}

const options: Option[] = [
  {
    id: 'frugal',
    name: 'The Frugal Route',
    tagline: 'Lowest total cost',
    cost: 612,
    doorToDoor: '14h 05m',
    leaveBy: '06:10',
    buffer: 2,
    bufferLabel: 'Tight — 25 min airport buffer',
    tradeoff: '$122 under budget, but an early start and one connection.',
    legs: [
      { type: 'home', label: 'Home', time: '' },
      { type: 'train', label: 'BART', time: '55m' },
      { type: 'flight', label: 'Flight · 1 stop', time: '11h' },
      { type: 'train', label: 'Rail', time: '35m' },
    ],
    fits: 'money',
  },
  {
    id: 'balanced',
    name: 'The Balanced Route',
    tagline: 'Best mix of price and calm',
    cost: 734,
    doorToDoor: '12h 40m',
    leaveBy: '08:15',
    buffer: 4,
    bufferLabel: 'Comfortable — 70 min buffer',
    tradeoff: 'Under budget with a relaxed 70-minute cushion at the airport.',
    legs: [
      { type: 'home', label: 'Home', time: '' },
      { type: 'car', label: 'Rideshare', time: '42m' },
      { type: 'flight', label: 'Nonstop', time: '10h 35m' },
      { type: 'train', label: 'Express', time: '35m' },
    ],
    fits: 'balanced',
  },
  {
    id: 'calm',
    name: 'The Calm Route',
    tagline: 'Most breathing room',
    cost: 868,
    doorToDoor: '12h 20m',
    leaveBy: '09:05',
    buffer: 5,
    bufferLabel: 'Generous — leave latest, arrive relaxed',
    tradeoff: 'Latest possible departure and the widest safety margin — still on budget.',
    legs: [
      { type: 'home', label: 'Home', time: '' },
      { type: 'car', label: 'Private car', time: '38m' },
      { type: 'flight', label: 'Nonstop', time: '10h 25m' },
      { type: 'train', label: 'Express', time: '30m' },
    ],
    fits: 'time',
  },
]

const priorities: { id: Priority; label: string }[] = [
  { id: 'money', label: 'Save money' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'time', label: 'Save time' },
]

interface SearchResultsProps {
  onSelect: () => void
  onBack: () => void
  isMobile: boolean
}

export default function SearchResults({ onSelect, onBack }: SearchResultsProps) {
  const [priority, setPriority] = useState<Priority>('balanced')
  const listRef = useRef<HTMLDivElement>(null)

  const recommendedId = options.find((o) => o.fits === priority)?.id ?? 'balanced'

  useEffect(() => {
    if (!listRef.current) return
    const cards = listRef.current.querySelectorAll('.opt-card')
    gsap.fromTo(
      cards,
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out' }
    )
  }, [priority])

  return (
    <div className="min-h-dvh" style={{ background: '#F6F3EA' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-5 md:px-8 pt-12 pb-4" style={{ background: 'rgba(246,243,234,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-10 h-10 glass-card rounded-full flex items-center justify-center active:scale-95 transition-transform">
              <ArrowLeft size={18} color="#0D1B2A" weight="bold" />
            </button>
            <div>
              <p className="text-[#146C7E] text-xs font-semibold tracking-wide uppercase">Step 1 of 2 · Solve it</p>
              <h1 className="font-display text-[#0D1B2A] text-xl leading-tight">Making San Francisco → London work</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-5 md:px-8 pb-28">
        {/* Constraints panel */}
        <div className="glass-card rounded-3xl p-5 mt-2">
          {/* Route */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 rounded-2xl px-4 py-3" style={{ background: 'rgba(20,108,126,0.08)' }}>
              <p className="text-[#0D1B2A]/45 text-[11px] uppercase tracking-wide">From home</p>
              <p className="text-[#0D1B2A] font-semibold text-sm">San Francisco, CA</p>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#0D1B2A' }}>
              <ArrowRight size={14} color="white" weight="bold" />
            </div>
            <div className="flex-1 rounded-2xl px-4 py-3" style={{ background: 'rgba(20,108,126,0.08)' }}>
              <p className="text-[#0D1B2A]/45 text-[11px] uppercase tracking-wide">To</p>
              <p className="text-[#0D1B2A] font-semibold text-sm">London, UK</p>
            </div>
          </div>

          {/* Constraints: arrive-by + budget */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ border: '1px solid rgba(13,27,42,0.1)' }}>
              <CalendarBlank size={18} color="#146C7E" weight="regular" />
              <div>
                <p className="text-[#0D1B2A]/45 text-[11px]">Must arrive by</p>
                <p className="text-[#0D1B2A] font-semibold text-sm">Aug 24 · 9:00 AM</p>
              </div>
            </div>
            <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ border: '1px solid rgba(13,27,42,0.1)' }}>
              <Wallet size={18} color="#FF7A00" weight="regular" />
              <div>
                <p className="text-[#0D1B2A]/45 text-[11px]">Budget cap</p>
                <p className="text-[#0D1B2A] font-semibold text-sm">${BUDGET_CAP}</p>
              </div>
            </div>
          </div>

          {/* Priority segmented control */}
          <p className="text-[#0D1B2A]/50 text-xs font-medium mb-2">What matters most this trip?</p>
          <div className="flex gap-1 p-1 rounded-full" style={{ background: 'rgba(13,27,42,0.06)' }}>
            {priorities.map((p) => {
              const active = priority === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setPriority(p.id)}
                  className="flex-1 rounded-full py-2 text-xs font-semibold transition-all duration-300"
                  style={{
                    background: active ? 'linear-gradient(135deg, #FF7A00, #FFC857)' : 'transparent',
                    color: active ? 'white' : 'rgba(13,27,42,0.6)',
                    boxShadow: active ? '0 6px 16px -8px rgba(255,122,0,0.7)' : 'none',
                  }}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center justify-between mt-8 mb-4">
          <h2 className="text-[#0D1B2A] font-semibold text-lg">3 ways to make this work</h2>
          <span className="text-[#0D1B2A]/45 text-xs">All under ${BUDGET_CAP}</span>
        </div>

        <div ref={listRef} className="space-y-4">
          {options.map((o) => {
            const recommended = o.id === recommendedId
            const pct = Math.min(100, Math.round((o.cost / BUDGET_CAP) * 100))
            const under = BUDGET_CAP - o.cost
            return (
              <button
                key={o.id}
                onClick={onSelect}
                className="opt-card w-full text-left glass-card rounded-3xl overflow-hidden active:scale-[0.99] hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                style={recommended ? { border: '1.5px solid #FF7A00' } : {}}
              >
                {recommended && (
                  <div className="px-5 py-2 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #FF7A00, #FFC857)' }}>
                    <ShieldCheck size={13} color="white" weight="fill" />
                    <span className="text-white text-xs font-semibold">Recommended for your priority</span>
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-display text-[#0D1B2A] text-xl leading-none">{o.name}</h3>
                      <p className="text-[#146C7E] text-xs font-medium mt-1">{o.tagline}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-[#0D1B2A] text-2xl leading-none">${o.cost}</p>
                      <p className="text-[#2FB4B4] text-xs font-semibold mt-0.5">${under} under budget</p>
                    </div>
                  </div>

                  {/* Budget bar */}
                  <div className="mb-4">
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(13,27,42,0.08)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #146C7E, #2FB4B4)' }} />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[#0D1B2A]/40 text-[11px]">Cost vs ${BUDGET_CAP} cap</span>
                      <span className="text-[#0D1B2A]/40 text-[11px]">{pct}%</span>
                    </div>
                  </div>

                  {/* Time + buffer metrics */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-2xl px-3 py-2.5 flex items-center gap-2.5" style={{ background: 'rgba(20,108,126,0.07)' }}>
                      <Timer size={18} color="#146C7E" weight="regular" />
                      <div>
                        <p className="text-[#0D1B2A]/45 text-[10px] uppercase tracking-wide">Door to door</p>
                        <p className="text-[#0D1B2A] font-semibold text-sm">{o.doorToDoor}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl px-3 py-2.5 flex items-center gap-2.5" style={{ background: 'rgba(255,122,0,0.08)' }}>
                      <Clock size={18} color="#FF7A00" weight="regular" />
                      <div>
                        <p className="text-[#0D1B2A]/45 text-[10px] uppercase tracking-wide">Leave home</p>
                        <p className="text-[#0D1B2A] font-semibold text-sm">{o.leaveBy}</p>
                      </div>
                    </div>
                  </div>

                  {/* Buffer / stress meter */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-6 h-1.5 rounded-full"
                          style={{ background: i < o.buffer ? '#2FB4B4' : 'rgba(13,27,42,0.1)' }}
                        />
                      ))}
                    </div>
                    <span className="text-[#0D1B2A]/55 text-xs">{o.bufferLabel}</span>
                  </div>

                  {/* Leg chain */}
                  <div className="flex items-center gap-1 mb-4">
                    {o.legs.map((leg, i) => {
                      const LegIcon = legIcons[leg.type]
                      return (
                        <div key={i} className="flex items-center gap-1">
                          <div className="flex flex-col items-center">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(13,27,42,0.06)' }}>
                              <LegIcon size={16} color="#0D1B2A" weight="regular" />
                            </div>
                            {leg.time && <span className="text-[#0D1B2A]/40 text-[9px] mt-1">{leg.time}</span>}
                          </div>
                          {i < o.legs.length - 1 && <div className="w-4 h-px" style={{ background: 'rgba(13,27,42,0.2)' }} />}
                        </div>
                      )
                    })}
                  </div>

                  {/* Tradeoff */}
                  <div className="flex items-start gap-2 rounded-2xl px-3 py-2.5" style={{ background: 'rgba(20,108,126,0.06)' }}>
                    <Coins size={15} color="#146C7E" weight="regular" className="mt-0.5 flex-shrink-0" />
                    <p className="text-[#0D1B2A]/65 text-xs leading-relaxed flex-1">{o.tradeoff}</p>
                    <span className="flex items-center gap-1 text-[#FF7A00] text-xs font-semibold flex-shrink-0 mt-0.5">
                      Plan <ArrowRight size={13} weight="bold" />
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Reassurance footer */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <Check size={14} color="#2FB4B4" weight="bold" />
          <span className="text-[#0D1B2A]/45 text-xs">Every route is checked against your budget and arrival time</span>
        </div>
      </div>
    </div>
  )
}
