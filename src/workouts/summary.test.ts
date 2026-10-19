import { describe, expect, it } from 'vitest'
import { EXERCISES, getExercise } from '@/exercises'
import type { Exercise } from '@/exercises/types'
import { cooldownBody, cooldownId, suggestCooldown } from './cooldown'
import { estimateCalories, primaryCategory, workedMuscles } from './summary'
import { normalizeBody } from './routine'

const squat = getExercise('squat') as Exercise
const pushUp = getExercise('push-up') as Exercise
const jacks = getExercise('jumping-jacks') as Exercise

describe('workout summary', () => {
  it('estimates calories from MET, time, and body weight', () => {
    const worked = [{ exercise: jacks, ms: 30 * 60_000 }]
    expect(estimateCalories(worked, 30 * 60_000, 70)).toBe(Math.round(8 * 70 * 0.5))
    expect(estimateCalories(worked, 60 * 60_000, 70)).toBe(Math.round(8 * 70 * 0.5 + 2 * 70 * 0.5))
    expect(estimateCalories([], 0, 70)).toBe(0)
  })

  it('ranks worked muscles by time with primary muscles weighted most', () => {
    const muscles = workedMuscles([
      { exercise: squat, ms: 60_000 },
      { exercise: pushUp, ms: 30_000 },
    ])
    expect(muscles[0]).toBe(squat.muscles[0])
    expect(muscles).toContain(pushUp.muscles[0])
    expect(primaryCategory([{ exercise: squat, ms: 60_000 }, { exercise: pushUp, ms: 30_000 }])).toBe(squat.category)
  })
})

describe('cool-down suggestions', () => {
  it('picks distinct stretches that cover the trained muscles', () => {
    const picks = suggestCooldown(['quads', 'glutes', 'chest'], EXERCISES)
    expect(picks.length).toBe(5)
    expect(new Set(picks.map((exercise) => exercise.id)).size).toBe(5)
    for (const exercise of picks) {
      expect(['stretch', 'mobility', 'recovery'].includes(exercise.category) || exercise.tags.includes('stretch')).toBe(true)
      expect(['none', 'mat', 'wall', 'chair']).toContain(exercise.equipment)
    }
    expect(picks.some((exercise) => exercise.muscles.includes('quads'))).toBe(true)
    expect(picks.some((exercise) => exercise.muscles.includes('chest'))).toBe(true)
  })

  it('excludes moves already done and builds a playable routine', () => {
    const first = suggestCooldown(['hamstrings'], EXERCISES, { count: 3 })
    const next = suggestCooldown(['hamstrings'], EXERCISES, { count: 3, exclude: first.map((exercise) => exercise.id) })
    expect(next.some((exercise) => first.includes(exercise))).toBe(false)
    const body = cooldownBody(first)
    expect(normalizeBody(body).items).toHaveLength(first.length)
    expect(cooldownId(first).split('~')).toEqual(first.map((exercise) => exercise.id))
  })
})
