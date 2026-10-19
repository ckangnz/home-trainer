import { Link } from 'react-router-dom'
import { getExercise } from '@/exercises'
import { effectiveTarget, normalizeDefaults } from '@/workouts/routine'
import { estimateDurationMs } from '@/workouts/steps'
import { useContent, useFormat, useT } from '@/i18n'
import type { RoutineBody } from '@/workouts/types'
import './routine-list.css'
import { ExerciseFigure } from './ExerciseFigure'

export function RoutineStats({ body }: { body: RoutineBody }) {
  const defaults = normalizeDefaults(body.defaults)
  const moves = body.items.filter((item) => getExercise(item.exerciseId)).length
  const t = useT()
  const fmt = useFormat()
  return (
    <dl className="routine-stats">
      <div>
        <dt>{t('app.components.routineList.time')}</dt>
        <dd>{fmt.duration(estimateDurationMs(body, getExercise))}</dd>
      </div>
      <div>
        <dt>{t('app.components.routineList.moves')}</dt>
        <dd>{moves}</dd>
      </div>
      <div>
        <dt>{t('app.components.routineList.rounds')}</dt>
        <dd>{defaults.rounds}</dd>
      </div>
      <div>
        <dt>{t('app.components.routineList.rest')}</dt>
        <dd>{fmt.seconds(defaults.restSec)}</dd>
      </div>
    </dl>
  )
}

export function RoutineList({ body, linkExercises = true }: { body: RoutineBody; linkExercises?: boolean }) {
  const defaults = normalizeDefaults(body.defaults)
  const t = useT()
  const fmt = useFormat()
  const localized = useContent()
  return (
    <ol className="routine-list">
      {body.items.map((item, index) => {
        const exercise = getExercise(item.exerciseId)
        if (!exercise) {
          return (
            <li key={item.id} className="routine-list__item routine-list__item--missing">
              <span className="routine-list__index">{index + 1}</span>
              <span className="muted">{t('app.components.routineList.unavailable', { id: item.exerciseId })}</span>
            </li>
          )
        }
        const target = fmt.target(effectiveTarget(item, defaults), exercise.sided)
        const sets = item.sets && item.sets > 1 ? t('app.components.routineList.sets', { count: item.sets }) : ''
        const content = (
          <>
            <span className="routine-list__thumb stage">
              <ExerciseFigure exerciseId={exercise.id} lazy playing={false} label="" />
            </span>
            <span className="routine-list__text">
              <span className="routine-list__name">{localized.exerciseName(exercise)}</span>
              <span className="routine-list__target">
                {target}
                {sets}
              </span>
            </span>
          </>
        )
        return (
          <li key={item.id} className="routine-list__item">
            <span className="routine-list__index">{index + 1}</span>
            {linkExercises ? (
              <Link to={`/exercises/${exercise.id}`} className="routine-list__link">
                {content}
              </Link>
            ) : (
              <span className="routine-list__link">{content}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
