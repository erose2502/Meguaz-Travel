import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import {
  CheckCircle,
  House,
  Clock,
  Bell,
  Wallet,
  Timer,
  ShieldCheck,
  CalendarCheck,
  Download,
  Share,
} from '@phosphor-icons/react'
import LottiePlayer from './LottiePlayer'
import type { PlanOption, TripBrief } from '@/lib/plan-types'

interface BookingConfirmationProps {
  option?: PlanOption | null
  brief?: TripBrief | null
  routeLabel?: string
  onDone: () => void
}

const BUDGET_CAP = 900
const TOTAL_COST = 734

export default function BookingConfirmation({ option, brief, routeLabel, onDone }: BookingConfirmationProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const successRef = useRef<HTMLDivElement>(null)
  const detailsRef = useRef<HTMLDivElement>(null)

  const budgetCap = brief?.budget ?? BUDGET_CAP
  const totalCost = option?.cost ?? TOTAL_COST
  const saved = budgetCap - totalCost
  const bufferMin = option?.bufferMin ?? 70
  const route = routeLabel ?? 'San Francisco → London'
  const dateLabel = brief
    ? new Date(brief.arriveBy + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : 'Mon, Aug 24'
  const doorToDoor = option?.doorToDoor ?? '12h 40m'
  const leaveBy = option?.leaveBy ?? '08:15 AM'
  const arriveStep = option?.steps.find((s) => s.id === 'rail' || s.id === 'arrive')
  const arriveLabel = arriveStep ? `By ${arriveStep.time.split(' → ').pop()}` : 'By 09:05 AM Tue'

  function savePlan() {
    const payload = option && brief ? { brief, option } : { demo: true }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `meguaz-plan-${(brief?.to ?? 'demo').toLowerCase().replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function sharePlan() {
    const text = `${route} · ${dateLabel} — door to door in ${doorToDoor}, $${totalCost} all-in. Planned with Meguaz.`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Meguaz plan', text })
        return
      } catch {
        /* user dismissed */
      }
    }
    await navigator.clipboard.writeText(text)
  }

  useEffect(() => {
    const tl = gsap.timeline()
    tl.fromTo(successRef.current, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'power2.out' })
    tl.fromTo(cardRef.current, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: 'power2.out' }, '-=0.2')
    tl.fromTo(detailsRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power2.out' }, '-=0.15')
  }, [])

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#F6F3EA' }}>
      <div className="flex-1 flex flex-col items-center px-5 pt-16 pb-40 relative z-10">
        {/* Success */}
        <div ref={successRef} className="flex flex-col items-center mb-8 text-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mb-5" style={{ background: 'rgba(47,180,180,0.15)', border: '1px solid rgba(47,180,180,0.3)' }}>
            <LottiePlayer type="success" size={72} />
          </div>
          <p className="text-[#146C7E] text-xs font-semibold tracking-widest uppercase mb-2">Plan locked</p>
          <h1 className="font-display text-[#0D1B2A] text-3xl leading-tight">
            Your journey<br />is handled.
          </h1>
          <p className="text-[#0D1B2A]/45 text-sm mt-2">Every leg booked and timed. Saved to your trips.</p>
        </div>

        <div ref={cardRef} className="w-full max-w-sm space-y-4">
          {/* The two things Meguaz actually protects */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-3xl p-5">
              <Wallet size={20} color="#FF7A00" weight="regular" />
              <p className="font-display text-[#FF7A00] text-3xl leading-none mt-3">${Math.max(saved, 0)}</p>
              <p className="text-[#0D1B2A]/55 text-xs mt-1">kept under your ${budgetCap} cap</p>
            </div>
            <div className="glass-card rounded-3xl p-5">
              <Timer size={20} color="#146C7E" weight="regular" />
              <p className="font-display text-[#146C7E] text-3xl leading-none mt-3">{bufferMin} min</p>
              <p className="text-[#0D1B2A]/55 text-xs mt-1">buffer secured before boarding</p>
            </div>
          </div>

          {/* What's locked in */}
          <div className="glass-card rounded-3xl overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(13,27,42,0.08)' }}>
              <p className="text-[#0D1B2A] font-semibold text-sm">{route}</p>
              <p className="text-[#0D1B2A]/45 text-xs mt-0.5">{dateLabel} · door to door in {doorToDoor}</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              {[
                { icon: House, label: 'Leave home', value: leaveBy },
                { icon: CalendarCheck, label: `Arrive ${brief?.to ?? 'London'}`, value: arriveLabel },
                { icon: ShieldCheck, label: 'Total cost', value: `$${totalCost.toLocaleString()}` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(20,108,126,0.1)' }}>
                    <Icon size={15} color="#146C7E" weight="regular" />
                  </span>
                  <span className="text-[#0D1B2A]/55 text-xs flex-1">{label}</span>
                  <span className="text-[#0D1B2A] text-sm font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Watching for you */}
          <div className="rounded-2xl px-4 py-4" style={{ background: 'rgba(47,180,180,0.1)', border: '1px solid rgba(47,180,180,0.25)' }}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={18} color="#146C7E" weight="fill" />
              <p className="text-[#0D1B2A] text-sm font-semibold">We'll keep watch</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock size={13} color="#146C7E" weight="regular" />
                <span className="text-[#0D1B2A]/60 text-xs">Rideshare auto-orders before {leaveBy} if traffic builds</span>
              </div>
              <div className="flex items-center gap-2">
                <Bell size={13} color="#146C7E" weight="regular" />
                <span className="text-[#0D1B2A]/60 text-xs">You'll be nudged the moment any leg shifts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div ref={detailsRef} className="w-full max-w-sm mt-4 flex gap-3">
          <button onClick={savePlan} className="flex-1 glass-card rounded-2xl py-3 flex items-center justify-center gap-2 active:scale-95 transition-transform">
            <Download size={16} color="#146C7E" weight="regular" />
            <span className="text-[#0D1B2A]/70 text-sm font-medium">Save plan</span>
          </button>
          <button onClick={sharePlan} className="flex-1 glass-card rounded-2xl py-3 flex items-center justify-center gap-2 active:scale-95 transition-transform">
            <Share size={16} color="#146C7E" weight="regular" />
            <span className="text-[#0D1B2A]/70 text-sm font-medium">Share</span>
          </button>
        </div>
      </div>

      {/* Done CTA */}
      <div className="fixed bottom-0 inset-x-0 px-5 pb-10 pt-4 z-30" style={{ background: 'rgba(246,243,234,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: '1px solid rgba(13,27,42,0.08)' }}>
        <button
          onClick={onDone}
          className="w-full max-w-sm mx-auto flex items-center justify-center gap-2 rounded-full py-4 font-semibold text-white transition-all duration-300 active:scale-[0.98] hover:brightness-105"
          style={{ background: 'linear-gradient(135deg, #FF7A00, #FFC857)', boxShadow: '0 12px 28px -10px rgba(255,122,0,0.6)' }}
        >
          Back to home
        </button>
      </div>
    </div>
  )
}
