import { normalizeBody, ROUTINE_SCHEMA_VERSION } from '@/workouts/routine'
import type { Routine, RoutineBody, RoutineItem, RoutineSource } from '@/workouts/types'
import { CODE_ALPHABET, CODE_LENGTH } from '@/sharing/code'
import type { Muscle } from '@/exercises/types'

export const COMPLETION_SCHEMA_VERSION = 2

export const SHARE_SCHEMA_VERSION = 2

export type CompletionSource = { kind: 'routine' | 'curated' | 'exercise' | 'cooldown'; id: string }

export interface Completion {
  id: string
  ownerId: string
  schemaVersion: number
  title: string
  source: CompletionSource
  startedAt: string
  completedAt: string
  durationMs: number
  exercises: number
  totalExercises: number
  calories?: number
  muscles?: Muscle[]
  exerciseIds?: string[]
}

export interface SharedRoutine {
  code: string
  ownerId: string
  schemaVersion: number
  createdAt: string
  routine: RoutineBody
}

type Json = Record<string, unknown>

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isText(value: unknown, max = 200): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

function parseItems(value: unknown): RoutineItem[] | null {
  if (!Array.isArray(value) || value.length > 60) {
    return null
  }
  const items: RoutineItem[] = []
  const ids = new Set<string>()
  for (const raw of value) {
    if (!isObject(raw) || !isText(raw.id, 80) || !isText(raw.exerciseId, 60) || !SLUG.test(raw.exerciseId) || ids.has(raw.id)) {
      return null
    }
    ids.add(raw.id)
    items.push(raw as unknown as RoutineItem)
  }
  return items
}

export function parseRoutineBody(value: unknown): RoutineBody | null {
  if (!isObject(value) || typeof value.name !== 'string' || !isObject(value.defaults)) {
    return null
  }
  const items = parseItems(value.items)
  if (items === null) {
    return null
  }
  return normalizeBody({
    name: value.name,
    description: typeof value.description === 'string' ? value.description : undefined,
    defaults: value.defaults as unknown as RoutineBody['defaults'],
    items,
  })
}

function parseSource(value: unknown): RoutineSource | undefined {
  if (!isObject(value)) {
    return undefined
  }
  if (value.kind === 'curated' && isText(value.id, 80)) {
    return { kind: 'curated', id: value.id }
  }
  if (value.kind === 'share' && isText(value.code, 20)) {
    return { kind: 'share', code: value.code }
  }
  if (value.kind === 'friend' && isText(value.uid, 128) && isText(value.routineId, 80)) {
    const source: RoutineSource = { kind: 'friend', uid: value.uid, routineId: value.routineId }
    if (isText(value.ownerName, 80)) {
      source.ownerName = value.ownerName
    }
    return source
  }
  return undefined
}

export function parseRoutine(id: string, ownerId: string, value: unknown): Routine | null {
  const body = parseRoutineBody(value)
  if (body === null || !isObject(value) || !isTimestamp(value.createdAt) || !isTimestamp(value.updatedAt)) {
    return null
  }
  const routine: Routine = {
    ...body,
    id,
    ownerId,
    schemaVersion: ROUTINE_SCHEMA_VERSION,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
  const source = parseSource(value.source)
  if (source) {
    routine.source = source
  }
  if (isText(value.shareCode, 20)) {
    routine.shareCode = value.shareCode
  }
  return routine
}

export function parseCompletion(id: string, ownerId: string, value: unknown): Completion | null {
  if (!isObject(value) || !isText(value.title, 120) || !isObject(value.source)) {
    return null
  }
  const source = value.source
  if (!['routine', 'curated', 'exercise', 'cooldown'].includes(String(source.kind)) || !isText(source.id, 80)) {
    return null
  }
  const numbers = [value.durationMs, value.exercises, value.totalExercises]
  if (!numbers.every((number) => typeof number === 'number' && Number.isFinite(number) && number >= 0)) {
    return null
  }
  if (!isTimestamp(value.startedAt) || !isTimestamp(value.completedAt)) {
    return null
  }
  const completion: Completion = {
    id,
    ownerId,
    schemaVersion: COMPLETION_SCHEMA_VERSION,
    title: value.title,
    source: { kind: source.kind as CompletionSource['kind'], id: source.id as string },
    startedAt: value.startedAt,
    completedAt: value.completedAt,
    durationMs: value.durationMs as number,
    exercises: value.exercises as number,
    totalExercises: value.totalExercises as number,
  }
  if (typeof value.calories === 'number' && Number.isFinite(value.calories) && value.calories >= 0) {
    completion.calories = Math.round(value.calories)
  }
  if (isTextList(value.muscles, 30, 40)) {
    completion.muscles = value.muscles as Muscle[]
  }
  if (isTextList(value.exerciseIds, 80, 60)) {
    completion.exerciseIds = value.exerciseIds
  }
  return completion
}

function isTextList(value: unknown, maxItems: number, maxLength: number): value is string[] {
  return Array.isArray(value) && value.length <= maxItems && value.every((entry) => isText(entry, maxLength))
}

export function isShareCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((character) => CODE_ALPHABET.includes(character))
}

export function parseShare(code: string, value: unknown): SharedRoutine | null {
  if (!isShareCode(code) || !isObject(value) || value.code !== code || !isText(value.ownerId, 128) || !isTimestamp(value.createdAt)) {
    return null
  }
  const routine = parseRoutineBody(value.routine)
  if (routine === null) {
    return null
  }
  return { code, ownerId: value.ownerId, schemaVersion: SHARE_SCHEMA_VERSION, createdAt: value.createdAt, routine }
}

export function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
