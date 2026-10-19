import { useMemo, useState } from 'react'
import { EXERCISES } from '@/exercises'
import { CATEGORY_LABEL, CATEGORY_ORDER, LEVEL_LABEL } from '@/exercises/labels'
import type { Category, ExerciseInfo } from '@/exercises/types'
import { matchesQuery } from '@/exercises/search'
import { Icon } from '@/app/Icons'
import { Dialog } from './Dialog'
import { SearchField } from './SearchField'
import { ExerciseFigure } from './ExerciseFigure'

interface ExercisePickerProps {
  open: boolean
  onClose: () => void
  onPick: (exercise: ExerciseInfo) => void
}

export function ExercisePicker({ open, onClose, onPick }: ExercisePickerProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | null>(null)
  const [added, setAdded] = useState(0)

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return EXERCISES.filter((exercise) => {
      if (category && exercise.category !== category && !exercise.tags.includes(category)) {
        return false
      }
      if (!needle) {
        return true
      }
      return matchesQuery(exercise, needle)
    })
  }, [query, category])

  const close = () => {
    setAdded(0)
    onClose()
  }

  return (
    <Dialog open={open} title="Add exercises" onClose={close}>
      <SearchField label="Search exercises" placeholder="Search by name, muscle, or equipment" value={query} onChange={setQuery} />
      <div className="chip-row chip-row--scroll" role="group" aria-label="Filter by category">
        <button type="button" className="chip" aria-pressed={category === null} onClick={() => setCategory(null)}>
          All
        </button>
        {CATEGORY_ORDER.map((entry) => (
          <button
            key={entry}
            type="button"
            className="chip"
            aria-pressed={category === entry}
            onClick={() => setCategory(category === entry ? null : entry)}
          >
            {CATEGORY_LABEL[entry]}
          </button>
        ))}
      </div>
      <ul className="picker-list">
        {results.map((exercise) => (
          <li key={exercise.id}>
            <button
              type="button"
              className="picker-item"
              onClick={() => {
                onPick(exercise)
                setAdded((count) => count + 1)
              }}
            >
              <span className="picker-item__thumb stage">
                <ExerciseFigure exerciseId={exercise.id} lazy playing={false} label="" />
              </span>
              <span className="picker-item__text">
                <span className="picker-item__name">{exercise.name}</span>
                <span className="faint">
                  {CATEGORY_LABEL[exercise.category]} · {LEVEL_LABEL[exercise.level]}
                </span>
              </span>
              <Icon name="plus" />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn--primary" onClick={close}>
        {added > 0 ? `Done · added ${added}` : 'Done'}
      </button>
    </Dialog>
  )
}
