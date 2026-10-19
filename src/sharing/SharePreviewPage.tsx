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
import { RoutineMuscles } from '@/components/RoutineMuscles'
import { useToast } from '@/app/Toast'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { useT, type MessageKey } from '@/i18n'
import { formatCode, parseCode } from './code'

type Load = { status: 'loading' } | { status: 'error'; message: MessageKey } | { status: 'ready'; share: SharedRoutine }

export function SharePreviewPage() {
  const { code: raw = '' } = useParams()
  const code = parseCode(raw)
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const { status, signIn } = useAuth()
  const { routines, createRoutine } = useData()
  const { notify } = useToast()
  const navigate = useNavigate()
  const t = useT()
  usePageMeta(
    load.status === 'ready' ? t('social.sharePreview.titleWithName', { name: load.share.routine.name }) : t('social.sharePreview.title'),
    t('social.sharePreview.description'),
  )

  useEffect(() => {
    let cancelled = false
    if (code === null) {
      setLoad({ status: 'error', message: 'social.sharePreview.invalid' })
      return
    }
    if (!isFirebaseConfigured) {
      setLoad({ status: 'error', message: 'social.sharePreview.unconfigured' })
      return
    }
    setLoad({ status: 'loading' })
    loadRepository()
      .then((repository) => repository.fetchShare(code))
      .then((share) => {
        if (!cancelled) {
          setLoad(share ? { status: 'ready', share } : { status: 'error', message: 'social.sharePreview.missing' })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoad({ status: 'error', message: 'social.sharePreview.loadFailed' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [code])

  if (load.status === 'loading') {
    return (
      <div className="center" role="status" aria-label={t('social.sharePreview.loading')}>
        <div className="spinner" />
      </div>
    )
  }

  if (load.status === 'error') {
    return (
      <div className="page page--narrow">
        <div className="empty">
          <p>{t(load.message)}</p>
          <div className="row row--wrap">
            <Link to="/app/import" className="btn btn--primary">
              {t('social.sharePreview.tryAnother')}
            </Link>
            <Link to="/workouts" className="btn">
              {t('social.sharePreview.browse')}
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
    notify(t('social.sharePreview.added', { name: routine.name }))
    navigate('/app')
  }

  return (
    <article className="page page--narrow">
      <header className="page__header">
        <p className="eyebrow">{t('social.sharePreview.eyebrow', { code: formatCode(share.code) })}</p>
        <h1 className="page__title">{share.routine.name}</h1>
        {share.routine.description ? <p className="page__lead">{share.routine.description}</p> : null}
      </header>

      <RoutineStats body={share.routine} />

      {missing > 0 ? (
        <p className="notice">{t('social.sharePreview.skipped', { count: missing })}</p>
      ) : null}

      <div className="row row--wrap">
        {status === 'signed-in' ? (
          <>
            <button type="button" className="btn btn--primary btn--lg" onClick={add}>
              <Icon name="plus" />
              {existing ? t('social.sharePreview.addAnother') : t('social.sharePreview.addToMine')}
            </button>
            {existing ? (
              <Link to={`/app/play/routine/${existing.id}`} className="btn btn--lg">
                <Icon name="play" />
                {t('social.sharePreview.playCopy')}
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
            {t('social.sharePreview.signInToAdd')}
          </button>
        )}
      </div>

      <RoutineMuscles body={share.routine} />

      <section className="section">
        <h2 className="section__title">{t('social.sharePreview.moves')}</h2>
        <RoutineList body={share.routine} />
      </section>
    </article>
  )
}
