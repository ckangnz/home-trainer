import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useToast } from '@/app/Toast'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { useFriends } from './FriendsProvider'
import { PersonAvatar } from './Avatar'
import { formatFriendCode, parseFriendCode } from './code'
import type { PublicProfile } from './models'
import './friends.css'

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; person: PublicProfile }

export function FriendAddPage() {
  usePageMeta('Add friend')
  const { code: raw = '' } = useParams()
  const code = parseFriendCode(raw)
  const { me, friends, outgoing, lookup, sendRequest } = useFriends()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (code === null) {
      setLoad({ status: 'error', message: 'This invite link is not valid.' })
      return
    }
    let cancelled = false
    lookup(code)
      .then((person) => {
        if (!cancelled) {
          setLoad(person ? { status: 'ready', person } : { status: 'error', message: 'This invite is no longer valid.' })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoad({ status: 'error', message: 'Could not load this invite. Check your connection.' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [code, lookup])

  if (load.status === 'loading') {
    return (
      <div className="center" role="status" aria-label="Loading invite">
        <div className="spinner" />
      </div>
    )
  }
  if (load.status === 'error') {
    return (
      <div className="page page--narrow">
        <div className="empty">
          <p>{load.message}</p>
          <Link to="/app/friends" className="btn btn--primary">
            Go to friends
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
      notify(`Friend request sent to ${person.displayName}`)
      navigate('/app/friends')
    } catch {
      notify('Could not send the request. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="page page--narrow friends">
      <div className="card stack friend-invite">
        <PersonAvatar person={person} size="lg" />
        <p className="eyebrow">Friend invite · {formatFriendCode(code ?? '')}</p>
        <h1 className="page__title">{person.displayName}</h1>
        {self ? (
          <p className="muted">This is your own invite link. Share it with a friend or your trainer.</p>
        ) : friend ? (
          <>
            <p className="muted">You are already friends.</p>
            <Link to={`/app/friends/${person.uid}`} className="btn btn--primary btn--lg">
              View {person.displayName}
            </Link>
          </>
        ) : asked ? (
          <p className="muted">Request sent. You&apos;ll see each other&apos;s workouts once they accept.</p>
        ) : (
          <>
            <p className="muted">Once they accept, you&apos;ll see each other&apos;s workout history and routines.</p>
            <button type="button" className="btn btn--primary btn--lg" disabled={busy} onClick={() => void send()}>
              <Icon name="userPlus" />
              Send friend request
            </button>
          </>
        )}
      </div>
    </div>
  )
}
