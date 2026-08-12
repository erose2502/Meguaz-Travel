import { useState } from 'react'
import { ArrowRight, Bell, House, X } from '@phosphor-icons/react'

interface OnboardingFlowProps {
  onComplete: () => void
}

const steps = [
  {
    wordmark: true,
    label: 'Welcome',
    heading: 'Travel, minus the stress.',
    body: 'Meguaz plans your whole trip around your budget and your time — so you spend less, leave on time, and never sweat the bottlenecks.',
    cta: 'Get started',
    img: 'https://images.unsplash.com/photo-1518965883985-f0054cf02694?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600',
    alt: 'Travelers silhouetted in an airport terminal at golden hour',
  },
  {
    icon: House,
    label: 'Home base',
    heading: 'Where do you usually travel from?',
    body: 'We\'ll use your home address to calculate realistic departure times, accounting for traffic and transit options near you.',
    cta: 'Save home base',
    img: 'https://images.unsplash.com/photo-1758743527681-009c368434f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600',
    alt: 'Golden sunrise over a coastal city',
    isAddress: true,
  },
  {
    icon: Bell,
    label: 'Stay in the loop',
    heading: 'Never miss your window to leave.',
    body: 'Enable notifications and Meguaz will alert you when it\'s time to head out — updated in real-time with traffic and delays.',
    cta: 'Enable notifications',
    img: 'https://images.unsplash.com/photo-1529947327457-8f5cb53bc1b6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600',
    alt: 'Airplane wing above the clouds at sunset',
    isNotifications: true,
  },
]

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0)
  const [address, setAddress] = useState('')
  const current = steps[step]

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1)
    else onComplete()
  }

  return (
    <div className="relative min-h-dvh overflow-hidden flex flex-col" style={{ background: '#071320' }}>
      {/* Crossfading background photos */}
      {steps.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-[900ms] ease-out will-change-[opacity]"
          style={{ opacity: i === step ? 1 : 0 }}
          aria-hidden={i !== step}
        >
          <img
            src={s.img}
            alt={i === step ? s.alt : ''}
            className="w-full h-full object-cover"
            style={{ transform: 'scale(1.06)' }}
          />
        </div>
      ))}
      {/* Legibility gradient */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(7,19,32,0.55) 0%, rgba(7,19,32,0.35) 30%, rgba(7,19,32,0.82) 78%, rgba(7,19,32,0.95) 100%)' }}
      />
      {/* Ambient orbs */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[#2FB4B4]/10 blur-3xl animate-drift" />
      <div className="absolute bottom-20 left-0 w-96 h-96 rounded-full bg-[#FF7A00]/8 blur-3xl" style={{ animationDelay: '3s' }} />

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4 z-10">
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-500"
              style={{
                width: i === step ? 28 : 8,
                background: i <= step ? '#2FB4B4' : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>
        {step < steps.length - 1 && (
          <button
            onClick={onComplete}
            className="text-white/40 text-sm font-medium hover:text-white/60 transition-colors"
          >
            Skip
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 z-10">
        {/* Brand mark / step icon */}
        <div key={`mark-${step}`} className="mb-10 animate-rise flex items-center justify-center">
          {current.wordmark ? (
            <div className="flex flex-col items-center">
              <span className="font-display text-white text-6xl leading-none tracking-tight">Meguaz</span>
              <span className="mt-3 h-1 w-16 rounded-full" style={{ background: 'linear-gradient(90deg, #FF7A00, #FFC857)' }} />
            </div>
          ) : (
            current.icon && (
              <div
                className="rounded-full flex items-center justify-center"
                style={{ width: 120, height: 120, background: 'rgba(20,108,126,0.28)', border: '1px solid rgba(111,208,208,0.4)' }}
              >
                <current.icon size={52} color="#6FD0D0" weight="light" />
              </div>
            )
          )}
        </div>

        {/* Text */}
        <div key={step} className="text-center max-w-xs animate-rise">
          <p className="text-[#6FD0D0] text-xs font-semibold tracking-widest uppercase mb-3">{current.label}</p>
          <h1 className="font-display text-3xl text-white leading-tight mb-4">{current.heading}</h1>
          <p className="text-white/60 text-base leading-relaxed">{current.body}</p>
        </div>

        {/* Address input */}
        {current.isAddress && (
          <div className="mt-8 w-full max-w-xs">
            <div className="glass rounded-2xl flex items-center gap-3 px-4 py-3 border border-white/20">
              <House size={18} color="#2FB4B4" weight="light" />
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="123 Main St, San Francisco, CA"
                className="flex-1 bg-transparent text-white placeholder-white/30 text-sm outline-none"
              />
              {address && (
                <button onClick={() => setAddress('')}>
                  <X size={14} color="rgba(255,255,255,0.4)" weight="light" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Notification options */}
        {current.isNotifications && (
          <div className="mt-8 w-full max-w-xs space-y-3">
            {['Departure alerts', 'Price drops', 'Journey status updates'].map((opt) => (
              <div key={opt} className="glass rounded-xl flex items-center gap-3 px-4 py-3">
                <Bell size={16} color="#2FB4B4" weight="light" />
                <span className="text-white/80 text-sm">{opt}</span>
                <div className="ml-auto w-10 h-5 rounded-full bg-[#2FB4B4] flex items-center justify-end pr-0.5">
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-8 pb-12 z-10">
        <button
          onClick={next}
          className="w-full flex items-center justify-center gap-2 rounded-full py-4 font-semibold text-white transition-all duration-300 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #FF7A00, #FFC857)' }}
        >
          {current.cta}
          <ArrowRight size={18} weight="regular" />
        </button>
        {step === steps.length - 1 && (
          <button
            onClick={onComplete}
            className="w-full text-center text-white/40 text-sm mt-4"
          >
            Maybe later
          </button>
        )}
      </div>
    </div>
  )
}
