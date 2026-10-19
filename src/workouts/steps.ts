import type { ExerciseInfo } from '@/exercises/types'
import { effectiveTarget, normalizeDefaults } from './routine'
import type { PauseReason, PlaybackStep, RoutineBody, Side, WorkStep } from './types'

export type ExerciseLookup = (id: string) => ExerciseInfo | undefined

const SIDES: Side[] = ['left', 'right']

export function expandRoutine(body: RoutineBody, lookup: ExerciseLookup): PlaybackStep[] {
  const defaults = normalizeDefaults(body.defaults)
  const items = body.items.filter((item) => lookup(item.exerciseId) !== undefined)
  if (items.length === 0) {
    return []
  }
  const steps: PlaybackStep[] = []
  const pause = (reason: PauseReason, seconds: number) => {
    if (seconds > 0) {
      steps.push({ kind: 'pause', reason, durationMs: seconds * 1000, nextWork: -1 })
    }
  }
  pause('getReady', defaults.getReadySec)
  for (let round = 1; round <= defaults.rounds; round += 1) {
    items.forEach((item, index) => {
      const exercise = lookup(item.exerciseId) as ExerciseInfo
      const target = effectiveTarget(item, defaults)
      const sets = Math.max(1, item.sets ?? 1)
      const sides: (Side | undefined)[] = exercise.sided === 'perSide' ? SIDES : [undefined]
      for (let set = 1; set <= sets; set += 1) {
        sides.forEach((side, sideIndex) => {
          const work: WorkStep = {
            kind: 'work',
            exerciseId: exercise.id,
            target: target.kind === 'time' ? { kind: 'time', ms: target.seconds * 1000 } : { kind: 'reps', reps: target.reps },
            set,
            sets,
            round,
            rounds: defaults.rounds,
            item: index + 1,
            items: items.length,
          }
          if (side) {
            work.side = side
          }
          steps.push(work)
          if (sideIndex < sides.length - 1) {
            pause('switch', defaults.switchSec)
          }
        })
        if (set < sets) {
          pause('set', item.setRestSec ?? defaults.restSec)
        }
      }
      if (index < items.length - 1) {
        pause('item', item.restAfterSec ?? defaults.restSec)
      } else if (round < defaults.rounds) {
        pause('round', defaults.roundRestSec)
      }
    })
  }
  let nextWork = -1
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index]
    if (step.kind === 'work') {
      nextWork = index
    } else {
      step.nextWork = nextWork
    }
  }
  return steps
}

const MIN_REP_MS = 1500
const MAX_REP_MS = 5000

export function estimatedRepMs(exercise: ExerciseInfo): number {
  const cycle = exercise.cycleMs
  const perRep = exercise.sided === 'alternating' ? cycle / 2 : cycle
  return Math.min(MAX_REP_MS, Math.max(MIN_REP_MS, perRep || 3000))
}

export function stepDurationMs(step: PlaybackStep, lookup: ExerciseLookup): number {
  if (step.kind === 'pause') {
    return step.durationMs
  }
  if (step.target.kind === 'time') {
    return step.target.ms
  }
  const exercise = lookup(step.exerciseId)
  return step.target.reps * (exercise ? estimatedRepMs(exercise) : 3000)
}

export function estimateDurationMs(body: RoutineBody, lookup: ExerciseLookup): number {
  return expandRoutine(body, lookup).reduce((total, step) => total + stepDurationMs(step, lookup), 0)
}

export function workStepCount(steps: PlaybackStep[]): number {
  return steps.filter((step) => step.kind === 'work').length
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  if (totalSeconds < 60) {
    return `${totalSeconds} sec`
  }
  const minutes = Math.round(totalSeconds / 60)
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
