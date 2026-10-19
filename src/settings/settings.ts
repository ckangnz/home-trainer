import { useSyncExternalStore } from 'react'
import { isTrainerId, type SkinTone, type TrainerId } from '@/figure/look'

export type LanguagePreference = 'auto' | 'en' | 'ko'

export interface Settings {
  voice: boolean
  beeps: boolean
  vibration: boolean
  keepAwake: boolean
  voiceName: string | null
  trainer: TrainerId
  skin: SkinTone
  weightKg: number
  language: LanguagePreference
}

export const DEFAULT_SETTINGS: Settings = {
  voice: true,
  beeps: true,
  vibration: true,
  keepAwake: true,
  voiceName: null,
  trainer: 'female',
  skin: 'medium',
  weightKg: 70,
  language: 'auto',
}

export const WEIGHT_RANGE: readonly [number, number] = [30, 250]

const SKIN_TONES: SkinTone[] = ['light', 'medium', 'deep']
export const LANGUAGE_PREFERENCES: LanguagePreference[] = ['auto', 'en', 'ko']

const KEY = 'hometrainer.settings.v1'

const listeners = new Set<() => void>()
let cached: Settings | null = null

function read(): Settings {
  if (cached) {
    return cached
  }
  let stored: Partial<Settings> = {}
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY)
    stored = raw ? (JSON.parse(raw) as Partial<Settings>) : {}
  } catch {
    stored = {}
  }
  cached = {
    voice: typeof stored.voice === 'boolean' ? stored.voice : DEFAULT_SETTINGS.voice,
    beeps: typeof stored.beeps === 'boolean' ? stored.beeps : DEFAULT_SETTINGS.beeps,
    vibration: typeof stored.vibration === 'boolean' ? stored.vibration : DEFAULT_SETTINGS.vibration,
    keepAwake: typeof stored.keepAwake === 'boolean' ? stored.keepAwake : DEFAULT_SETTINGS.keepAwake,
    voiceName: typeof stored.voiceName === 'string' ? stored.voiceName : null,
    trainer: isTrainerId(stored.trainer) ? stored.trainer : DEFAULT_SETTINGS.trainer,
    skin: SKIN_TONES.includes(stored.skin as SkinTone) ? (stored.skin as SkinTone) : DEFAULT_SETTINGS.skin,
    weightKg:
      typeof stored.weightKg === 'number' && stored.weightKg >= WEIGHT_RANGE[0] && stored.weightKg <= WEIGHT_RANGE[1]
        ? stored.weightKg
        : DEFAULT_SETTINGS.weightKg,
    language: LANGUAGE_PREFERENCES.includes(stored.language as LanguagePreference)
      ? (stored.language as LanguagePreference)
      : DEFAULT_SETTINGS.language,
  }
  return cached
}

export function getSettings(): Settings {
  return read()
}

export function updateSettings(patch: Partial<Settings>): void {
  cached = { ...read(), ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(cached))
  } catch {
    // Settings still apply for this session when storage is unavailable.
  }
  for (const listener of listeners) {
    listener()
  }
}

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribeSettings, read, () => DEFAULT_SETTINGS)
}
