import { useState } from 'react'
import type { PublicProfile } from './models'

export function PersonAvatar({ person, size = 'md' }: { person: PublicProfile; size?: 'sm' | 'md' | 'lg' }) {
  const [broken, setBroken] = useState(false)
  return (
    <span className={`person-avatar person-avatar--${size}`} aria-hidden="true">
      {person.photoURL && !broken ? (
        <img src={person.photoURL} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      ) : (
        person.displayName.charAt(0).toUpperCase()
      )}
    </span>
  )
}
