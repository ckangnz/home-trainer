import { variationsOf } from '@/exercises'
import { LEVEL_LABEL } from '@/exercises/labels'
import type { ExerciseInfo } from '@/exercises/types'

export function variantLabel(exercise: ExerciseInfo): string {
  return exercise.variant ?? exercise.name
}

export function VariationPicker({ exercise, onPick }: { exercise: ExerciseInfo; onPick: (next: ExerciseInfo) => void }) {
  const variations = variationsOf(exercise)
  if (variations.length < 2) {
    return null
  }
  return (
    <div className="stack stack--tight">
      <span className="ui-field__label">Variation</span>
      <div className="chip-row chip-row--scroll" role="group" aria-label={`${exercise.name} variations`}>
        {variations.map((option) => (
          <button
            key={option.id}
            type="button"
            className="chip"
            aria-pressed={option.id === exercise.id}
            title={`${option.name} · ${LEVEL_LABEL[option.level]}`}
            onClick={() => {
              if (option.id !== exercise.id) {
                onPick(option)
              }
            }}
          >
            {variantLabel(option)}
          </button>
        ))}
      </div>
    </div>
  )
}
