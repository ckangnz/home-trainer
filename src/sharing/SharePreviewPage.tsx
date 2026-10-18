import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { useData } from '@/data/DataProvider'
import { isFirebaseConfigured } from '@/data/config'
import { loadRepository } from '@/data/lazy'
import type { SharedRoutine } from '@/data/models'
import { getExercise } from '@/exercises'
import { withFreshIds } from '@/workouts/routine'
import { RoutineList, RoutineStats } from '@/components/RoutineList'
import { useToast } from '@/app/Toast'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { formatCode, parseCode } from './code'

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; share: SharedRoutine }

export function SharePreviewPage() {
  const { code: raw = '' } = useParams()
  const code = parseCode(raw)
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const { status, signIn } = useAuth()
  const { routines, createRoutine } = useData()
  const { notify } = useToast()
  const navigate = useNavigate()
  usePageMeta(
    load.status === 'ready' ? `${load.share.routine.name} — shared routine` : 'Shared routine',
    'Preview a workout routine shared with you and add your own copy to HomeTrainer.',
  )

  useEffect(() => {
    let cancelled = false
    if (code === null) {
      setLoad({ status: 'error', message: 'That does not look like a valid share code.' })
      return
    }
    if (!isFirebaseConfigured) {
      setLoad({ status: 'error', message: 'Shared routines are unavailable because Firebase is not configured.' })
      return
    }
    setLoad({ status: 'loading' })
    loadRepository()
      .then((repository) => repository.fetchShare(code))
      .then((share) => {
        if (!cancelled) {
          setLoad(share ? { status: 'ready', share } : { status: 'error', message: 'This code does not exist or sharing was stopped.' })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoad({ status: 'error', message: 'Could not load this routine. Check your connection and try again.' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [code])

  if (load.status === 'loading') {
    return (
      <div className="center" role="status" aria-label="Loading shared routine">
        <div className="spinner" />
      </div>
    )
  }

  if (load.status === 'error') {
    return (
      <div className="page page--narrow">
        <div className="empty">
          <p>{load.message}</p>
          <div className="row row--wrap">
            <Link to="/app/import" className="btn btn--primary">
              Try another code
            </Link>
            <Link to="/workouts" className="btn">
              Browse workouts
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { share } = load
  const missing = share.routine.items.filter((item) => !getExercise(item.exerciseId)).length
  const existing = routines.find((routine) => routine.source?.kind === 'share' && routine.source.code === share.code)

  const add = () => {
    const body = withFreshIds({ ...share.routine, items: share.routine.items.filter((item) => getExercise(item.exerciseId)) })
    const routine = createRoutine(body, { kind: 'share', code: share.code })
    notify(`Added ${routine.name} to your routines`)
    navigate('/app')
  }

  return (
    <article className="page page--narrow">
      <header className="page__header">
        <p className="eyebrow">Shared routine · {formatCode(share.code)}</p>
        <h1 className="page__title">{share.routine.name}</h1>
        {share.routine.description ? <p className="page__lead">{share.routine.description}</p> : null}
      </header>

      <RoutineStats body={share.routine} />

      {missing > 0 ? (
        <p className="notice">
          {missing} exercise{missing === 1 ? ' is' : 's are'} not available in this version of HomeTrainer and will be
          skipped.
        </p>
      ) : null}

      <div className="row row--wrap">
        {status === 'signed-in' ? (
          <>
            <button type="button" className="btn btn--primary btn--lg" onClick={add}>
              <Icon name="plus" />
              {existing ? 'Add another copy' : 'Add to my routines'}
            </button>
            {existing ? (
              <Link to={`/app/play/routine/${existing.id}`} className="btn btn--lg">
                <Icon name="play" />
                Play my copy
              </Link>
            ) : null}
          </>
        ) : (
          <button
            type="button"
            className="btn btn--primary btn--lg"
            onClick={() => {
              void signIn()
            }}
          >
            Sign in to add this routine
          </button>
        )}
      </div>

      <section className="section">
        <h2 className="section__title">The moves</h2>
        <RoutineList body={share.routine} />
      </section>
    </article>
  )
}
