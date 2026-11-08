import type { Completion } from '@/data/models'
import type { ExerciseInfo } from '@/exercises/types'
import { estimatedRepMs } from './steps'
import { estimateCalories, workedMuscles, type WorkedExercise } from './summary'

export type LogAmount = 'reps' | 'time'

export interface LogEntry {
  key: string
  exercise: ExerciseInfo
  amount: LogAmount
  sets: number
  value: number
}

export const LOG_LIMITS = {
  entries: 40,
  sets: [1, 20],
  reps: [1, 200],
  seconds: [5, 3600],
  maxDurationMs: 12 * 3_600_000,
} as const

export function newLogEntry(exercise: ExerciseInfo): LogEntry {
  const { defaultTarget } = exercise
  return {
    key: `${exercise.id}-${Math.random().toString(36).slice(2, 8)}`,
    exercise,
    amount: defaultTarget.kind,
    sets: 1,
    value: defaultTarget.kind === 'reps' ? defaultTarget.reps : defaultTarget.seconds,
  }
}

export function switchAmount(entry: LogEntry, amount: LogAmount): LogEntry {
  if (entry.amount === amount) {
    return entry
  }
  const { defaultTarget } = entry.exercise
  const fallback = amount === 'reps' ? 10 : 30
  const value = defaultTarget.kind === amount ? (defaultTarget.kind === 'reps' ? defaultTarget.reps : defaultTarget.seconds) : fallback
  return { ...entry, amount, value }
}

export function entryMs(entry: LogEntry): number {
  const perSet = entry.amount === 'reps' ? entry.value * estimatedRepMs(entry.exercise) : entry.value * 1000
  const sides = entry.exercise.sided === 'perSide' ? 2 : 1
  return Math.round(perSet * entry.sets * sides)
}

export function workedFrom(entries: readonly LogEntry[]): WorkedExercise[] {
  return entries.map((entry) => ({ exercise: entry.exercise, ms: entryMs(entry) }))
}

export type WindowError = 'order' | 'future' | 'tooLong'

export function parseWindow(date: string, start: string, end: string, now: Date): { startedAt: Date; endedAt: Date } | WindowError {
  const startedAt = new Date(`${date}T${start}:00`)
  const endedAt = new Date(`${date}T${end}:00`)
  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime()) || endedAt.getTime() <= startedAt.getTime()) {
    return 'order'
  }
  if (endedAt.getTime() > now.getTime()) {
    return 'future'
  }
  if (endedAt.getTime() - startedAt.getTime() > LOG_LIMITS.maxDurationMs) {
    return 'tooLong'
  }
  return { startedAt, endedAt }
}

export function estimateLog(entries: readonly LogEntry[], activeMs: number, weightKg: number): number {
  return estimateCalories(workedFrom(entries), activeMs, weightKg)
}

export function buildManualCompletion(input: {
  title: string
  entries: readonly LogEntry[]
  startedAt: Date
  endedAt: Date
  weightKg: number
}): Omit<Completion, 'ownerId' | 'schemaVersion'> {
  const { entries, startedAt, endedAt, weightKg } = input
  const activeMs = endedAt.getTime() - startedAt.getTime()
  const worked = workedFrom(entries)
  const exerciseIds = [...new Set(entries.map((entry) => entry.exercise.id))]
  return {
    id: `manual-${startedAt.getTime()}`,
    title: input.title.trim(),
    source: { kind: 'manual', id: 'manual' },
    startedAt: startedAt.toISOString(),
    completedAt: endedAt.toISOString(),
    durationMs: activeMs,
    exercises: exerciseIds.length,
    totalExercises: exerciseIds.length,
    calories: estimateCalories(worked, activeMs, weightKg),
    muscles: workedMuscles(worked),
    exerciseIds,
  }
}
