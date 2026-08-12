import {
  AirplaneTakeoff,
  AirplaneInFlight,
  Clock,
  MapPin,
  CaretRight,
  Suitcase,
} from '@phosphor-icons/react'

const upcoming = [
  {
    id: 'UA892',
    route: 'San Francisco → London',
    from: 'SFO',
    to: 'LHR',
    date: 'Mon, Aug 24',
    depart: '10:45',
    leaveHome: '08:15',
    status: 'Confirmed',
  },
]

const past = [
  {
    id: 'DL118',
    route: 'New York → Amsterdam',
    from: 'JFK',
    to: 'AMS',
    date: 'Jun 12',
    depart: '18:20',
  },
  {
    id: 'AS334',
    route: 'Seattle → San Francisco',
    from: 'SEA',
    to: 'SFO',
    date: 'May 03',
    depart: '07:05',
  },
]

interface TripsScreenProps {
  onOpenJourney: () => void
  isMobile: boolean
}

export default function TripsScreen({ onOpenJourney, isMobile }: TripsScreenProps) {
  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: 'linear-gradient(180deg, #071320 0%, #0D1B2A 55%, #146C7E 100%)' }}
    >
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <p className="text-[#2FB4B4] text-xs font-medium tracking-widest uppercase mb-2">Your travel</p>
        <h1 className="font-display text-white" style={{ fontSize: isMobile ? '2rem' : '2.6rem' }}>My Trips</h1>
      </div>

      <div className="flex-1 px-5 pb-32 space-y-8">
        {/* Upcoming */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AirplaneInFlight size={16} color="#FF7A00" weight="light" />
            <h2 className="text-white/80 text-sm font-semibold tracking-wide">Upcoming</h2>
          </div>

          {upcoming.map((t) => (
            <button
              key={t.id}
              onClick={onOpenJourney}
              className="w-full text-left glass rounded-3xl p-5 mb-3 hover:scale-[1.01] active:scale-[0.99] transition-transform duration-300"
              style={{ border: '1px solid rgba(47,180,180,0.35)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ background: 'rgba(47,180,180,0.18)', color: '#2FB4B4' }}
                >
                  {t.status}
                </span>
                <span className="text-white/40 text-xs">{t.date}</span>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="text-center">
                  <div className="text-white font-bold text-xl">{t.from}</div>
                </div>
                <div className="flex-1 flex items-center">
                  <div className="flex-1 h-px bg-white/20" />
                  <AirplaneTakeoff size={16} color="rgba(255,255,255,0.5)" weight="light" className="mx-1" />
                  <div className="flex-1 h-px bg-white/20" />
                </div>
                <div className="text-center">
                  <div className="text-white font-bold text-xl">{t.to}</div>
                </div>
              </div>

              <div
                className="rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ background: 'rgba(255,122,0,0.12)', border: '1px solid rgba(255,122,0,0.2)' }}
              >
                <Clock size={16} color="#FF7A00" weight="light" />
                <div className="flex-1">
                  <p className="text-white/80 text-xs font-medium">Leave home by {t.leaveHome}</p>
                  <p className="text-white/45 text-xs">{t.id} departs {t.depart} · {t.route}</p>
                </div>
                <CaretRight size={16} color="rgba(255,255,255,0.4)" weight="light" />
              </div>
            </button>
          ))}
        </div>

        {/* Past */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Suitcase size={16} color="rgba(255,255,255,0.5)" weight="light" />
            <h2 className="text-white/80 text-sm font-semibold tracking-wide">Past</h2>
          </div>

          {past.map((t) => (
            <div key={t.id} className="glass-dark rounded-2xl px-5 py-4 mb-3 flex items-center gap-4 opacity-80">
              <MapPin size={18} color="rgba(255,255,255,0.35)" weight="light" />
              <div className="flex-1 min-w-0">
                <p className="text-white/70 text-sm font-medium">{t.route}</p>
                <p className="text-white/35 text-xs">{t.id} · {t.date} · Departed {t.depart}</p>
              </div>
              <span className="text-white/30 text-xs">{t.from}→{t.to}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
