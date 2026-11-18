import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { isFirebaseConfigured } from '@/data/config'
import { describeAuthError } from '@/data/authErrors'
import { getLanguage } from '@/i18n/language'
import { translate } from '@/i18n/translate'

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out' | 'unconfigured'

type AuthModule = typeof import('@/data/auth')

interface AuthContextValue {
  status: AuthStatus
  user: User | null
  error: string | null
  slowLoading: boolean
  signIn: () => Promise<boolean>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<'updated' | 'unchanged' | 'missing' | 'failed'>
  clearError: () => void
  profileVersion: number
}

const AuthContext = createContext<AuthContextValue | null>(null)

const loadAuth = (): Promise<AuthModule> => import('@/data/auth')

// Firebase Auth can take tens of seconds to deliver the first auth event on a
// cold iOS PWA start (persisted session refresh). Surface that state so the UI
// can offer a manual reload instead of an unexplained endless spinner.
const SLOW_LOADING_MS = 8000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>(isFirebaseConfigured ? 'loading' : 'unconfigured')
  const [error, setError] = useState<string | null>(null)
  const moduleRef = useRef<AuthModule | null>(null)
  const [profileVersion, setProfileVersion] = useState(0)
  const [slowLoading, setSlowLoading] = useState(false)

  useEffect(() => {
    if (status !== 'loading') {
      setSlowLoading(false)
      return
    }
    const timer = window.setTimeout(() => setSlowLoading(true), SLOW_LOADING_MS)
    return () => window.clearTimeout(timer)
  }, [status])

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return
    }
    let cancelled = false
    let unsubscribe = () => {}
    loadAuth()
      .then((auth) => {
        if (cancelled) {
          return
        }
        moduleRef.current = auth
        auth
          .completeRedirectSignIn()
          .then(() => setProfileVersion((version) => version + 1))
          .catch((cause: unknown) => setError(describeAuthError(cause)))
        unsubscribe = auth.subscribeToAuth(
          (nextUser) => {
            setUser(nextUser)
            setStatus(nextUser ? 'signed-in' : 'signed-out')
          },
          () => {
            setStatus('signed-out')
            setError(translate(getLanguage(), 'shell.auth.sessionFailed'))
          },
        )
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('signed-out')
          setError(translate(getLanguage(), 'shell.auth.loadFailed'))
        }
      })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const signIn = useCallback(async () => {
    setError(null)
    try {
      const auth = moduleRef.current ?? (await loadAuth())
      await auth.signInWithGoogle()
      setProfileVersion((version) => version + 1)
      return true
    } catch (cause) {
      setError(describeAuthError(cause))
      return false
    }
  }, [])

  const signOut = useCallback(async () => {
    setError(null)
    try {
      const auth = moduleRef.current ?? (await loadAuth())
      await auth.signOutCurrentUser()
    } catch (cause) {
      setError(describeAuthError(cause))
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    setError(null)
    try {
      const auth = moduleRef.current ?? (await loadAuth())
      const result = await auth.refreshGoogleProfile()
      setProfileVersion((version) => version + 1)
      return result
    } catch (cause) {
      setError(describeAuthError(cause))
      return 'failed' as const
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, error, slowLoading, signIn, signOut, refreshProfile, clearError, profileVersion }),
    [status, user, error, slowLoading, signIn, signOut, refreshProfile, clearError, profileVersion],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider.')
  }
  return context
}
