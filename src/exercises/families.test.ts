import { describe, expect, it } from 'vitest'
import { EXISTING_FAMILIES, FAMILY_LABEL } from './families'
import { EXERCISES, getExercise, variationsOf } from '.'

describe('exercise families', () => {
  it('only maps real exercises and labels every family', () => {
    for (const id of Object.keys(EXISTING_FAMILIES)) {
      expect(getExercise(id), id).toBeDefined()
    }
    for (const exercise of EXERCISES.filter((entry) => entry.family)) {
      expect(FAMILY_LABEL[exercise.family as string], exercise.id).toBeDefined()
      expect(exercise.variant, exercise.id).toBeTruthy()
    }
  })

  it('groups weighted and easier squats with the bodyweight squat', () => {
    const squat = getExercise('squat')
    const ids = variationsOf(squat ?? {}).map((exercise) => exercise.id)
    expect(ids).toEqual(expect.arrayContaining(['squat', 'kettlebell-goblet-squat', 'dumbbell-squat', 'barbell-back-squat', 'chair-squat']))
  })

  it('gives every variation in a family a distinct label', () => {
    const seen = new Set<string>()
    for (const exercise of EXERCISES.filter((entry) => entry.family)) {
      const key = `${exercise.family}:${exercise.variant}`
      expect(seen.has(key), key).toBe(false)
      seen.add(key)
    }
  })
})
