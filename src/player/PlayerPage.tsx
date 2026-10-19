import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EXERCISES, getExercise } from '@/exercises'
import { getFullExercise, useExercisesLoaded } from '@/exercises/content'
import { muscleLoad } from '@/exercises/muscles'
import type { ExerciseInfo } from '@/exercises/types'
import { useData } from '@/data/DataProvider'
import { useAuth } from '@/auth/AuthProvider'
import type { CompletionSource } from '@/data/models'
import { summarizeStreak } from '@/history/streaks'
import { AdUnit } from '@/ads/AdUnit'
import { shouldRequestPauseAd, shouldRequestSummaryAd } from '@/ads/policy'
import { updateSettings, useSettings } from '@/settings/settings'
import { TRAINERS } from '@/figure/look'
import { getCuratedWorkout } from '@/workouts/curated'
import { DEFAULT_ROUTINE_DEFAULTS } from '@/workouts/routine'
import { expandRoutine, formatClock, workStepCount } from '@/workouts/steps'
import type { PauseStep, PlaybackStep, RoutineBody, WorkStep } from '@/workouts/types'
import { COOLDOWN_SEPARATOR, cooldownBody, cooldownId, suggestCooldown } from '@/workouts/cooldown'
import { estimateCalories, primaryCategory, workedMuscles, type WorkedExercise } from '@/workouts/summary'
import type { HealthWorkout } from '@/health/export'
import { HealthExportDialog } from '@/health/HealthExportDialog'
import { MuscleMap } from '@/components/MuscleMap'
import { RoutineMuscles } from '@/components/RoutineMuscles'
import { RoutineList, RoutineStats } from '@/components/RoutineList'
import { Confetti, ShareResultButton, SupportCard } from '@/components/Support'
import { TimerRing } from '@/components/TimerRing'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { activeDurationMs, currentStep, type WorkLogEntry, progressFraction, stepElapsed, stepLimitMs, stepRemaining } from './machine'
import { usePlayer, type PlayerControls } from './usePlayer'
import { useWakeLock } from './useWakeLock'
import './player.css'
import { ExerciseFigure } from '@/components/ExerciseFigure'
import { useContent, useFormat, useLanguage, useT, type Localizer, type TFunction } from '@/i18n'

interface Session {
  title: string
  body: RoutineBody
  source: CompletionSource
  exitTo: string
}

function sessionTitle(session: Session, content: Localizer, t: TFunction): string {
  const { source } = session
  if (source.kind === 'curated') {
    return content.workoutName({ id: source.id, name: session.title })
  }
  if (source.kind === 'exercise') {
    return content.exerciseName({ id: source.id, name: session.title })
  }
  if (source.kind === 'cooldown') {
    return t('player.cooldown.name')
  }
  return session.title
}

function sessionDescription(session: Session, content: Localizer, t: TFunction): string | undefined {
  const { source } = session
  if (source.kind === 'curated') {
    return content.workoutDescription({ id: source.id, description: session.body.description })
  }
  if (source.kind === 'cooldown') {
    return t('player.cooldown.description')
  }
  return session.body.description
}

function useSessionText(session: Session): { title: string; description: string | undefined } {
  const content = useContent()
  const t = useT()
  return { title: sessionTitle(session, content, t), description: sessionDescription(session, content, t) }
}

type Resolution = { status: 'loading' } | { status: 'missing' } | { status: 'ready'; session: Session }

function useSession(kind: string, id: string): Resolution {
  const { ready, getRoutine } = useData()
  const { status } = useAuth()
  if (kind === 'workout') {
    const workout = getCuratedWorkout(id)
    return workout
      ? { status: 'ready', session: { title: workout.name, body: workout, source: { kind: 'curated', id }, exitTo: `/workouts/${id}` } }
      : { status: 'missing' }
  }
  if (kind === 'exercise') {
    const exercise = getExercise(id)
    if (!exercise) {
      return { status: 'missing' }
    }
    const body: RoutineBody = {
      name: exercise.name,
      defaults: { ...DEFAULT_ROUTINE_DEFAULTS, getReadySec: 5 },
      items: [{ id: 'single', exerciseId: exercise.id, target: exercise.defaultTarget }],
    }
    return { status: 'ready', session: { title: exercise.name, body, source: { kind: 'exercise', id }, exitTo: `/exercises/${id}` } }
  }
  if (kind === 'cooldown') {
    const exercises = id
      .split(COOLDOWN_SEPARATOR)
      .slice(0, 12)
      .map((entry) => getExercise(entry))
      .filter((exercise): exercise is ExerciseInfo => exercise !== undefined)
    if (exercises.length === 0) {
      return { status: 'missing' }
    }
    const body = cooldownBody(exercises)
    return { status: 'ready', session: { title: body.name, body, source: { kind: 'cooldown', id: 'stretch' }, exitTo: '/app' } }
  }
  if (kind === 'routine') {
    if (status !== 'signed-in' && status !== 'loading') {
      return { status: 'missing' }
    }
    if (!ready) {
      return { status: 'loading' }
    }
    const routine = getRoutine(id)
    return routine
      ? { status: 'ready', session: { title: routine.name, body: routine, source: { kind: 'routine', id }, exitTo: '/app' } }
      : { status: 'missing' }
  }
  return { status: 'missing' }
}

export function PlayerPage() {
  const { kind = '', id = '' } = useParams()
  const resolution = useSession(kind, id)
  const content = useContent()
  const t = useT()
  usePageMeta(resolution.status === 'ready' ? sessionTitle(resolution.session, content, t) : t('player.pageTitle'))

  if (resolution.status === 'loading') {
    return (
      <div className="player player--center" role="status" aria-label={t('player.loading')}>
        <div className="spinner" />
      </div>
    )
  }
  if (resolution.status === 'missing') {
    return (
      <div className="player player--center">
        <div className="empty">
          <p>{t('player.missing')}</p>
          <Link to="/app" className="btn btn--primary">
            {t('player.backHome')}
          </Link>
        </div>
      </div>
    )
  }
  return <LoadedSession key={`${kind}/${id}`} session={resolution.session} />
}

function LoadedSession({ session }: { session: Session }) {
  const ids = useMemo(() => session.body.items.map((item) => item.exerciseId), [session])
  const ready = useExercisesLoaded(ids)
  const t = useT()
  if (!ready) {
    return (
      <div className="player player--center" role="status" aria-label={t('player.loading')}>
        <div className="spinner" />
      </div>
    )
  }
  return <PlayerSession session={session} />
}

const PAUSE_TITLE = {
  getReady: 'player.pauseTitle.getReady',
  item: 'player.pauseTitle.rest',
  set: 'player.pauseTitle.rest',
  round: 'player.pauseTitle.round',
  switch: 'player.pauseTitle.switch',
} as const satisfies Record<PauseStep['reason'], string>

interface SessionSummary {
  worked: WorkedExercise[]
  calories: number
  muscles: ReturnType<typeof workedMuscles>
  activeMs: number
  health: HealthWorkout
}

function summarize(title: string, log: WorkLogEntry[], activeMs: number, weightKg: number, startedAt: number, endedAt: number): SessionSummary {
  const worked = log
    .map((entry) => ({ exercise: getExercise(entry.exerciseId), ms: entry.ms }))
    .filter((entry): entry is WorkedExercise => entry.exercise !== undefined)
  const calories = estimateCalories(worked, activeMs, weightKg)
  return {
    worked,
    calories,
    muscles: workedMuscles(worked),
    activeMs,
    health: {
      title,
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date(endedAt).toISOString(),
      activeMs,
      calories,
      category: primaryCategory(worked),
      exercises: worked.length,
    },
  }
}

function exerciseOf(step: WorkStep | undefined): ExerciseInfo | undefined {
  return step ? getExercise(step.exerciseId) : undefined
}

function targetLabel(step: WorkStep, exercise: ExerciseInfo | undefined, t: TFunction, reps: (count: number) => string): string {
  const base = step.target.kind === 'reps' ? reps(step.target.reps) : formatClock(step.target.ms)
  if (exercise?.sided === 'perSide' && step.side) {
    return t(step.side === 'left' ? 'player.work.targetLeft' : 'player.work.targetRight', { base })
  }
  return base
}

function PlayerSession({ session }: { session: Session }) {
  const [frozen] = useState(session)
  const navigate = useNavigate()
  const { addCompletion, completions } = useData()
  const settings = useSettings()
  const t = useT()
  const text = useSessionText(frozen)
  const language = useLanguage()
  const coachContent = useContent()
  const steps = useMemo(() => expandRoutine(frozen.body, getExercise), [frozen])
  const totalWork = useMemo(() => workStepCount(steps), [steps])
  const coachContext = useMemo(
    () => ({
      nameOf: (exerciseId: string) => {
        const exercise = getExercise(exerciseId)
        return exercise ? coachContent.exerciseName(exercise) : t('player.coachNextExercise')
      },
      tipOf: (exerciseId: string) => coachContent.exerciseTips({ id: exerciseId, tips: getFullExercise(exerciseId)?.tips })[0],
      trainer: settings.trainer,
      trainerName: TRAINERS[settings.trainer].name,
      language,
    }),
    [settings.trainer, language, coachContent, t],
  )
  const player = usePlayer(steps, coachContext)
  const { state, now } = player
  const wallStart = useRef(0)
  const recorded = useRef(new Set<number>())
  const lastAdAt = useRef<number | null>(null)
  const [adKey, setAdKey] = useState<string | null>(null)
  const active = state.status === 'running' || state.status === 'paused'
  const stepKey = `${state.runId}:${state.status === 'finished' ? 'done' : state.index}`

  useWakeLock(settings.keepAwake && active)

  const start = useCallback(() => {
    wallStart.current = Date.now()
    player.start()
  }, [player])

  useEffect(() => {
    if (state.status === 'ready') {
      return
    }
    const time = performance.now()
    const context = { enteredBy: state.enteredBy, lastRequestAt: lastAdAt.current, now: time }
    const allowed =
      state.status === 'finished' ? shouldRequestSummaryAd(context) : shouldRequestPauseAd(currentStep(state), context)
    if (allowed) {
      lastAdAt.current = time
      setAdKey(stepKey)
    }
    // Ads are decided once per step entry; later re-renders of the same step must not request again.
  }, [stepKey])

  const finished = state.status === 'finished'
  const summary = useMemo(() => {
    if (!finished || state.startedAt === null || state.finishedAt === null) {
      return null
    }
    const endedAt = wallStart.current + (state.finishedAt - state.startedAt)
    return summarize(text.title, state.workLog, Math.round(activeDurationMs(state, state.finishedAt)), settings.weightKg, wallStart.current, endedAt)
  }, [finished, state, text.title, settings.weightKg])

  useEffect(() => {
    if (summary === null || state.completedWork === 0 || recorded.current.has(state.runId)) {
      return
    }
    recorded.current.add(state.runId)
    const completion = {
      id: `${frozen.source.kind}-${frozen.source.id}-${wallStart.current}`,
      title: frozen.title,
      source: frozen.source,
      startedAt: summary.health.startedAt,
      completedAt: summary.health.endedAt,
      durationMs: summary.activeMs,
      exercises: state.completedWork,
      totalExercises: totalWork,
      calories: summary.calories,
      muscles: summary.muscles,
      exerciseIds: [...new Set(summary.worked.map((entry) => entry.exercise.id))].slice(0, 80),
    }
    addCompletion(completion)
  }, [summary, state.completedWork, state.runId, addCompletion, frozen, totalWork])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
        return
      }
      const step = currentStep(state)
      if (event.key === ' ') {
        event.preventDefault()
        if (state.status === 'running') {
          player.pause()
        } else if (state.status === 'paused') {
          player.resume()
        } else if (state.status === 'ready') {
          start()
        }
      } else if (event.key === 'ArrowRight') {
        player.next()
      } else if (event.key === 'ArrowLeft') {
        player.previous()
      } else if (event.key === 'Enter' && step?.kind === 'work' && step.target.kind === 'reps') {
        player.done()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state, player, start])

  const exit = () => {
    if (active && !window.confirm(t('player.confirmEnd'))) {
      return
    }
    navigate(frozen.exitTo)
  }

  const muted = !settings.voice && !settings.beeps
  const step = currentStep(state)

  return (
    <div className="player" data-phase={state.status === 'finished' ? 'done' : state.status === 'ready' ? 'ready' : step?.kind}>
      <header className="player__top">
        <button type="button" className="btn btn--ghost btn--icon" aria-label={t('player.endWorkout')} onClick={exit}>
          <Icon name="close" />
        </button>
        <div className="player__progress" aria-label={t('player.progress')}>
          <div className="player__progress-bar" style={{ transform: `scaleX(${progressFraction(state)})` }} />
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--icon"
          aria-label={muted ? t('player.soundOn') : t('player.mute')}
          aria-pressed={muted}
          onClick={() => updateSettings(muted ? { voice: true, beeps: true } : { voice: false, beeps: false })}
        >
          <Icon name="volume" style={{ opacity: muted ? 0.4 : 1 }} />
        </button>
      </header>

      <div className="player__body" inert={state.status === 'paused' ? true : undefined} aria-hidden={state.status === 'paused' ? true : undefined}>
      {state.status === 'ready' ? (
        <ReadyView session={frozen} onStart={start} />
      ) : state.status === 'finished' ? (
        <DoneView
          session={frozen}
          summary={summary}
          durationMs={activeDurationMs(state, now)}
          exercises={state.completedWork}
          total={totalWork}
          streak={summarizeStreak(completions, new Date()).current}
          showAd={adKey === stepKey}
          adKey={adKey}
          onAgain={start}
        />
      ) : step?.kind === 'work' ? (
        <WorkView player={player} step={step} />
      ) : step ? (
        <PauseView player={player} step={step} steps={steps} showAd={adKey === stepKey} adKey={adKey} />
      ) : null}
      </div>

      {state.status === 'paused' ? (
        <div className="player__overlay" role="dialog" aria-label={t('player.paused')}>
          <div className="stack">
            <h2 className="page__title">{t('player.paused')}</h2>
            <button type="button" className="btn btn--primary btn--lg" onClick={player.resume}>
              <Icon name="play" />
              {t('player.resume')}
            </button>
            <button type="button" className="btn btn--lg" onClick={exit}>
              {t('player.endWorkout')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ReadyView({ session, onStart }: { session: Session; onStart: () => void }) {
  const settings = useSettings()
  const t = useT()
  const content = useContent()
  const text = useSessionText(session)
  const trainer = TRAINERS[settings.trainer]
  const first = session.body.items.map((item) => getExercise(item.exerciseId)).find(Boolean)
  const firstName = first ? content.exerciseName(first) : ''
  return (
    <div className="player__scroll">
      <div className="ready">
        <header className="page__header">
          <h1 className="page__title">{text.title}</h1>
          {text.description ? <p className="muted">{text.description}</p> : null}
        </header>
        {first ? (
          <div className="trainer-hello">
            <div className="trainer-hello__stage stage">
              <ExerciseFigure exerciseId={first.id} label={t('player.ready.demonstrating', { trainer: trainer.name, exercise: firstName })} />
            </div>
            <p className="trainer-hello__bubble">
              {t('player.ready.hello', { trainer: trainer.name, exercise: firstName.toLowerCase() })}
            </p>
          </div>
        ) : null}
        <RoutineStats body={session.body} />
        <RoutineMuscles body={session.body} />
        <button type="button" className="btn btn--primary btn--lg btn--block" onClick={onStart}>
          <Icon name="play" />
          {t('player.ready.start')}
        </button>
        <p className="faint">{t('player.ready.tip')}</p>
        <RoutineList body={session.body} linkExercises={false} />
      </div>
    </div>
  )
}

function WorkView({ player, step }: { player: PlayerControls; step: WorkStep }) {
  const { state, now } = player
  const t = useT()
  const content = useContent()
  const exercise = exerciseOf(step)
  const name = exercise ? content.exerciseName(exercise) : t('player.work.fallbackName')
  const running = state.status === 'running'
  const limit = stepLimitMs(state)
  const remaining = stepRemaining(state, now)
  const meta = [
    t('player.work.exerciseOf', { item: step.item, items: step.items }),
    step.sets > 1 ? t('player.work.setOf', { set: step.set, sets: step.sets }) : null,
    step.rounds > 1 ? t('player.work.roundOf', { round: step.round, rounds: step.rounds }) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="work">
      <div className="work__stage stage">
        {exercise ? (
          <ExerciseFigure
            exerciseId={exercise.id}
            mirrored={step.side === 'right'}
            playing={running}
            restartKey={`${state.runId}-${state.index}`}
            label={t('player.work.demonstration', { name })}
          />
        ) : null}
        {step.side ? (
          <span className="work__side badge badge--accent">{step.side === 'left' ? t('player.work.leftSide') : t('player.work.rightSide')}</span>
        ) : null}
      </div>
      <div className="work__info">
        <p className="faint">{meta}</p>
        <h1 className="work__name">{name}</h1>
        {limit !== null && remaining !== null ? (
          <TimerRing fraction={remaining / limit} label={t('player.work.remaining', { time: formatClock(remaining) })}>
            <span className="work__clock">{formatClock(remaining)}</span>
          </TimerRing>
        ) : step.target.kind === 'reps' ? (
          <div className="reps">
            <span className="reps__count tabular">{step.target.reps}</span>
            <span className="reps__unit">{step.side ? t('player.work.repsUnitSide') : t('player.work.repsUnit')}</span>
            <span className="faint tabular">{formatClock(stepElapsed(state, now))}</span>
          </div>
        ) : null}
      </div>
      <div className="player__controls">
        <button type="button" className="btn btn--icon control" aria-label={t('player.work.previous')} onClick={player.previous}>
          <Icon name="previous" />
        </button>
        {step.target.kind === 'reps' ? (
          <button type="button" className="btn btn--primary btn--lg control control--main" onClick={player.done}>
            <Icon name="check" />
            {t('player.work.done')}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary btn--icon control control--round"
            aria-label={running ? t('player.pause') : t('player.resume')}
            onClick={running ? player.pause : player.resume}
          >
            <Icon name={running ? 'pause' : 'play'} />
          </button>
        )}
        <button type="button" className="btn btn--icon control" aria-label={t('player.work.skip')} onClick={player.next}>
          <Icon name="next" />
        </button>
      </div>
      {step.target.kind === 'reps' ? (
        <button type="button" className="btn btn--ghost btn--small work__pause" onClick={running ? player.pause : player.resume}>
          <Icon name={running ? 'pause' : 'play'} />
          {running ? t('player.pause') : t('player.resume')}
        </button>
      ) : null}
    </div>
  )
}

function roundTitle(step: PauseStep, steps: PlaybackStep[], index: number, t: TFunction): string {
  if (step.reason !== 'round') {
    return t(PAUSE_TITLE[step.reason])
  }
  const finished = steps.slice(0, index).reverse().find((candidate): candidate is WorkStep => candidate.kind === 'work')
  return finished ? t('player.pauseTitle.roundNumber', { round: finished.round }) : t(PAUSE_TITLE.round)
}

function PauseView({
  player,
  step,
  steps,
  showAd,
  adKey,
}: {
  player: PlayerControls
  step: PauseStep
  steps: PlaybackStep[]
  showAd: boolean
  adKey: string | null
}) {
  const { state, now } = player
  const t = useT()
  const content = useContent()
  const fmt = useFormat()
  const next = steps[step.nextWork]
  const nextWork = next?.kind === 'work' ? next : undefined
  const exercise = exerciseOf(nextWork)
  const limit = stepLimitMs(state) ?? step.durationMs
  const remaining = stepRemaining(state, now) ?? 0
  const switching = step.reason === 'switch'

  return (
    <div className="player__scroll">
      <div className="pause">
        <p className="pause__title">{roundTitle(step, steps, state.index, t)}</p>
        <TimerRing fraction={remaining / limit} tone="rest" size="lg" label={t('player.rest.secondsLeft', { n: Math.ceil(remaining / 1000) })}>
          <span className="pause__count tabular">{Math.ceil(remaining / 1000)}</span>
          <span className="faint">{t('player.rest.seconds')}</span>
        </TimerRing>
        <div className="row row--wrap pause__controls">
          <button type="button" className="btn" onClick={() => player.extend(10000)}>
            <Icon name="plus" />
            {fmt.seconds(10)}
          </button>
          <button type="button" className="btn btn--primary" onClick={player.next}>
            {t('player.rest.skip')}
            <Icon name="next" />
          </button>
        </div>
        {exercise && nextWork ? (
          <section className="up-next card" aria-label={t('player.rest.upNext')}>
            <div className="up-next__media stage">
              <ExerciseFigure
                exerciseId={exercise.id}
                mirrored={nextWork.side === 'right'}
                playing={state.status === 'running'}
                label={t('player.work.demonstration', { name: content.exerciseName(exercise) })}
              />
            </div>
            <div className="stack stack--tight">
              <p className="faint">{switching ? t('player.rest.otherSide') : t('player.rest.upNext')}</p>
              <h2 className="up-next__name">{content.exerciseName(exercise)}</h2>
              <p className="muted">{targetLabel(nextWork, exercise, t, fmt.reps)}</p>
              {!switching ? (
                <ol className="up-next__steps">
                  {content.exerciseSteps({ id: exercise.id, steps: getFullExercise(exercise.id)?.steps }).slice(0, 3).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ol>
              ) : null}
            </div>
          </section>
        ) : null}
        {showAd && !switching ? <AdUnit key={adKey ?? 'rest'} placement="rest" className="pause__ad" /> : null}
      </div>
    </div>
  )
}

function DoneView({
  session,
  summary,
  durationMs,
  exercises,
  total,
  streak,
  showAd,
  adKey,
  onAgain,
}: {
  session: Session
  summary: SessionSummary | null
  durationMs: number
  exercises: number
  total: number
  streak: number
  showAd: boolean
  adKey: string | null
  onAgain: () => void
}) {
  const settings = useSettings()
  const navigate = useNavigate()
  const t = useT()
  const fmt = useFormat()
  const content = useContent()
  const { muscle: muscleLabel } = content.labels
  const text = useSessionText(session)
  const trainerName = TRAINERS[settings.trainer].name
  const [exporting, setExporting] = useState(false)
  const [roller, setRoller] = useState(false)
  const cheer = getExercise('jumping-jacks')
  const worked = summary?.worked ?? []
  const load = useMemo(() => muscleLoad(worked.map((entry) => ({ exercise: entry.exercise, weight: entry.ms }))), [worked])
  const isCooldown = session.source.kind === 'cooldown'
  const stretches = useMemo(
    () =>
      isCooldown || !summary
        ? []
        : suggestCooldown(summary.muscles, EXERCISES, {
            count: 5,
            exclude: worked.map((entry) => entry.exercise.id),
            equipment: roller ? 'roller' : 'none',
          }),
    [isCooldown, summary, worked, roller],
  )

  return (
    <div className="player__scroll">
      <Confetti />
      <div className="done">
        {cheer ? (
          <div className="done__stage stage">
            <ExerciseFigure exerciseId={cheer.id} fps={60} label={t('player.done.celebrating', { trainer: trainerName })} />
          </div>
        ) : null}
        <h1 className="page__title">{isCooldown ? t('player.done.stretched') : t('player.done.complete')}</h1>
        <p className="muted">{t('player.done.proud', { title: text.title, trainer: trainerName })}</p>
        <dl className="routine-stats done__stats">
          <div>
            <dt>{t('player.done.time')}</dt>
            <dd>{fmt.duration(durationMs)}</dd>
          </div>
          <div>
            <dt>{t('player.done.moves')}</dt>
            <dd>
              {exercises}/{total}
            </dd>
          </div>
          <div>
            <dt>{t('player.done.calories')}</dt>
            <dd>{summary ? t('units.calories', { n: summary.calories }) : '–'}</dd>
          </div>
          <div>
            <dt>{t('player.done.streak')}</dt>
            <dd>{t('units.days', { count: streak })}</dd>
          </div>
        </dl>
        <div className="done__actions">
          <Link to="/app" className="btn btn--primary btn--lg btn--block">
            <Icon name="check" />
            {t('player.done.done')}
          </Link>
          <div className="done__tools">
            <button type="button" className="btn done__tool" onClick={onAgain}>
              <Icon name="repeat" />
              {t('player.done.again')}
            </button>
            {summary ? (
              <button type="button" className="btn done__tool" onClick={() => setExporting(true)}>
                <Icon name="heart" />
                {t('player.done.saveHealth')}
              </button>
            ) : null}
            <ShareResultButton title={text.title} minutes={Math.max(1, Math.round(durationMs / 60000))} className="btn done__tool" />
          </div>
        </div>

        {summary && summary.muscles.length > 0 ? (
          <section className="card done__muscles">
            <h2 className="section__title">{t('player.done.muscles')}</h2>
            <MuscleMap load={load} size="md" legend />
            <div className="chip-row done__chips">
              {summary.muscles.slice(0, 6).map((muscle) => (
                <span key={muscle} className="chip chip--static">
                  {muscleLabel[muscle]}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {stretches.length > 0 ? (
          <section className="card done__cooldown">
            <div className="section__head">
              <div className="stack stack--tight">
                <h2 className="section__title">{t('player.done.cooldownTitle')}</h2>
                <p className="faint">{t('player.done.cooldownHint', { n: Math.ceil((stretches.length * 50) / 60) })}</p>
              </div>
            </div>
            <label className="switch done__roller">
              <span className="stack stack--tight">
                <strong>{t('player.done.roller')}</strong>
                <span className="faint">{t('player.done.rollerHint')}</span>
              </span>
              <input type="checkbox" checked={roller} onChange={(event) => setRoller(event.target.checked)} />
            </label>
            <ul className="done__stretch-list">
              {stretches.map((exercise) => (
                <li key={exercise.id} className="done__stretch">
                  <span className="done__stretch-thumb stage">
                    <ExerciseFigure exerciseId={exercise.id} lazy playing={false} label="" />
                  </span>
                  <span className="stack stack--tight">
                    <strong>{content.exerciseName(exercise)}</strong>
                    <span className="faint">{exercise.muscles.slice(0, 2).map((muscle) => muscleLabel[muscle]).join(' · ')}</span>
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="btn btn--primary btn--lg btn--block"
              onClick={() => navigate(`/app/play/cooldown/${cooldownId(stretches)}`)}
            >
              <Icon name="play" />
              {t('player.done.startCooldown')}
            </button>
          </section>
        ) : null}

        <SupportCard />
        {showAd ? <AdUnit key={adKey ?? 'done'} placement="rest" className="done__ad" /> : null}
        {summary ? <HealthExportDialog workout={summary.health} open={exporting} onClose={() => setExporting(false)} /> : null}
      </div>
    </div>
  )
}
