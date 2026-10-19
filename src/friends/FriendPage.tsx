import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '@/data/DataProvider'
import { getExercise } from '@/exercises'
import { muscleLoad } from '@/exercises/muscles'
import { groupByDay, summarizeStreak } from '@/history/streaks'
import { withFreshIds } from '@/workouts/routine'
import type { Routine } from '@/workouts/types'
import { MuscleMap } from '@/components/MuscleMap'
import { RoutineList, RoutineStats } from '@/components/RoutineList'
import { RoutineMuscles } from '@/components/RoutineMuscles'
import { useToast } from '@/app/Toast'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { useFormat, useLabels, useT } from '@/i18n'
import { useFriends, type FriendActivity } from './FriendsProvider'
import { PersonAvatar } from './Avatar'
import { AdUnit } from '@/ads/AdUnit'
import '@/pages/history.css'
import './friends.css'

const DAY_OPTIONS: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' }
const TIME_OPTIONS: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; activity: FriendActivity }

type Tab = 'activity' | 'routines'

export function FriendPage() {
  const { uid = '' } = useParams()
  const { ready, friends, loadActivity, remove } = useFriends()
  const friend = friends.find((entry) => entry.uid === uid)
  const t = useT()
  const fmt = useFormat()
  usePageMeta(friend ? friend.displayName : t('social.friend.fallbackTitle'))
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
      <div className="center" role="status" aria-label={t('social.friend.loading')}>
        <div className="spinner" />
      </div>
    )
  }
  if (!friend) {
    return (
      <div className="page page--narrow">
        <div className="empty">
          <p>{t('social.friend.notFriends')}</p>
          <Link to="/app/friends" className="btn btn--primary">
            {t('social.friend.backToFriends')}
          </Link>
        </div>
      </div>
    )
  }

  const unfriend = async () => {
    if (!window.confirm(t('social.friend.confirmRemove', { name: friend.displayName }))) {
      return
    }
    try {
      await remove(friend.uid)
      notify(t('social.friend.removed', { name: friend.displayName }))
      navigate('/app/friends')
    } catch {
      notify(t('social.friend.removeFailed'))
    }
  }

  return (
    <div className="page page--narrow friends">
      <Link to="/app/friends" className="btn btn--ghost btn--small friends__back">
        <Icon name="back" />
        {t('social.friend.back')}
      </Link>
      <header className="friend-head">
        <PersonAvatar person={friend} size="lg" />
        <div className="friend-head__text">
          <h1 className="page__title">{friend.displayName}</h1>
          <p className="faint">{t('social.friend.since', { date: fmt.date(friend.since, {}) })}</p>
        </div>
      </header>

      <div className="segmented" role="tablist" aria-label={t('social.friend.details')}>
        <button type="button" role="tab" aria-selected={tab === 'activity'} aria-pressed={tab === 'activity'} onClick={() => setTab('activity')}>
          {t('social.friend.history')}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'routines'} aria-pressed={tab === 'routines'} onClick={() => setTab('routines')}>
          {t('social.friend.theirWorkouts')}
          {load.status === 'ready' ? ` (${load.activity.routines.length})` : ''}
        </button>
      </div>

      {load.status === 'loading' ? (
        <div className="center" role="status" aria-label={t('social.friend.loadingActivity')}>
          <div className="spinner" />
        </div>
      ) : load.status === 'error' ? (
        <p className="notice notice--error" role="alert">
          {t('social.friend.activityFailed', { name: friend.displayName })}
        </p>
      ) : tab === 'activity' ? (
        <FriendActivityView name={friend.displayName} activity={load.activity} />
      ) : (
        <FriendRoutines ownerUid={friend.uid} ownerName={friend.displayName} routines={load.activity.routines} />
      )}

      <button type="button" className="btn btn--ghost btn--danger" onClick={() => void unfriend()}>
        {t('social.friend.remove')}
      </button>
    </div>
  )
}

function FriendActivityView({ name, activity }: { name: string; activity: FriendActivity }) {
  const t = useT()
  const fmt = useFormat()
  const labels = useLabels()
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
          <dt>{t('social.friend.streak')}</dt>
          <dd>{streak.current}</dd>
        </div>
        <div>
          <dt>{t('social.friend.thisWeek')}</dt>
          <dd>{recent.length}</dd>
        </div>
        <div>
          <dt>{t('social.friend.weekTime')}</dt>
          <dd>{fmt.duration(weekMs)}</dd>
        </div>
        <div>
          <dt>{t('social.friend.weekKcal')}</dt>
          <dd>{weekCalories}</dd>
        </div>
      </dl>

      {Object.keys(load).length > 0 ? (
        <section className="card friend-week">
          <h2 className="section__title">{t('social.friend.musclesTitle')}</h2>
          <MuscleMap load={load} size="md" label={t('social.friend.musclesLabel', { name })} legend />
        </section>
      ) : null}

      <AdUnit placement="page" className="page-ad" />

      {days.length === 0 ? (
        <div className="empty">
          <p>{t('social.friend.noWorkouts', { name })}</p>
        </div>
      ) : (
        <div className="stack">
          {days.map((day) => (
            <section key={day.key} className="history-day">
              <h2 className="history-day__title">{fmt.date(`${day.key}T12:00:00`, DAY_OPTIONS)}</h2>
              <ul className="list">
                {day.entries.map((entry) => (
                  <li key={entry.id} className="card friend-entry">
                    <strong>{entry.title}</strong>
                    <div className="friend-entry__meta faint">
                      <span>
                        {fmt.date(entry.startedAt, TIME_OPTIONS)} – {fmt.date(entry.completedAt, TIME_OPTIONS)}
                      </span>
                      <span>{fmt.duration(entry.durationMs)}</span>
                      <span>{t('social.friend.moves', { done: entry.exercises, total: entry.totalExercises })}</span>
                      {entry.calories !== undefined ? <span>{t('units.calories', { n: entry.calories })}</span> : null}
                    </div>
                    {entry.muscles?.length ? (
                      <div className="chip-row">
                        {entry.muscles.slice(0, 5).map((muscle) => (
                          <span key={muscle} className="chip chip--static">
                            {labels.muscle[muscle]}
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
  const t = useT()
  const { notify } = useToast()
  const [open, setOpen] = useState<string | null>(null)

  if (routines.length === 0) {
    return (
      <div className="empty">
        <p>{t('social.friend.noRoutines', { name: ownerName })}</p>
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
    notify(t('social.friend.added', { name: created.name }))
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
                {imported ? t('social.friend.addAnother') : t('social.friend.addToMine')}
              </button>
              {imported ? (
                <Link to={`/app/play/routine/${imported.id}`} className="btn btn--small">
                  <Icon name="play" />
                  {t('social.friend.playCopy')}
                </Link>
              ) : null}
              <button type="button" className="btn btn--ghost btn--small" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : routine.id)}>
                {expanded ? t('social.friend.hideMoves') : t('social.friend.seeMoves')}
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
