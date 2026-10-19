import type { Category, Exercise } from './types'
import { CARDIO } from './catalog/cardio'
import { LOWER_BODY } from './catalog/lower'
import { UPPER_BODY } from './catalog/upper'
import { CORE } from './catalog/core'
import { STRETCH } from './catalog/stretch'
import { YOGA } from './catalog/yoga'
import { WARM_UP } from './catalog/warmup'
import { MOBILITY } from './catalog/mobility'
import { CONDITIONING } from './catalog/conditioning'
import { WEIGHTS } from './catalog/weights'
import { RECOVERY } from './catalog/recovery'

const CATALOG: Exercise[] = [...CARDIO, ...LOWER_BODY, ...UPPER_BODY, ...CORE, ...STRETCH, ...YOGA, ...WARM_UP, ...CONDITIONING, ...WEIGHTS, ...MOBILITY, ...RECOVERY]

export const EXERCISES: Exercise[] = CATALOG.map((exercise) =>
  exercise.impact === 'high' && exercise.animation.feel === undefined
    ? { ...exercise, animation: { ...exercise.animation, feel: 'bouncy' } }
    : exercise,
)

const byId = new Map(EXERCISES.map((exercise) => [exercise.id, exercise]))

export function getExercise(id: string): Exercise | undefined {
  return byId.get(id)
}

export function exercisesIn(category: Category): Exercise[] {
  return EXERCISES.filter((exercise) => exercise.category === category || exercise.tags.includes(category))
}
