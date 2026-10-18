import { Link } from 'react-router-dom'
import { CURATED_WORKOUTS } from '@/workouts/curated'
import { WorkoutCard } from '@/components/WorkoutCard'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'

export function WorkoutsPage() {
  usePageMeta(
    'Free guided workouts',
    'Free guided home workouts including the classic 7-minute workout, HIIT cardio, abs, legs, upper body, stretching, and yoga.',
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
      <div className="grid grid--wide">
        {CURATED_WORKOUTS.map((workout) => (
          <WorkoutCard key={workout.id} workout={workout} />
        ))}
      </div>
    </div>
  )
}
