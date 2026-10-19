import { Link } from 'react-router-dom'
import { CATEGORY_LABEL, LEVEL_LABEL } from '@/exercises/labels'
import type { ExerciseInfo } from '@/exercises/types'
import './cards.css'
import { ExerciseFigure } from './ExerciseFigure'

export function ExerciseCard({ exercise, to }: { exercise: ExerciseInfo; to?: string }) {
  return (
    <Link to={to ?? `/exercises/${exercise.id}`} className="exercise-card">
      <div className="stage">
        <ExerciseFigure exerciseId={exercise.id} lazy label={`${exercise.name} demonstration`} />
      </div>
      <div className="exercise-card__body">
        <h3 className="exercise-card__name">{exercise.name}</h3>
        <p className="exercise-card__meta">
          {CATEGORY_LABEL[exercise.category]} · {LEVEL_LABEL[exercise.level]}
        </p>
      </div>
    </Link>
  )
}
