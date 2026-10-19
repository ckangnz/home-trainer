import { Link } from 'react-router-dom'
import { getExercise } from '@/exercises'
import { formatSeconds, formatTarget } from '@/exercises/labels'
import { effectiveTarget, normalizeDefaults } from '@/workouts/routine'
import { estimateDurationMs, formatDuration } from '@/workouts/steps'
import type { RoutineBody } from '@/workouts/types'
import './routine-list.css'
import { ExerciseFigure } from './ExerciseFigure'

export function RoutineStats({ body }: { body: RoutineBody }) {
  const defaults = normalizeDefaults(body.defaults)
  const moves = body.items.filter((item) => getExercise(item.exerciseId)).length
  return (
    <dl className="routine-stats">
      <div>
        <dt>Time</dt>
        <dd>{formatDuration(estimateDurationMs(body, getExercise))}</dd>
      </div>
      <div>
        <dt>Moves</dt>
        <dd>{moves}</dd>
      </div>
      <div>
        <dt>Rounds</dt>
        <dd>{defaults.rounds}</dd>
      </div>
      <div>
        <dt>Rest</dt>
        <dd>{formatSeconds(defaults.restSec)}</dd>
      </div>
    </dl>
  )
}

export function RoutineList({ body, linkExercises = true }: { body: RoutineBody; linkExercises?: boolean }) {
  const defaults = normalizeDefaults(body.defaults)
  return (
    <ol className="routine-list">
      {body.items.map((item, index) => {
        const exercise = getExercise(item.exerciseId)
        if (!exercise) {
          return (
            <li key={item.id} className="routine-list__item routine-list__item--missing">
              <span className="routine-list__index">{index + 1}</span>
              <span className="muted">Unavailable exercise ({item.exerciseId})</span>
            </li>
          )
        }
        const target = formatTarget(effectiveTarget(item, defaults), exercise.sided)
        const sets = item.sets && item.sets > 1 ? ` × ${item.sets} sets` : ''
        const content = (
          <>
            <span className="routine-list__thumb stage">
              <ExerciseFigure exerciseId={exercise.id} lazy playing={false} label="" />
            </span>
            <span className="routine-list__text">
              <span className="routine-list__name">{exercise.name}</span>
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
