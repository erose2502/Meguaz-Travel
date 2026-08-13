import { useCallback, useEffect, useState } from 'react'
import {
  getProfile,
  getSession,
  saveProfile,
  signIn as apiSignIn,
  signOut as apiSignOut,
  signUp as apiSignUp,
  type Preferences,
  type Profile,
  type SessionUser,
} from './api'

export type Account = {
  user: SessionUser | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName?: string) => Promise<{ confirmationRequired: boolean }>
  signOut: () => Promise<void>
  savePreferences: (prefs: Preferences) => Promise<void>
  /** Re-reads the profile row (e.g. after an avatar upload). */
  refreshProfile: () => Promise<void>
}

/**
 * The signed-in traveller and the preferences the planner personalizes from.
 * The session itself lives in an httpOnly cookie set by the backend — nothing
 * here reads or writes a token.
 */
export function useAccount(): Account {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    const { profile: next } = await getProfile().catch(() => ({ profile: null }))
    setProfile(next)
  }, [])

  useEffect(() => {
    let live = true
    const controller = new AbortController()
    getSession(controller.signal)
      .then(async ({ user: next }) => {
        if (!live) return
        setUser(next)
        if (next) await loadProfile()
      })
      .catch(() => {
        /* backend down — the app stays usable, just not personalized */
      })
      .finally(() => {
        if (live) setLoading(false)
      })
    return () => {
      live = false
      controller.abort()
    }
  }, [loadProfile])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { user: next } = await apiSignIn(email, password)
      setUser(next)
      if (next) await loadProfile()
    },
    [loadProfile],
  )

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const res = await apiSignUp(email, password, displayName)
      setUser(res.user)
      if (res.user) await loadProfile()
      return { confirmationRequired: !!res.confirmationRequired }
    },
    [loadProfile],
  )

  const signOut = useCallback(async () => {
    await apiSignOut()
    setUser(null)
    setProfile(null)
  }, [])

  const savePreferences = useCallback(async (prefs: Preferences) => {
    const { profile: next } = await saveProfile(prefs)
    if (next) setProfile(next)
  }, [])

  return { user, profile, loading, signIn, signUp, signOut, savePreferences, refreshProfile: loadProfile }
}
