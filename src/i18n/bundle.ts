import { useSyncExternalStore } from 'react'
import type { Catalog } from './catalog'
import type { UiMessages } from './en'
import type { ExerciseText, WorkoutText } from './types'

export type LabelGroup = 'category' | 'muscle' | 'equipment' | 'level' | 'gear' | 'family' | 'goal' | 'area' | 'duration'

export interface KoreanBundle {
  ui: Catalog<UiMessages>
  exercises: Record<string, ExerciseText>
  workouts: Record<string, WorkoutText>
  labels: Partial<Record<LabelGroup, Partial<Record<string, string>>>>
}

const listeners = new Set<() => void>()
let korean: KoreanBundle | null = null
let pending: Promise<KoreanBundle> | null = null

export function getKorean(): KoreanBundle | null {
  return korean
}

export function loadKorean(): Promise<KoreanBundle> {
  if (!pending) {
    pending = Promise.all([import('./ko/ui'), import('./ko/exercises'), import('./ko/workouts'), import('./ko/labels')])
      .then(([ui, exercises, workouts, labels]) => {
        korean = { ui: ui.UI_KO, exercises: exercises.EXERCISES_KO, workouts: workouts.WORKOUTS_KO, labels: labels.LABELS_KO }
        for (const listener of listeners) {
          listener()
        }
        return korean
      })
      .catch((error: unknown) => {
        pending = null
        throw error
      })
  }
  return pending
}

export function subscribeKorean(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useKoreanBundle(): KoreanBundle | null {
  return useSyncExternalStore(subscribeKorean, getKorean, () => null)
}
