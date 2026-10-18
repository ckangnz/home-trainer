import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getExercise } from '@/exercises'
import type { Exercise } from '@/exercises/types'
import { Figure } from '@/figure/Figure'
import { useData } from '@/data/DataProvider'
import type { CompletionSource } from '@/data/models'
import { summarizeStreak } from '@/history/streaks'
import { AdUnit } from '@/ads/AdUnit'
import { shouldRequestPauseAd, shouldRequestSummaryAd } from '@/ads/policy'
import { updateSettings, useSettings } from '@/settings/settings'
import { getCuratedWorkout } from '@/workouts/curated'
import { DEFAULT_ROUTINE_DEFAULTS } from '@/workouts/routine'
import { expandRoutine, formatClock, formatDuration, workStepCount } from '@/workouts/steps'
import type { PauseStep, PlaybackStep, RoutineBody, WorkStep } from '@/workouts/types'
import { RoutineList, RoutineStats } from '@/components/RoutineList'
import { TimerRing } from '@/components/TimerRing'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { activeDurationMs, currentStep, progressFraction, stepElapsed, stepLimitMs, stepRemaining } from './machine'
import { usePlayer, type PlayerControls } from './usePlayer'
import { useWakeLock } from './useWakeLock'
import './player.css'

interface Session {
  title: string
  body: RoutineBody
  source: CompletionSource
  exitTo: string
}

type Resolution = { status: 'loading' } | { status: 'missing' } | { status: 'ready'; session: Session }

function useSession(kind: string, id: string): Resolution {
  const { ready, getRoutine } = useData()
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
  if (kind === 'routine') {
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
  usePageMeta(resolution.status === 'ready' ? resolution.session.title : 'Workout')

  if (resolution.status === 'loading') {
    return (
      <div className="player player--center" role="status" aria-label="Loading workout">
        <div className="spinner" />
      </div>
    )
  }
  if (resolution.status === 'missing') {
    return (
      <div className="player player--center">
        <div className="empty">
          <p>This workout is not available.</p>
          <Link to="/app" className="btn btn--primary">
            Back home
          </Link>
        </div>
      </div>
    )
  }
  return <PlayerSession key={`${kind}/${id}`} session={resolution.session} />
}

const PAUSE_TITLE: Record<PauseStep['reason'], string> = {
  getReady: 'Get ready',
  item: 'Rest',
  set: 'Rest',
  round: 'Round complete',
  switch: 'Switch sides',
}

function exerciseOf(step: WorkStep | undefined): Exercise | undefined {
  return step ? getExercise(step.exerciseId) : undefined
}

function targetLabel(step: WorkStep, exercise: Exercise | undefined): string {
  const base = step.target.kind === 'reps' ? `${step.target.reps} reps` : formatClock(step.target.ms)
  return exercise?.sided === 'perSide' && step.side ? `${base} · ${step.side} side` : base
}

function PlayerSession({ session }: { session: Session }) {
  const [frozen] = useState(session)
  const navigate = useNavigate()
  const { addCompletion, completions } = useData()
  const settings = useSettings()
  const steps = useMemo(() => expandRoutine(frozen.body, getExercise), [frozen])
  const totalWork = useMemo(() => workStepCount(steps), [steps])
  const nameOf = useCallback((exerciseId: string) => getExercise(exerciseId)?.name ?? 'the next exercise', [])
  const player = usePlayer(steps, nameOf)
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

  useEffect(() => {
    if (state.status !== 'finished' || state.startedAt === null || state.completedWork === 0 || recorded.current.has(state.runId)) {
      return
    }
    recorded.current.add(state.runId)
    addCompletion({
      id: `${frozen.source.kind}-${frozen.source.id}-${wallStart.current}`,
      title: frozen.title,
      source: frozen.source,
      startedAt: new Date(wallStart.current).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Math.round(activeDurationMs(state, now)),
      exercises: state.completedWork,
      totalExercises: totalWork,
    })
  }, [state, now, addCompletion, frozen, totalWork])

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
    if (active && !window.confirm('End this workout? This session will not be saved.')) {
      return
    }
    navigate(frozen.exitTo)
  }

  const muted = !settings.voice && !settings.beeps
  const step = currentStep(state)

  return (
    <div className="player" data-phase={state.status === 'finished' ? 'done' : state.status === 'ready' ? 'ready' : step?.kind}>
      <header className="player__top">
        <button type="button" className="btn btn--ghost btn--icon" aria-label="End workout" onClick={exit}>
          <Icon name="close" />
        </button>
        <div className="player__progress" aria-label="Workout progress">
          <div className="player__progress-bar" style={{ transform: `scaleX(${progressFraction(state)})` }} />
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--icon"
          aria-label={muted ? 'Turn sound on' : 'Mute coach'}
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
        <div className="player__overlay" role="dialog" aria-label="Paused">
          <div className="stack">
            <h2 className="page__title">Paused</h2>
            <button type="button" className="btn btn--primary btn--lg" onClick={player.resume}>
              <Icon name="play" />
              Resume
            </button>
            <button type="button" className="btn btn--lg" onClick={exit}>
              End workout
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ReadyView({ session, onStart }: { session: Session; onStart: () => void }) {
  return (
    <div className="player__scroll">
      <div className="ready">
        <header className="page__header">
          <h1 className="page__title">{session.title}</h1>
          {session.body.description ? <p className="muted">{session.body.description}</p> : null}
        </header>
        <RoutineStats body={session.body} />
        <button type="button" className="btn btn--primary btn--lg btn--block" onClick={onStart}>
          <Icon name="play" />
          Start
        </button>
        <p className="faint">Tip: turn your volume up for the voice coach. Your screen stays on while you train.</p>
        <RoutineList body={session.body} linkExercises={false} />
      </div>
    </div>
  )
}

function WorkView({ player, step }: { player: PlayerControls; step: WorkStep }) {
  const { state, now } = player
  const exercise = exerciseOf(step)
  const running = state.status === 'running'
  const limit = stepLimitMs(state)
  const remaining = stepRemaining(state, now)
  const meta = [
    `Exercise ${step.item} of ${step.items}`,
    step.sets > 1 ? `Set ${step.set} of ${step.sets}` : null,
    step.rounds > 1 ? `Round ${step.round} of ${step.rounds}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="work">
      <div className="work__stage stage">
        {exercise ? (
          <Figure
            animation={exercise.animation}
            mirrored={step.side === 'right'}
            playing={running}
            restartKey={`${state.runId}-${state.index}`}
            label={`${exercise.name} demonstration`}
          />
        ) : null}
        {step.side ? <span className="work__side badge badge--accent">{step.side === 'left' ? 'Left side' : 'Right side'}</span> : null}
      </div>
      <div className="work__info">
        <p className="faint">{meta}</p>
        <h1 className="work__name">{exercise?.name ?? 'Exercise'}</h1>
        {limit !== null && remaining !== null ? (
          <TimerRing fraction={remaining / limit} label={`${formatClock(remaining)} remaining`}>
            <span className="work__clock">{formatClock(remaining)}</span>
          </TimerRing>
        ) : step.target.kind === 'reps' ? (
          <div className="reps">
            <span className="reps__count tabular">{step.target.reps}</span>
            <span className="reps__unit">reps{step.side ? ' this side' : ''}</span>
            <span className="faint tabular">{formatClock(stepElapsed(state, now))}</span>
          </div>
        ) : null}
      </div>
      <div className="player__controls">
        <button type="button" className="btn btn--icon control" aria-label="Previous exercise" onClick={player.previous}>
          <Icon name="previous" />
        </button>
        {step.target.kind === 'reps' ? (
          <button type="button" className="btn btn--primary btn--lg control control--main" onClick={player.done}>
            <Icon name="check" />
            Done
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary btn--icon control control--round"
            aria-label={running ? 'Pause' : 'Resume'}
            onClick={running ? player.pause : player.resume}
          >
            <Icon name={running ? 'pause' : 'play'} />
          </button>
        )}
        <button type="button" className="btn btn--icon control" aria-label="Skip exercise" onClick={player.next}>
          <Icon name="next" />
        </button>
      </div>
      {step.target.kind === 'reps' ? (
        <button type="button" className="btn btn--ghost btn--small work__pause" onClick={running ? player.pause : player.resume}>
          <Icon name={running ? 'pause' : 'play'} />
          {running ? 'Pause' : 'Resume'}
        </button>
      ) : null}
    </div>
  )
}

function roundTitle(step: PauseStep, steps: PlaybackStep[], index: number): string {
  if (step.reason !== 'round') {
    return PAUSE_TITLE[step.reason]
  }
  const finished = steps.slice(0, index).reverse().find((candidate): candidate is WorkStep => candidate.kind === 'work')
  return finished ? `Round ${finished.round} complete` : PAUSE_TITLE.round
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
  const next = steps[step.nextWork]
  const nextWork = next?.kind === 'work' ? next : undefined
  const exercise = exerciseOf(nextWork)
  const limit = stepLimitMs(state) ?? step.durationMs
  const remaining = stepRemaining(state, now) ?? 0
  const switching = step.reason === 'switch'

  return (
    <div className="player__scroll">
      <div className="pause">
        <p className="pause__title">{roundTitle(step, steps, state.index)}</p>
        <TimerRing fraction={remaining / limit} tone="rest" size="lg" label={`${Math.ceil(remaining / 1000)} seconds left`}>
          <span className="pause__count tabular">{Math.ceil(remaining / 1000)}</span>
          <span className="faint">seconds</span>
        </TimerRing>
        <div className="row row--wrap pause__controls">
          <button type="button" className="btn" onClick={() => player.extend(10000)}>
            <Icon name="plus" />
            10 sec
          </button>
          <button type="button" className="btn btn--primary" onClick={player.next}>
            Skip
            <Icon name="next" />
          </button>
        </div>
        {exercise && nextWork ? (
          <section className="up-next card" aria-label="Up next">
            <div className="up-next__media stage">
              <Figure
                animation={exercise.animation}
                mirrored={nextWork.side === 'right'}
                playing={state.status === 'running'}
                label={`${exercise.name} demonstration`}
              />
            </div>
            <div className="stack stack--tight">
              <p className="faint">{switching ? 'Now the other side' : 'Up next'}</p>
              <h2 className="up-next__name">{exercise.name}</h2>
              <p className="muted">{targetLabel(nextWork, exercise)}</p>
              {!switching ? (
                <ol className="up-next__steps">
                  {exercise.steps.slice(0, 3).map((line) => (
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
  durationMs,
  exercises,
  total,
  streak,
  showAd,
  adKey,
  onAgain,
}: {
  session: Session
  durationMs: number
  exercises: number
  total: number
  streak: number
  showAd: boolean
  adKey: string | null
  onAgain: () => void
}) {
  return (
    <div className="player__scroll">
      <div className="done">
        <span className="done__badge" aria-hidden="true">
          <Icon name="check" />
        </span>
        <h1 className="page__title">Workout complete!</h1>
        <p className="muted">{session.title}</p>
        <dl className="routine-stats done__stats">
          <div>
            <dt>Time</dt>
            <dd>{formatDuration(durationMs)}</dd>
          </div>
          <div>
            <dt>Moves</dt>
            <dd>
              {exercises}/{total}
            </dd>
          </div>
          <div>
            <dt>Streak</dt>
            <dd>
              {streak} {streak === 1 ? 'day' : 'days'}
            </dd>
          </div>
        </dl>
        <div className="row row--wrap">
          <Link to="/app" className="btn btn--primary btn--lg">
            Done
          </Link>
          <button type="button" className="btn btn--lg" onClick={onAgain}>
            <Icon name="repeat" />
            Do it again
          </button>
        </div>
        {showAd ? <AdUnit key={adKey ?? 'done'} placement="rest" className="done__ad" /> : null}
      </div>
    </div>
  )
}
