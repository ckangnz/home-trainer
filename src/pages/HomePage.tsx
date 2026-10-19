import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { useData } from '@/data/DataProvider'
import { getExercise } from '@/exercises'
import { lastDays, summarizeStreak } from '@/history/streaks'
import { ShareDialog } from '@/sharing/ShareDialog'
import { CURATED_WORKOUTS, getCuratedWorkout } from '@/workouts/curated'
import { estimateDurationMs } from '@/workouts/steps'
import type { Routine } from '@/workouts/types'
import { WorkoutCard } from '@/components/WorkoutCard'
import { TRAINERS } from '@/figure/look'
import { useSettings } from '@/settings/settings'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { useContent, useFormat, useLanguage, useT, type TFunction } from '@/i18n'
import './home.css'
import { ExerciseFigure } from '@/components/ExerciseFigure'

function greeting(t: TFunction, date: Date): string {
  const hour = date.getHours()
  return hour < 12 ? t('app.home.morning') : hour < 18 ? t('app.home.afternoon') : t('app.home.evening')
}

function RoutineCard({ routine, onShare, onDelete }: { routine: Routine; onShare: () => void; onDelete: () => void }) {
  const preview = routine.items.map((item) => getExercise(item.exerciseId)).find(Boolean)
  const moves = routine.items.filter((item) => getExercise(item.exerciseId)).length
  const t = useT()
  const fmt = useFormat()
  return (
    <article className="routine-card card">
      <div className="routine-card__main">
        <div className="routine-card__thumb stage">
          {preview ? <ExerciseFigure exerciseId={preview.id} lazy playing={false} label="" /> : null}
        </div>
        <div className="routine-card__body">
          <h3 className="routine-card__name">{routine.name}</h3>
          <p className="faint">
            {t('units.moves', { count: moves })} · {fmt.duration(estimateDurationMs(routine, getExercise))}
            {routine.defaults.rounds > 1 ? t('app.home.card.rounds', { count: routine.defaults.rounds }) : ''}
          </p>
          {routine.shareCode || routine.source?.kind === 'friend' ? (
            <div className="routine-card__tags">
              {routine.shareCode ? <span className="badge">{t('app.home.card.shared')}</span> : null}
              {routine.source?.kind === 'friend' ? <span className="badge">{t('app.home.card.from', { name: routine.source.ownerName ?? t('app.home.card.aFriend') })}</span> : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="routine-card__actions">
        <Link
          to={`/app/play/routine/${routine.id}`}
          className={`btn btn--primary routine-card__play${moves === 0 ? ' is-disabled' : ''}`}
          aria-disabled={moves === 0}
          onClick={(event) => {
            if (moves === 0) {
              event.preventDefault()
            }
          }}
        >
          <Icon name="play" />
          {t('app.home.card.play')}
        </Link>
        <Link to={`/app/routines/${routine.id}`} className="btn btn--icon routine-card__tool" aria-label={t('app.home.card.editName', { name: routine.name })} title={t('common.edit')}>
          <Icon name="edit" />
        </Link>
        <button type="button" className="btn btn--icon routine-card__tool" aria-label={t('app.home.card.shareName', { name: routine.name })} title={t('common.share')} onClick={onShare}>
          <Icon name="share" />
        </button>
        <button
          type="button"
          className="btn btn--icon routine-card__tool routine-card__tool--danger"
          aria-label={t('app.home.card.deleteName', { name: routine.name })}
          title={t('common.delete')}
          onClick={onDelete}
        >
          <Icon name="trash" />
        </button>
      </div>
    </article>
  )
}

export function HomePage() {
  const t = useT()
  const fmt = useFormat()
  const content = useContent()
  const language = useLanguage()
  usePageMeta(t('app.home.metaTitle'))
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
          {firstName ? t('app.home.greetingName', { greeting: greeting(t, today), name: firstName }) : greeting(t, today)}
        </h1>
        <p className="muted">
          {streak.current > 0
            ? t('app.home.onStreak', { count: streak.current })
            : t('app.home.ready')}
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
              <p className="faint">{t('app.home.streakBest', { best: streak.longest })}</p>
            </div>
          </div>
          <ol className="week" aria-label={t('app.home.lastSevenDays')}>
            {week.map((day) => (
              <li key={day.key} className={`week__day${day.active ? ' is-active' : ''}${day.today ? ' is-today' : ''}`}>
                <span className="week__dot" />
                <span className="week__label">{language === 'en' ? day.label : fmt.date(`${day.key}T12:00:00`, { weekday: 'narrow' })}</span>
              </li>
            ))}
          </ol>
        </div>
        {classic ? (
          <Link to={`/app/play/workout/${classic.id}`} className="quick-start card">
            <div className="quick-start__text">
              <span className="badge badge--accent">{t('app.home.quickStart', { trainer: TRAINERS[settings.trainer].name })}</span>
              <h2 className="quick-start__title">{content.workoutName(classic)}</h2>
              <p className="muted">{content.workoutSummary(classic)}</p>
              <span className="btn btn--primary">
                <Icon name="play" />
                {t('app.home.startNow')}
              </span>
            </div>
            {cheer ? (
              <div className="quick-start__stage stage">
                <ExerciseFigure exerciseId={cheer.id} label={t('app.home.warmingUp', { trainer: TRAINERS[settings.trainer].name })} />
              </div>
            ) : null}
          </Link>
        ) : null}
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">{t('app.home.myWorkouts')}</h2>
          <div className="row">
            <Link to="/app/import" className="btn btn--small">
              <Icon name="download" />
              {t('app.home.importCode')}
            </Link>
            <Link to="/app/routines/new" className="btn btn--small btn--primary">
              <Icon name="plus" />
              {t('app.home.new')}
            </Link>
          </div>
        </div>
        {!ready ? (
          <div className="center" role="status" aria-label={t('app.home.loadingWorkouts')}>
            <div className="spinner" />
          </div>
        ) : routines.length === 0 ? (
          <div className="empty">
            <p>{t('app.home.empty')}</p>
            <div className="row row--wrap">
              <button type="button" className="btn btn--primary" onClick={() => navigate('/app/routines/new')}>
                <Icon name="plus" />
                {t('app.home.createWorkout')}
              </button>
              <Link to="/app/import" className="btn">
                {t('app.home.importACode')}
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
                  if (window.confirm(t('app.home.confirmDelete', { name: routine.name }))) {
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
          <h2 className="section__title">{t('app.home.tryWorkout')}</h2>
          <Link to="/workouts" className="section__link">
            {t('app.home.allWorkouts')}
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
