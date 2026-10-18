import { useSyncExternalStore } from 'react'

export interface Settings {
  voice: boolean
  beeps: boolean
  vibration: boolean
  keepAwake: boolean
  voiceName: string | null
}

export const DEFAULT_SETTINGS: Settings = {
  voice: true,
  beeps: true,
  vibration: true,
  keepAwake: true,
  voiceName: null,
}

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

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_SETTINGS)
}
