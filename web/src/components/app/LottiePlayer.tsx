import { AirplaneTakeoff, Car, Train, Bus, CheckCircle, MapPin, Clock, Spinner } from '@phosphor-icons/react'

interface LottiePlayerProps {
  type: 'flight' | 'walking' | 'driving' | 'boarding' | 'success' | 'loading' | 'train' | 'bus'
  size?: number
  className?: string
}

export default function LottiePlayer({ type, size = 80, className = '' }: LottiePlayerProps) {
  const configs = {
    flight: {
      icon: AirplaneTakeoff,
      bg: 'from-sky-400/20 to-blue-600/20',
      color: '#6FD0D0',
      label: 'Flight animation',
    },
    walking: {
      icon: MapPin,
      bg: 'from-sage/20 to-green-400/20',
      color: '#2FB4B4',
      label: 'Walking animation',
    },
    driving: {
      icon: Car,
      bg: 'from-amber-400/20 to-orange-400/20',
      color: '#FFC857',
      label: 'Driving animation',
    },
    boarding: {
      icon: AirplaneTakeoff,
      bg: 'from-blue-400/20 to-indigo-500/20',
      color: '#2FB4B4',
      label: 'Boarding animation',
    },
    success: {
      icon: CheckCircle,
      bg: 'from-green-400/20 to-emerald-500/20',
      color: '#2FB4B4',
      label: 'Success animation',
    },
    loading: {
      icon: Spinner,
      bg: 'from-sky-400/10 to-blue-400/10',
      color: '#2FB4B4',
      label: 'Loading animation',
    },
    train: {
      icon: Train,
      bg: 'from-purple-400/20 to-indigo-400/20',
      color: '#146C7E',
      label: 'Train animation',
    },
    bus: {
      icon: Bus,
      bg: 'from-teal-400/20 to-cyan-400/20',
      color: '#2FB4B4',
      label: 'Bus animation',
    },
  }

  const config = configs[type]
  const Icon = config.icon
  const isLoading = type === 'loading'

  return (
    <div
      className={`lottie-placeholder rounded-2xl bg-gradient-to-br ${config.bg} ${className}`}
      style={{ width: size, height: size }}
      aria-label={config.label}
      role="img"
    >
      <Icon
        size={size * 0.45}
        color={config.color}
        weight="light"
        className={isLoading ? 'animate-spin' : ''}
      />
    </div>
  )
}
