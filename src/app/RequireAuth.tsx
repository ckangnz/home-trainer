import type { ReactNode } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { GoogleMark } from './Icons'

export function SignInPanel({ title = 'Sign in to keep going', compact = false }: { title?: string; compact?: boolean }) {
  const { signIn, error } = useAuth()
  return (
    <section className={compact ? 'card sign-in sign-in--compact' : 'page page--narrow'}>
      <div className={compact ? 'stack' : 'card sign-in stack'}>
        <h1 className={compact ? 'section__title' : 'page__title'}>{title}</h1>
        <p className="muted">
          HomeTrainer is free. Sign in with Google to play workouts, save your own routines, import routines friends share
          with you, and keep your streak.
        </p>
        <button
          type="button"
          className="btn btn--lg btn--outline"
          onClick={() => {
            void signIn()
          }}
        >
          <GoogleMark />
          Continue with Google
        </button>
        {error ? (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="faint">
          We only store your routines and workout history. See our <Link to="/privacy">privacy policy</Link>.
        </p>
      </div>
    </section>
  )
}

function SetupNotice() {
  return (
    <section className="page page--narrow">
      <div className="card stack">
        <h1 className="page__title">Firebase is not configured</h1>
        <p className="muted">
          Copy <code>.env.example</code> to <code>.env.local</code>, add your Firebase web configuration, and restart the
          dev server. The public exercise library and workouts work without it.
        </p>
      </div>
    </section>
  )
}

export function RequireAuth({ children }: { children?: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') {
    return (
      <div className="center" role="status" aria-label="Loading">
        <div className="spinner" />
      </div>
    )
  }
  if (status === 'unconfigured') {
    return <SetupNotice />
  }
  if (status === 'signed-out') {
    return <SignInPanel />
  }
  return children ? <>{children}</> : <Outlet />
}
