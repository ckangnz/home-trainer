import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { newId, normalizeBody, ROUTINE_SCHEMA_VERSION } from '@/workouts/routine'
import type { Routine, RoutineBody, RoutineSource } from '@/workouts/types'
import type { Completion } from './models'
import { loadRepository } from './lazy'

interface DataContextValue {
  ready: boolean
  routines: Routine[]
  completions: Completion[]
  error: string | null
  getRoutine: (id: string) => Routine | undefined
  createRoutine: (body: RoutineBody, source?: RoutineSource) => Routine
  updateRoutine: (routine: Routine, body: RoutineBody) => Routine
  setShareCode: (routine: Routine, code: string | undefined) => void
  removeRoutine: (id: string) => void
  addCompletion: (completion: Omit<Completion, 'ownerId' | 'schemaVersion'>) => void
  removeCompletion: (id: string) => void
}

const DataContext = createContext<DataContextValue | null>(null)

const SAVE_ERROR = 'Could not save your changes. They will retry when you are back online.'

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const [routines, setRoutines] = useState<Routine[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [loaded, setLoaded] = useState({ routines: false, completions: false })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRoutines([])
    setCompletions([])
    setLoaded({ routines: false, completions: false })
    if (uid === null) {
      return
    }
    const fail = () => setError('Could not load your data. Check your connection.')
    let cancelled = false
    let stops: (() => void)[] = []
    loadRepository()
      .then((repository) => {
        if (cancelled) {
          return
        }
        stops = [
          repository.subscribeRoutines(
            uid,
            (next) => {
              setRoutines(next)
              setLoaded((current) => ({ ...current, routines: true }))
            },
            fail,
          ),
          repository.subscribeCompletions(
            uid,
            (next) => {
              setCompletions(next)
              setLoaded((current) => ({ ...current, completions: true }))
            },
            fail,
          ),
        ]
      })
      .catch(fail)
    return () => {
      cancelled = true
      stops.forEach((stop) => stop())
    }
  }, [uid])

  const report = useCallback((write: (repository: Awaited<ReturnType<typeof loadRepository>>) => Promise<void>) => {
    loadRepository()
      .then(write)
      .catch(() => setError(SAVE_ERROR))
  }, [])

  const getRoutine = useCallback((id: string) => routines.find((routine) => routine.id === id), [routines])

  const createRoutine = useCallback(
    (body: RoutineBody, source?: RoutineSource) => {
      if (uid === null) {
        throw new Error('Sign in to save routines.')
      }
      const now = new Date().toISOString()
      const routine: Routine = {
        ...normalizeBody(body),
        id: newId(),
        ownerId: uid,
        schemaVersion: ROUTINE_SCHEMA_VERSION,
        createdAt: now,
        updatedAt: now,
      }
      if (source) {
        routine.source = source
      }
      setRoutines((current) => [routine, ...current])
      report((repository) => repository.saveRoutine(routine))
      return routine
    },
    [uid, report],
  )

  const updateRoutine = useCallback(
    (routine: Routine, body: RoutineBody) => {
      const next: Routine = { ...routine, ...normalizeBody(body), updatedAt: new Date().toISOString() }
      if (!body.description) {
        delete next.description
      }
      setRoutines((current) => [next, ...current.filter((entry) => entry.id !== routine.id)])
      report((repository) => repository.saveRoutine(next))
      return next
    },
    [report],
  )

  const setShareCode = useCallback(
    (routine: Routine, code: string | undefined) => {
      const next: Routine = { ...routine }
      if (code) {
        next.shareCode = code
      } else {
        delete next.shareCode
      }
      setRoutines((current) => current.map((entry) => (entry.id === routine.id ? next : entry)))
      report((repository) => repository.saveRoutine(next))
    },
    [report],
  )

  const removeRoutine = useCallback(
    (id: string) => {
      if (uid === null) {
        return
      }
      setRoutines((current) => current.filter((routine) => routine.id !== id))
      report((repository) => repository.deleteRoutine(uid, id))
    },
    [uid, report],
  )

  const addCompletion = useCallback(
    (completion: Omit<Completion, 'ownerId' | 'schemaVersion'>) => {
      if (uid === null) {
        return
      }
      const full: Completion = { ...completion, ownerId: uid, schemaVersion: 2 }
      setCompletions((current) => [full, ...current.filter((entry) => entry.id !== full.id)])
      report((repository) => repository.recordCompletion(full))
    },
    [uid, report],
  )

  const removeCompletion = useCallback(
    (id: string) => {
      if (uid === null) {
        return
      }
      setCompletions((current) => current.filter((completion) => completion.id !== id))
      report((repository) => repository.deleteCompletion(uid, id))
    },
    [uid, report],
  )

  const value = useMemo<DataContextValue>(
    () => ({
      ready: uid !== null && loaded.routines && loaded.completions,
      routines,
      completions,
      error,
      getRoutine,
      createRoutine,
      updateRoutine,
      setShareCode,
      removeRoutine,
      addCompletion,
      removeCompletion,
    }),
    [uid, loaded, routines, completions, error, getRoutine, createRoutine, updateRoutine, setShareCode, removeRoutine, addCompletion, removeCompletion],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const context = useContext(DataContext)
  if (context === null) {
    throw new Error('useData must be used within a DataProvider.')
  }
  return context
}
