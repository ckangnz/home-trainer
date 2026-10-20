import { getExercise } from '@/exercises'
import type { Completion } from '@/data/models'
import { activityFor, type ActivityPart, type HealthActivity } from './activity'
import type { HealthWorkout } from './export'

export type SourceItems = (completion: Completion) => readonly string[]

function partsFor(exerciseIds: readonly string[]): ActivityPart[] {
  return exerciseIds.flatMap((id) => {
    const exercise = getExercise(id)
    return exercise ? [{ category: exercise.category, ms: 1 }] : []
  })
}

export function completionActivity(completion: Completion, itemsOf?: SourceItems): HealthActivity {
  if (completion.source.kind === 'cooldown') {
    return 'flexibility'
  }
  const recorded = completion.exerciseIds ?? []
  const ids = recorded.length > 0 ? recorded : (itemsOf?.(completion) ?? [])
  return activityFor(partsFor(ids))
}

export function healthWorkoutFrom(completion: Completion, title: string, itemsOf?: SourceItems): HealthWorkout {
  return {
    title,
    startedAt: completion.startedAt,
    endedAt: completion.completedAt,
    activeMs: completion.durationMs,
    calories: completion.calories ?? 0,
    activity: completionActivity(completion, itemsOf),
    exercises: completion.exercises,
  }
}
