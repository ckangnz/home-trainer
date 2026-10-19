import { prepareAnimation } from '@/figure/animate'
import type { FigureAnimation } from '@/figure/types'
import { EXISTING_FAMILIES } from './families'
import type { Exercise, ExerciseInfo } from './types'

export const CATALOG_ORDER = [
  'cardio',
  'lower',
  'upper',
  'core',
  'stretch',
  'yoga',
  'warmup',
  'conditioning',
  'weights',
  'mobility',
  'recovery',
  'variations-lower',
  'variations-upper',
  'stretch-variations',
]

export function catalogName(path: string): string {
  return path.replace(/^.*\/catalog\//, '').replace(/\.ts$/, '')
}

export function sortCatalogs(names: string[]): string[] {
  const rank = (name: string) => {
    const index = CATALOG_ORDER.indexOf(name)
    return index < 0 ? CATALOG_ORDER.length : index
  }
  return [...names].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}

export function playableAnimation(exercise: Pick<Exercise, 'impact' | 'animation'>): FigureAnimation {
  return exercise.impact === 'high' && exercise.animation.feel === undefined
    ? { ...exercise.animation, feel: 'bouncy' }
    : exercise.animation
}

export function exerciseInfo(exercise: Exercise, catalog: string): ExerciseInfo {
  const { animation, steps, tips, ...info } = exercise
  const grouping = info.family ? undefined : EXISTING_FAMILIES[info.id]
  return { ...info, ...grouping, catalog, cycleMs: Math.round(prepareAnimation(playableAnimation(exercise)).cycleMs) }
}

export function collectExercises(modules: Record<string, Record<string, unknown>>): { exercise: Exercise; catalog: string }[] {
  const byName = new Map(Object.entries(modules).map(([path, module]) => [catalogName(path), module]))
  return sortCatalogs([...byName.keys()]).flatMap((catalog) =>
    Object.values(byName.get(catalog) ?? {})
      .filter((value): value is Exercise[] => Array.isArray(value))
      .flat()
      .map((exercise) => ({ exercise, catalog })),
  )
}
