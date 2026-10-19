import type { ExerciseInfo, Target } from '@/exercises/types'
import type { RoutineBody, RoutineDefaults, RoutineItem } from './types'

export const ROUTINE_SCHEMA_VERSION = 2

export const DEFAULT_ROUTINE_DEFAULTS: RoutineDefaults = {
  workSec: 30,
  restSec: 15,
  rounds: 1,
  roundRestSec: 60,
  getReadySec: 10,
  switchSec: 5,
}

export const LIMITS = {
  name: 60,
  description: 280,
  items: 60,
  workSec: [5, 600],
  restSec: [0, 600],
  rounds: [1, 20],
  roundRestSec: [0, 900],
  getReadySec: [0, 60],
  switchSec: [0, 30],
  targetSec: [5, 900],
  reps: [1, 200],
  sets: [1, 20],
} as const

function clampInt(value: unknown, [min, max]: readonly [number, number], fallback: number): number {
  const number = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback
  return Math.min(max, Math.max(min, number))
}

function optionalInt(value: unknown, range: readonly [number, number]): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? clampInt(value, range, range[0]) : undefined
}

export function normalizeDefaults(input: Partial<RoutineDefaults> | undefined): RoutineDefaults {
  const source = input ?? {}
  return {
    workSec: clampInt(source.workSec, LIMITS.workSec, DEFAULT_ROUTINE_DEFAULTS.workSec),
    restSec: clampInt(source.restSec, LIMITS.restSec, DEFAULT_ROUTINE_DEFAULTS.restSec),
    rounds: clampInt(source.rounds, LIMITS.rounds, DEFAULT_ROUTINE_DEFAULTS.rounds),
    roundRestSec: clampInt(source.roundRestSec, LIMITS.roundRestSec, DEFAULT_ROUTINE_DEFAULTS.roundRestSec),
    getReadySec: clampInt(source.getReadySec, LIMITS.getReadySec, DEFAULT_ROUTINE_DEFAULTS.getReadySec),
    switchSec: clampInt(source.switchSec, LIMITS.switchSec, DEFAULT_ROUTINE_DEFAULTS.switchSec),
  }
}

export function normalizeTarget(input: unknown): Target | undefined {
  if (typeof input !== 'object' || input === null) {
    return undefined
  }
  const target = input as Record<string, unknown>
  if (target.kind === 'time' && typeof target.seconds === 'number' && Number.isFinite(target.seconds)) {
    return { kind: 'time', seconds: clampInt(target.seconds, LIMITS.targetSec, 30) }
  }
  if (target.kind === 'reps' && typeof target.reps === 'number' && Number.isFinite(target.reps)) {
    return { kind: 'reps', reps: clampInt(target.reps, LIMITS.reps, 10) }
  }
  return undefined
}

export function normalizeItem(input: Partial<RoutineItem> & { exerciseId: string; id: string }): RoutineItem {
  const item: RoutineItem = { id: input.id, exerciseId: input.exerciseId }
  const target = normalizeTarget(input.target)
  if (target) {
    item.target = target
  }
  const sets = optionalInt(input.sets, LIMITS.sets)
  if (sets !== undefined && sets > 1) {
    item.sets = sets
  }
  const setRestSec = optionalInt(input.setRestSec, LIMITS.restSec)
  if (setRestSec !== undefined) {
    item.setRestSec = setRestSec
  }
  const restAfterSec = optionalInt(input.restAfterSec, LIMITS.restSec)
  if (restAfterSec !== undefined) {
    item.restAfterSec = restAfterSec
  }
  return item
}

export function normalizeBody(input: RoutineBody): RoutineBody {
  const name = input.name.trim().slice(0, LIMITS.name) || 'My workout'
  const description = input.description?.trim().slice(0, LIMITS.description)
  const body: RoutineBody = {
    name,
    defaults: normalizeDefaults(input.defaults),
    items: input.items.slice(0, LIMITS.items).map(normalizeItem),
  }
  if (description) {
    body.description = description
  }
  return body
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function itemFor(exercise: ExerciseInfo): RoutineItem {
  return { id: newId(), exerciseId: exercise.id }
}

export function effectiveTarget(item: RoutineItem, defaults: RoutineDefaults): Target {
  return item.target ?? { kind: 'time', seconds: defaults.workSec }
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items
  }
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

export function withFreshIds(body: RoutineBody): RoutineBody {
  return { ...body, items: body.items.map((item) => ({ ...item, id: newId() })) }
}

export function blankRoutine(): RoutineBody {
  return { name: 'My workout', defaults: { ...DEFAULT_ROUTINE_DEFAULTS }, items: [] }
}
