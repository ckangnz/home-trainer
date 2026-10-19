import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { useFriends } from '@/friends/FriendsProvider'
import { cleanPhoto } from '@/friends/models'
import { InstallPrompt } from '@/pwa/InstallPrompt'
import { BrandMark, Icon, type IconName } from './Icons'
import { SITE } from './site'
import './shell.css'

interface NavItem {
  to: string
  label: string
  icon: IconName
  end?: boolean
}

const SIGNED_IN_NAV: NavItem[] = [
  { to: '/app', label: 'Home', icon: 'home', end: true },
  { to: '/workouts', label: 'Workouts', icon: 'bolt' },
  { to: '/exercises', label: 'Exercises', icon: 'grid' },
  { to: '/app/friends', label: 'Friends', icon: 'users' },
  { to: '/app/history', label: 'History', icon: 'history' },
]

const PUBLIC_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/workouts', label: 'Workouts', icon: 'bolt' },
  { to: '/exercises', label: 'Exercises', icon: 'grid' },
]

const GUEST_NAV: NavItem[] = [...PUBLIC_NAV, { to: '/app/settings', label: 'Settings', icon: 'settings' }]

function Avatar() {
  const { user } = useAuth()
  const [broken, setBroken] = useState(false)
  const name = (user?.displayName ?? user?.email ?? '?').trim()
  const photo = cleanPhoto(user?.photoURL)
  return (
    <Link to="/app/settings" className="avatar" aria-label="Account and settings" title={name}>
      {photo && !broken ? (
        <img src={photo} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      ) : (
        <span className="avatar__initial">{name.charAt(0).toUpperCase()}</span>
      )}
    </Link>
  )
}

export function AppShell() {
  const { status, signIn } = useAuth()
  const signedIn = status === 'signed-in'
  const nav = signedIn ? SIGNED_IN_NAV : status === 'unconfigured' ? GUEST_NAV : PUBLIC_NAV
  const { incoming } = useFriends()
  const badge = (item: NavItem) =>
    item.to === '/app/friends' && incoming.length > 0 ? (
      <span className="nav-badge" aria-label={`${incoming.length} friend requests`}>
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
        <nav className="shell__nav" aria-label="Primary">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="shell__link">
              {item.label}
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
              Sign in
            </button>
          ) : null}
        </div>
      </header>

      <main className="shell__main" id="main">
        <Outlet />
      </main>

      <footer className="shell__footer">
        <nav className="row row--wrap" aria-label="Footer">
          <Link to="/workouts">Workouts</Link>
          <Link to="/exercises">Exercise library</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          {SITE.supportUrl ? (
            <a href={SITE.supportUrl} target="_blank" rel="noreferrer">
              Support {SITE.name}
            </a>
          ) : null}
        </nav>
        <p className="faint">
          {SITE.name} is free and supported by ads. Exercise guidance is general information, not medical advice.
        </p>
      </footer>

      <nav className="tabbar" aria-label="Primary">
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="tabbar__link">
            <Icon name={item.icon} />
            <span>{item.label}</span>
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
            <span>Sign in</span>
          </button>
        ) : null}
      </nav>
    </div>
  )
}
