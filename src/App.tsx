import { useState, useEffect } from 'react'
import OnboardingFlow from './components/OnboardingFlow'
import LandingPage from './components/LandingPage'
import SearchResults from './components/SearchResults'
import JourneyTimeline from './components/JourneyTimeline'
import BookingConfirmation from './components/BookingConfirmation'
import TripsScreen from './components/TripsScreen'
import ProfileScreen from './components/ProfileScreen'
import BottomNav from './components/BottomNav'

type Screen = 'onboarding' | 'landing' | 'search' | 'journey' | 'confirmation' | 'trips' | 'profile'

const SHOW_ONBOARDING_KEY = 'wayfar_onboarded'

export default function App() {
  const [screen, setScreen] = useState<Screen>('onboarding')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (sessionStorage.getItem(SHOW_ONBOARDING_KEY)) {
      setScreen('landing')
    }
  }, [])

  const handleOnboardingComplete = () => {
    sessionStorage.setItem(SHOW_ONBOARDING_KEY, '1')
    setScreen('landing')
  }

  const showNav = screen !== 'onboarding' && screen !== 'confirmation'

  // Search & journey are steps inside the booking flow, not top-level destinations,
  // so no bottom-nav tab is highlighted while the user is mid-flow.
  const navScreenId =
    screen === 'landing' || screen === 'trips' || screen === 'profile' ? screen : ''

  return (
    <div className="relative w-full min-h-dvh overflow-hidden" style={{ fontFamily: "'Inter', sans-serif", background: '#071320' }}>
      <div key={screen} className="animate-screen">
      {screen === 'onboarding' && (
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      )}

      {screen === 'landing' && (
        <LandingPage
          onSearch={() => setScreen('search')}
          isMobile={isMobile}
        />
      )}

      {screen === 'search' && (
        <div className="overflow-y-auto h-dvh">
          <SearchResults
            onSelect={() => setScreen('journey')}
            onBack={() => setScreen('landing')}
            isMobile={isMobile}
          />
        </div>
      )}

      {screen === 'journey' && (
        <div className="overflow-y-auto h-dvh">
          <JourneyTimeline
            onBack={() => setScreen('search')}
            onBook={() => setScreen('confirmation')}
            isMobile={isMobile}
          />
        </div>
      )}

      {screen === 'confirmation' && (
        <div className="overflow-y-auto h-dvh">
          <BookingConfirmation onDone={() => setScreen('landing')} />
        </div>
      )}

      {screen === 'trips' && (
        <div className="overflow-y-auto h-dvh">
          <TripsScreen onOpenJourney={() => setScreen('journey')} isMobile={isMobile} />
        </div>
      )}

      {screen === 'profile' && (
        <div className="overflow-y-auto h-dvh">
          <ProfileScreen isMobile={isMobile} />
        </div>
      )}
      </div>

      {showNav && (
        <BottomNav
          screen={navScreenId}
          onNavigate={(id) => {
            if (id === 'landing') setScreen('landing')
            else if (id === 'trips') setScreen('trips')
            else if (id === 'profile') setScreen('profile')
          }}
        />
      )}
    </div>
  )
}
