import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EXERCISES } from '@/exercises'
import { CATEGORY_LABEL, CATEGORY_ORDER, MUSCLE_LABEL } from '@/exercises/labels'
import type { Category } from '@/exercises/types'
import { ExerciseCard } from '@/components/ExerciseCard'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'

function isCategory(value: string | null): value is Category {
  return value !== null && (CATEGORY_ORDER as string[]).includes(value)
}

export function ExercisesPage() {
  const [params, setParams] = useSearchParams()
  const category = isCategory(params.get('category')) ? (params.get('category') as Category) : null
  const query = params.get('q') ?? ''
  usePageMeta(
    category ? `${CATEGORY_LABEL[category]} exercises` : 'Exercise library',
    'Browse animated bodyweight exercises for cardio, strength, core, stretching, and yoga, each with step-by-step instructions and form tips.',
  )

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return EXERCISES.filter((exercise) => {
      if (category && exercise.category !== category && !exercise.tags.includes(category)) {
        return false
      }
      if (!needle) {
        return true
      }
      const haystack = [exercise.name, exercise.summary, ...exercise.muscles.map((muscle) => MUSCLE_LABEL[muscle])]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [category, query])

  const update = (next: { category?: Category | null; q?: string }) => {
    const merged = new URLSearchParams(params)
    if (next.category !== undefined) {
      if (next.category) {
        merged.set('category', next.category)
      } else {
        merged.delete('category')
      }
    }
    if (next.q !== undefined) {
      if (next.q) {
        merged.set('q', next.q)
      } else {
        merged.delete('q')
      }
    }
    setParams(merged, { replace: true })
  }

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">Exercise library</h1>
        <p className="page__lead">
          {EXERCISES.length} bodyweight moves with animated demos. Tap any exercise for instructions, then add it to your
          own routine.
        </p>
      </header>

      <div className="stack">
        <label className="search">
          <Icon name="search" />
          <span className="visually-hidden">Search exercises</span>
          <input
            type="search"
            className="ui-control"
            placeholder="Search by name or muscle"
            value={query}
            onChange={(event) => update({ q: event.target.value })}
          />
        </label>
        <div className="chip-row chip-row--scroll" role="group" aria-label="Filter by category">
          <button type="button" className="chip" aria-pressed={category === null} onClick={() => update({ category: null })}>
            All
          </button>
          {CATEGORY_ORDER.map((entry) => (
            <button
              key={entry}
              type="button"
              className="chip"
              aria-pressed={category === entry}
              onClick={() => update({ category: category === entry ? null : entry })}
            >
              {CATEGORY_LABEL[entry]}
            </button>
          ))}
        </div>
      </div>

      {results.length > 0 ? (
        <div className="grid">
          {results.map((exercise) => (
            <ExerciseCard key={exercise.id} exercise={exercise} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>No exercises match your search.</p>
          <button type="button" className="btn" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
