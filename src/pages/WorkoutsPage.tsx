import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getExercise } from '@/exercises'
import { CATEGORY_LABEL } from '@/exercises/labels'
import { matchesQuery } from '@/exercises/search'
import { CURATED_WORKOUTS } from '@/workouts/curated'
import type { CuratedWorkout } from '@/workouts/types'
import { WorkoutCard } from '@/components/WorkoutCard'
import { SearchField } from '@/components/SearchField'
import { usePageMeta } from '@/app/meta'
import { useHydrated } from '@/app/hydration'
import { Icon } from '@/app/Icons'

function matchesWorkout(workout: CuratedWorkout, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const text = [workout.name, workout.summary, ...workout.focus.map((focus) => CATEGORY_LABEL[focus])].join(' ').toLowerCase()
  if (words.every((word) => text.includes(word))) {
    return true
  }
  return workout.items.some((item) => {
    const exercise = getExercise(item.exerciseId)
    return exercise ? matchesQuery(exercise, query) : false
  })
}

export function WorkoutsPage() {
  usePageMeta(
    'Free guided workouts',
    'Free guided home workouts including the classic 7-minute workout, HIIT cardio, abs, legs, weights, stretching, mobility, foam rolling, and yoga.',
  )
  const [query, setQuery] = useState('')
  const hydrated = useHydrated()
  const results = useMemo(
    () => (hydrated && query.trim() ? CURATED_WORKOUTS.filter((workout) => matchesWorkout(workout, query.trim())) : CURATED_WORKOUTS),
    [hydrated, query],
  )
  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">Workouts</h1>
        <p className="page__lead">
          Ready-made sessions with a voice coach and animated guides. Start one as is, or customize a copy with your own
          times, reps, sets, and rounds.
        </p>
        <div>
          <Link to="/app/routines/new" className="btn">
            <Icon name="plus" />
            Build your own routine
          </Link>
        </div>
      </header>
      <SearchField label="Search workouts" placeholder="Search by name, focus, or exercise" value={query} onChange={setQuery} />
      {results.length > 0 ? (
        <div className="grid grid--wide">
          {results.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>No workouts match “{query}”.</p>
          <button type="button" className="btn" onClick={() => setQuery('')}>
            Clear search
          </button>
        </div>
      )}
    </div>
  )
}
