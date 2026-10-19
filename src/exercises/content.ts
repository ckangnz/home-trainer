import { useEffect, useSyncExternalStore } from 'react'
import { catalogName, playableAnimation } from './registry'
import type { Exercise } from './types'
import { getExercise } from '.'

type CatalogModule = Record<string, unknown>

const loaders = import.meta.glob<CatalogModule>('./catalog/*.ts')
const loaderByName = new Map(Object.entries(loaders).map(([path, load]) => [catalogName(path), load]))
const full = new Map<string, Exercise>()
const pending = new Map<string, Promise<void>>()
const listeners = new Set<() => void>()
let tracked: Set<string> | null = null

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

function register(module: CatalogModule): void {
  for (const value of Object.values(module)) {
    if (Array.isArray(value)) {
      for (const exercise of value as Exercise[]) {
        full.set(exercise.id, { ...exercise, animation: playableAnimation(exercise) })
      }
    }
  }
}

export function loadCatalog(name: string): Promise<void> {
  const load = loaderByName.get(name)
  if (!load) {
    return Promise.resolve()
  }
  let promise = pending.get(name)
  if (!promise) {
    promise = load()
      .then((module) => {
        register(module)
        emit()
      })
      .catch((error: unknown) => {
        pending.delete(name)
        throw error
      })
    pending.set(name, promise)
  }
  return promise
}

export function loadExercises(ids: Iterable<string>): Promise<void> {
  const catalogs = new Set<string>()
  for (const id of ids) {
    const info = getExercise(id)
    if (info && !full.has(id)) {
      catalogs.add(info.catalog)
    }
  }
  return Promise.all([...catalogs].map(loadCatalog)).then(() => undefined)
}

export function loadAllExercises(): Promise<void> {
  return Promise.all([...loaderByName.keys()].map(loadCatalog)).then(() => undefined)
}

export function getFullExercise(id: string): Exercise | undefined {
  const exercise = full.get(id)
  if (tracked !== null) {
    const info = getExercise(id)
    if (info) {
      tracked.add(info.catalog)
    }
  }
  return exercise
}

export function trackCatalogs<T>(render: () => T): { result: T; catalogs: string[] } {
  tracked = new Set()
  try {
    const result = render()
    return { result, catalogs: [...tracked].sort() }
  } finally {
    tracked = null
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useFullExercise(id: string | undefined, enabled = true): Exercise | undefined {
  const read = () => (enabled && id ? getFullExercise(id) : undefined)
  const exercise = useSyncExternalStore(subscribe, read, read)
  useEffect(() => {
    if (enabled && id && !exercise) {
      void loadExercises([id]).catch(() => undefined)
    }
  }, [enabled, id, exercise])
  return exercise
}

export function useExercisesLoaded(ids: readonly string[]): boolean {
  const ready = useSyncExternalStore(
    subscribe,
    () => ids.every((id) => !getExercise(id) || full.has(id)),
    () => ids.every((id) => !getExercise(id) || full.has(id)),
  )
  useEffect(() => {
    if (!ready) {
      void loadExercises(ids).catch(() => undefined)
    }
  }, [ready, ids])
  return ready
}
