import { useEffect, useRef, useState, useCallback } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGeolocation } from '@/lib/useGeolocation'
import {
  ArrowLeft,
  House,
  Car,
  AirplaneTilt,
  ShieldCheck,
  ForkKnife,
  Door,
  Train,
  Clock,
  Warning,
  CheckCircle,
  Wallet,
  Timer,
  LockKey,
  Crosshair,
  ArrowClockwise,
} from '@phosphor-icons/react'

import type { PlanOption, StepIcon } from '@/lib/plan-types'

gsap.registerPlugin(ScrollTrigger)

const BUDGET_CAP = 900
const TOTAL_COST = 734

// Icon names arrive as strings from the solver API; resolve to phosphor components.
const stepIconMap: Record<StepIcon, typeof House> = {
  home: House,
  car: Car,
  flight: AirplaneTilt,
  checkin: ShieldCheck,
  buffer: ForkKnife,
  door: Door,
  train: Train,
}

function timeAgo(ts: number): string {
  const secs = Math.round((Date.now() - ts) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.round(secs / 60)
  return `${mins} min ago`
}

const costBreakdown = [
  { label: 'Flight (nonstop)', amount: 665, color: '#146C7E' },
  { label: 'Rideshare to SFO', amount: 34, color: '#FF7A00' },
  { label: 'Heathrow Express', amount: 35, color: '#2FB4B4' },
]

const steps = [
  {
    id: 'home', icon: House, time: '08:15', label: 'Leave home',
    location: '742 Evergreen Terrace, San Francisco',
    detail: 'Rideshare ordered — arrives in 3 min', cost: '$34', kind: 'go',
    note: null,
  },
  {
    id: 'drive', icon: Car, time: '08:15 → 08:57', label: 'Rideshare to SFO',
    location: 'Via US-101 N · 42 min',
    detail: 'Uber X · fare locked at $34', cost: null, kind: 'normal',
    note: 'Bottleneck cleared — we told you to leave 8 min earlier to beat Bay Bridge traffic.',
  },
  {
    id: 'checkin', icon: ShieldCheck, time: '08:57 → 09:10', label: 'Check-in & security',
    location: 'SFO Terminal 3 · TSA PreCheck',
    detail: 'Average wait right now: 12 min', cost: null, kind: 'normal',
    note: null,
  },
  {
    id: 'buffer', icon: ForkKnife, time: '09:10 → 10:20', label: '70-min buffer',
    location: 'Time to breathe, grab coffee, relax',
    detail: 'Your safety cushion before boarding', cost: null, kind: 'buffer',
    note: null,
  },
  {
    id: 'flight', icon: AirplaneTilt, time: '10:45 → 07:20+1', label: 'SFO → LHR · Nonstop',
    location: 'Seat 24A · 10h 35m in the air',
    detail: 'Flight fare', cost: '$665', kind: 'main',
    note: null,
  },
  {
    id: 'arrive', icon: Door, time: '07:20', label: 'Arrive London Heathrow',
    location: 'Terminal 2 · border + baggage ~45 min',
    detail: 'We padded 45 min for arrivals', cost: null, kind: 'normal',
    note: null,
  },
  {
    id: 'rail', icon: Train, time: '08:30 → 09:05', label: 'Heathrow Express',
    location: 'To Paddington · 35 min incl. walk',
    detail: 'Ticket fare', cost: '$35', kind: 'go',
    note: null,
  },
]

interface JourneyTimelineProps {
  option?: PlanOption | null
  budget?: number
  routeLabel?: string
  originCoords?: { lat: number; lng: number } | null
  onBack: () => void
  onBook: () => void
  isMobile: boolean
}

// Live drive-ETA state for the "Leave home by" card.
type LiveEta = {
  leaveBy: string
  driveMin: number
  trafficAware: boolean
  checkedAt: number
}

export default function JourneyTimeline({
  option,
  budget,
  originCoords,
  onBack,
  onBook,
}: JourneyTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { coords, locate } = useGeolocation()
  const [live, setLive] = useState<LiveEta | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Live plan when an option was selected; the prototype's demo plan otherwise.
  const budgetCap = budget ?? BUDGET_CAP
  const totalCost = option?.cost ?? TOTAL_COST
  const planName = option?.name ?? 'The Balanced Route'
  const breakdown = option?.costBreakdown ?? costBreakdown
  const planSteps = option
    ? option.steps.map((s) => ({ ...s, icon: stepIconMap[s.icon] }))
    : steps
  const bufferMin = option?.bufferMin ?? 70
  const doorToDoor = option?.doorToDoor ?? '12h 40m'
  const underBudget = budgetCap - totalCost

  // The live value wins once we have it, else the solver's baked-in time.
  const leaveBy = live?.leaveBy ?? option?.leaveBy ?? '08:15'
  const canLiveEta = Boolean(option?.originAirport && option?.departAt)

  // Re-price the drive from the user's current position and shift leave-by.
  const refreshEta = useCallback(
    async (from: { lat: number; lng: number }) => {
      if (!option?.originAirport || !option?.departAt) return
      setRefreshing(true)
      try {
        const res = await fetch('/api/location/eta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, airport: option.originAirport, departAt: option.departAt }),
        })
        if (!res.ok) return
        const eta = await res.json()
        const departMs = Date.parse(option.departAt)
        const leaveMs = departMs - (eta.minutes + option.preTransferMin) * 60_000
        const leaveByStr = new Date(leaveMs).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
        setLive({
          leaveBy: leaveByStr,
          driveMin: eta.minutes,
          trafficAware: eta.trafficAware,
          checkedAt: Date.now(),
        })
      } finally {
        setRefreshing(false)
      }
    },
    [option]
  )

  // Auto-refresh once on open when we already have the traveler's location
  // (from the brief), so the plan opens with a current leave-by.
  useEffect(() => {
    const start = originCoords ?? coords
    if (canLiveEta && start) void refreshEta(start)
  }, [canLiveEta, originCoords, coords, refreshEta])

  async function handleManualRefresh() {
    const from = originCoords ?? coords ?? (await locate())
    if (from) void refreshEta(from)
  }

  useEffect(() => {
    if (!containerRef.current) return
    const items = containerRef.current.querySelectorAll('.timeline-item')
    items.forEach((item, i) => {
      gsap.fromTo(
        item,
        { opacity: 0, x: -20 },
        {
          opacity: 1, x: 0, duration: 0.5, ease: 'power2.out',
          scrollTrigger: { trigger: item, start: 'top 88%', scroller: item.closest('.jt-scroll') || undefined },
          delay: i < 3 ? i * 0.08 : 0,
        }
      )
    })
  }, [])

  return (
    <div className="min-h-dvh" style={{ background: '#F6F3EA' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-5 md:px-8 pt-12 pb-4" style={{ background: 'rgba(246,243,234,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        <div className="mx-auto w-full max-w-3xl flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 glass-card rounded-full flex items-center justify-center active:scale-95 transition-transform">
            <ArrowLeft size={18} color="#0D1B2A" weight="bold" />
          </button>
          <div>
            <p className="text-[#146C7E] text-xs font-semibold tracking-wide uppercase">Step 2 of 2 · The plan</p>
            <h1 className="font-display text-[#0D1B2A] text-xl leading-tight">{planName}</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-5 md:px-8 pb-40">
        {/* Two budgets side by side */}
        <div className="grid md:grid-cols-2 gap-4 mt-3">
          {/* MONEY budget */}
          <div className="glass-card rounded-3xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={18} color="#FF7A00" weight="regular" />
              <h2 className="text-[#0D1B2A] font-semibold text-sm">Money budget</h2>
              <span className="ml-auto text-xs font-semibold" style={{ color: underBudget >= 0 ? '#2FB4B4' : '#FF7A00' }}>
                {underBudget >= 0 ? `$${underBudget} to spare` : `$${Math.abs(underBudget)} over cap`}
              </span>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="font-display text-[#0D1B2A] text-3xl leading-none">${totalCost.toLocaleString()}</span>
              <span className="text-[#0D1B2A]/40 text-sm mb-0.5">of ${budgetCap} cap</span>
            </div>
            {/* Stacked bar */}
            <div className="h-3 rounded-full overflow-hidden flex" style={{ background: 'rgba(13,27,42,0.08)' }}>
              {breakdown.map((c) => (
                <div key={c.label} style={{ width: `${(c.amount / budgetCap) * 100}%`, background: c.color }} />
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              {breakdown.map((c) => (
                <div key={c.label} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                  <span className="text-[#0D1B2A]/60 text-xs flex-1">{c.label}</span>
                  <span className="text-[#0D1B2A] text-xs font-semibold">${c.amount}</span>
                </div>
              ))}
            </div>
          </div>

          {/* TIME budget */}
          <div className="glass-card rounded-3xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Timer size={18} color="#146C7E" weight="regular" />
              <h2 className="text-[#0D1B2A] font-semibold text-sm">Time budget</h2>
              <span className="ml-auto text-[#2FB4B4] text-xs font-semibold">{bufferMin} min buffer</span>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="font-display text-[#0D1B2A] text-3xl leading-none">{doorToDoor}</span>
              <span className="text-[#0D1B2A]/40 text-sm mb-0.5">door to door</span>
            </div>
            <div className="rounded-2xl px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(255,122,0,0.1)' }}>
              <div>
                <p className="text-[#0D1B2A]/50 text-[11px] uppercase tracking-wide">Leave home by</p>
                <p className="font-display text-[#FF7A00] text-2xl leading-none">{leaveBy}</p>
              </div>
              {canLiveEta ? (
                <button
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                  aria-label="Refresh leave-home-by from your location"
                  className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold text-[#FF7A00] active:scale-95 transition-transform"
                  style={{ background: 'rgba(255,122,0,0.15)' }}
                >
                  {live ? (
                    <ArrowClockwise size={14} weight="bold" className={refreshing ? 'animate-spin' : ''} />
                  ) : (
                    <Crosshair size={14} weight="bold" />
                  )}
                  {refreshing ? 'Checking…' : live ? 'Refresh' : 'Use my location'}
                </button>
              ) : (
                <Clock size={30} color="#FF7A00" weight="light" />
              )}
            </div>
            <p className="text-[#0D1B2A]/50 text-xs mt-2.5 leading-relaxed">
              {live
                ? `${live.driveMin}-min drive ${live.trafficAware ? 'with live traffic' : 'from your location'} · updated ${timeAgo(live.checkedAt)}. Reopen or refresh before you leave.`
                : option?.etaTrafficAware
                  ? 'Timed from your location with live traffic — refresh before you head out.'
                  : option?.etaFromLocation
                    ? 'Timed from your current location — sharpens as you get closer.'
                    : 'Share your location for a live, traffic-aware leave-home-by time.'}
            </p>
          </div>
        </div>

        {/* Bottleneck resolved banner (live bottleneck detection needs a traffic
            source — see docs/ux-flows.md; demo copy only shows in demo mode) */}
        {!option && (
          <div className="rounded-2xl px-4 py-3 flex items-center gap-3 mt-4" style={{ background: 'rgba(47,180,180,0.12)', border: '1px solid rgba(47,180,180,0.3)' }}>
            <CheckCircle size={18} color="#146C7E" weight="fill" />
            <div className="flex-1">
              <p className="text-[#0D1B2A] text-xs font-semibold">1 bottleneck handled for you</p>
              <p className="text-[#0D1B2A]/55 text-xs">Bay Bridge traffic — departure pulled 8 min earlier so you still make it.</p>
            </div>
          </div>
        )}

        {/* Timeline */}
        <h2 className="text-[#0D1B2A] font-semibold text-lg mt-8 mb-4">Your door-to-door plan</h2>
        <div ref={containerRef}>
          {planSteps.map((step, i) => {
            const Icon = step.icon
            const isLast = i === planSteps.length - 1
            const accent = step.kind === 'main' ? '#146C7E' : step.kind === 'buffer' ? '#FF7A00' : step.kind === 'go' ? '#2FB4B4' : '#0D1B2A'
            return (
              <div key={step.id} className="timeline-item relative flex gap-4">
                {/* Rail */}
                <div className="flex flex-col items-center" style={{ width: 40 }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: step.kind === 'main' ? '#146C7E' : 'rgba(13,27,42,0.06)' }}>
                    <Icon size={18} color={step.kind === 'main' ? 'white' : accent} weight="regular" />
                  </div>
                  {!isLast && <div className="flex-1 w-px my-1" style={{ background: 'rgba(13,27,42,0.12)', minHeight: 26 }} />}
                </div>

                {/* Card */}
                <div
                  className="flex-1 mb-3 rounded-2xl p-4"
                  style={{
                    background: step.kind === 'buffer' ? 'rgba(255,122,0,0.08)' : 'rgba(255,255,255,0.6)',
                    border: `1px solid ${step.kind === 'main' ? 'rgba(20,108,126,0.35)' : 'rgba(13,27,42,0.08)'}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[#0D1B2A] font-semibold text-sm leading-tight">{step.label}</p>
                      <p className="text-[#0D1B2A]/50 text-xs mt-0.5">{step.location}</p>
                    </div>
                    <span className="text-[#0D1B2A]/50 text-xs font-medium flex-shrink-0">{step.time}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[#0D1B2A]/40 text-xs">{step.detail}</p>
                    {step.cost && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(20,108,126,0.1)', color: '#146C7E' }}>{step.cost}</span>
                    )}
                  </div>
                  {step.note && (
                    <div className="flex items-start gap-2 mt-3 rounded-xl px-3 py-2" style={{ background: 'rgba(47,180,180,0.1)' }}>
                      <Warning size={13} color="#146C7E" weight="fill" className="mt-0.5 flex-shrink-0" />
                      <span className="text-[#0D1B2A]/65 text-xs leading-relaxed">{step.note}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Lock-in CTA */}
      <div className="fixed bottom-0 inset-x-0 px-5 md:px-8 pb-8 pt-4 z-30" style={{ background: 'rgba(246,243,234,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: '1px solid rgba(13,27,42,0.08)' }}>
        <div className="mx-auto w-full max-w-3xl flex items-center gap-4">
          <div className="hidden sm:block">
            <p className="text-[#0D1B2A]/45 text-xs">
              Total · {underBudget >= 0 ? `$${underBudget} under budget` : `$${Math.abs(underBudget)} over cap`}
            </p>
            <p className="font-display text-[#0D1B2A] text-2xl leading-none">${totalCost.toLocaleString()}</p>
          </div>
          <button
            onClick={onBook}
            className="flex-1 flex items-center justify-center gap-2 rounded-full py-4 font-semibold text-white active:scale-[0.98] hover:brightness-105 transition-all"
            style={{ background: 'linear-gradient(135deg, #FF7A00, #FFC857)', boxShadow: '0 12px 28px -10px rgba(255,122,0,0.6)' }}
          >
            <LockKey size={18} weight="regular" />
            Lock in this plan
          </button>
        </div>
      </div>
    </div>
  )
}
