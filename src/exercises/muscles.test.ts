import { describe, expect, it } from 'vitest'
import { MAP_MUSCLES, muscleLevel, muscleLoad, topMuscles, weightedItems } from './muscles'
import type { ExerciseInfo } from './types'

describe('muscleLoad', () => {
  it('weights the first muscle as primary and later muscles as secondary', () => {
    expect(muscleLoad([{ muscles: ['quads', 'glutes', 'hamstrings'] }])).toEqual({ quads: 1, glutes: 0.5, hamstrings: 0.5 })
  })

  it('accumulates entry weights and normalises so the max is 1', () => {
    const load = muscleLoad([
      { muscles: ['chest', 'triceps'], weight: 3 },
      { muscles: ['triceps'], weight: 1 },
      { muscles: ['abs'], weight: 0.5 },
    ])
    expect(load.chest).toBe(1)
    expect(load.triceps).toBeCloseTo(2.5 / 3, 3)
    expect(load.abs).toBeCloseTo(0.5 / 3, 3)
    expect(Math.max(...Object.values(load))).toBe(1)
  })

  it('accepts weighted exercise entries such as work seconds', () => {
    const squat = { muscles: ['quads', 'glutes'] } as Pick<ExerciseInfo, 'muscles'>
    const curl = { muscles: ['biceps'] } as Pick<ExerciseInfo, 'muscles'>
    expect(muscleLoad([{ exercise: squat, weight: 60 }, { exercise: curl, weight: 30 }])).toEqual({ quads: 1, glutes: 0.5, biceps: 0.5 })
  })

  it('spreads full body work thinly over every region', () => {
    const load = muscleLoad([{ muscles: ['quads'] }, { muscles: ['fullBody'] }])
    expect(load.quads).toBe(1)
    expect(load.fullBody).toBeUndefined()
    for (const muscle of MAP_MUSCLES.filter((muscle) => muscle !== 'quads')) {
      expect(load[muscle]).toBeCloseTo(0.3 / 1.3, 3)
    }
    expect(Object.keys(muscleLoad([{ muscles: ['fullBody'] }]))).toHaveLength(MAP_MUSCLES.length)
  })

  it('does not double count a muscle repeated within one exercise', () => {
    expect(muscleLoad([{ muscles: ['quads', 'quads', 'glutes'] }])).toEqual({ quads: 1, glutes: 0.5 })
  })

  it('ignores empty, zero and invalid weights', () => {
    expect(muscleLoad([])).toEqual({})
    expect(muscleLoad([{ muscles: ['chest'], weight: 0 }, { muscles: ['abs'], weight: Number.NaN }, { muscles: [] }])).toEqual({})
  })
})

describe('muscleLevel', () => {
  it('buckets intensity into three steps', () => {
    expect([undefined, 0, 0.1, 0.33, 0.34, 0.66, 0.67, 1].map(muscleLevel)).toEqual([0, 0, 1, 1, 2, 2, 3, 3])
  })
})

describe('topMuscles', () => {
  it('sorts by intensity with labels and limits the count', () => {
    const top = topMuscles({ glutes: 0.4, quads: 1, calves: 0.2, chest: 0 }, 2)
    expect(top).toEqual([
      { muscle: 'quads', value: 1, level: 3, label: 'Quads' },
      { muscle: 'glutes', value: 0.4, level: 2, label: 'Glutes' },
    ])
    expect(topMuscles({ chest: 0 })).toEqual([])
  })
})

describe('weightedItems', () => {
  const exercises = new Map([
    ['squat', { id: 'squat', muscles: ['quads', 'glutes'] }],
    ['plank', { id: 'plank', muscles: ['abs'] }],
  ]) as unknown as Map<string, ExerciseInfo>
  const lookup = (id: string) => exercises.get(id)

  it('maps routine items to weighted exercises by sets and skips unknown ids', () => {
    const entries = weightedItems([{ exerciseId: 'squat', sets: 3 }, { exerciseId: 'plank' }, { exerciseId: 'missing', sets: 2 }], lookup)
    expect(entries.map((entry) => [entry.exercise.id, entry.weight])).toEqual([
      ['squat', 3],
      ['plank', 1],
    ])
    expect(muscleLoad(entries)).toEqual({ quads: 1, glutes: 0.5, abs: 0.333 })
  })

  it('accepts a custom weight such as work seconds', () => {
    const entries = weightedItems([{ exerciseId: 'plank', sets: 2, workSec: 45 }], lookup, (item) => (item.sets ?? 1) * item.workSec)
    expect(entries[0].weight).toBe(90)
  })
})
