import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { useData } from '@/data/DataProvider'
import { getExercise } from '@/exercises'
import { Figure } from '@/figure/Figure'
import { lastDays, summarizeStreak } from '@/history/streaks'
import { ShareDialog } from '@/sharing/ShareDialog'
import { CURATED_WORKOUTS, getCuratedWorkout } from '@/workouts/curated'
import { estimateDurationMs, formatDuration } from '@/workouts/steps'
import type { Routine } from '@/workouts/types'
import { WorkoutCard } from '@/components/WorkoutCard'
import { TRAINERS } from '@/figure/look'
import { useSettings } from '@/settings/settings'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import './home.css'

function greeting(date: Date): string {
  const hour = date.getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

function RoutineCard({ routine, onShare, onDelete }: { routine: Routine; onShare: () => void; onDelete: () => void }) {
  const preview = routine.items.map((item) => getExercise(item.exerciseId)).find(Boolean)
  const moves = routine.items.filter((item) => getExercise(item.exerciseId)).length
  return (
    <article className="routine-card card">
      <div className="routine-card__thumb stage">
        {preview ? <Figure animation={preview.animation} playing={false} label="" /> : null}
      </div>
      <div className="routine-card__body">
        <h3 className="routine-card__name">{routine.name}</h3>
        <p className="faint">
          {moves} moves · {formatDuration(estimateDurationMs(routine, getExercise))}
          {routine.defaults.rounds > 1 ? ` · ${routine.defaults.rounds} rounds` : ''}
          {routine.shareCode ? ' · Shared' : ''}
        </p>
        <div className="routine-card__actions">
          <Link
            to={`/app/play/routine/${routine.id}`}
            className={`btn btn--primary btn--small${moves === 0 ? ' is-disabled' : ''}`}
            aria-disabled={moves === 0}
            onClick={(event) => {
              if (moves === 0) {
                event.preventDefault()
              }
            }}
          >
            <Icon name="play" />
            Play
          </Link>
          <Link to={`/app/routines/${routine.id}`} className="btn btn--small">
            <Icon name="edit" />
            Edit
          </Link>
          <button type="button" className="btn btn--small" onClick={onShare}>
            <Icon name="share" />
            Share
          </button>
          <button type="button" className="btn btn--small btn--ghost" aria-label={`Delete ${routine.name}`} onClick={onDelete}>
            <Icon name="trash" />
          </button>
        </div>
      </div>
    </article>
  )
}

export function HomePage() {
  usePageMeta('Home')
  const { user } = useAuth()
  const { routines, completions, removeRoutine, ready } = useData()
  const navigate = useNavigate()
  const [sharing, setSharing] = useState<Routine | null>(null)
  const today = useMemo(() => new Date(), [])
  const streak = summarizeStreak(completions, today)
  const week = lastDays(completions, today)
  const firstName = user?.displayName?.split(' ')[0]
  const classic = getCuratedWorkout('classic-7-minute')
  const settings = useSettings()
  const cheer = getExercise('jumping-jacks')

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">
          {greeting(today)}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="muted">
          {streak.current > 0
            ? `You are on a ${streak.current}-day streak. Keep it going!`
            : 'Ready for a quick workout? Seven minutes is all it takes.'}
        </p>
      </header>

      <section className="home-top">
        <div className="streak card">
          <div className="streak__head">
            <span className="streak__flame">
              <Icon name="flame" />
            </span>
            <div>
              <p className="streak__count tabular">{streak.current}</p>
              <p className="faint">day streak · best {streak.longest}</p>
            </div>
          </div>
          <ol className="week" aria-label="Last 7 days">
            {week.map((day) => (
              <li key={day.key} className={`week__day${day.active ? ' is-active' : ''}${day.today ? ' is-today' : ''}`}>
                <span className="week__dot" />
                <span className="week__label">{day.label}</span>
              </li>
            ))}
          </ol>
        </div>
        {classic ? (
          <Link to={`/app/play/workout/${classic.id}`} className="quick-start card">
            <div className="quick-start__text">
              <span className="badge badge--accent">Quick start with {TRAINERS[settings.trainer].name}</span>
              <h2 className="quick-start__title">{classic.name}</h2>
              <p className="muted">{classic.summary}</p>
              <span className="btn btn--primary">
                <Icon name="play" />
                Start now
              </span>
            </div>
            {cheer ? (
              <div className="quick-start__stage stage">
                <Figure animation={cheer.animation} label={`${TRAINERS[settings.trainer].name} warming up`} />
              </div>
            ) : null}
          </Link>
        ) : null}
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">My routines</h2>
          <div className="row">
            <Link to="/app/import" className="btn btn--small">
              <Icon name="download" />
              Import code
            </Link>
            <Link to="/app/routines/new" className="btn btn--small btn--primary">
              <Icon name="plus" />
              New
            </Link>
          </div>
        </div>
        {!ready ? (
          <div className="center" role="status" aria-label="Loading routines">
            <div className="spinner" />
          </div>
        ) : routines.length === 0 ? (
          <div className="empty">
            <p>Build a routine from any of our exercises, customize a ready-made workout, or paste a friend&apos;s code.</p>
            <div className="row row--wrap">
              <button type="button" className="btn btn--primary" onClick={() => navigate('/app/routines/new')}>
                <Icon name="plus" />
                Create a routine
              </button>
              <Link to="/app/import" className="btn">
                Import a code
              </Link>
            </div>
          </div>
        ) : (
          <div className="routine-grid">
            {routines.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                onShare={() => setSharing(routine)}
                onDelete={() => {
                  if (window.confirm(`Delete "${routine.name}"? This cannot be undone.`)) {
                    removeRoutine(routine.id)
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Try a workout</h2>
          <Link to="/workouts" className="section__link">
            All workouts
          </Link>
        </div>
        <div className="grid grid--wide">
          {CURATED_WORKOUTS.slice(1, 4).map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      </section>

      {sharing ? (
        <ShareDialog
          routine={routines.find((routine) => routine.id === sharing.id) ?? sharing}
          open
          onClose={() => setSharing(null)}
        />
      ) : null}
    </div>
  )
}
