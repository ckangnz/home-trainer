import { getExercise } from '@/exercises'
import { gearGroup, type GearGroup } from '@/exercises/labels'
import { estimateDurationMs } from './steps'
import type { BodyArea, CuratedWorkout, WorkoutGoal } from './types'

export const GOAL_ORDER: WorkoutGoal[] = ['cardio', 'strength', 'flexibility', 'recovery']

export const GOAL_LABEL: Record<WorkoutGoal, string> = {
  cardio: 'Fat burn & cardio',
  strength: 'Strength & muscle',
  flexibility: 'Flexibility & mobility',
  recovery: 'Recovery',
}

export const AREA_ORDER: BodyArea[] = ['fullBody', 'core', 'glutes', 'legs', 'arms', 'chest', 'back', 'shoulders']

export const AREA_LABEL: Record<BodyArea, string> = {
  fullBody: 'Full body',
  arms: 'Arms',
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  core: 'Abs & core',
  glutes: 'Glutes',
  legs: 'Legs',
}

export type DurationBucket = 'short' | 'medium' | 'long'

export const DURATION_ORDER: DurationBucket[] = ['short', 'medium', 'long']

export const DURATION_LABEL: Record<DurationBucket, string> = {
  short: 'Under 10 min',
  medium: '10–20 min',
  long: '20+ min',
}

export interface WorkoutFilters {
  query: string
  goal: WorkoutGoal | null
  area: BodyArea | null
  level: 1 | 2 | 3 | null
  gear: GearGroup | null
  duration: DurationBucket | null
}

export const NO_FILTERS: WorkoutFilters = { query: '', goal: null, area: null, level: null, gear: null, duration: null }

const minutesCache = new WeakMap<CuratedWorkout, number>()

export function workoutMinutes(workout: CuratedWorkout): number {
  let minutes = minutesCache.get(workout)
  if (minutes === undefined) {
    minutes = estimateDurationMs(workout, getExercise) / 60000
    minutesCache.set(workout, minutes)
  }
  return minutes
}

export function durationBucket(workout: CuratedWorkout): DurationBucket {
  const minutes = workoutMinutes(workout)
  return minutes < 10 ? 'short' : minutes <= 20 ? 'medium' : 'long'
}

export function workoutGear(workout: CuratedWorkout): Set<GearGroup> {
  const gear = new Set<GearGroup>()
  for (const item of workout.items) {
    const exercise = getExercise(item.exerciseId)
    if (exercise) {
      gear.add(gearGroup(exercise.equipment))
    }
  }
  return gear
}

export function matchesGear(workout: CuratedWorkout, gear: GearGroup): boolean {
  const used = workoutGear(workout)
  return gear === 'none' ? [...used].every((entry) => entry === 'none') : used.has(gear)
}

export type WorkoutSearchText = (workout: CuratedWorkout) => string

function matchesText(workout: CuratedWorkout, query: string, extraText?: WorkoutSearchText): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return true
  }
  const names = workout.items.map((item) => getExercise(item.exerciseId)?.name ?? '')
  const text = [workout.name, workout.summary, GOAL_LABEL[workout.goal], ...workout.areas.map((area) => AREA_LABEL[area]), ...names, extraText?.(workout) ?? '']
    .join(' ')
    .toLowerCase()
  return words.every((word) => text.includes(word))
}

export function filterWorkouts(workouts: CuratedWorkout[], filters: WorkoutFilters, extraText?: WorkoutSearchText): CuratedWorkout[] {
  return workouts.filter(
    (workout) =>
      (filters.goal === null || workout.goal === filters.goal) &&
      (filters.area === null || workout.areas.includes(filters.area)) &&
      (filters.level === null || workout.level === filters.level) &&
      (filters.gear === null || matchesGear(workout, filters.gear)) &&
      (filters.duration === null || durationBucket(workout) === filters.duration) &&
      matchesText(workout, filters.query, extraText),
  )
}

export function hasFilters(filters: WorkoutFilters): boolean {
  return Boolean(filters.query.trim() || filters.goal || filters.area || filters.level || filters.gear || filters.duration)
}

function pick<T extends string>(value: string | null, options: readonly T[]): T | null {
  return value !== null && (options as readonly string[]).includes(value) ? (value as T) : null
}

export function filtersFromParams(params: URLSearchParams): WorkoutFilters {
  const level = Number(params.get('level'))
  return {
    query: params.get('q') ?? '',
    goal: pick(params.get('goal'), GOAL_ORDER),
    area: pick(params.get('area'), AREA_ORDER),
    level: level === 1 || level === 2 || level === 3 ? level : null,
    gear: pick(params.get('gear'), ['none', 'weights', 'band', 'recovery'] as const),
    duration: pick(params.get('time'), DURATION_ORDER),
  }
}

export function paramsFromFilters(filters: WorkoutFilters): URLSearchParams {
  const entries: [string, string | null][] = [
    ['q', filters.query || null],
    ['goal', filters.goal],
    ['area', filters.area],
    ['level', filters.level ? String(filters.level) : null],
    ['gear', filters.gear],
    ['time', filters.duration],
  ]
  return new URLSearchParams(entries.filter((entry): entry is [string, string] => entry[1] !== null))
}
