import type { Category, ExerciseInfo } from './types'
import index from './index.json'

export const EXERCISES: ExerciseInfo[] = index as ExerciseInfo[]

const byId = new Map(EXERCISES.map((exercise) => [exercise.id, exercise]))

export function getExercise(id: string): ExerciseInfo | undefined {
  return byId.get(id)
}

export function exercisesIn(category: Category): ExerciseInfo[] {
  return EXERCISES.filter((exercise) => exercise.category === category || exercise.tags.includes(category))
}

const byFamily = new Map<string, ExerciseInfo[]>()
for (const exercise of EXERCISES) {
  if (exercise.family) {
    byFamily.set(exercise.family, [...(byFamily.get(exercise.family) ?? []), exercise])
  }
}
for (const members of byFamily.values()) {
  members.sort((a, b) => a.level - b.level || Number(a.equipment !== 'none') - Number(b.equipment !== 'none') || a.name.localeCompare(b.name))
}

export function variationsOf(exercise: Pick<ExerciseInfo, 'family'>): ExerciseInfo[] {
  return exercise.family ? (byFamily.get(exercise.family) ?? []) : []
}
