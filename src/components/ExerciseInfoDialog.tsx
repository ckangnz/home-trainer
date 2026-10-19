import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Exercise } from '@/exercises/types'
import { EQUIPMENT_LABEL, LEVEL_LABEL, MUSCLE_LABEL } from '@/exercises/labels'
import { Figure } from '@/figure/Figure'
import { Icon } from '@/app/Icons'
import { muscleLoad } from '@/exercises/muscles'
import { Dialog } from './Dialog'
import { MuscleMap } from './MuscleMap'
import '@/pages/exercise-detail.css'

interface ExerciseInfoDialogProps {
  exercise: Exercise | null
  onClose: () => void
}

export function ExerciseInfoDialog({ exercise, onClose }: ExerciseInfoDialogProps) {
  const [mirrored, setMirrored] = useState(false)
  return (
    <Dialog open={exercise !== null} title={exercise?.name ?? 'Exercise'} onClose={onClose}>
      {exercise ? (
        <div className="exercise-info stack">
          <div className="exercise-info__stage stage">
            <Figure animation={exercise.animation} mirrored={mirrored} label={`${exercise.name} demonstration`} />
          </div>
          {exercise.sided === 'perSide' ? (
            <button type="button" className="btn btn--small" onClick={() => setMirrored((value) => !value)}>
              <Icon name="swap" />
              Show {mirrored ? 'first' : 'other'} side
            </button>
          ) : null}
          <p className="muted">{exercise.summary}</p>
          <div className="chip-row">
            <span className="chip chip--static">{LEVEL_LABEL[exercise.level]}</span>
            <span className="chip chip--static">{EQUIPMENT_LABEL[exercise.equipment]}</span>
            {exercise.muscles.slice(0, 3).map((muscle) => (
              <span key={muscle} className="chip chip--static">
                {MUSCLE_LABEL[muscle]}
              </span>
            ))}
          </div>
          <MuscleMap load={muscleLoad([exercise])} size="sm" label={`${exercise.name} works`} />
          <section className="stack stack--tight">
            <h3 className="section__title">How to do it</h3>
            <ol className="steps">
              {exercise.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
          <section className="stack stack--tight">
            <h3 className="section__title">Form tips</h3>
            <ul className="tips">
              {exercise.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
          <Link to={`/exercises/${exercise.id}`} className="section__link" target="_blank" rel="noopener">
            Open full page
          </Link>
        </div>
      ) : null}
    </Dialog>
  )
}
