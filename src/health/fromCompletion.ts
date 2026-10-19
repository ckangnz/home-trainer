import { getExercise } from '@/exercises'
import type { Category } from '@/exercises/types'
import type { Completion } from '@/data/models'
import type { HealthWorkout } from './export'

export function workoutCategory(exerciseIds: readonly string[] | undefined): Category | null {
  const counts = new Map<Category, number>()
  for (const id of exerciseIds ?? []) {
    const exercise = getExercise(id)
    if (exercise) {
      counts.set(exercise.category, (counts.get(exercise.category) ?? 0) + 1)
    }
  }
  let best: Category | null = null
  for (const [category, count] of counts) {
    if (best === null || count > (counts.get(best) ?? 0)) {
      best = category
    }
  }
  return best
}

export function healthWorkoutFrom(completion: Completion, title: string): HealthWorkout {
  return {
    title,
    startedAt: completion.startedAt,
    endedAt: completion.completedAt,
    activeMs: completion.durationMs,
    calories: completion.calories ?? 0,
    category: workoutCategory(completion.exerciseIds),
    exercises: completion.exercises,
  }
}
