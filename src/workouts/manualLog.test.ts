import { describe, expect, it } from 'vitest'
import { EXERCISES, getExercise } from '@/exercises'
import { parseCompletion } from '@/data/models'
import { buildManualCompletion, entryMs, estimateLog, newLogEntry, parseWindow, switchAmount } from './manualLog'

const exercise = (id: string) => {
  const found = getExercise(id)
  if (!found) {
    throw new Error(`missing exercise ${id}`)
  }
  return found
}

const anyExercise = (predicate: (exercise: NonNullable<ReturnType<typeof getExercise>>) => boolean) => {
  return EXERCISES.find(predicate)!
}

describe('manual workout log', () => {
  it('turns time-based entries into milliseconds per set', () => {
    const base = newLogEntry(anyExercise((entry) => entry.sided !== 'perSide'))
    expect(entryMs({ ...base, amount: 'time', sets: 3, value: 30 })).toBe(90_000)
  })

  it('doubles per-side exercises', () => {
    const base = newLogEntry(anyExercise((entry) => entry.sided === 'perSide'))
    expect(entryMs({ ...base, amount: 'time', sets: 1, value: 20 })).toBe(40_000)
  })

  it('switches measure while keeping the exercise', () => {
    const base = newLogEntry(anyExercise((entry) => entry.defaultTarget.kind === 'reps'))
    const timed = switchAmount(base, 'time')
    expect(timed.amount).toBe('time')
    expect(timed.value).toBe(30)
    expect(switchAmount(timed, 'time')).toBe(timed)
  })

  it('estimates more calories for longer windows and heavier bodies', () => {
    const entries = [{ ...newLogEntry(anyExercise((entry) => entry.category === 'cardio')), amount: 'time' as const, sets: 3, value: 60 }]
    const short = estimateLog(entries, 30 * 60_000, 70)
    expect(estimateLog(entries, 60 * 60_000, 70)).toBeGreaterThan(short)
    expect(estimateLog(entries, 30 * 60_000, 90)).toBeGreaterThan(short)
  })

  it('validates the time window', () => {
    const now = new Date('2026-11-08T18:00:00')
    expect(parseWindow('2026-11-08', '10:00', '09:00', now)).toBe('order')
    expect(parseWindow('2026-11-08', '10:00', '10:00', now)).toBe('order')
    expect(parseWindow('2026-11-08', '17:00', '19:00', now)).toBe('future')
    expect(parseWindow('2026-11-08', '00:00', '13:00', new Date('2026-11-08T20:00:00'))).toBe('tooLong')
    expect(parseWindow('', '10:00', '11:00', now)).toBe('order')
    expect(parseWindow('2026-11-08', '10:00', '11:00', now)).toEqual({
      startedAt: new Date('2026-11-08T10:00:00'),
      endedAt: new Date('2026-11-08T11:00:00'),
    })
  })

  it('builds a completion that survives parsing', () => {
    const entry = { ...newLogEntry(exercise(anyExercise(() => true).id)), amount: 'reps' as const, sets: 2, value: 12 }
    const startedAt = new Date('2026-11-08T10:00:00')
    const endedAt = new Date('2026-11-08T10:45:00')
    const completion = buildManualCompletion({ title: '  PT session ', entries: [entry, { ...entry, key: 'other' }], startedAt, endedAt, weightKg: 70 })
    expect(completion).toMatchObject({ title: 'PT session', source: { kind: 'manual', id: 'manual' }, durationMs: 45 * 60_000, exercises: 1 })
    expect(completion.calories).toBeGreaterThan(0)
    const { id, ...data } = completion
    expect(parseCompletion(id, 'user-1', data)).not.toBeNull()
  })
})
