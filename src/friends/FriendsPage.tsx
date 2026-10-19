import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { TextField } from '@/components/ui'
import { useToast } from '@/app/Toast'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { SITE, absoluteUrl } from '@/app/site'
import { useT, type MessageKey } from '@/i18n'
import { useFriends } from './FriendsProvider'
import { PersonAvatar } from './Avatar'
import { formatFriendCode, friendInvitePath, parseFriendCode } from './code'
import type { FriendRequest, PublicProfile } from './models'
import './friends.css'

type Lookup = { status: 'idle' } | { status: 'busy' } | { status: 'found'; person: PublicProfile } | { status: 'error'; message: MessageKey }

export function FriendsPage() {
  const t = useT()
  usePageMeta(t('social.friends.title'))
  const { ready, me, profile, friends, incoming, outgoing, error, lookup, sendRequest, accept, dismiss } = useFriends()
  const { notify } = useToast()
  const [value, setValue] = useState('')
  const [found, setFound] = useState<Lookup>({ status: 'idle' })

  const inviteUrl = profile ? absoluteUrl(friendInvitePath(profile.friendCode)) : null

  const shareInvite = async () => {
    if (!profile || !inviteUrl) {
      return
    }
    const text = t('social.friends.inviteText', { name: SITE.name, code: formatFriendCode(profile.friendCode) })
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: t('social.friends.inviteTitle', { name: SITE.name }), text, url: inviteUrl })
        return
      } catch {
        return
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${inviteUrl}`)
      notify(t('social.friends.inviteCopied'))
    } catch {
      notify(t('social.friends.inviteCopyFailed'))
    }
  }

  const find = async (event: FormEvent) => {
    event.preventDefault()
    const code = parseFriendCode(value)
    if (code === null) {
      setFound({ status: 'error', message: 'social.friends.invalidCode' })
      return
    }
    setFound({ status: 'busy' })
    try {
      const person = await lookup(code)
      if (!person) {
        setFound({ status: 'error', message: 'social.friends.noOne' })
      } else if (person.uid === me?.uid) {
        setFound({ status: 'error', message: 'social.friends.ownCode' })
      } else {
        setFound({ status: 'found', person })
      }
    } catch {
      setFound({ status: 'error', message: 'social.friends.lookupFailed' })
    }
  }

  const request = async (person: PublicProfile) => {
    try {
      await sendRequest(person)
      notify(t('social.friends.requestSent', { name: person.displayName }))
      setFound({ status: 'idle' })
      setValue('')
    } catch {
      notify(t('social.friends.requestFailed'))
    }
  }

  const respond = async (action: (request: FriendRequest) => Promise<void>, request: FriendRequest, message: string) => {
    try {
      await action(request)
      notify(message)
    } catch {
      notify(t('social.friends.genericError'))
    }
  }

  const foundPerson = found.status === 'found' ? found.person : null
  const alreadyFriend = foundPerson ? friends.some((friend) => friend.uid === foundPerson.uid) : false
  const alreadyAsked = foundPerson ? outgoing.some((entry) => entry.to.uid === foundPerson.uid) : false

  return (
    <div className="page page--narrow friends">
      <header className="page__header">
        <h1 className="page__title">{t('social.friends.title')}</h1>
        <p className="page__lead">{t('social.friends.lead')}</p>
      </header>

      {error ? (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="card stack friend-code">
        <h2 className="section__title">{t('social.friends.yourCode')}</h2>
        {profile ? (
          <>
            <p className="friend-code__value tabular">{formatFriendCode(profile.friendCode)}</p>
            <div className="row row--wrap">
              <button type="button" className="btn btn--primary" onClick={() => void shareInvite()}>
                <Icon name="share" />
                {t('social.friends.invite')}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(formatFriendCode(profile.friendCode))
                    .then(() => notify(t('social.friends.codeCopied')))
                    .catch(() => notify(t('social.friends.codeCopyFailed')))
                }}
              >
                <Icon name="copy" />
                {t('social.friends.copyCode')}
              </button>
            </div>
          </>
        ) : (
          <div className="row" role="status" aria-label={t('social.friends.loadingCode')}>
            <div className="spinner" />
          </div>
        )}
      </section>

      <form className="card stack" onSubmit={(event) => void find(event)}>
        <h2 className="section__title">{t('social.friends.add')}</h2>
        <TextField
          label={t('social.friends.codeField')}
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
            {t(found.message)}
          </p>
        ) : null}
        {foundPerson ? (
          <div className="person-row">
            <PersonAvatar person={foundPerson} />
            <strong className="person-row__name">{foundPerson.displayName}</strong>
            {alreadyFriend ? (
              <span className="badge">{t('social.friends.alreadyFriends')}</span>
            ) : alreadyAsked ? (
              <span className="badge">{t('social.friends.sent')}</span>
            ) : (
              <button type="button" className="btn btn--primary btn--small" onClick={() => void request(foundPerson)}>
                <Icon name="userPlus" />
                {t('social.friends.sendRequest')}
              </button>
            )}
          </div>
        ) : (
          <button type="submit" className="btn btn--primary" disabled={found.status === 'busy'}>
            <Icon name="search" />
            {found.status === 'busy' ? t('social.friends.lookingUp') : t('social.friends.find')}
          </button>
        )}
      </form>

      {incoming.length > 0 ? (
        <section className="section">
          <h2 className="section__title">{t('social.friends.requestsForYou')}</h2>
          <ul className="list">
            {incoming.map((entry) => (
              <li key={entry.id} className="card person-row">
                <PersonAvatar person={entry.from} />
                <span className="person-row__name">
                  <strong>{entry.from.displayName}</strong>
                  <span className="faint">{t('social.friends.wantsToBeFriends')}</span>
                </span>
                <div className="person-row__actions">
                  <button
                    type="button"
                    className="btn btn--primary btn--small"
                    onClick={() => void respond(accept, entry, t('social.friends.nowFriends', { name: entry.from.displayName }))}
                  >
                    <Icon name="check" />
                    {t('social.friends.accept')}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => void respond(dismiss, entry, t('social.friends.declined'))}
                  >
                    {t('social.friends.decline')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="section">
        <h2 className="section__title">{t('social.friends.yourFriends')}</h2>
        {!ready ? (
          <div className="center" role="status" aria-label={t('social.friends.loadingFriends')}>
            <div className="spinner" />
          </div>
        ) : friends.length === 0 ? (
          <div className="empty">
            <p>{t('social.friends.empty')}</p>
          </div>
        ) : (
          <ul className="list">
            {friends.map((friend) => (
              <li key={friend.uid}>
                <Link to={`/app/friends/${friend.uid}`} className="card person-row person-row--link">
                  <PersonAvatar person={friend} />
                  <span className="person-row__name">
                    <strong>{friend.displayName}</strong>
                    <span className="faint">{t('social.friends.seeHistory')}</span>
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
          <h2 className="section__title">{t('social.friends.waiting')}</h2>
          <ul className="list">
            {outgoing.map((entry) => (
              <li key={entry.id} className="card person-row">
                <PersonAvatar person={entry.to} />
                <span className="person-row__name">
                  <strong>{entry.to.displayName}</strong>
                  <span className="faint">{t('social.friends.sent')}</span>
                </span>
                <button type="button" className="btn btn--ghost btn--small" onClick={() => void respond(dismiss, entry, t('social.friends.canceled'))}>
                  {t('social.friends.cancel')}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
