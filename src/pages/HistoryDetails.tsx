import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getExercise } from '@/exercises'
import { muscleLoad } from '@/exercises/muscles'
import type { Completion } from '@/data/models'
import { ExerciseFigure } from '@/components/ExerciseFigure'
import { MuscleMap } from '@/components/MuscleMap'
import { APPLE_ACTIVITY } from '@/health/activity'
import { completionActivity, type SourceItems } from '@/health/fromCompletion'
import { useContent, useFormat, useT } from '@/i18n'
import { Icon } from '@/app/Icons'

const TIME_FORMAT: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }

function replayPath(entry: Completion, exerciseIds: readonly string[], ownWorkouts: boolean): string | null {
  const { kind, id } = entry.source
  if (kind === 'curated') {
    return `/app/play/workout/${id}`
  }
  if (kind === 'routine') {
    return ownWorkouts ? `/app/play/routine/${id}` : null
  }
  if (kind === 'exercise') {
    return `/app/play/exercise/${id}`
  }
  return exerciseIds.length > 0 ? `/app/play/cooldown/${exerciseIds.join('~')}` : null
}

export function HistoryDetails({ entry, itemsOf, ownWorkouts = true }: { entry: Completion; itemsOf: SourceItems; ownWorkouts?: boolean }) {
  const t = useT()
  const fmt = useFormat()
  const content = useContent()
  const recorded = entry.exerciseIds ?? []
  const planned = recorded.length === 0
  const exerciseIds = useMemo(() => [...new Set(planned ? itemsOf(entry) : recorded)].filter((id) => getExercise(id)), [entry, itemsOf, planned, recorded])
  const load = useMemo(() => {
    const recordedMuscles = entry.muscles ?? []
    if (recordedMuscles.length > 0) {
      return muscleLoad(recordedMuscles.map((muscle, index) => ({ muscles: [muscle], weight: recordedMuscles.length - index })))
    }
    return muscleLoad(exerciseIds.flatMap((id) => {
      const exercise = getExercise(id)
      return exercise ? [{ exercise, weight: 1 }] : []
    }))
  }, [entry, exerciseIds])
  const muscles = entry.muscles?.length ? entry.muscles : []
  const replay = replayPath(entry, exerciseIds, ownWorkouts)

  return (
    <div className="history-details">
      <dl className="history-details__stats">
        <div>
          <dt>{t('app.history.started')}</dt>
          <dd>{fmt.date(entry.startedAt, TIME_FORMAT)}</dd>
        </div>
        <div>
          <dt>{t('app.history.finished')}</dt>
          <dd>{fmt.date(entry.completedAt, TIME_FORMAT)}</dd>
        </div>
        <div>
          <dt>{t('app.history.active')}</dt>
          <dd>{fmt.duration(entry.durationMs)}</dd>
        </div>
        {entry.calories !== undefined ? (
          <div>
            <dt>{t('app.history.calories')}</dt>
            <dd>{entry.calories} kcal</dd>
          </div>
        ) : null}
        <div className="history-details__wide">
          <dt>{t('app.history.healthType')}</dt>
          <dd>{APPLE_ACTIVITY[completionActivity(entry, itemsOf)]}</dd>
        </div>
      </dl>

      {Object.keys(load).length > 0 ? (
        <section className="history-details__muscles">
          <MuscleMap load={load} size="sm" label={t('app.history.musclesWorked')} />
          <div className="stack stack--tight">
            <h3 className="history-details__heading">{t('app.history.musclesWorked')}</h3>
            {muscles.length > 0 ? (
              <div className="chip-row">
                {muscles.slice(0, 6).map((muscle) => (
                  <span key={muscle} className="chip chip--static">
                    {content.labels.muscle[muscle]}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {exerciseIds.length > 0 ? (
        <section className="stack stack--tight">
          <h3 className="history-details__heading">
            {t('app.history.exercisesDone')}
            {planned ? <span className="faint"> · {t('app.history.fromPlan')}</span> : null}
          </h3>
          <ul className="history-details__moves">
            {exerciseIds.map((id) => {
              const exercise = getExercise(id)
              return exercise ? (
                <li key={id}>
                  <Link to={`/exercises/${id}`} className="history-details__move">
                    <span className="history-details__thumb stage">
                      <ExerciseFigure exerciseId={id} lazy playing={false} label="" />
                    </span>
                    <span>{content.exerciseName(exercise)}</span>
                  </Link>
                </li>
              ) : null
            })}
          </ul>
        </section>
      ) : null}

      {replay ? (
        <Link to={replay} className="btn btn--primary btn--small history-details__again">
          <Icon name="repeat" />
          {t('app.history.doAgain')}
        </Link>
      ) : null}
    </div>
  )
}
