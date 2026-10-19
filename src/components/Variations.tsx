import { Link } from 'react-router-dom'
import { variationsOf } from '@/exercises'
import { EQUIPMENT_LABEL, LEVEL_LABEL } from '@/exercises/labels'
import { FAMILY_LABEL } from '@/exercises/families'
import type { ExerciseInfo } from '@/exercises/types'
import { ExerciseFigure } from './ExerciseFigure'
import { variantLabel } from './VariationPicker'
import './variations.css'

export function Variations({ exercise }: { exercise: ExerciseInfo }) {
  const variations = variationsOf(exercise)
  if (variations.length < 2 || !exercise.family) {
    return null
  }
  return (
    <section className="section">
      <h2 className="section__title">{FAMILY_LABEL[exercise.family] ?? 'More'} variations</h2>
      <ul className="variations">
        {variations.map((option) => (
          <li key={option.id}>
            <Link
              to={`/exercises/${option.id}`}
              className="variation card card--flush"
              aria-current={option.id === exercise.id ? 'page' : undefined}
            >
              <span className="variation__stage stage">
                <ExerciseFigure exerciseId={option.id} lazy playing={false} label="" />
              </span>
              <span className="variation__text">
                <strong>{variantLabel(option)}</strong>
                <span className="faint">
                  {LEVEL_LABEL[option.level]} · {EQUIPMENT_LABEL[option.equipment]}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
