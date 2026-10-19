import { variationsOf } from '@/exercises'
import { useContent, useT, type Localizer } from '@/i18n'
import type { ExerciseInfo } from '@/exercises/types'

export function variantLabel(exercise: ExerciseInfo, content?: Localizer): string {
  return content ? (content.exerciseVariant(exercise) ?? content.exerciseName(exercise)) : (exercise.variant ?? exercise.name)
}

export function VariationPicker({ exercise, onPick }: { exercise: ExerciseInfo; onPick: (next: ExerciseInfo) => void }) {
  const variations = variationsOf(exercise)
  const t = useT()
  const content = useContent()
  if (variations.length < 2) {
    return null
  }
  return (
    <div className="stack stack--tight">
      <span className="ui-field__label">{t('app.components.variations.label')}</span>
      <div className="chip-row chip-row--scroll" role="group" aria-label={t('app.components.variations.group', { name: content.exerciseName(exercise) })}>
        {variations.map((option) => (
          <button
            key={option.id}
            type="button"
            className="chip"
            aria-pressed={option.id === exercise.id}
            title={`${content.exerciseName(option)} · ${content.labels.level[option.level]}`}
            onClick={() => {
              if (option.id !== exercise.id) {
                onPick(option)
              }
            }}
          >
            {variantLabel(option, content)}
          </button>
        ))}
      </div>
    </div>
  )
}
