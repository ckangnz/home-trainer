import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { useFriends } from '@/friends/FriendsProvider'
import { userPhoto } from '@/friends/models'
import type { MessageKey } from '@/i18n/en'
import { useT } from '@/i18n/translate'
import { InstallPrompt } from '@/pwa/InstallPrompt'
import { BrandMark, Icon, type IconName } from './Icons'
import { SITE } from './site'
import './shell.css'

interface NavItem {
  to: string
  label: MessageKey
  icon: IconName
  end?: boolean
}

const SIGNED_IN_NAV: NavItem[] = [
  { to: '/app', label: 'shell.nav.home', icon: 'home', end: true },
  { to: '/workouts', label: 'shell.nav.workouts', icon: 'bolt' },
  { to: '/exercises', label: 'shell.nav.exercises', icon: 'grid' },
  { to: '/app/friends', label: 'shell.nav.friends', icon: 'users' },
  { to: '/app/history', label: 'shell.nav.history', icon: 'history' },
]

const PUBLIC_NAV: NavItem[] = [
  { to: '/', label: 'shell.nav.home', icon: 'home', end: true },
  { to: '/workouts', label: 'shell.nav.workouts', icon: 'bolt' },
  { to: '/exercises', label: 'shell.nav.exercises', icon: 'grid' },
]

const GUEST_NAV: NavItem[] = [...PUBLIC_NAV, { to: '/app/settings', label: 'shell.nav.settings', icon: 'settings' }]

function Avatar() {
  const t = useT()
  const { user, profileVersion } = useAuth()
  const photo = userPhoto(user)
  const [brokenPhoto, setBrokenPhoto] = useState<string | null>(null)
  const broken = brokenPhoto !== null && brokenPhoto === photo
  const name = (user?.displayName ?? user?.email ?? '?').trim()
  return (
    <Link to="/app/settings" className="avatar" aria-label={t('shell.accountAndSettings')} title={name}>
      {photo && !broken ? (
        <img key={`${photo}-${profileVersion}`} src={photo} alt="" referrerPolicy="no-referrer" onError={() => setBrokenPhoto(photo)} />
      ) : (
        <span className="avatar__initial">{name.charAt(0).toUpperCase()}</span>
      )}
    </Link>
  )
}

export function AppShell() {
  const t = useT()
  const { status, signIn } = useAuth()
  const signedIn = status === 'signed-in'
  const nav = signedIn ? SIGNED_IN_NAV : status === 'unconfigured' ? GUEST_NAV : PUBLIC_NAV
  const { incoming } = useFriends()
  const badge = (item: NavItem) =>
    item.to === '/app/friends' && incoming.length > 0 ? (
      <span className="nav-badge" aria-label={t('shell.friendRequests', { count: incoming.length })}>
        {incoming.length}
      </span>
    ) : null

  return (
    <div className="shell">
      <header className="shell__header">
        <Link to={signedIn ? '/app' : '/'} className="brand">
          <BrandMark />
          <span>{SITE.name}</span>
        </Link>
        <nav className="shell__nav" aria-label={t('shell.nav.primary')}>
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="shell__link">
              {t(item.label)}
              {badge(item)}
            </NavLink>
          ))}
        </nav>
        <div className="shell__actions">
          <InstallPrompt />
          {signedIn ? <Avatar /> : null}
          {status === 'signed-out' ? (
            <button
              type="button"
              className="btn btn--primary btn--small"
              onClick={() => {
                void signIn()
              }}
            >
              {t('common.signIn')}
            </button>
          ) : null}
        </div>
      </header>

      <main className="shell__main" id="main">
        <Outlet />
      </main>

      <footer className="shell__footer">
        <nav className="row row--wrap" aria-label={t('shell.nav.footer')}>
          <Link to="/workouts">{t('shell.footer.workouts')}</Link>
          <Link to="/exercises">{t('shell.footer.library')}</Link>
          <Link to="/privacy">{t('shell.footer.privacy')}</Link>
          <Link to="/terms">{t('shell.footer.terms')}</Link>
          {SITE.supportUrl ? (
            <a href={SITE.supportUrl} target="_blank" rel="noreferrer">
              {t('shell.footer.support', { name: SITE.name })}
            </a>
          ) : null}
        </nav>
        <p className="faint">{t('shell.footer.disclaimer', { name: SITE.name })}</p>
      </footer>

      <nav className="tabbar" aria-label={t('shell.nav.primary')}>
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="tabbar__link">
            <Icon name={item.icon} />
            <span>{t(item.label)}</span>
            {badge(item)}
          </NavLink>
        ))}
        {status === 'signed-out' ? (
          <button
            type="button"
            className="tabbar__link"
            onClick={() => {
              void signIn()
            }}
          >
            <Icon name="forward" />
            <span>{t('common.signIn')}</span>
          </button>
        ) : null}
      </nav>
    </div>
  )
}
