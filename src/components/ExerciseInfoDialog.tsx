import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ExerciseInfo } from '@/exercises/types'
import { useContent, useT } from '@/i18n'
import { Icon } from '@/app/Icons'
import { muscleLoad } from '@/exercises/muscles'
import { useFullExercise } from '@/exercises/content'
import { Dialog } from './Dialog'
import { MuscleMap } from './MuscleMap'
import '@/pages/exercise-detail.css'
import { ExerciseFigure } from './ExerciseFigure'

interface ExerciseInfoDialogProps {
  exercise: ExerciseInfo | null
  onClose: () => void
}

export function ExerciseInfoDialog({ exercise, onClose }: ExerciseInfoDialogProps) {
  const [mirrored, setMirrored] = useState(false)
  const details = useFullExercise(exercise?.id)
  const t = useT()
  const content = useContent()
  const { labels } = content
  const name = exercise ? content.exerciseName(exercise) : t('app.components.exerciseInfo.fallbackTitle')
  return (
    <Dialog open={exercise !== null} title={name} onClose={onClose}>
      {exercise ? (
        <div className="exercise-info stack">
          <div className="exercise-info__stage stage">
            <ExerciseFigure exerciseId={exercise.id} mirrored={mirrored} label={t('app.components.demonstration', { name })} />
          </div>
          {exercise.sided === 'perSide' ? (
            <button type="button" className="btn btn--small" onClick={() => setMirrored((value) => !value)}>
              <Icon name="swap" />
              {mirrored ? t('app.components.exerciseInfo.showFirst') : t('app.components.exerciseInfo.showOther')}
            </button>
          ) : null}
          <p className="muted">{content.exerciseSummary(exercise)}</p>
          <div className="chip-row">
            <span className="chip chip--static">{labels.level[exercise.level]}</span>
            <span className="chip chip--static">{labels.equipment[exercise.equipment]}</span>
            {exercise.muscles.slice(0, 3).map((muscle) => (
              <span key={muscle} className="chip chip--static">
                {labels.muscle[muscle]}
              </span>
            ))}
          </div>
          <MuscleMap load={muscleLoad([exercise])} size="sm" label={t('app.components.exerciseInfo.works', { name })} />
          <section className="stack stack--tight">
            <h3 className="section__title">{t('app.components.exerciseInfo.howTo')}</h3>
            <ol className="steps">
              {(details ? content.exerciseSteps(details) : []).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
          <section className="stack stack--tight">
            <h3 className="section__title">{t('app.components.exerciseInfo.tips')}</h3>
            <ul className="tips">
              {(details ? content.exerciseTips(details) : []).map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
          <Link to={`/exercises/${exercise.id}`} className="section__link" target="_blank" rel="noopener">
            {t('app.components.exerciseInfo.openPage')}
          </Link>
        </div>
      ) : null}
    </Dialog>
  )
}
