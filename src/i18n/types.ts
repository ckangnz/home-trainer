export type Language = 'en' | 'ko'

export interface ExerciseText {
  name: string
  summary: string
  steps: string[]
  tips: string[]
  variant?: string
}

export interface WorkoutText {
  name: string
  summary: string
  description: string
}
