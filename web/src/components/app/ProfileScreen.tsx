import { useEffect, useState } from 'react'
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
  Check,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

const account = [
  { icon: CreditCard, color: '#2FB4B4', label: 'Payment methods' },
  { icon: Shield, color: '#2FB4B4', label: 'Travel documents' },
  { icon: Gear, color: 'rgba(255,255,255,0.5)', label: 'Settings' },
]

interface ProfileScreenProps {
  isMobile: boolean
}

export default function ProfileScreen({ isMobile }: ProfileScreenProps) {
  const [email, setEmail] = useState<string | null>(null)
  const [homeBase, setHomeBase] = useState('Not set')
  const [editingHome, setEditingHome] = useState(false)
  const [homeDraft, setHomeDraft] = useState('')

  useEffect(() => {
    setHomeBase(localStorage.getItem('meguaz_home_base') ?? 'Not set')
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email)
    })
  }, [])

  function saveHomeBase() {
    const v = homeDraft.trim()
    if (v) {
      localStorage.setItem('meguaz_home_base', v)
      setHomeBase(v)
    }
    setEditingHome(false)
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const preferences = [
    {
      icon: MapPin,
      color: '#FF7A00',
      label: 'Home address',
      value: homeBase,
      onClick: () => {
        setHomeDraft(homeBase === 'Not set' ? '' : homeBase)
        setEditingHome(true)
      },
    },
    { icon: Clock, color: '#2FB4B4', label: 'Airport buffer', value: 'Balanced · 70 min', onClick: undefined },
    { icon: Bell, color: '#FFC857', label: 'Departure alerts', value: 'On · Push', onClick: undefined },
  ]

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
            <h1 className="font-display text-white" style={{ fontSize: isMobile ? '1.7rem' : '2rem' }}>
              {email ? email.split('@')[0] : 'Traveler'}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Star size={13} color="#FFC857" weight="fill" />
              <span className="text-white/50 text-xs">
                {email ?? 'Sign in to sync your trips'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 pb-32 space-y-8">
        {/* Travel preferences */}
        <div>
          <h2 className="text-white/50 text-xs font-semibold tracking-widest uppercase mb-3">Travel preferences</h2>
          <div className="glass rounded-3xl overflow-hidden">
            {preferences.map(({ icon: Icon, color, label, value, onClick }, i) => (
              <button
                key={label}
                onClick={onClick}
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
                  {label === 'Home address' && editingHome ? (
                    <input
                      autoFocus
                      value={homeDraft}
                      onChange={(e) => setHomeDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveHomeBase()}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="123 Main St, San Francisco"
                      className="w-full bg-transparent text-white text-xs outline-none border-b border-white/20 pb-0.5 mt-0.5"
                    />
                  ) : (
                    <p className="text-white/40 text-xs truncate">{value}</p>
                  )}
                </div>
                {label === 'Home address' && editingHome ? (
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      saveHomeBase()
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(47,180,180,0.25)' }}
                  >
                    <Check size={14} color="#2FB4B4" weight="bold" />
                  </span>
                ) : (
                  <CaretRight size={16} color="rgba(255,255,255,0.3)" weight="light" />
                )}
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

        <button
          onClick={email ? signOut : () => (window.location.href = '/login')}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-full glass-dark text-white/60 text-sm font-medium hover:text-white/80 transition-colors"
        >
          <SignOut size={16} weight="light" />
          {email ? 'Sign out' : 'Sign in'}
        </button>
      </div>
    </div>
  )
}
