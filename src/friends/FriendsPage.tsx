import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { TextField } from '@/components/ui'
import { useToast } from '@/app/Toast'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { SITE, absoluteUrl } from '@/app/site'
import { useFriends } from './FriendsProvider'
import { PersonAvatar } from './Avatar'
import { formatFriendCode, friendInvitePath, parseFriendCode } from './code'
import type { FriendRequest, PublicProfile } from './models'
import './friends.css'

type Lookup = { status: 'idle' } | { status: 'busy' } | { status: 'found'; person: PublicProfile } | { status: 'error'; message: string }

export function FriendsPage() {
  usePageMeta('Friends')
  const { ready, me, profile, friends, incoming, outgoing, error, lookup, sendRequest, accept, dismiss } = useFriends()
  const { notify } = useToast()
  const [value, setValue] = useState('')
  const [found, setFound] = useState<Lookup>({ status: 'idle' })

  const inviteUrl = profile ? absoluteUrl(friendInvitePath(profile.friendCode)) : null

  const shareInvite = async () => {
    if (!profile || !inviteUrl) {
      return
    }
    const text = `Add me on ${SITE.name} so we can see each other's workouts. My friend code is ${formatFriendCode(profile.friendCode)}.`
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `${SITE.name} friend invite`, text, url: inviteUrl })
        return
      } catch {
        return
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${inviteUrl}`)
      notify('Invite link copied')
    } catch {
      notify('Could not copy. Share your code instead.')
    }
  }

  const find = async (event: FormEvent) => {
    event.preventDefault()
    const code = parseFriendCode(value)
    if (code === null) {
      setFound({ status: 'error', message: 'Enter a friend code like FR-7KQ2-M9XP, or paste an invite link.' })
      return
    }
    setFound({ status: 'busy' })
    try {
      const person = await lookup(code)
      if (!person) {
        setFound({ status: 'error', message: 'No one has that friend code. Check it and try again.' })
      } else if (person.uid === me?.uid) {
        setFound({ status: 'error', message: 'That is your own friend code.' })
      } else {
        setFound({ status: 'found', person })
      }
    } catch {
      setFound({ status: 'error', message: 'Could not look up that code. Check your connection.' })
    }
  }

  const request = async (person: PublicProfile) => {
    try {
      await sendRequest(person)
      notify(`Friend request sent to ${person.displayName}`)
      setFound({ status: 'idle' })
      setValue('')
    } catch {
      notify('Could not send the request. Please try again.')
    }
  }

  const respond = async (action: (request: FriendRequest) => Promise<void>, request: FriendRequest, message: string) => {
    try {
      await action(request)
      notify(message)
    } catch {
      notify('Something went wrong. Please try again.')
    }
  }

  const foundPerson = found.status === 'found' ? found.person : null
  const alreadyFriend = foundPerson ? friends.some((friend) => friend.uid === foundPerson.uid) : false
  const alreadyAsked = foundPerson ? outgoing.some((entry) => entry.to.uid === foundPerson.uid) : false

  return (
    <div className="page page--narrow friends">
      <header className="page__header">
        <h1 className="page__title">Friends</h1>
        <p className="page__lead">Train together. Friends can see each other&apos;s workout history and routines, and copy routines to their own list. Great for checking in with your personal trainer.</p>
      </header>

      {error ? (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="card stack friend-code">
        <h2 className="section__title">Your friend code</h2>
        {profile ? (
          <>
            <p className="friend-code__value tabular">{formatFriendCode(profile.friendCode)}</p>
            <div className="row row--wrap">
              <button type="button" className="btn btn--primary" onClick={() => void shareInvite()}>
                <Icon name="share" />
                Invite a friend
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(formatFriendCode(profile.friendCode))
                    .then(() => notify('Friend code copied'))
                    .catch(() => notify('Could not copy the code'))
                }}
              >
                <Icon name="copy" />
                Copy code
              </button>
            </div>
          </>
        ) : (
          <div className="row" role="status" aria-label="Loading friend code">
            <div className="spinner" />
          </div>
        )}
      </section>

      <form className="card stack" onSubmit={(event) => void find(event)}>
        <h2 className="section__title">Add a friend</h2>
        <TextField
          label="Friend code or invite link"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setFound({ status: 'idle' })
          }}
          placeholder="FR-7KQ2-M9XP"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
        />
        {found.status === 'error' ? (
          <p className="notice notice--error" role="alert">
            {found.message}
          </p>
        ) : null}
        {foundPerson ? (
          <div className="person-row">
            <PersonAvatar person={foundPerson} />
            <strong className="person-row__name">{foundPerson.displayName}</strong>
            {alreadyFriend ? (
              <span className="badge">Already friends</span>
            ) : alreadyAsked ? (
              <span className="badge">Request sent</span>
            ) : (
              <button type="button" className="btn btn--primary btn--small" onClick={() => void request(foundPerson)}>
                <Icon name="userPlus" />
                Send request
              </button>
            )}
          </div>
        ) : (
          <button type="submit" className="btn btn--primary" disabled={found.status === 'busy'}>
            <Icon name="search" />
            {found.status === 'busy' ? 'Looking up…' : 'Find friend'}
          </button>
        )}
      </form>

      {incoming.length > 0 ? (
        <section className="section">
          <h2 className="section__title">Requests for you</h2>
          <ul className="list">
            {incoming.map((entry) => (
              <li key={entry.id} className="card person-row">
                <PersonAvatar person={entry.from} />
                <span className="person-row__name">
                  <strong>{entry.from.displayName}</strong>
                  <span className="faint">wants to be friends</span>
                </span>
                <div className="person-row__actions">
                  <button
                    type="button"
                    className="btn btn--primary btn--small"
                    onClick={() => void respond(accept, entry, `You and ${entry.from.displayName} are now friends`)}
                  >
                    <Icon name="check" />
                    Accept
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => void respond(dismiss, entry, 'Request declined')}
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="section">
        <h2 className="section__title">Your friends</h2>
        {!ready ? (
          <div className="center" role="status" aria-label="Loading friends">
            <div className="spinner" />
          </div>
        ) : friends.length === 0 ? (
          <div className="empty">
            <p>No friends yet. Share your code with a friend or your trainer to get started.</p>
          </div>
        ) : (
          <ul className="list">
            {friends.map((friend) => (
              <li key={friend.uid}>
                <Link to={`/app/friends/${friend.uid}`} className="card person-row person-row--link">
                  <PersonAvatar person={friend} />
                  <span className="person-row__name">
                    <strong>{friend.displayName}</strong>
                    <span className="faint">See workouts and routines</span>
                  </span>
                  <Icon name="forward" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {outgoing.length > 0 ? (
        <section className="section">
          <h2 className="section__title">Waiting for a reply</h2>
          <ul className="list">
            {outgoing.map((entry) => (
              <li key={entry.id} className="card person-row">
                <PersonAvatar person={entry.to} />
                <span className="person-row__name">
                  <strong>{entry.to.displayName}</strong>
                  <span className="faint">Request sent</span>
                </span>
                <button type="button" className="btn btn--ghost btn--small" onClick={() => void respond(dismiss, entry, 'Request canceled')}>
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
