import { useEffect, useRef, useState, type CSSProperties } from 'react'
import GlassSelect from './GlassSelect'
import Icon from './Icon'
import Spinner from './Spinner'
import AirportPicker from './AirportPicker'
import { BACKDROPS } from '../data/media'
import { uploadAvatar, type CabinClass, type NearbyAirport, type Preferences, type Profile, type SessionUser } from '../lib/api'

type Props = {
  user: SessionUser | null
  profile: Profile | null
  loading: boolean
  tripCount: number
  airports: NearbyAirport[]
  coords: { lat: number; lng: number } | null
  onSave: (prefs: Preferences) => Promise<void>
  onSignOut: () => Promise<void>
  onAvatarUploaded: () => Promise<void> | void
  goAccount: () => void
  goPhrases: () => void
  goOnboarding: () => void
}

const CARD: CSSProperties = { borderRadius: 22, padding: 18 }

const LABEL: CSSProperties = {
  display: 'block',
  fontSize: 10,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  color: 'var(--color-neutral-600)',
  margin: '0 0 6px',
}

const FIELD: CSSProperties = {
  width: '100%',
  height: 40,
  padding: '0 12px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.75)',
  background: 'rgba(255,255,255,0.62)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
  font: 'inherit',
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--color-text)',
  outline: 'none',
}

const STYLES: { value: 'saver' | 'balanced' | 'comfort'; label: string }[] = [
  { value: 'saver', label: 'Money' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'comfort', label: 'Time' },
]

export default function ProfileScreen(props: Props) {
  const {
    user,
    profile,
    loading,
    tripCount,
    airports,
    coords,
    onSave,
    onSignOut,
    onAvatarUploaded,
    goAccount,
    goPhrases,
    goOnboarding,
  } = props

  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const onAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setAvatarError(null)
    try {
      await uploadAvatar(file)
      await onAvatarUploaded()
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Could not update your photo')
    } finally {
      setUploading(false)
    }
  }

  const [homeAirport, setHomeAirport] = useState<string | null>(null)
  const [style, setStyle] = useState<'saver' | 'balanced' | 'comfort'>('balanced')
  const [cabin, setCabin] = useState<CabinClass>('economy')
  const [language, setLanguage] = useState<string>('English')
  const [budget, setBudget] = useState<number>(900)
  const [buffer, setBuffer] = useState<number>(90)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    setHomeAirport(profile.home_airport)
    if (profile.travel_style) setStyle(profile.travel_style)
    if (profile.preferred_cabin) setCabin(profile.preferred_cabin)
    if (profile.preferred_language) setLanguage(profile.preferred_language)
    if (profile.default_budget_usd != null) setBudget(Number(profile.default_budget_usd))
    if (profile.airport_buffer_min != null) setBuffer(Number(profile.airport_buffer_min))
  }, [profile])

  const save = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await onSave({
        homeAirport,
        travelStyle: style,
        preferredCabin: cabin,
        defaultBudgetUsd: budget,
        airportBufferMin: buffer,
        preferredLanguage: language,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2400)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <div data-screen-label="Profile" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div
          className="glass"
          style={{
            ...CARD,
            padding: 24,
            textAlign: 'center',
            // Generated travel-memories collage, washed for readability.
            background:
              'linear-gradient(rgba(255,253,248,0.84), rgba(255,253,248,0.92)), url(' +
              BACKDROPS.profile +
              ') center/cover',
          }}
        >
          <span
            className="glass-accent"
            style={{
              width: 54,
              height: 54,
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="user" size={22} color="var(--color-accent-800)" />
          </span>
          <h1 style={{ fontSize: 22, margin: '12px 0 6px' }}>Travel your way, remembered</h1>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: 'var(--color-neutral-700)',
              margin: '0 auto 16px',
              maxWidth: '44ch',
            }}
          >
            Sign in and Meguaz remembers your home airport, cabin, budget and how much airport cushion you
            actually want — then fills every future trip in for you.
          </p>
          <button
            className="hv-accent"
            onClick={goAccount}
            style={{
              border: 0,
              borderRadius: 999,
              padding: '12px 22px',
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-heading)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Sign in or create an account
          </button>
        </div>
      </div>
    )
  }

  const name = profile?.display_name || user.displayName || user.email?.split('@')[0] || 'Traveller'
  const initials = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  return (
    <div data-screen-label="Profile">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Change your photo"
          aria-label="Change your photo"
          style={{
            position: 'relative',
            width: 64,
            height: 64,
            padding: 0,
            border: 0,
            borderRadius: 999,
            overflow: 'hidden',
            background: 'var(--color-accent-2-300)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-heading)',
            fontSize: 22,
            color: 'var(--color-accent-2-900)',
            flex: 'none',
            cursor: uploading ? 'progress' : 'pointer',
          }}
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            initials || 'M'
          )}
          <span
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              padding: '2px 0 4px',
              background: 'rgba(46,43,37,0.45)',
              color: '#fff',
              fontSize: 9,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {uploading ? '…' : 'Edit'}
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onAvatarFile}
          style={{ display: 'none' }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 'clamp(24px,3vw,34px)', lineHeight: 1.1, margin: 0 }}>{name}</h1>
          <p style={{ fontSize: 13, color: 'var(--color-neutral-600)', margin: '3px 0 0' }}>{user.email}</p>
          {avatarError && (
            <p style={{ fontSize: 12, color: 'var(--color-accent-800)', margin: '3px 0 0' }}>{avatarError}</p>
          )}
        </div>
        <span className="tag tag-accent">
          {tripCount === 0 ? 'No trips yet' : tripCount === 1 ? '1 trip planned' : tripCount + ' trips planned'}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }}>
        <div className="glass-strong" style={{ ...CARD, flex: '1.4 1 340px' }}>
          <p
            style={{
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-neutral-600)',
              margin: '0 0 4px',
            }}
          >
            What the planner uses
          </p>
          <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--color-neutral-700)', margin: '0 0 16px' }}>
            These pre-fill every new trip. Booking updates them automatically.
          </p>

          {loading && <Spinner size={16} label="Loading your preferences" />}

          {!loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <span style={LABEL}>Home airport</span>
                <AirportPicker
                  nearby={airports}
                  value={homeAirport}
                  onChange={setHomeAirport}
                  coords={coords}
                  locating={false}
                />
              </div>

              <div>
                <span style={LABEL}>Travel priority</span>
                <div className="seg" style={{ display: 'flex', width: '100%', background: 'rgba(255,255,255,0.5)' }}>
                  {STYLES.map((s) => (
                    <label
                      key={s.value}
                      className="seg-opt"
                      style={{ flex: 1, justifyContent: 'center', fontWeight: 600 }}
                    >
                      <input
                        type="radio"
                        name="mg-profile-style"
                        checked={style === s.value}
                        onChange={() => setStyle(s.value)}
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ flex: '1 1 150px' }}>
                  <label style={LABEL} htmlFor="mg-pref-language">
                    Your language
                  </label>
                  <GlassSelect
                    id="mg-pref-language"
                    ariaLabel="Your language"
                    value={language}
                    onChange={setLanguage}
                    options={[
                      'English',
                      'Amharic',
                      'Arabic',
                      'French',
                      'German',
                      'Hindi',
                      'Italian',
                      'Japanese',
                      'Mandarin',
                      'Portuguese',
                      'Spanish',
                      'Swahili',
                    ].map((l) => ({ value: l, label: l }))}
                  />
                </div>
                <div style={{ flex: '1 1 150px' }}>
                  <label style={LABEL} htmlFor="mg-pref-cabin">
                    Preferred cabin
                  </label>
                  <GlassSelect
                    id="mg-pref-cabin"
                    ariaLabel="Preferred cabin"
                    value={cabin}
                    onChange={setCabin}
                    options={[
                      { value: 'economy', label: 'Economy' },
                      { value: 'premium_economy', label: 'Premium economy' },
                      { value: 'business', label: 'Business' },
                      { value: 'first', label: 'First' },
                    ]}
                  />
                </div>
                <div style={{ flex: '1 1 110px' }}>
                  <label style={LABEL} htmlFor="mg-pref-budget">
                    Usual budget
                  </label>
                  <input
                    id="mg-pref-budget"
                    type="number"
                    min={50}
                    step={50}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    style={FIELD}
                  />
                </div>
                <div style={{ flex: '1 1 110px' }}>
                  <label style={LABEL} htmlFor="mg-pref-buffer">
                    Airport buffer
                  </label>
                  <input
                    id="mg-pref-buffer"
                    type="number"
                    min={0}
                    max={600}
                    step={15}
                    value={buffer}
                    onChange={(e) => setBuffer(Number(e.target.value))}
                    style={FIELD}
                  />
                </div>
              </div>

              {error && (
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--color-accent-800)',
                    background: 'var(--color-accent-100)',
                    borderRadius: 12,
                    padding: '10px 12px',
                    margin: 0,
                  }}
                >
                  {error}
                </p>
              )}

              <button
                className="hv-accent"
                onClick={save}
                disabled={saving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: 13,
                  border: 0,
                  borderRadius: 999,
                  background: saved ? 'var(--color-accent-2-600)' : 'var(--color-accent)',
                  color: 'var(--color-bg)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: 14,
                  cursor: saving ? 'progress' : 'pointer',
                }}
              >
                {saving && <Spinner size={13} color="var(--color-bg)" />}
                {saved && <Icon name="check" size={14} />}
                {saving ? 'Saving…' : saved ? 'Saved' : 'Save preferences'}
              </button>
            </div>
          )}
        </div>

        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="glass" style={CARD}>
            <p
              style={{
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--color-neutral-600)',
                margin: '0 0 10px',
              }}
            >
              Language
            </p>
            <button
              onClick={goPhrases}
              style={{
                width: '100%',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 0',
                border: 0,
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              <Icon name="bookOpen" size={18} color="var(--color-accent-2-700)" style={{ flex: 'none' }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>Destination phrases</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-600)' }}>
                  Six phrases before each trip
                </span>
              </span>
              <Icon name="chevronRight" size={16} color="var(--color-neutral-500)" />
            </button>
          </div>

          <button
            className="glass hv-white"
            onClick={goOnboarding}
            style={{
              padding: 13,
              borderRadius: 999,
              fontFamily: 'var(--font-heading)',
              fontSize: 14,
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            Replay onboarding
          </button>

          <button
            className="hv-soft"
            onClick={onSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 13,
              borderRadius: 999,
              border: '1px solid var(--color-divider)',
              background: 'transparent',
              fontFamily: 'var(--font-heading)',
              fontSize: 14,
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            <Icon name="logOut" size={15} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
