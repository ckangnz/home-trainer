import type { ReactNode } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { useT } from '@/i18n/translate'
import { GoogleMark } from './Icons'

export function SignInPanel({ title, compact = false }: { title?: string; compact?: boolean }) {
  const t = useT()
  const { signIn, error } = useAuth()
  return (
    <section className={compact ? 'card sign-in sign-in--compact' : 'page page--narrow'}>
      <div className={compact ? 'stack' : 'card sign-in stack'}>
        <h1 className={compact ? 'section__title' : 'page__title'}>{title ?? t('shell.signInPanel.title')}</h1>
        <p className="muted">{t('shell.signInPanel.body')}</p>
        <button
          type="button"
          className="btn btn--lg btn--outline"
          onClick={() => {
            void signIn()
          }}
        >
          <GoogleMark />
          {t('common.continueWithGoogle')}
        </button>
        {error ? (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="faint">
          {t('shell.signInPanel.privacyBefore')}
          <Link to="/privacy">{t('shell.signInPanel.privacyLink')}</Link>
          {t('shell.signInPanel.privacyAfter')}
        </p>
      </div>
    </section>
  )
}

function SetupNotice() {
  const t = useT()
  return (
    <section className="page page--narrow">
      <div className="card stack">
        <h1 className="page__title">{t('shell.setup.title')}</h1>
        <p className="muted">
          Copy <code>env.example</code> to <code>.env.local</code> (or add the <code>VITE_FIREBASE_*</code> repository
          secrets), add your Firebase web configuration, and rebuild. Workouts, exercises, and settings work without it.
        </p>
      </div>
    </section>
  )
}

export function RequireAuth({ children, guestWhenUnconfigured = false }: { children?: ReactNode; guestWhenUnconfigured?: boolean }) {
  const t = useT()
  const { status } = useAuth()
  if (status === 'unconfigured' && guestWhenUnconfigured) {
    return children ? <>{children}</> : <Outlet />
  }
  if (status === 'loading') {
    return (
      <div className="center" role="status" aria-label={t('common.loading')}>
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
