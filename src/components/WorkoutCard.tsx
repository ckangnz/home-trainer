import { Link } from 'react-router-dom'
import { Figure } from '@/figure/Figure'
import { getExercise } from '@/exercises'
import { LEVEL_LABEL } from '@/exercises/labels'
import { estimateDurationMs, formatDuration } from '@/workouts/steps'
import type { CuratedWorkout } from '@/workouts/types'
import './cards.css'

export function WorkoutCard({ workout }: { workout: CuratedWorkout }) {
  const preview = workout.items.map((item) => getExercise(item.exerciseId)).find((exercise) => exercise !== undefined)
  const duration = formatDuration(estimateDurationMs(workout, getExercise))
  return (
    <Link to={`/workouts/${workout.id}`} className="workout-card">
      <div className="stage stage--wide">
        {preview ? <Figure animation={preview.animation} label={`${preview.name} demonstration`} aspect={4 / 3} /> : null}
        <span className="workout-card__duration badge">{duration}</span>
      </div>
      <div className="workout-card__body">
        <h3 className="workout-card__name">{workout.name}</h3>
        <p className="workout-card__summary">{workout.summary}</p>
        <p className="workout-card__meta">
          {workout.items.length} moves · {LEVEL_LABEL[workout.level]}
          {workout.defaults.rounds > 1 ? ` · ${workout.defaults.rounds} rounds` : ''}
        </p>
      </div>
    </Link>
  )
}
