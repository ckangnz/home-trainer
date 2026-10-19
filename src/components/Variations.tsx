import { Link } from 'react-router-dom'
import { variationsOf } from '@/exercises'
import { useContent, useT } from '@/i18n'
import type { ExerciseInfo } from '@/exercises/types'
import { ExerciseFigure } from './ExerciseFigure'
import { variantLabel } from './VariationPicker'
import './variations.css'

export function Variations({ exercise }: { exercise: ExerciseInfo }) {
  const variations = variationsOf(exercise)
  const t = useT()
  const content = useContent()
  const { labels } = content
  if (variations.length < 2 || !exercise.family) {
    return null
  }
  return (
    <section className="section">
      <h2 className="section__title">{t('app.components.variations.title', { family: labels.family[exercise.family] ?? t('app.components.variations.more') })}</h2>
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
                <strong>{variantLabel(option, content)}</strong>
                <span className="faint">
                  {labels.level[option.level]} · {labels.equipment[option.equipment]}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
