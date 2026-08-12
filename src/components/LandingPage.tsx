import { useEffect, useRef } from 'react'
import {
  MagnifyingGlass,
  CornersOut,
  AirplaneTilt,
  House,
  Bus,
  CalendarBlank,
  Compass,
  Heart,
  ArrowRight,
  Sparkle,
  MapTrifold,
  Storefront,
} from '@phosphor-icons/react'

const HERO_IMG =
  'https://images.unsplash.com/photo-1783397866869-ac2d75de5eb2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600'

const plans = [
  {
    title: '10-Day Adventure in Japan',
    stops: 'Tokyo · Kyoto · Osaka · Nara',
    dates: 'May 12 – May 22',
    cost: '$2,145',
    img: 'https://images.unsplash.com/photo-1665706896821-319040b81753?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    alt: 'Pagoda framed by cherry blossom in Kyoto',
  },
  {
    title: '7-Day Aegean Escape',
    stops: 'Athens · Santorini · Naxos',
    dates: 'Jun 3 – Jun 10',
    cost: '$1,780',
    img: 'https://images.unsplash.com/photo-1571765389054-221ebc7cd3cb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    alt: 'White buildings overlooking the blue Aegean sea in Santorini',
  },
  {
    title: '6-Day Fjords & Lights',
    stops: 'Bergen · Flåm · Tromsø',
    dates: 'Sep 14 – Sep 20',
    cost: '$2,460',
    img: 'https://images.unsplash.com/photo-1518124880777-cf8c82231ffb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    alt: 'Dramatic mountains rising over a Norwegian fjord',
  },
]

const categories = [
  { icon: AirplaneTilt, label: 'Flights' },
  { icon: House, label: 'Stays' },
  { icon: Bus, label: 'Transport' },
  { icon: CalendarBlank, label: 'Itinerary' },
  { icon: Compass, label: 'Explore' },
  { icon: Heart, label: 'Saved' },
]

const features = [
  {
    icon: Sparkle,
    title: 'Personalized',
    body: 'Every itinerary is shaped around exactly how you like to travel.',
  },
  {
    icon: MapTrifold,
    title: 'Local-to-local',
    body: 'Buses, trains, and local routes — not just flights and highways.',
  },
  {
    icon: Storefront,
    title: 'Shop & prepare',
    body: 'Order travel gear and essentials, delivered wherever you go.',
  },
]

interface LandingPageProps {
  onSearch: () => void
  isMobile: boolean
}

export default function LandingPage({ onSearch, isMobile }: LandingPageProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const heroImgRef = useRef<HTMLDivElement>(null)

  // Subtle cinematic parallax — the hero photo drifts slower than the page scroll.
  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    let raf = 0
    const factor = isMobile ? 0.18 : 0.28
    const update = () => {
      if (heroImgRef.current) {
        heroImgRef.current.style.transform = `translate3d(0, ${scroller.scrollTop * factor}px, 0) scale(1.08)`
      }
      raf = 0
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [isMobile])

  // Staggered scroll-reveal for every marked block.
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    const targets = root.querySelectorAll<HTMLElement>('.io-reveal')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            el.style.transitionDelay = `${el.dataset.delay ?? '0'}ms`
            el.classList.add('io-revealed')
            observer.unobserve(el)
          }
        })
      },
      { root, threshold: 0.15 }
    )
    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={scrollRef}
      className="overflow-y-auto h-dvh"
      style={{ background: '#F6F3EA', scrollBehavior: 'smooth' }}
    >
      {/* ── HERO (full-bleed, responsive height) ────────────── */}
      <section className="relative overflow-hidden rounded-b-[2.5rem] md:rounded-b-[3rem] h-[56vh] min-h-[430px] md:h-[72vh] md:max-h-[760px]">
        <div ref={heroImgRef} className="absolute inset-0 will-change-transform" style={{ transform: 'scale(1.08)' }}>
          <img src={HERO_IMG} alt="Traveler watching the sunset from a mountain summit" className="w-full h-full object-cover" />
        </div>
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(13,27,42,0.35) 0%, rgba(13,27,42,0.05) 38%, rgba(13,27,42,0.75) 100%)' }}
        />

        {/* Top bar — wordmark only (no search button here) */}
        <div className="absolute top-0 inset-x-0 z-10 mx-auto w-full max-w-6xl px-6 md:px-10 pt-12 md:pt-10 flex items-center justify-between">
          <span className="font-display text-white text-3xl md:text-4xl leading-none tracking-tight animate-rise">Meguaz</span>
          <span className="hidden md:inline text-white/70 text-sm font-medium animate-rise" style={{ animationDelay: '0.15s' }}>Travel. Personalized. Unforgettable.</span>
        </div>

        {/* Headline */}
        <div className="absolute bottom-0 inset-x-0 z-10 mx-auto w-full max-w-6xl px-6 md:px-10 pb-10 md:pb-16">
          <h1 className="font-display text-white leading-[1.03] text-[2.6rem] md:text-7xl animate-rise" style={{ animationDelay: '0.1s' }}>
            Your journey,<br />perfected.
          </h1>
          <p className="text-white/85 text-sm md:text-lg mt-3 max-w-[16rem] md:max-w-md animate-rise" style={{ animationDelay: '0.25s' }}>
            Personalized travel plans, crafted just for you.
          </p>
        </div>
      </section>

      {/* ── SEARCH + CATEGORIES ────────────────────── */}
      <div className="mx-auto w-full max-w-2xl px-5 md:px-8 relative z-20">
        <button
          onClick={onSearch}
          className="io-reveal glass-card w-full rounded-full pl-5 pr-2 py-2 md:py-2.5 flex items-center gap-3 text-left -mt-7 md:-mt-9 active:scale-[0.99] hover:shadow-lg transition-all"
        >
          <MagnifyingGlass size={20} color="#146C7E" weight="regular" />
          <span className="flex-1 text-[#0D1B2A]/50 text-sm md:text-base font-medium">Where are you going?</span>
          <span className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center" style={{ background: '#0D1B2A' }}>
            <CornersOut size={16} color="white" weight="regular" />
          </span>
        </button>

        <div className="grid grid-cols-6 gap-2 md:gap-3 mt-5">
          {categories.map(({ icon: Icon, label }, i) => (
            <button key={label} onClick={onSearch} className="io-reveal flex flex-col items-center gap-1.5 group" data-delay={i * 55} aria-label={label}>
              <span className="glass-card w-full aspect-square rounded-2xl flex items-center justify-center group-hover:-translate-y-0.5 group-active:scale-95 transition-transform">
                <Icon size={isMobile ? 22 : 26} color="#146C7E" weight="regular" />
              </span>
              <span className="text-[#0D1B2A]/55 text-[10px] md:text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────── */}
      <div className="mx-auto w-full max-w-6xl px-5 md:px-10">
        {/* Personalized plans */}
        <div className="mt-9 md:mt-14">
          <div className="io-reveal flex items-end justify-between mb-4">
            <h2 className="text-[#0D1B2A] font-semibold text-lg md:text-2xl">Your Personalized Plans</h2>
            <button onClick={onSearch} className="text-[#146C7E] text-sm font-semibold hover:text-[#0D1B2A] transition-colors">View all</button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((p, i) => (
              <button
                key={p.title}
                onClick={onSearch}
                data-delay={i * 110}
                className="io-reveal group glass-card rounded-3xl p-3 flex flex-row md:flex-col items-stretch gap-4 md:gap-0 text-left active:scale-[0.99] hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
              >
                {/* Text */}
                <div className="flex-1 min-w-0 order-1 md:order-2 py-2 md:pt-4 pl-2 md:pl-1">
                  <h3 className="font-display text-[#0D1B2A] text-xl leading-tight mb-1">{p.title}</h3>
                  <p className="text-[#0D1B2A]/55 text-xs">{p.stops}</p>
                  <p className="text-[#0D1B2A]/40 text-xs mt-0.5">{p.dates}</p>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-[#0D1B2A]/45 text-[11px] uppercase tracking-wide">Estimated cost</p>
                      <p className="font-display text-[#FF7A00] text-2xl leading-none mt-0.5">{p.cost}</p>
                    </div>
                    <ArrowRight size={18} weight="bold" className="text-[#146C7E] mb-1" />
                  </div>
                </div>
                {/* Image */}
                <div className="w-28 md:w-full flex-shrink-0 rounded-2xl overflow-hidden order-2 md:order-1 md:h-44">
                  <img src={p.img} alt={p.alt} className="w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Built for you */}
        <div className="mt-10 md:mt-16">
          <h2 className="io-reveal text-[#0D1B2A] font-semibold text-lg md:text-2xl mb-4">Built for you</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {features.map(({ icon: Icon, title, body }, i) => (
              <div key={title} data-delay={i * 100} className="io-reveal glass-card rounded-2xl p-5 flex items-start gap-4 md:flex-col md:gap-3 hover:-translate-y-1 transition-transform duration-300">
                <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(20,108,126,0.12)' }}>
                  <Icon size={22} color="#146C7E" weight="regular" />
                </span>
                <div className="flex-1">
                  <h3 className="text-[#0D1B2A] font-semibold text-sm md:text-base">{title}</h3>
                  <p className="text-[#0D1B2A]/55 text-xs md:text-sm leading-relaxed mt-0.5">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="io-reveal mt-12 mb-40 flex flex-col items-center">
          <button
            onClick={onSearch}
            className="w-full max-w-md flex items-center justify-center gap-2 rounded-full py-4 font-semibold text-white active:scale-[0.98] hover:brightness-105 transition-all"
            style={{ background: 'linear-gradient(135deg, #FF7A00, #FFC857)', boxShadow: '0 12px 28px -10px rgba(255,122,0,0.6)' }}
          >
            Plan my journey
            <ArrowRight size={18} weight="bold" />
          </button>
          <p className="text-[#0D1B2A]/40 text-xs mt-3">Travel. Personalized. Unforgettable.</p>
        </div>
      </div>
    </div>
  )
}
