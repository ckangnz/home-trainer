import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EXERCISES, getExercise } from '@/exercises'
import { ExerciseCard } from '@/components/ExerciseCard'
import { MuscleMap } from '@/components/MuscleMap'
import { Variations } from '@/components/Variations'
import { muscleLoad } from '@/exercises/muscles'
import { useFullExercise } from '@/exercises/content'
import { AddToRoutineDialog } from '@/components/AddToRoutineDialog'
import { AdUnit } from '@/ads/AdUnit'
import { useAuth } from '@/auth/AuthProvider'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { useContent, useExerciseText, useFormat, useT } from '@/i18n'
import { NotFoundPage } from './NotFoundPage'
import './exercise-detail.css'
import { ExerciseFigure } from '@/components/ExerciseFigure'

const SIDED_NOTE = {
  symmetric: null,
  alternating: 'publicPages.exerciseDetail.alternating',
  perSide: 'publicPages.exerciseDetail.perSide',
} as const

export function ExerciseDetailPage() {
  const { id = '' } = useParams()
  const exercise = getExercise(id)
  const details = useFullExercise(exercise?.id)
  const navigate = useNavigate()
  const { status, signIn } = useAuth()
  const [mirrored, setMirrored] = useState(false)
  const [adding, setAdding] = useState(false)
  const t = useT()
  const format = useFormat()
  const content = useContent()
  const { labels } = content
  const text = useExerciseText(details ?? exercise)
  usePageMeta(
    text ? t('publicPages.exerciseDetail.metaTitle', { name: text.name }) : t('publicPages.exerciseDetail.metaNotFound'),
    text ? t('publicPages.exerciseDetail.metaDescription', { summary: text.summary }) : undefined,
  )

  if (!exercise || !text) {
    return <NotFoundPage />
  }

  const related = EXERCISES.filter((candidate) => candidate.id !== exercise.id && candidate.category === exercise.category).slice(0, 6)
  const sidedNote = SIDED_NOTE[exercise.sided]
  const signedIn = status === 'signed-in'
  const guest = status === 'unconfigured'
  const requireSignIn = (action: () => void) => {
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
    <article className="page">
      <nav className="breadcrumbs" aria-label={t('publicPages.exerciseDetail.breadcrumb')}>
        <Link to="/exercises">{t('publicPages.exerciseDetail.exercises')}</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/exercises?category=${exercise.category}`}>{labels.category[exercise.category]}</Link>
      </nav>

      <div className="exercise-detail">
        <div className="exercise-detail__media">
          <div className="stage">
            <ExerciseFigure exerciseId={exercise.id} mirrored={mirrored} label={t('publicPages.exerciseDetail.demonstration', { name: text.name })} />
          </div>
          {exercise.sided === 'perSide' ? (
            <button type="button" className="btn btn--small" onClick={() => setMirrored((value) => !value)}>
              <Icon name="swap" />
              {t(mirrored ? 'publicPages.exerciseDetail.showFirstSide' : 'publicPages.exerciseDetail.showOtherSide')}
            </button>
          ) : null}
        </div>

        <div className="exercise-detail__info">
          <header className="stack">
            <h1 className="page__title">{text.name}</h1>
            <p className="page__lead">{text.summary}</p>
            <div className="chip-row">
              <span className="chip chip--static">{labels.level[exercise.level]}</span>
              <span className="chip chip--static">{labels.equipment[exercise.equipment]}</span>
              <span className="chip chip--static">{t(exercise.impact === 'high' ? 'publicPages.exerciseDetail.highImpact' : 'publicPages.exerciseDetail.lowImpact')}</span>
              <span className="chip chip--static">{t('publicPages.exerciseDetail.suggested', { target: format.target(exercise.defaultTarget, exercise.sided) })}</span>
            </div>
          </header>

          <div className="row row--wrap">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => requireSignIn(() => navigate(`/app/play/exercise/${exercise.id}`))}
            >
              <Icon name="play" />
              {t('publicPages.exerciseDetail.tryNow')}
            </button>
            <button type="button" className="btn" onClick={() => requireSignIn(() => setAdding(true))}>
              <Icon name="plus" />
              {t('publicPages.exerciseDetail.addToWorkout')}
            </button>
          </div>

          <section className="stack">
            <h2 className="section__title">{t('publicPages.exerciseDetail.howTo')}</h2>
            <ol className="steps">
              {(details ? text.steps : []).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {sidedNote ? <p className="faint">{t(sidedNote)}</p> : null}
          </section>

          <section className="stack">
            <h2 className="section__title">{t('publicPages.exerciseDetail.formTips')}</h2>
            <ul className="tips">
              {(details ? text.tips : []).map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>

          <section className="stack">
            <h2 className="section__title">{t('publicPages.exerciseDetail.muscles')}</h2>
            <MuscleMap load={muscleLoad([exercise])} size="md" label={t('publicPages.exerciseDetail.musclesLabel', { name: text.name })} legend />
            <div className="chip-row">
              {exercise.muscles.map((muscle) => (
                <span key={muscle} className="chip chip--static">
                  {labels.muscle[muscle]}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>

      <Variations exercise={exercise} />

      <AdUnit placement="content" />

      {related.length > 0 ? (
        <section className="section">
          <h2 className="section__title">{t('publicPages.exerciseDetail.more', { category: content.language === 'en' ? labels.category[exercise.category].toLowerCase() : labels.category[exercise.category] })}</h2>
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
