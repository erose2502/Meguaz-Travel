import { House, Ticket, User } from '@phosphor-icons/react'

interface BottomNavProps {
  screen: string
  onNavigate: (screen: string) => void
}

const tabs = [
  { id: 'landing', icon: House, label: 'Home' },
  { id: 'trips', icon: Ticket, label: 'Trips' },
  { id: 'profile', icon: User, label: 'Profile' },
]

export default function BottomNav({ screen, onNavigate }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 flex justify-center md:hidden" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
      <div
        className="glass-card flex items-center gap-1.5 px-2.5 py-2"
        style={{ borderRadius: 9999, boxShadow: '0 14px 40px -12px rgba(13,27,42,0.35)' }}
      >
        {tabs.map(({ id, icon: Icon, label }) => {
          const active = screen === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="flex items-center gap-2 rounded-full transition-all duration-300"
              style={{
                background: active ? 'linear-gradient(135deg, #FF7A00, #FFC857)' : 'transparent',
                padding: active ? '0.6rem 1.1rem' : '0.6rem 0.85rem',
                boxShadow: active ? '0 8px 20px -8px rgba(255,122,0,0.7)' : 'none',
              }}
            >
              <Icon
                size={22}
                weight={active ? 'fill' : 'regular'}
                color={active ? '#FFFFFF' : '#146C7E'}
              />
              {active && <span className="text-white text-sm font-semibold">{label}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
