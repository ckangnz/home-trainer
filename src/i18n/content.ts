import { useMemo } from 'react'
import { getExercise } from '@/exercises'
import { FAMILY_LABEL } from '@/exercises/families'
import { CATEGORY_LABEL, EQUIPMENT_LABEL, GEAR_LABEL, LEVEL_LABEL, MUSCLE_LABEL, type GearGroup } from '@/exercises/labels'
import type { Category, Equipment, Muscle } from '@/exercises/types'
import { AREA_LABEL, DURATION_LABEL, GOAL_LABEL, type DurationBucket } from '@/workouts/filters'
import type { BodyArea, CuratedWorkout, WorkoutGoal } from '@/workouts/types'
import { getKorean, type KoreanBundle, type LabelGroup } from './bundle'
import { getLanguage, useLanguage } from './language'
import type { Language } from './types'

export interface Labels {
  category: Record<Category, string>
  muscle: Record<Muscle, string>
  equipment: Record<Equipment, string>
  level: Record<1 | 2 | 3, string>
  gear: Record<GearGroup, string>
  family: Record<string, string>
  goal: Record<WorkoutGoal, string>
  area: Record<BodyArea, string>
  duration: Record<DurationBucket, string>
}

export const EN_LABELS: Labels = {
  category: CATEGORY_LABEL,
  muscle: MUSCLE_LABEL,
  equipment: EQUIPMENT_LABEL,
  level: LEVEL_LABEL,
  gear: GEAR_LABEL,
  family: FAMILY_LABEL,
  goal: GOAL_LABEL,
  area: AREA_LABEL,
  duration: DURATION_LABEL,
}

interface ExerciseLike {
  id: string
  name: string
  summary?: string
  variant?: string
  steps?: string[]
  tips?: string[]
}

interface WorkoutLike {
  id?: string
  name: string
  summary?: string
  description?: string
}

export interface LocalizedExercise {
  name: string
  summary: string
  variant: string | undefined
  steps: string[]
  tips: string[]
}

export interface Localizer {
  language: Language
  labels: Labels
  exercise: (exercise: ExerciseLike) => LocalizedExercise
  exerciseName: (exercise: Pick<ExerciseLike, 'id' | 'name'>) => string
  exerciseSummary: (exercise: Pick<ExerciseLike, 'id' | 'summary'>) => string
  exerciseVariant: (exercise: Pick<ExerciseLike, 'id' | 'variant'>) => string | undefined
  exerciseSteps: (exercise: Pick<ExerciseLike, 'id' | 'steps'>) => string[]
  exerciseTips: (exercise: Pick<ExerciseLike, 'id' | 'tips'>) => string[]
  workoutName: (workout: Pick<WorkoutLike, 'id' | 'name'>) => string
  workoutSummary: (workout: Pick<WorkoutLike, 'id' | 'summary'>) => string
  workoutDescription: (workout: Pick<WorkoutLike, 'id' | 'description'>) => string | undefined
}

function mergeLabels(bundle: KoreanBundle): Labels {
  const merge = <K extends LabelGroup>(group: K): Labels[K] => {
    const localized = Object.fromEntries(Object.entries(bundle.labels[group] ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1])))
    return { ...EN_LABELS[group], ...localized } as Labels[K]
  }
  return {
    category: merge('category'),
    muscle: merge('muscle'),
    equipment: merge('equipment'),
    level: merge('level'),
    gear: merge('gear'),
    family: merge('family'),
    goal: merge('goal'),
    area: merge('area'),
    duration: merge('duration'),
  }
}

function nonEmpty(list: string[] | undefined): list is string[] {
  return Array.isArray(list) && list.length > 0
}

function build(language: Language, bundle: KoreanBundle | null): Localizer {
  const korean = language === 'ko' ? bundle : null
  const exerciseText = (id: string) => korean?.exercises[id]
  const workoutText = (id: string | undefined) => (id === undefined ? undefined : korean?.workouts[id])
  const exerciseName: Localizer['exerciseName'] = (exercise) => exerciseText(exercise.id)?.name || exercise.name
  const exerciseSummary: Localizer['exerciseSummary'] = (exercise) => exerciseText(exercise.id)?.summary || exercise.summary || ''
  const exerciseVariant: Localizer['exerciseVariant'] = (exercise) => exerciseText(exercise.id)?.variant || exercise.variant
  const exerciseSteps: Localizer['exerciseSteps'] = (exercise) => {
    const localized = exerciseText(exercise.id)?.steps
    return nonEmpty(localized) ? localized : (exercise.steps ?? [])
  }
  const exerciseTips: Localizer['exerciseTips'] = (exercise) => {
    const localized = exerciseText(exercise.id)?.tips
    return nonEmpty(localized) ? localized : (exercise.tips ?? [])
  }
  return {
    language,
    labels: korean ? mergeLabels(korean) : EN_LABELS,
    exercise: (exercise) => ({
      name: exerciseName(exercise),
      summary: exerciseSummary(exercise),
      variant: exerciseVariant(exercise),
      steps: exerciseSteps(exercise),
      tips: exerciseTips(exercise),
    }),
    exerciseName,
    exerciseSummary,
    exerciseVariant,
    exerciseSteps,
    exerciseTips,
    workoutName: (workout) => workoutText(workout.id)?.name || workout.name,
    workoutSummary: (workout) => workoutText(workout.id)?.summary || workout.summary || '',
    workoutDescription: (workout) => workoutText(workout.id)?.description || workout.description,
  }
}

const english = build('en', null)
let koreanCache: { bundle: KoreanBundle; localizer: Localizer } | null = null

export function localizer(language: Language = getLanguage()): Localizer {
  const bundle = getKorean()
  if (language !== 'ko' || bundle === null) {
    return english
  }
  if (koreanCache?.bundle !== bundle) {
    koreanCache = { bundle, localizer: build('ko', bundle) }
  }
  return koreanCache.localizer
}

export function exerciseName(exercise: Pick<ExerciseLike, 'id' | 'name'>, language?: Language): string {
  return localizer(language).exerciseName(exercise)
}

export function workoutName(workout: Pick<WorkoutLike, 'id' | 'name'>, language?: Language): string {
  return localizer(language).workoutName(workout)
}

export function labelsFor(language?: Language): Labels {
  return localizer(language).labels
}

export function useContent(): Localizer {
  const language = useLanguage()
  return useMemo(() => localizer(language), [language])
}

export function useLabels(): Labels {
  return useContent().labels
}

export function useExerciseText(exercise: ExerciseLike | undefined): LocalizedExercise | undefined {
  const content = useContent()
  return useMemo(() => (exercise ? content.exercise(exercise) : undefined), [content, exercise])
}

export function workoutSearchText(content: Localizer): ((workout: CuratedWorkout) => string) | undefined {
  if (content.language === 'en') {
    return undefined
  }
  return (workout) =>
    [
      content.workoutName(workout),
      content.workoutSummary(workout),
      content.labels.goal[workout.goal],
      ...workout.areas.map((area) => content.labels.area[area]),
      ...workout.items.map((item) => {
        const exercise = getExercise(item.exerciseId)
        return exercise ? content.exerciseName(exercise) : ''
      }),
    ].join(' ')
}
