import { Link } from 'react-router-dom'
import { useContent, useT } from '@/i18n'
import type { ExerciseInfo } from '@/exercises/types'
import './cards.css'
import { ExerciseFigure } from './ExerciseFigure'

export function ExerciseCard({ exercise, to }: { exercise: ExerciseInfo; to?: string }) {
  const t = useT()
  const content = useContent()
  const name = content.exerciseName(exercise)
  return (
    <Link to={to ?? `/exercises/${exercise.id}`} className="exercise-card">
      <div className="stage">
        <ExerciseFigure exerciseId={exercise.id} lazy label={t('app.components.demonstration', { name })} />
      </div>
      <div className="exercise-card__body">
        <h3 className="exercise-card__name">{name}</h3>
        <p className="exercise-card__meta">
          {content.labels.category[exercise.category]} · {content.labels.level[exercise.level]}
        </p>
      </div>
    </Link>
  )
}
