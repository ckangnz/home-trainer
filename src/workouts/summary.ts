import type { Category, ExerciseInfo, Muscle } from '@/exercises/types'

export const CATEGORY_MET: Record<Category, number> = {
  cardio: 8,
  fullBody: 7,
  upperBody: 5,
  lowerBody: 5.5,
  core: 4,
  weights: 5,
  stretch: 2.3,
  mobility: 2.8,
  recovery: 2,
  yoga: 3,
  warmup: 3.5,
}

export const REST_MET = 2

export interface WorkedExercise {
  exercise: ExerciseInfo
  ms: number
}

export function metFor(exercise: ExerciseInfo): number {
  const base = CATEGORY_MET[exercise.category]
  return exercise.impact === 'high' ? Math.max(base, 8) : base
}

export function estimateCalories(worked: WorkedExercise[], activeMs: number, weightKg: number): number {
  const workMs = worked.reduce((sum, entry) => sum + entry.ms, 0)
  const restMs = Math.max(0, activeMs - workMs)
  const metHours = worked.reduce((sum, entry) => sum + metFor(entry.exercise) * (entry.ms / 3_600_000), 0) + REST_MET * (restMs / 3_600_000)
  return Math.round(metHours * weightKg)
}

export function primaryCategory(worked: WorkedExercise[]): Category | null {
  const totals = new Map<Category, number>()
  for (const entry of worked) {
    totals.set(entry.exercise.category, (totals.get(entry.exercise.category) ?? 0) + entry.ms)
  }
  let best: Category | null = null
  for (const [category, ms] of totals) {
    if (best === null || ms > (totals.get(best) ?? 0)) {
      best = category
    }
  }
  return best
}

export function workedMuscles(worked: WorkedExercise[], limit = 8): Muscle[] {
  const scores = new Map<Muscle, number>()
  for (const entry of worked) {
    entry.exercise.muscles.forEach((muscle, index) => {
      scores.set(muscle, (scores.get(muscle) ?? 0) + entry.ms * (index === 0 ? 1 : 0.5))
    })
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([muscle]) => muscle)
}
