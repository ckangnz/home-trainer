import type { Category, Target } from '@/exercises/types'

export type { Target }

export interface RoutineDefaults {
  workSec: number
  restSec: number
  rounds: number
  roundRestSec: number
  getReadySec: number
  switchSec: number
}

export interface RoutineItem {
  id: string
  exerciseId: string
  target?: Target
  sets?: number
  setRestSec?: number
  restAfterSec?: number
}

export interface RoutineBody {
  name: string
  description?: string
  defaults: RoutineDefaults
  items: RoutineItem[]
}

export type RoutineSource =
  | { kind: 'curated'; id: string }
  | { kind: 'share'; code: string }
  | { kind: 'friend'; uid: string; routineId: string; ownerName?: string }

export interface Routine extends RoutineBody {
  id: string
  ownerId: string
  schemaVersion: number
  source?: RoutineSource
  shareCode?: string
  createdAt: string
  updatedAt: string
}

export interface CuratedWorkout extends RoutineBody {
  id: string
  summary: string
  level: 1 | 2 | 3
  focus: Category[]
}

export type WorkTarget = { kind: 'time'; ms: number } | { kind: 'reps'; reps: number }

export type Side = 'left' | 'right'

export interface WorkStep {
  kind: 'work'
  exerciseId: string
  target: WorkTarget
  side?: Side
  set: number
  sets: number
  round: number
  rounds: number
  item: number
  items: number
}

export type PauseReason = 'getReady' | 'set' | 'item' | 'round' | 'switch'

export interface PauseStep {
  kind: 'pause'
  reason: PauseReason
  durationMs: number
  nextWork: number
}

export type PlaybackStep = WorkStep | PauseStep
