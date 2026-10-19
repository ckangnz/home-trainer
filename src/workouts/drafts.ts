import type { RoutineBody } from './types'

const PREFIX = 'hometrainer:routine-draft:'

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

export function draftKey(routineId: string | undefined, from: string | null): string {
  return routineId ? `edit:${routineId}` : `new:${from ?? ''}`
}

export function loadDraft(key: string): RoutineBody | null {
  const raw = storage()?.getItem(PREFIX + key)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as RoutineBody
    return typeof parsed?.name === 'string' && Array.isArray(parsed.items) && typeof parsed.defaults === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function saveDraft(key: string, body: RoutineBody): void {
  try {
    storage()?.setItem(PREFIX + key, JSON.stringify(body))
  } catch {
    return
  }
}

export function clearDraft(key: string): void {
  storage()?.removeItem(PREFIX + key)
}
