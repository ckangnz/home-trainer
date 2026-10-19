import type { Equipment, Exercise, Muscle } from '@/exercises/types'
import { DEFAULT_ROUTINE_DEFAULTS } from './routine'
import type { RoutineBody } from './types'

const STRETCH_CATEGORIES = new Set(['stretch', 'mobility', 'recovery'])

const NO_GEAR: Equipment[] = ['none', 'mat', 'wall', 'chair']

export const COOLDOWN_SEPARATOR = '~'

export interface CooldownOptions {
  count?: number
  exclude?: Iterable<string>
  equipment?: 'none' | 'roller'
}

function isStretch(exercise: Exercise): boolean {
  return STRETCH_CATEGORIES.has(exercise.category) || exercise.tags.includes('stretch')
}

function allowedGear(exercise: Exercise, equipment: CooldownOptions['equipment']): boolean {
  if (NO_GEAR.includes(exercise.equipment)) {
    return true
  }
  return equipment === 'roller' && (exercise.equipment === 'foamRoller' || exercise.equipment === 'massageBall')
}

function score(exercise: Exercise, muscle: Muscle, equipment: CooldownOptions['equipment']): number {
  const index = exercise.muscles.indexOf(muscle)
  if (index < 0) {
    return -1
  }
  const primary = index === 0 ? 4 : 2 - Math.min(1.5, index * 0.5)
  const roller = equipment === 'roller' && exercise.category === 'recovery' ? 1.5 : 0
  const gentle = exercise.level === 1 ? 0.5 : 0
  const holds = exercise.category === 'stretch' ? 0.25 : 0
  return primary + roller + gentle + holds
}

export function suggestCooldown(muscles: Muscle[], catalog: Exercise[], options: CooldownOptions = {}): Exercise[] {
  const count = options.count ?? 5
  const exclude = new Set(options.exclude ?? [])
  const pool = catalog.filter((exercise) => isStretch(exercise) && !exclude.has(exercise.id) && allowedGear(exercise, options.equipment))
  const picked: Exercise[] = []
  const targets = muscles.filter((muscle) => muscle !== 'fullBody')
  const queue = targets.length > 0 ? targets : (['hamstrings', 'hipFlexors', 'chest', 'lowerBack', 'quads'] as Muscle[])
  for (let pass = 0; pass < 2 && picked.length < count; pass += 1) {
    for (const muscle of queue) {
      if (picked.length >= count) {
        break
      }
      const covered = picked.some((exercise) => exercise.muscles[0] === muscle)
      if (pass === 0 && covered) {
        continue
      }
      const best = pool
        .filter((exercise) => !picked.includes(exercise))
        .map((exercise) => ({ exercise, value: score(exercise, muscle, options.equipment) }))
        .filter((entry) => entry.value > 0)
        .sort((a, b) => b.value - a.value)[0]
      if (best) {
        picked.push(best.exercise)
      }
    }
  }
  for (const exercise of pool) {
    if (picked.length >= count) {
      break
    }
    if (!picked.includes(exercise) && exercise.muscles.includes('fullBody')) {
      picked.push(exercise)
    }
  }
  return picked
}

export function cooldownId(exercises: Exercise[]): string {
  return exercises.map((exercise) => exercise.id).join(COOLDOWN_SEPARATOR)
}

export function cooldownBody(exercises: Exercise[]): RoutineBody {
  return {
    name: 'Cool-down stretch',
    description: 'Stretches picked for the muscles you just trained.',
    defaults: { ...DEFAULT_ROUTINE_DEFAULTS, workSec: 30, restSec: 8, rounds: 1, getReadySec: 5, switchSec: 5 },
    items: exercises.map((exercise, index) => ({
      id: `cooldown-${index + 1}`,
      exerciseId: exercise.id,
      target: exercise.defaultTarget.kind === 'time' ? { kind: 'time', seconds: Math.max(20, Math.min(45, exercise.defaultTarget.seconds)) } : exercise.defaultTarget,
    })),
  }
}
