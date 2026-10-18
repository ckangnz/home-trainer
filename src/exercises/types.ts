import type { FigureAnimation } from '@/figure/types'

export type Category =
  | 'cardio'
  | 'fullBody'
  | 'upperBody'
  | 'lowerBody'
  | 'core'
  | 'stretch'
  | 'yoga'
  | 'warmup'

export type Muscle =
  | 'chest'
  | 'shoulders'
  | 'triceps'
  | 'biceps'
  | 'upperBack'
  | 'lowerBack'
  | 'abs'
  | 'obliques'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'hipFlexors'
  | 'adductors'
  | 'fullBody'

export type Equipment = 'none' | 'chair' | 'wall' | 'mat'

export type Sided = 'symmetric' | 'alternating' | 'perSide'

export type Target = { kind: 'time'; seconds: number } | { kind: 'reps'; reps: number }

export interface Exercise {
  id: string
  name: string
  category: Category
  tags: Category[]
  muscles: Muscle[]
  equipment: Equipment
  level: 1 | 2 | 3
  impact: 'low' | 'high'
  sided: Sided
  defaultTarget: Target
  animation: FigureAnimation
  summary: string
  steps: string[]
  tips: string[]
}
