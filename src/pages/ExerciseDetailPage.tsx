import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Figure } from '@/figure/Figure'
import { EXERCISES, getExercise } from '@/exercises'
import { CATEGORY_LABEL, EQUIPMENT_LABEL, LEVEL_LABEL, MUSCLE_LABEL, formatTarget } from '@/exercises/labels'
import { ExerciseCard } from '@/components/ExerciseCard'
import { AddToRoutineDialog } from '@/components/AddToRoutineDialog'
import { AdUnit } from '@/ads/AdUnit'
import { useAuth } from '@/auth/AuthProvider'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { NotFoundPage } from './NotFoundPage'
import './exercise-detail.css'

const SIDED_NOTE = {
  symmetric: null,
  alternating: 'Alternate sides with each rep.',
  perSide: 'Work one side, then switch. Timed sets run once per side.',
} as const

export function ExerciseDetailPage() {
  const { id = '' } = useParams()
  const exercise = getExercise(id)
  const navigate = useNavigate()
  const { status, signIn } = useAuth()
  const [mirrored, setMirrored] = useState(false)
  const [adding, setAdding] = useState(false)
  usePageMeta(
    exercise ? `${exercise.name}: how to do it` : 'Exercise not found',
    exercise ? `${exercise.summary} Step-by-step instructions, form tips, and an animated demo.` : undefined,
  )

  if (!exercise) {
    return <NotFoundPage />
  }

  const related = EXERCISES.filter((candidate) => candidate.id !== exercise.id && candidate.category === exercise.category).slice(0, 6)
  const signedIn = status === 'signed-in'
  const requireSignIn = (action: () => void) => {
    if (signedIn) {
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
    <article className="page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/exercises">Exercises</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/exercises?category=${exercise.category}`}>{CATEGORY_LABEL[exercise.category]}</Link>
      </nav>

      <div className="exercise-detail">
        <div className="exercise-detail__media">
          <div className="stage">
            <Figure animation={exercise.animation} mirrored={mirrored} label={`${exercise.name} demonstration`} />
          </div>
          {exercise.sided === 'perSide' ? (
            <button type="button" className="btn btn--small" onClick={() => setMirrored((value) => !value)}>
              <Icon name="swap" />
              Show {mirrored ? 'first' : 'other'} side
            </button>
          ) : null}
        </div>

        <div className="exercise-detail__info">
          <header className="stack">
            <h1 className="page__title">{exercise.name}</h1>
            <p className="page__lead">{exercise.summary}</p>
            <div className="chip-row">
              <span className="chip chip--static">{LEVEL_LABEL[exercise.level]}</span>
              <span className="chip chip--static">{EQUIPMENT_LABEL[exercise.equipment]}</span>
              <span className="chip chip--static">{exercise.impact === 'high' ? 'High impact' : 'Low impact'}</span>
              <span className="chip chip--static">Suggested: {formatTarget(exercise.defaultTarget, exercise.sided)}</span>
            </div>
          </header>

          <div className="row row--wrap">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => requireSignIn(() => navigate(`/app/play/exercise/${exercise.id}`))}
            >
              <Icon name="play" />
              Try it now
            </button>
            <button type="button" className="btn" onClick={() => requireSignIn(() => setAdding(true))}>
              <Icon name="plus" />
              Add to a routine
            </button>
          </div>

          <section className="stack">
            <h2 className="section__title">How to do it</h2>
            <ol className="steps">
              {exercise.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {SIDED_NOTE[exercise.sided] ? <p className="faint">{SIDED_NOTE[exercise.sided]}</p> : null}
          </section>

          <section className="stack">
            <h2 className="section__title">Form tips</h2>
            <ul className="tips">
              {exercise.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>

          <section className="stack">
            <h2 className="section__title">Muscles worked</h2>
            <div className="chip-row">
              {exercise.muscles.map((muscle) => (
                <span key={muscle} className="chip chip--static">
                  {MUSCLE_LABEL[muscle]}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>

      <AdUnit placement="content" />

      {related.length > 0 ? (
        <section className="section">
          <h2 className="section__title">More {CATEGORY_LABEL[exercise.category].toLowerCase()}</h2>
          <div className="grid">
            {related.map((candidate) => (
              <ExerciseCard key={candidate.id} exercise={candidate} />
            ))}
          </div>
        </section>
      ) : null}

      {signedIn ? <AddToRoutineDialog exercise={exercise} open={adding} onClose={() => setAdding(false)} /> : null}
    </article>
  )
}
