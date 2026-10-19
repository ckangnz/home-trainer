import { describe, expect, it } from 'vitest'
import type { ExerciseInfo, Sided } from '@/exercises/types'
import { LIMITS, moveItem, normalizeBody, normalizeDefaults, normalizeTarget, withFreshIds } from './routine'
import { estimateDurationMs, expandRoutine, formatClock, formatDuration } from './steps'
import type { PauseStep, RoutineBody, WorkStep } from './types'

function exercise(id: string, sided: Sided = 'symmetric', cycleMs = 2000): ExerciseInfo {
  return {
    id,
    name: id,
    category: 'core',
    tags: [],
    muscles: ['abs'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided,
    defaultTarget: { kind: 'time', seconds: 30 },
    summary: 'A test exercise.',
    catalog: 'test',
    cycleMs,
  }
}

const library = new Map([
  ['a', exercise('a')],
  ['b', exercise('b')],
  ['side', exercise('side', 'perSide')],
  ['alt', exercise('alt', 'alternating', 2000)],
])
const lookup = (id: string) => library.get(id)

function body(overrides: Partial<RoutineBody> = {}): RoutineBody {
  return {
    name: 'Test',
    defaults: { workSec: 30, restSec: 10, rounds: 1, roundRestSec: 60, getReadySec: 5, switchSec: 3 },
    items: [
      { id: '1', exerciseId: 'a' },
      { id: '2', exerciseId: 'b' },
    ],
    ...overrides,
  }
}

function shape(steps: ReturnType<typeof expandRoutine>) {
  return steps.map((step) =>
    step.kind === 'work'
      ? `${step.exerciseId}${step.side ? `:${step.side}` : ''}@${step.round}.${step.set}`
      : `${step.reason}(${step.durationMs / 1000})`,
  )
}

describe('routine normalization', () => {
  it('fills and clamps defaults', () => {
    expect(normalizeDefaults({ workSec: 2, rounds: 99, restSec: Number.NaN })).toEqual({
      workSec: LIMITS.workSec[0],
      restSec: 15,
      rounds: LIMITS.rounds[1],
      roundRestSec: 60,
      getReadySec: 10,
      switchSec: 5,
    })
  })

  it('accepts only valid targets', () => {
    expect(normalizeTarget({ kind: 'time', seconds: 45.4 })).toEqual({ kind: 'time', seconds: 45 })
    expect(normalizeTarget({ kind: 'reps', reps: 0 })).toEqual({ kind: 'reps', reps: 1 })
    expect(normalizeTarget({ kind: 'reps' })).toBeUndefined()
    expect(normalizeTarget('30s')).toBeUndefined()
  })

  it('trims names, limits items, and drops single-set noise', () => {
    const normalized = normalizeBody({
      name: '   ',
      defaults: body().defaults,
      items: Array.from({ length: 70 }, (_, index) => ({ id: String(index), exerciseId: 'a', sets: 1 })),
    })
    expect(normalized.name).toBe('My routine')
    expect(normalized.items).toHaveLength(LIMITS.items)
    expect(normalized.items[0]).toEqual({ id: '0', exerciseId: 'a' })
  })

  it('regenerates item ids for copies', () => {
    const copy = withFreshIds(body())
    expect(copy.items.map((item) => item.id)).not.toEqual(['1', '2'])
    expect(copy.items.map((item) => item.exerciseId)).toEqual(['a', 'b'])
  })

  it('moves items within bounds only', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moveItem(['a', 'b'], 0, 5)).toEqual(['a', 'b'])
  })
})

describe('routine expansion', () => {
  it('starts with get ready and rests between exercises only', () => {
    expect(shape(expandRoutine(body(), lookup))).toEqual(['getReady(5)', 'a@1.1', 'item(10)', 'b@1.1'])
  })

  it('points pauses at the upcoming work step', () => {
    const steps = expandRoutine(body(), lookup)
    expect((steps[0] as PauseStep).nextWork).toBe(1)
    expect((steps[2] as PauseStep).nextWork).toBe(3)
  })

  it('repeats sets with set rests and per-item overrides', () => {
    const steps = expandRoutine(
      body({ items: [{ id: '1', exerciseId: 'a', sets: 3, setRestSec: 20, restAfterSec: 0 }, { id: '2', exerciseId: 'b' }] }),
      lookup,
    )
    expect(shape(steps)).toEqual(['getReady(5)', 'a@1.1', 'set(20)', 'a@1.2', 'set(20)', 'a@1.3', 'b@1.1'])
  })

  it('splits per-side exercises with a switch pause', () => {
    const steps = expandRoutine(body({ items: [{ id: '1', exerciseId: 'side', target: { kind: 'time', seconds: 20 } }] }), lookup)
    expect(shape(steps)).toEqual(['getReady(5)', 'side:left@1.1', 'switch(3)', 'side:right@1.1'])
    expect((steps[1] as WorkStep).target).toEqual({ kind: 'time', ms: 20000 })
  })

  it('uses round rests between rounds and never ends on a rest', () => {
    const steps = expandRoutine(body({ defaults: { ...body().defaults, rounds: 2 } }), lookup)
    expect(shape(steps)).toEqual(['getReady(5)', 'a@1.1', 'item(10)', 'b@1.1', 'round(60)', 'a@2.1', 'item(10)', 'b@2.1'])
  })

  it('skips zero-length pauses and unknown exercises', () => {
    const steps = expandRoutine(
      body({
        defaults: { ...body().defaults, getReadySec: 0, restSec: 0 },
        items: [
          { id: '1', exerciseId: 'a' },
          { id: '2', exerciseId: 'missing' },
          { id: '3', exerciseId: 'b' },
        ],
      }),
      lookup,
    )
    expect(shape(steps)).toEqual(['a@1.1', 'b@1.1'])
    expect((steps[1] as WorkStep).items).toBe(2)
  })

  it('returns nothing for empty routines', () => {
    expect(expandRoutine(body({ items: [] }), lookup)).toEqual([])
  })

  it('keeps rep targets and defaults time targets', () => {
    const steps = expandRoutine(body({ items: [{ id: '1', exerciseId: 'a', target: { kind: 'reps', reps: 12 } }, { id: '2', exerciseId: 'b' }] }), lookup)
    expect((steps[1] as WorkStep).target).toEqual({ kind: 'reps', reps: 12 })
    expect((steps[3] as WorkStep).target).toEqual({ kind: 'time', ms: 30000 })
  })
})

describe('durations', () => {
  it('sums pauses, timed work, and estimated reps', () => {
    const total = estimateDurationMs(
      body({ items: [{ id: '1', exerciseId: 'a', target: { kind: 'reps', reps: 10 } }, { id: '2', exerciseId: 'b' }] }),
      lookup,
    )
    expect(total).toBe(5000 + 10 * 2000 + 10000 + 30000)
  })

  it('formats clocks and summaries', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(59_001)).toBe('1:00')
    expect(formatClock(125_000)).toBe('2:05')
    expect(formatDuration(45_000)).toBe('45 sec')
    expect(formatDuration(7 * 60_000 + 50_000)).toBe('8 min')
    expect(formatDuration(95 * 60_000)).toBe('1 h 35 min')
  })
})
