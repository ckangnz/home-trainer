import { describe, expect, it } from 'vitest'
import { EXISTING_FAMILIES, FAMILY_LABEL } from '../../exercises/families'
import { collectExercises } from '../../exercises/registry'
import { CURATED_WORKOUTS } from '../../workouts/curated'
import { EXERCISES_KO } from './exercises'
import { LABELS_KO } from './labels'
import { WORKOUTS_KO } from './workouts'

const modules = import.meta.glob<Record<string, unknown>>('../../exercises/catalog/*.ts', { eager: true })
const exercises = collectExercises(modules).map(({ exercise }) => exercise)

function filled(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

describe('Korean exercise content', () => {
  it.each(exercises.map((exercise) => [exercise.id, exercise] as const))('%s is translated', (id, exercise) => {
    const text = EXERCISES_KO[id]
    expect(text, id).toBeDefined()
    expect(filled(text.name)).toBe(true)
    expect(filled(text.summary)).toBe(true)
    expect(text.steps).toHaveLength(exercise.steps.length)
    expect(text.tips).toHaveLength(exercise.tips.length)
    expect([...text.steps, ...text.tips].every(filled)).toBe(true)
    const hasVariant = Boolean(exercise.variant ?? EXISTING_FAMILIES[id]?.variant)
    expect(filled(text.variant)).toBe(hasVariant)
  })

  it('has no entries for unknown exercises', () => {
    const ids = new Set(exercises.map((exercise) => exercise.id))
    expect(Object.keys(EXERCISES_KO).filter((id) => !ids.has(id))).toEqual([])
  })
})

describe('Korean workout content', () => {
  it.each(CURATED_WORKOUTS.map((workout) => [workout.id] as const))('%s is translated', (id) => {
    const text = WORKOUTS_KO[id]
    expect(text, id).toBeDefined()
    expect(filled(text.name)).toBe(true)
    expect(filled(text.summary)).toBe(true)
    expect(filled(text.description)).toBe(true)
  })

  it('has no entries for unknown workouts', () => {
    const ids = new Set(CURATED_WORKOUTS.map((workout) => workout.id))
    expect(Object.keys(WORKOUTS_KO).filter((id) => !ids.has(id))).toEqual([])
  })
})

describe('Korean labels', () => {
  it('covers every exercise family', () => {
    const families = new Set([...Object.keys(FAMILY_LABEL), ...exercises.flatMap((exercise) => exercise.family ?? [])])
    expect([...families].filter((family) => !filled(LABELS_KO.family[family as keyof typeof LABELS_KO.family]))).toEqual([])
  })
})
