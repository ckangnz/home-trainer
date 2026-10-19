import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EXERCISES } from '@/exercises'
import { CATEGORY_LABEL, CATEGORY_ORDER, GEAR_LABEL, GEAR_ORDER, gearGroup, type GearGroup } from '@/exercises/labels'
import type { Category } from '@/exercises/types'
import { matchesQuery } from '@/exercises/search'
import { ExerciseCard } from '@/components/ExerciseCard'
import { SearchField } from '@/components/SearchField'
import { usePageMeta } from '@/app/meta'
import { useHydrated } from '@/app/hydration'

function isCategory(value: string | null): value is Category {
  return value !== null && (CATEGORY_ORDER as string[]).includes(value)
}

const EMPTY_PARAMS = new URLSearchParams()

function isGear(value: string | null): value is GearGroup {
  return value !== null && (GEAR_ORDER as string[]).includes(value)
}

export function ExercisesPage() {
  const [urlParams, setParams] = useSearchParams()
  const hydrated = useHydrated()
  const params = hydrated ? urlParams : EMPTY_PARAMS
  const category = isCategory(params.get('category')) ? (params.get('category') as Category) : null
  const query = params.get('q') ?? ''
  const gear = isGear(params.get('gear')) ? (params.get('gear') as GearGroup) : null
  usePageMeta(
    category ? `${CATEGORY_LABEL[category]} exercises` : 'Exercise library',
    'Browse animated exercises for cardio, bodyweight strength, weights, core, stretching, mobility, foam rolling, and yoga, each with step-by-step instructions and form tips.',
  )

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return EXERCISES.filter((exercise) => {
      if (category && exercise.category !== category && !exercise.tags.includes(category)) {
        return false
      }
      if (gear && gearGroup(exercise.equipment) !== gear) {
        return false
      }
      if (!needle) {
        return true
      }
      return matchesQuery(exercise, needle)
    })
  }, [category, query, gear])

  const update = (next: { category?: Category | null; q?: string; gear?: GearGroup | null }) => {
    const merged = new URLSearchParams(urlParams)
    if (next.gear !== undefined) {
      if (next.gear) {
        merged.set('gear', next.gear)
      } else {
        merged.delete('gear')
      }
    }
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
          {EXERCISES.length} moves with animated demos, from bodyweight and weights to stretching and foam rolling. Tap
          any exercise for instructions, then add it to your own routine.
        </p>
      </header>

      <div className="stack">
        <SearchField label="Search exercises" placeholder="Search by name, muscle, or equipment" value={query} onChange={(q) => update({ q })} />
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
        <div className="chip-row chip-row--scroll" role="group" aria-label="Filter by equipment">
          <button type="button" className="chip" aria-pressed={gear === null} onClick={() => update({ gear: null })}>
            Any equipment
          </button>
          {GEAR_ORDER.map((entry) => (
            <button
              key={entry}
              type="button"
              className="chip"
              aria-pressed={gear === entry}
              onClick={() => update({ gear: gear === entry ? null : entry })}
            >
              {GEAR_LABEL[entry]}
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
