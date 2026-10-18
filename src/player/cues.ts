import type { PlaybackStep, WorkStep } from '@/workouts/types'
import { stepElapsed, stepLimitMs, type PlayerState } from './machine'

export type Cue = { kind: 'say'; text: string } | { kind: 'beep'; tone: 'count' | 'go' | 'end' }

export type NameOf = (exerciseId: string) => string

function targetPhrase(step: WorkStep): string {
  if (step.target.kind === 'reps') {
    return `${step.target.reps} reps`
  }
  const seconds = Math.round(step.target.ms / 1000)
  if (seconds % 60 === 0) {
    const minutes = seconds / 60
    return minutes === 1 ? '1 minute' : `${minutes} minutes`
  }
  return `${seconds} seconds`
}

export function workAnnouncement(step: WorkStep, nameOf: NameOf): string {
  const parts = [nameOf(step.exerciseId)]
  if (step.side) {
    parts.push(`${step.side} side`)
  }
  parts.push(targetPhrase(step))
  if (step.sets > 1) {
    parts.push(`set ${step.set} of ${step.sets}`)
  }
  return `${parts.join(', ')}.`
}

function upNext(steps: PlaybackStep[], index: number): WorkStep | undefined {
  const step = steps[index]
  if (step?.kind !== 'pause' || step.nextWork < 0) {
    return undefined
  }
  const next = steps[step.nextWork]
  return next?.kind === 'work' ? next : undefined
}

export function entryAnnouncement(state: PlayerState, nameOf: NameOf): string | null {
  if (state.status === 'finished') {
    return 'Workout complete. Great job!'
  }
  const step = state.steps[state.index]
  if (!step) {
    return null
  }
  if (step.kind === 'work') {
    return workAnnouncement(step, nameOf)
  }
  const next = upNext(state.steps, state.index)
  const nextName = next ? nameOf(next.exerciseId) : null
  switch (step.reason) {
    case 'getReady':
      return nextName ? `Get ready. First up: ${nextName}.` : 'Get ready.'
    case 'switch':
      return 'Switch sides.'
    case 'round': {
      const finished = state.steps.slice(0, state.index).reverse().find((candidate) => candidate.kind === 'work')
      const round = finished?.kind === 'work' ? finished.round : 1
      return nextName ? `Round ${round} complete. Rest. Next up: ${nextName}.` : `Round ${round} complete. Rest.`
    }
    default:
      return nextName ? `Rest. Next up: ${nextName}.` : 'Rest.'
  }
}

const COUNTDOWN_SECONDS = [3, 2, 1]
const HALFWAY_MIN_MS = 20000

export function cuesBetween(previous: PlayerState, next: PlayerState, previousNow: number, now: number, nameOf: NameOf): Cue[] {
  const cues: Cue[] = []
  const entered =
    next.runId !== previous.runId ||
    next.index !== previous.index ||
    (next.status === 'finished' && previous.status !== 'finished') ||
    (previous.status === 'ready' && next.status === 'running')
  if (entered) {
    const step = next.steps[next.index]
    if (next.status === 'finished') {
      cues.push({ kind: 'beep', tone: 'end' })
    } else if (step?.kind === 'work') {
      cues.push({ kind: 'beep', tone: 'go' })
    }
    const text = entryAnnouncement(next, nameOf)
    if (text) {
      cues.push({ kind: 'say', text })
    }
    return cues
  }
  if (next.status !== 'running') {
    return cues
  }
  const limit = stepLimitMs(next)
  if (limit === null) {
    return cues
  }
  const before = stepElapsed(previous, previousNow)
  const after = stepElapsed(next, now)
  const step = next.steps[next.index]
  if (step?.kind === 'work' && limit >= HALFWAY_MIN_MS && before < limit / 2 && after >= limit / 2) {
    cues.push({ kind: 'say', text: 'Halfway there.' })
  }
  for (const second of COUNTDOWN_SECONDS) {
    const mark = limit - second * 1000
    if (mark > 0 && before < mark && after >= mark) {
      cues.push({ kind: 'beep', tone: 'count' })
    }
  }
  return cues
}
