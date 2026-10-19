import { Link } from 'react-router-dom'
import { getExercise } from '@/exercises'
import { estimateDurationMs } from '@/workouts/steps'
import { useContent, useFormat, useT } from '@/i18n'
import type { CuratedWorkout } from '@/workouts/types'
import './cards.css'
import { ExerciseFigure } from './ExerciseFigure'

export function WorkoutCard({ workout }: { workout: CuratedWorkout }) {
  const preview = workout.items.map((item) => getExercise(item.exerciseId)).find((exercise) => exercise !== undefined)
  const t = useT()
  const fmt = useFormat()
  const content = useContent()
  const duration = fmt.duration(estimateDurationMs(workout, getExercise))
  return (
    <Link to={`/workouts/${workout.id}`} className="workout-card">
      <div className="stage stage--wide">
        {preview ? <ExerciseFigure exerciseId={preview.id} lazy label={t('app.components.demonstration', { name: content.exerciseName(preview) })} aspect={4 / 3} /> : null}
        <span className="workout-card__duration badge">{duration}</span>
      </div>
      <div className="workout-card__body">
        <h3 className="workout-card__name">{content.workoutName(workout)}</h3>
        <p className="workout-card__summary">{content.workoutSummary(workout)}</p>
        <p className="workout-card__meta">
          {t('app.components.workoutCard.meta', { count: workout.items.length, level: content.labels.level[workout.level] })}
          {workout.defaults.rounds > 1 ? t('app.components.workoutCard.rounds', { count: workout.defaults.rounds }) : ''}
        </p>
      </div>
    </Link>
  )
}
