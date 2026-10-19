import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useToast } from '@/app/Toast'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { useT, type MessageKey } from '@/i18n'
import { useFriends } from './FriendsProvider'
import { PersonAvatar } from './Avatar'
import { formatFriendCode, parseFriendCode } from './code'
import type { PublicProfile } from './models'
import './friends.css'

type Load = { status: 'loading' } | { status: 'error'; message: MessageKey } | { status: 'ready'; person: PublicProfile }

export function FriendAddPage() {
  const t = useT()
  usePageMeta(t('social.friendAdd.title'))
  const { code: raw = '' } = useParams()
  const code = parseFriendCode(raw)
  const { me, friends, outgoing, lookup, sendRequest } = useFriends()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (code === null) {
      setLoad({ status: 'error', message: 'social.friendAdd.invalid' })
      return
    }
    let cancelled = false
    lookup(code)
      .then((person) => {
        if (!cancelled) {
          setLoad(person ? { status: 'ready', person } : { status: 'error', message: 'social.friendAdd.expired' })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoad({ status: 'error', message: 'social.friendAdd.loadFailed' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [code, lookup])

  if (load.status === 'loading') {
    return (
      <div className="center" role="status" aria-label={t('social.friendAdd.loading')}>
        <div className="spinner" />
      </div>
    )
  }
  if (load.status === 'error') {
    return (
      <div className="page page--narrow">
        <div className="empty">
          <p>{t(load.message)}</p>
          <Link to="/app/friends" className="btn btn--primary">
            {t('social.friendAdd.goToFriends')}
          </Link>
        </div>
      </div>
    )
  }

  const { person } = load
  const self = person.uid === me?.uid
  const friend = friends.some((entry) => entry.uid === person.uid)
  const asked = outgoing.some((entry) => entry.to.uid === person.uid)

  const send = async () => {
    setBusy(true)
    try {
      await sendRequest(person)
      notify(t('social.friends.requestSent', { name: person.displayName }))
      navigate('/app/friends')
    } catch {
      notify(t('social.friends.requestFailed'))
      setBusy(false)
    }
  }

  return (
    <div className="page page--narrow friends">
      <div className="card stack friend-invite">
        <PersonAvatar person={person} size="lg" />
        <p className="eyebrow">{t('social.friendAdd.eyebrow', { code: formatFriendCode(code ?? '') })}</p>
        <h1 className="page__title">{person.displayName}</h1>
        {self ? (
          <p className="muted">{t('social.friendAdd.self')}</p>
        ) : friend ? (
          <>
            <p className="muted">{t('social.friendAdd.already')}</p>
            <Link to={`/app/friends/${person.uid}`} className="btn btn--primary btn--lg">
              {t('social.friendAdd.view', { name: person.displayName })}
            </Link>
          </>
        ) : asked ? (
          <p className="muted">{t('social.friendAdd.asked')}</p>
        ) : (
          <>
            <p className="muted">{t('social.friendAdd.explain')}</p>
            <button type="button" className="btn btn--primary btn--lg" disabled={busy} onClick={() => void send()}>
              <Icon name="userPlus" />
              {t('social.friendAdd.send')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
