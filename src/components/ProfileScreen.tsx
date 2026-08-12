import {
  User,
  MapPin,
  Bell,
  CreditCard,
  Shield,
  Clock,
  Gear,
  SignOut,
  CaretRight,
  Star,
} from '@phosphor-icons/react'

const preferences = [
  { icon: MapPin, color: '#FF7A00', label: 'Home address', value: '742 Evergreen Terrace' },
  { icon: Clock, color: '#2FB4B4', label: 'Airport buffer', value: 'TSA PreCheck · 90 min' },
  { icon: Bell, color: '#FFC857', label: 'Departure alerts', value: 'On · Push + SMS' },
]

const account = [
  { icon: CreditCard, color: '#2FB4B4', label: 'Payment methods' },
  { icon: Shield, color: '#2FB4B4', label: 'Travel documents' },
  { icon: Gear, color: 'rgba(255,255,255,0.5)', label: 'Settings' },
]

interface ProfileScreenProps {
  isMobile: boolean
}

export default function ProfileScreen({ isMobile }: ProfileScreenProps) {
  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: 'linear-gradient(180deg, #071320 0%, #0D1B2A 55%, #146C7E 100%)' }}
    >
      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2FB4B4, #1E8A94)' }}
          >
            <User size={30} color="white" weight="light" />
          </div>
          <div>
            <h1 className="font-display text-white" style={{ fontSize: isMobile ? '1.7rem' : '2rem' }}>Alex Rivera</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Star size={13} color="#FFC857" weight="fill" />
              <span className="text-white/50 text-xs">Meguaz Gold · 24 journeys planned</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 pb-32 space-y-8">
        {/* Travel preferences */}
        <div>
          <h2 className="text-white/50 text-xs font-semibold tracking-widest uppercase mb-3">Travel preferences</h2>
          <div className="glass rounded-3xl overflow-hidden">
            {preferences.map(({ icon: Icon, color, label, value }, i) => (
              <button
                key={label}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/5 transition-colors"
                style={i > 0 ? { borderTop: '1px solid rgba(255,255,255,0.07)' } : {}}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}20` }}
                >
                  <Icon size={18} color={color} weight="light" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-sm font-medium">{label}</p>
                  <p className="text-white/40 text-xs">{value}</p>
                </div>
                <CaretRight size={16} color="rgba(255,255,255,0.3)" weight="light" />
              </button>
            ))}
          </div>
        </div>

        {/* Account */}
        <div>
          <h2 className="text-white/50 text-xs font-semibold tracking-widest uppercase mb-3">Account</h2>
          <div className="glass rounded-3xl overflow-hidden">
            {account.map(({ icon: Icon, color, label }, i) => (
              <button
                key={label}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/5 transition-colors"
                style={i > 0 ? { borderTop: '1px solid rgba(255,255,255,0.07)' } : {}}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}20` }}
                >
                  <Icon size={18} color={color} weight="light" />
                </div>
                <p className="flex-1 text-white/80 text-sm font-medium">{label}</p>
                <CaretRight size={16} color="rgba(255,255,255,0.3)" weight="light" />
              </button>
            ))}
          </div>
        </div>

        <button className="w-full flex items-center justify-center gap-2 py-4 rounded-full glass-dark text-white/60 text-sm font-medium hover:text-white/80 transition-colors">
          <SignOut size={16} weight="light" />
          Sign out
        </button>
      </div>
    </div>
  )
}
