import { MUSCLE_LABEL } from './labels'
import type { Exercise, Muscle } from './types'

export type MuscleLoad = Partial<Record<Muscle, number>>

export type MuscleLevel = 0 | 1 | 2 | 3

export type MapMuscle = Exclude<Muscle, 'fullBody'>

export interface WeightedExercise {
  exercise: Pick<Exercise, 'muscles'>
  weight: number
}

export type MuscleLoadEntry = { muscles: readonly Muscle[]; weight?: number } | WeightedExercise

export interface MuscleShare {
  muscle: MapMuscle
  value: number
  level: MuscleLevel
  label: string
}

export const MAP_MUSCLES: readonly MapMuscle[] = [
  'neck',
  'traps',
  'shoulders',
  'chest',
  'biceps',
  'triceps',
  'forearms',
  'upperBack',
  'lats',
  'lowerBack',
  'abs',
  'obliques',
  'hipFlexors',
  'glutes',
  'abductors',
  'adductors',
  'quads',
  'hamstrings',
  'calves',
]

export const PRIMARY_SHARE = 1
export const SECONDARY_SHARE = 0.5
export const FULL_BODY_SHARE = 0.3

export const LEVEL_NAME: Record<MuscleLevel, string> = {
  0: 'Not worked',
  1: 'Light',
  2: 'Moderate',
  3: 'Strong',
}

function entryParts(entry: MuscleLoadEntry): [readonly Muscle[], number] {
  if ('exercise' in entry) {
    return [entry.exercise.muscles, entry.weight]
  }
  return [entry.muscles, entry.weight ?? 1]
}

export function muscleLoad(entries: readonly MuscleLoadEntry[]): MuscleLoad {
  const totals = new Map<MapMuscle, number>()
  for (const entry of entries) {
    const [muscles, weight] = entryParts(entry)
    if (!Number.isFinite(weight) || weight <= 0) {
      continue
    }
    const shares = new Map<MapMuscle, number>()
    const add = (muscle: MapMuscle, share: number) => shares.set(muscle, Math.max(shares.get(muscle) ?? 0, share))
    muscles.forEach((muscle, index) => {
      const share = index === 0 ? PRIMARY_SHARE : SECONDARY_SHARE
      if (muscle === 'fullBody') {
        MAP_MUSCLES.forEach((region) => add(region, share * FULL_BODY_SHARE))
      } else {
        add(muscle, share)
      }
    })
    shares.forEach((share, muscle) => totals.set(muscle, (totals.get(muscle) ?? 0) + share * weight))
  }
  const max = Math.max(0, ...totals.values())
  const load: MuscleLoad = {}
  if (max === 0) {
    return load
  }
  for (const muscle of MAP_MUSCLES) {
    const total = totals.get(muscle)
    if (total) {
      load[muscle] = Math.round((total / max) * 1000) / 1000
    }
  }
  return load
}

export function muscleLevel(value: number | undefined): MuscleLevel {
  if (!value || value <= 0) {
    return 0
  }
  if (value >= 0.67) {
    return 3
  }
  return value >= 0.34 ? 2 : 1
}

export function topMuscles(load: MuscleLoad, n = MAP_MUSCLES.length): MuscleShare[] {
  return MAP_MUSCLES.filter((muscle) => (load[muscle] ?? 0) > 0)
    .map((muscle) => {
      const value = load[muscle] ?? 0
      return { muscle, value, level: muscleLevel(value), label: MUSCLE_LABEL[muscle] }
    })
    .sort((a, b) => b.value - a.value || MAP_MUSCLES.indexOf(a.muscle) - MAP_MUSCLES.indexOf(b.muscle))
    .slice(0, Math.max(0, n))
}

export function weightedItems<Item extends { exerciseId: string; sets?: number }>(
  items: readonly Item[],
  lookup: (id: string) => Exercise | undefined,
  weightOf: (item: Item, exercise: Exercise) => number = (item) => item.sets ?? 1,
): { exercise: Exercise; weight: number }[] {
  return items.flatMap((item) => {
    const exercise = lookup(item.exerciseId)
    return exercise ? [{ exercise, weight: weightOf(item, exercise) }] : []
  })
}
