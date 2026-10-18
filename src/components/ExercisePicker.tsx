import { useMemo, useState } from 'react'
import { EXERCISES } from '@/exercises'
import { CATEGORY_LABEL, CATEGORY_ORDER, LEVEL_LABEL, MUSCLE_LABEL } from '@/exercises/labels'
import type { Category, Exercise } from '@/exercises/types'
import { Figure } from '@/figure/Figure'
import { Icon } from '@/app/Icons'
import { Dialog } from './Dialog'

interface ExercisePickerProps {
  open: boolean
  onClose: () => void
  onPick: (exercise: Exercise) => void
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
      return [exercise.name, ...exercise.muscles.map((muscle) => MUSCLE_LABEL[muscle])].join(' ').toLowerCase().includes(needle)
    })
  }, [query, category])

  const close = () => {
    setAdded(0)
    onClose()
  }

  return (
    <Dialog open={open} title="Add exercises" onClose={close}>
      <label className="search">
        <Icon name="search" />
        <span className="visually-hidden">Search exercises</span>
        <input
          type="search"
          className="ui-control"
          placeholder="Search by name or muscle"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
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
                <Figure animation={exercise.animation} playing={false} label="" />
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
