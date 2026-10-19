import { Link, useNavigate, useParams } from 'react-router-dom'
import { getCuratedWorkout } from '@/workouts/curated'
import { LEVEL_LABEL, formatSeconds } from '@/exercises/labels'
import { RoutineList, RoutineStats } from '@/components/RoutineList'
import { RoutineMuscles } from '@/components/RoutineMuscles'
import { useAuth } from '@/auth/AuthProvider'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { NotFoundPage } from './NotFoundPage'

export function WorkoutDetailPage() {
  const { id = '' } = useParams()
  const workout = getCuratedWorkout(id)
  const navigate = useNavigate()
  const { status, signIn } = useAuth()
  usePageMeta(workout ? workout.name : 'Workout not found', workout ? `${workout.summary} ${workout.description}` : undefined)

  if (!workout) {
    return <NotFoundPage />
  }

  const signedIn = status === 'signed-in'
  const guest = status === 'unconfigured'
  const whenSignedIn = (action: () => void) => {
    if (signedIn || guest) {
      action()
    } else {
      void signIn().then((ok) => {
        if (ok) {
          action()
        }
      })
    }
  }

  return (
    <article className="page page--narrow">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/workouts">Workouts</Link>
      </nav>
      <header className="page__header">
        <p className="eyebrow">{LEVEL_LABEL[workout.level]}</p>
        <h1 className="page__title">{workout.name}</h1>
        <p className="page__lead">{workout.summary}</p>
      </header>

      <RoutineStats body={workout} />

      <div className="row row--wrap">
        <button
          type="button"
          className="btn btn--primary btn--lg"
          onClick={() => whenSignedIn(() => navigate(`/app/play/workout/${workout.id}`))}
        >
          <Icon name="play" />
          Start workout
        </button>
        <button
          type="button"
          className="btn btn--lg"
          onClick={() => whenSignedIn(() => navigate(`/app/routines/new?from=${workout.id}`))}
        >
          <Icon name="edit" />
          Customize a copy
        </button>
      </div>

      <section className="prose">
        <p>{workout.description}</p>
        <p>
          Each move runs for {formatSeconds(workout.defaults.workSec)} unless noted, with {formatSeconds(workout.defaults.restSec)} of
          rest in between
          {workout.defaults.rounds > 1
            ? `, repeated for ${workout.defaults.rounds} rounds with ${formatSeconds(workout.defaults.roundRestSec)} between rounds`
            : ''}
          .
        </p>
      </section>

      <RoutineMuscles body={workout} />

      <section className="section">
        <h2 className="section__title">The moves</h2>
        <RoutineList body={workout} />
      </section>
    </article>
  )
}
