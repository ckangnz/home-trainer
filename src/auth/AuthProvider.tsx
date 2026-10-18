import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { isFirebaseConfigured } from '@/data/config'
import { describeAuthError } from '@/data/authErrors'

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out' | 'unconfigured'

type AuthModule = typeof import('@/data/auth')

interface AuthContextValue {
  status: AuthStatus
  user: User | null
  error: string | null
  signIn: () => Promise<boolean>
  signOut: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const loadAuth = (): Promise<AuthModule> => import('@/data/auth')

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>(isFirebaseConfigured ? 'loading' : 'unconfigured')
  const [error, setError] = useState<string | null>(null)
  const moduleRef = useRef<AuthModule | null>(null)

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
        auth.completeRedirectSignIn().catch((cause: unknown) => setError(describeAuthError(cause)))
        unsubscribe = auth.subscribeToAuth(
          (nextUser) => {
            setUser(nextUser)
            setStatus(nextUser ? 'signed-in' : 'signed-out')
          },
          () => {
            setStatus('signed-out')
            setError('Could not verify your session. Please sign in again.')
          },
        )
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('signed-out')
          setError('Could not load sign-in. Check your connection and reload.')
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

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, error, signIn, signOut, clearError }),
    [status, user, error, signIn, signOut, clearError],
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
