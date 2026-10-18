import { describe, expect, it } from 'vitest'
import { parseCompletion, parseRoutine, parseShare, stripUndefined } from './models'

const timestamps = { createdAt: '2026-10-18T08:00:00.000Z', updatedAt: '2026-10-18T09:00:00.000Z' }

const routineDoc = {
  name: '  Morning burner  ',
  defaults: { workSec: 40, restSec: 15, rounds: 3, roundRestSec: 60, getReadySec: 10, switchSec: 5 },
  items: [
    { id: 'a', exerciseId: 'jumping-jacks' },
    { id: 'b', exerciseId: 'push-up', target: { kind: 'reps', reps: 12 }, sets: 3, setRestSec: 30 },
  ],
  source: { kind: 'curated', id: 'classic-7-minute' },
  shareCode: '7KQ2M9XP',
  ...timestamps,
}

describe('routine documents', () => {
  it('parses and normalizes valid routines', () => {
    const routine = parseRoutine('r1', 'u1', routineDoc)
    expect(routine).toMatchObject({
      id: 'r1',
      ownerId: 'u1',
      name: 'Morning burner',
      source: { kind: 'curated', id: 'classic-7-minute' },
      shareCode: '7KQ2M9XP',
    })
    expect(routine?.items[1]).toEqual({ id: 'b', exerciseId: 'push-up', target: { kind: 'reps', reps: 12 }, sets: 3, setRestSec: 30 })
  })

  it('rejects malformed routines', () => {
    expect(parseRoutine('r1', 'u1', { ...routineDoc, createdAt: 'yesterday' })).toBeNull()
    expect(parseRoutine('r1', 'u1', { ...routineDoc, items: 'all of them' })).toBeNull()
    expect(parseRoutine('r1', 'u1', { ...routineDoc, items: [{ id: 'a', exerciseId: 'Push Up!' }] })).toBeNull()
    expect(parseRoutine('r1', 'u1', { ...routineDoc, items: [{ id: 'a', exerciseId: 'squat' }, { id: 'a', exerciseId: 'lunge' }] })).toBeNull()
    expect(parseRoutine('r1', 'u1', null)).toBeNull()
  })

  it('clamps hostile numbers instead of trusting them', () => {
    const routine = parseRoutine('r1', 'u1', { ...routineDoc, defaults: { ...routineDoc.defaults, rounds: 1e9, workSec: -5 } })
    expect(routine?.defaults.rounds).toBe(20)
    expect(routine?.defaults.workSec).toBe(5)
  })
})

describe('share snapshots', () => {
  const shareDoc = { code: '7KQ2M9XP', ownerId: 'u1', schemaVersion: 2, createdAt: timestamps.createdAt, routine: routineDoc }

  it('accepts snapshots whose code matches the document id', () => {
    expect(parseShare('7KQ2M9XP', shareDoc)?.routine.name).toBe('Morning burner')
  })

  it('rejects mismatched or invalid codes', () => {
    expect(parseShare('7KQ2M9XQ', shareDoc)).toBeNull()
    expect(parseShare('bad', { ...shareDoc, code: 'bad' })).toBeNull()
    expect(parseShare('7KQ2M9XP', { ...shareDoc, routine: { name: 'x' } })).toBeNull()
  })
})

describe('completions', () => {
  const completionDoc = {
    title: 'Classic 7-Minute Workout',
    source: { kind: 'curated', id: 'classic-7-minute' },
    startedAt: timestamps.createdAt,
    completedAt: timestamps.updatedAt,
    durationMs: 420000,
    exercises: 12,
    totalExercises: 12,
  }

  it('parses valid completions', () => {
    expect(parseCompletion('c1', 'u1', completionDoc)).toMatchObject({ id: 'c1', ownerId: 'u1', exercises: 12 })
  })

  it('rejects invalid completions', () => {
    expect(parseCompletion('c1', 'u1', { ...completionDoc, durationMs: -1 })).toBeNull()
    expect(parseCompletion('c1', 'u1', { ...completionDoc, source: { kind: 'plan', id: 'x' } })).toBeNull()
  })
})

describe('serialization', () => {
  it('drops undefined fields before writing to Firestore', () => {
    expect(stripUndefined({ a: 1, b: undefined, c: { d: undefined, e: 2 } })).toEqual({ a: 1, c: { e: 2 } })
  })
})
