import type { Category, Equipment, Exercise, Muscle, Sided, Target } from './types'

export const CATEGORY_ORDER: Category[] = ['cardio', 'fullBody', 'upperBody', 'lowerBody', 'core', 'weights', 'stretch', 'mobility', 'recovery', 'yoga', 'warmup']

export const CATEGORY_LABEL: Record<Category, string> = {
  cardio: 'Cardio & HIIT',
  fullBody: 'Full body',
  upperBody: 'Upper body',
  lowerBody: 'Legs & glutes',
  core: 'Core & abs',
  stretch: 'Stretching',
  yoga: 'Yoga',
  warmup: 'Warm-up',
  weights: 'Weights',
  mobility: 'Mobility',
  recovery: 'Foam rolling & recovery',
}

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: 'Chest',
  shoulders: 'Shoulders',
  triceps: 'Triceps',
  biceps: 'Biceps',
  upperBack: 'Upper back',
  lats: 'Lats',
  traps: 'Traps',
  forearms: 'Forearms',
  lowerBack: 'Lower back',
  abs: 'Abs',
  obliques: 'Obliques',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
  hipFlexors: 'Hip flexors',
  adductors: 'Inner thighs',
  abductors: 'Outer hips',
  neck: 'Neck',
  fullBody: 'Full body',
}

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  none: 'No equipment',
  chair: 'Chair',
  wall: 'Wall',
  mat: 'Mat',
  dumbbells: 'Dumbbells',
  kettlebell: 'Kettlebell',
  barbell: 'Barbell',
  bench: 'Bench',
  band: 'Resistance band',
  foamRoller: 'Foam roller',
  massageBall: 'Massage ball',
  strap: 'Stretch strap',
  box: 'Step or box',
}

export type GearGroup = 'none' | 'weights' | 'band' | 'recovery'

export const GEAR_ORDER: GearGroup[] = ['none', 'weights', 'band', 'recovery']

export const GEAR_LABEL: Record<GearGroup, string> = {
  none: 'No equipment',
  weights: 'Free weights',
  band: 'Bands',
  recovery: 'Roller & tools',
}

const GEAR_OF: Record<Equipment, GearGroup> = {
  none: 'none',
  chair: 'none',
  wall: 'none',
  mat: 'none',
  dumbbells: 'weights',
  kettlebell: 'weights',
  barbell: 'weights',
  bench: 'weights',
  box: 'none',
  band: 'band',
  foamRoller: 'recovery',
  massageBall: 'recovery',
  strap: 'recovery',
}

export function gearGroup(equipment: Equipment): GearGroup {
  return GEAR_OF[equipment]
}

export const LEVEL_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Beginner',
  2: 'Intermediate',
  3: 'Advanced',
}

export function formatTarget(target: Target, sided: Sided = 'symmetric'): string {
  const base = target.kind === 'reps' ? `${target.reps} reps` : formatSeconds(target.seconds)
  return sided === 'perSide' ? `${base} per side` : base
}

export function formatSeconds(seconds: number): string {
  if (seconds >= 60 && seconds % 60 === 0) {
    return `${seconds / 60} min`
  }
  if (seconds > 60) {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} min`
  }
  return `${seconds} sec`
}

export function exerciseMeta(exercise: Exercise): string {
  return [CATEGORY_LABEL[exercise.category], LEVEL_LABEL[exercise.level], EQUIPMENT_LABEL[exercise.equipment]].join(' · ')
}
