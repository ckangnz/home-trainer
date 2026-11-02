import { NavLink } from 'react-router-dom'
import { useT } from '@/i18n'
import './library-switch.css'

export function LibrarySwitch() {
  const t = useT()
  return (
    <nav className="segmented library-switch" aria-label={t('shell.nav.library')}>
      <NavLink to="/workouts" end>
        {t('shell.nav.workouts')}
      </NavLink>
      <NavLink to="/exercises" end>
        {t('shell.nav.exercises')}
      </NavLink>
    </nav>
  )
}
