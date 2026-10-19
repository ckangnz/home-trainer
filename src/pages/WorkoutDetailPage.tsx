import { Link, useNavigate, useParams } from 'react-router-dom'
import { getCuratedWorkout } from '@/workouts/curated'
import { RoutineList, RoutineStats } from '@/components/RoutineList'
import { RoutineMuscles } from '@/components/RoutineMuscles'
import { useAuth } from '@/auth/AuthProvider'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { useContent, useFormat, useT } from '@/i18n'
import { NotFoundPage } from './NotFoundPage'

export function WorkoutDetailPage() {
  const { id = '' } = useParams()
  const workout = getCuratedWorkout(id)
  const navigate = useNavigate()
  const { status, signIn } = useAuth()
  const t = useT()
  const format = useFormat()
  const content = useContent()
  const name = workout ? content.workoutName(workout) : ''
  const summary = workout ? content.workoutSummary(workout) : ''
  const description = workout ? content.workoutDescription(workout) : undefined
  usePageMeta(workout ? name : t('publicPages.workoutDetail.metaNotFound'), workout ? `${summary} ${description}` : undefined)

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
      <nav className="breadcrumbs" aria-label={t('publicPages.workoutDetail.breadcrumb')}>
        <Link to="/workouts">{t('publicPages.workoutDetail.workouts')}</Link>
      </nav>
      <header className="page__header">
        <p className="eyebrow">{content.labels.level[workout.level]}</p>
        <h1 className="page__title">{name}</h1>
        <p className="page__lead">{summary}</p>
      </header>

      <RoutineStats body={workout} />

      <div className="row row--wrap">
        <button
          type="button"
          className="btn btn--primary btn--lg"
          onClick={() => whenSignedIn(() => navigate(`/app/play/workout/${workout.id}`))}
        >
          <Icon name="play" />
          {t('publicPages.workoutDetail.start')}
        </button>
        <button
          type="button"
          className="btn btn--lg"
          onClick={() => whenSignedIn(() => navigate(`/app/routines/new?from=${workout.id}`))}
        >
          <Icon name="edit" />
          {t('publicPages.workoutDetail.customize')}
        </button>
      </div>

      <section className="prose">
        <p>{description}</p>
        <p>
          {t(workout.defaults.rounds > 1 ? 'publicPages.workoutDetail.timingRounds' : 'publicPages.workoutDetail.timing', {
            work: format.seconds(workout.defaults.workSec),
            rest: format.seconds(workout.defaults.restSec),
            rounds: workout.defaults.rounds,
            roundRest: format.seconds(workout.defaults.roundRestSec),
          })}
        </p>
      </section>

      <RoutineMuscles body={workout} />

      <section className="section">
        <h2 className="section__title">{t('publicPages.workoutDetail.moves')}</h2>
        <RoutineList body={workout} />
      </section>
    </article>
  )
}
