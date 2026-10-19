import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '@/data/DataProvider'
import { getExercise } from '@/exercises'
import { MUSCLE_LABEL } from '@/exercises/labels'
import { muscleLoad } from '@/exercises/muscles'
import { groupByDay, summarizeStreak } from '@/history/streaks'
import { withFreshIds } from '@/workouts/routine'
import { formatDuration } from '@/workouts/steps'
import type { Routine } from '@/workouts/types'
import { MuscleMap } from '@/components/MuscleMap'
import { RoutineList, RoutineStats } from '@/components/RoutineList'
import { RoutineMuscles } from '@/components/RoutineMuscles'
import { useToast } from '@/app/Toast'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { useFriends, type FriendActivity } from './FriendsProvider'
import { PersonAvatar } from './Avatar'
import '@/pages/history.css'
import './friends.css'

const DAY_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; activity: FriendActivity }

type Tab = 'activity' | 'routines'

export function FriendPage() {
  const { uid = '' } = useParams()
  const { ready, friends, loadActivity, remove } = useFriends()
  const friend = friends.find((entry) => entry.uid === uid)
  usePageMeta(friend ? friend.displayName : 'Friend')
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [tab, setTab] = useState<Tab>('activity')
  const navigate = useNavigate()
  const { notify } = useToast()

  useEffect(() => {
    if (!friend) {
      return
    }
    let cancelled = false
    setLoad({ status: 'loading' })
    loadActivity(friend.uid)
      .then((activity) => {
        if (!cancelled) {
          setLoad({ status: 'ready', activity })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoad({ status: 'error' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [friend, loadActivity])

  if (!ready) {
    return (
      <div className="center" role="status" aria-label="Loading friend">
        <div className="spinner" />
      </div>
    )
  }
  if (!friend) {
    return (
      <div className="page page--narrow">
        <div className="empty">
          <p>You are not friends with this person.</p>
          <Link to="/app/friends" className="btn btn--primary">
            Back to friends
          </Link>
        </div>
      </div>
    )
  }

  const unfriend = async () => {
    if (!window.confirm(`Remove ${friend.displayName} from your friends? You will stop seeing each other's workouts.`)) {
      return
    }
    try {
      await remove(friend.uid)
      notify(`Removed ${friend.displayName}`)
      navigate('/app/friends')
    } catch {
      notify('Could not remove this friend. Please try again.')
    }
  }

  return (
    <div className="page page--narrow friends">
      <Link to="/app/friends" className="btn btn--ghost btn--small friends__back">
        <Icon name="back" />
        Friends
      </Link>
      <header className="friend-head">
        <PersonAvatar person={friend} size="lg" />
        <div className="friend-head__text">
          <h1 className="page__title">{friend.displayName}</h1>
          <p className="faint">Friends since {new Date(friend.since).toLocaleDateString()}</p>
        </div>
      </header>

      <div className="segmented" role="tablist" aria-label="Friend details">
        <button type="button" role="tab" aria-selected={tab === 'activity'} aria-pressed={tab === 'activity'} onClick={() => setTab('activity')}>
          Workouts
        </button>
        <button type="button" role="tab" aria-selected={tab === 'routines'} aria-pressed={tab === 'routines'} onClick={() => setTab('routines')}>
          Routines
          {load.status === 'ready' ? ` (${load.activity.routines.length})` : ''}
        </button>
      </div>

      {load.status === 'loading' ? (
        <div className="center" role="status" aria-label="Loading activity">
          <div className="spinner" />
        </div>
      ) : load.status === 'error' ? (
        <p className="notice notice--error" role="alert">
          Could not load {friend.displayName}&apos;s activity. Check your connection and try again.
        </p>
      ) : tab === 'activity' ? (
        <FriendActivityView name={friend.displayName} activity={load.activity} />
      ) : (
        <FriendRoutines ownerUid={friend.uid} ownerName={friend.displayName} routines={load.activity.routines} />
      )}

      <button type="button" className="btn btn--ghost btn--danger" onClick={() => void unfriend()}>
        Remove friend
      </button>
    </div>
  )
}

function FriendActivityView({ name, activity }: { name: string; activity: FriendActivity }) {
  const today = useMemo(() => new Date(), [])
  const { completions } = activity
  const streak = summarizeStreak(completions, today)
  const recent = completions.filter((entry) => today.getTime() - Date.parse(entry.completedAt) <= WEEK_MS)
  const weekMs = recent.reduce((sum, entry) => sum + entry.durationMs, 0)
  const weekCalories = recent.reduce((sum, entry) => sum + (entry.calories ?? 0), 0)
  const load = muscleLoad(recent.filter((entry) => entry.muscles?.length).map((entry) => ({ muscles: entry.muscles ?? [], weight: entry.durationMs })))
  const days = groupByDay(completions)

  return (
    <>
      <dl className="friend-stats">
        <div>
          <dt>Streak</dt>
          <dd>{streak.current}</dd>
        </div>
        <div>
          <dt>This week</dt>
          <dd>{recent.length}</dd>
        </div>
        <div>
          <dt>Week time</dt>
          <dd>{formatDuration(weekMs)}</dd>
        </div>
        <div>
          <dt>Week kcal</dt>
          <dd>{weekCalories}</dd>
        </div>
      </dl>

      {Object.keys(load).length > 0 ? (
        <section className="card friend-week">
          <h2 className="section__title">Muscles trained this week</h2>
          <MuscleMap load={load} size="md" label={`${name}'s muscles this week`} legend />
        </section>
      ) : null}

      {days.length === 0 ? (
        <div className="empty">
          <p>{name} has not logged any workouts yet.</p>
        </div>
      ) : (
        <div className="stack">
          {days.map((day) => (
            <section key={day.key} className="history-day">
              <h2 className="history-day__title">{DAY_FORMAT.format(new Date(`${day.key}T12:00:00`))}</h2>
              <ul className="list">
                {day.entries.map((entry) => (
                  <li key={entry.id} className="card friend-entry">
                    <strong>{entry.title}</strong>
                    <div className="friend-entry__meta faint">
                      <span>
                        {TIME_FORMAT.format(new Date(entry.startedAt))} – {TIME_FORMAT.format(new Date(entry.completedAt))}
                      </span>
                      <span>{formatDuration(entry.durationMs)}</span>
                      <span>
                        {entry.exercises}/{entry.totalExercises} moves
                      </span>
                      {entry.calories !== undefined ? <span>{entry.calories} kcal</span> : null}
                    </div>
                    {entry.muscles?.length ? (
                      <div className="chip-row">
                        {entry.muscles.slice(0, 5).map((muscle) => (
                          <span key={muscle} className="chip chip--static">
                            {MUSCLE_LABEL[muscle]}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  )
}

function FriendRoutines({ ownerUid, ownerName, routines }: { ownerUid: string; ownerName: string; routines: Routine[] }) {
  const { routines: mine, createRoutine } = useData()
  const { notify } = useToast()
  const [open, setOpen] = useState<string | null>(null)

  if (routines.length === 0) {
    return (
      <div className="empty">
        <p>{ownerName} has no routines yet.</p>
      </div>
    )
  }

  const copy = (routine: Routine) => {
    const body = withFreshIds({
      name: routine.name,
      description: routine.description,
      defaults: routine.defaults,
      items: routine.items.filter((item) => getExercise(item.exerciseId)),
    })
    if (!body.description) {
      delete body.description
    }
    const created = createRoutine(body, { kind: 'friend', uid: ownerUid, routineId: routine.id, ownerName })
    notify(`Added ${created.name} to your routines`)
  }

  return (
    <ul className="list">
      {routines.map((routine) => {
        const imported = mine.find((entry) => entry.source?.kind === 'friend' && entry.source.routineId === routine.id && entry.source.uid === ownerUid)
        const expanded = open === routine.id
        return (
          <li key={routine.id} className="card friend-routine">
            <div className="friend-routine__head">
              <div className="stack stack--tight">
                <h3 className="routine-card__name">{routine.name}</h3>
                {routine.description ? <p className="faint">{routine.description}</p> : null}
              </div>
            </div>
            <RoutineStats body={routine} />
            <div className="row row--wrap">
              <button type="button" className="btn btn--primary btn--small" onClick={() => copy(routine)}>
                <Icon name="import" />
                {imported ? 'Add another copy' : 'Add to my routines'}
              </button>
              {imported ? (
                <Link to={`/app/play/routine/${imported.id}`} className="btn btn--small">
                  <Icon name="play" />
                  Play my copy
                </Link>
              ) : null}
              <button type="button" className="btn btn--ghost btn--small" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : routine.id)}>
                {expanded ? 'Hide moves' : 'See moves'}
              </button>
            </div>
            {expanded ? (
              <>
                <RoutineMuscles body={routine} />
                <RoutineList body={routine} />
              </>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
