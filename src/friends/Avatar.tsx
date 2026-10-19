import type { PublicProfile } from './models'

export function PersonAvatar({ person, size = 'md' }: { person: PublicProfile; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`person-avatar person-avatar--${size}`} aria-hidden="true">
      {person.photoURL ? <img src={person.photoURL} alt="" referrerPolicy="no-referrer" /> : person.displayName.charAt(0).toUpperCase()}
    </span>
  )
}
