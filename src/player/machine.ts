import type { PlaybackStep } from '@/workouts/types'

export type PlayerStatus = 'ready' | 'running' | 'paused' | 'finished'

export type EntryTrigger = 'user' | 'timer'

export interface PlayerState {
  steps: PlaybackStep[]
  index: number
  status: PlayerStatus
  stepElapsedMs: number
  runningSince: number | null
  extraMs: number
  enteredBy: EntryTrigger
  startedAt: number | null
  finishedAt: number | null
  pausedMs: number
  pausedSince: number | null
  completedWork: number
  runId: number
}

export function createPlayer(steps: PlaybackStep[]): PlayerState {
  return {
    steps,
    index: 0,
    status: steps.length === 0 ? 'finished' : 'ready',
    stepElapsedMs: 0,
    runningSince: null,
    extraMs: 0,
    enteredBy: 'user',
    startedAt: null,
    finishedAt: null,
    pausedMs: 0,
    pausedSince: null,
    completedWork: 0,
    runId: 0,
  }
}

export function currentStep(state: PlayerState): PlaybackStep | undefined {
  return state.steps[state.index]
}

export function stepElapsed(state: PlayerState, now: number): number {
  return state.stepElapsedMs + (state.runningSince === null ? 0 : Math.max(0, now - state.runningSince))
}

export function stepLimitMs(state: PlayerState): number | null {
  const step = currentStep(state)
  if (!step) {
    return null
  }
  if (step.kind === 'pause') {
    return step.durationMs + state.extraMs
  }
  return step.target.kind === 'time' ? step.target.ms : null
}

export function stepRemaining(state: PlayerState, now: number): number | null {
  const limit = stepLimitMs(state)
  return limit === null ? null : Math.max(0, limit - stepElapsed(state, now))
}

function enter(state: PlayerState, index: number, now: number, trigger: EntryTrigger, carryMs = 0): PlayerState {
  const leaving = currentStep(state)
  const completedWork = state.completedWork + (leaving?.kind === 'work' && index > state.index ? 1 : 0)
  if (index >= state.steps.length) {
    return {
      ...state,
      index: state.steps.length - 1,
      status: 'finished',
      stepElapsedMs: 0,
      runningSince: null,
      extraMs: 0,
      enteredBy: trigger,
      finishedAt: now,
      completedWork,
    }
  }
  const running = state.status === 'running'
  return {
    ...state,
    index,
    stepElapsedMs: running ? 0 : carryMs,
    runningSince: running ? now - carryMs : null,
    extraMs: 0,
    enteredBy: trigger,
    completedWork,
  }
}

export function startPlayer(state: PlayerState, now: number): PlayerState {
  if (state.steps.length === 0) {
    return { ...state, status: 'finished' }
  }
  return {
    ...createPlayer(state.steps),
    status: 'running',
    runningSince: now,
    startedAt: now,
    enteredBy: 'user',
    runId: state.runId + 1,
  }
}

export function tickPlayer(state: PlayerState, now: number): PlayerState {
  let next = state
  for (let guard = 0; guard < next.steps.length + 1 && next.status === 'running'; guard += 1) {
    const limit = stepLimitMs(next)
    if (limit === null) {
      break
    }
    const elapsed = stepElapsed(next, now)
    if (elapsed < limit) {
      break
    }
    next = enter(next, next.index + 1, now, 'timer', elapsed - limit)
  }
  return next
}

export function pausePlayer(state: PlayerState, now: number): PlayerState {
  if (state.status !== 'running') {
    return state
  }
  return { ...state, status: 'paused', stepElapsedMs: stepElapsed(state, now), runningSince: null, pausedSince: now }
}

export function resumePlayer(state: PlayerState, now: number): PlayerState {
  if (state.status !== 'paused') {
    return state
  }
  const pausedFor = state.pausedSince === null ? 0 : Math.max(0, now - state.pausedSince)
  return {
    ...state,
    status: 'running',
    runningSince: now - state.stepElapsedMs,
    stepElapsedMs: 0,
    pausedMs: state.pausedMs + pausedFor,
    pausedSince: null,
  }
}

export function nextStep(state: PlayerState, now: number): PlayerState {
  if (state.status === 'ready' || state.status === 'finished') {
    return state
  }
  return enter(state, state.index + 1, now, 'user')
}

export function completeReps(state: PlayerState, now: number): PlayerState {
  const step = currentStep(state)
  if (state.status !== 'running' || step?.kind !== 'work' || step.target.kind !== 'reps') {
    return state
  }
  return enter(state, state.index + 1, now, 'user')
}

const RESTART_THRESHOLD_MS = 3000

export function previousStep(state: PlayerState, now: number): PlayerState {
  if (state.status === 'ready' || state.status === 'finished') {
    return state
  }
  if (stepElapsed(state, now) > RESTART_THRESHOLD_MS && currentStep(state)?.kind === 'work') {
    return { ...enter(state, state.index, now, 'user'), completedWork: state.completedWork }
  }
  for (let index = state.index - 1; index >= 0; index -= 1) {
    if (state.steps[index].kind === 'work') {
      return { ...enter(state, index, now, 'user'), completedWork: Math.max(0, state.completedWork - 1) }
    }
  }
  return { ...enter(state, state.index, now, 'user'), completedWork: state.completedWork }
}

export function extendPause(state: PlayerState, ms: number): PlayerState {
  if (currentStep(state)?.kind !== 'pause' || state.status === 'finished') {
    return state
  }
  return { ...state, extraMs: state.extraMs + ms }
}

export function activeDurationMs(state: PlayerState, now: number): number {
  if (state.startedAt === null) {
    return 0
  }
  const end = state.finishedAt ?? now
  const pausing = state.pausedSince === null ? 0 : Math.max(0, end - state.pausedSince)
  return Math.max(0, end - state.startedAt - state.pausedMs - pausing)
}

export function progressFraction(state: PlayerState): number {
  const total = state.steps.filter((step) => step.kind === 'work').length
  return total === 0 ? 1 : Math.min(1, state.completedWork / total)
}
