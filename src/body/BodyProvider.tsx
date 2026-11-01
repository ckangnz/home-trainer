import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { getSettings, updateSettings, WEIGHT_RANGE } from '@/settings/settings'
import type { WeightEntry } from './types'

type BodyModule = typeof import('@/data/body')

interface BodyContextValue {
  ready: boolean
  entries: WeightEntry[]
  latest: WeightEntry | null
  save: (date: string, kg: number) => Promise<void>
  remove: (date: string) => Promise<void>
}

const BodyContext = createContext<BodyContextValue | null>(null)

const loadBody = (): Promise<BodyModule> => import('@/data/body')

export function roundKg(kg: number): number {
  return Math.round(kg * 10) / 10
}

export function BodyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const [entries, setEntries] = useState<WeightEntry[] | null>(null)

  useEffect(() => {
    setEntries(null)
    if (uid === null) {
      return
    }
    let cancelled = false
    let stop: (() => void) | null = null
    loadBody()
      .then((module) => {
        if (!cancelled) {
          stop = module.subscribeWeights(uid, setEntries, () => setEntries((current) => current ?? []))
        }
      })
      .catch(() => setEntries([]))
    return () => {
      cancelled = true
      stop?.()
    }
  }, [uid])

  const latest = entries && entries.length > 0 ? entries[entries.length - 1] : null

  useEffect(() => {
    if (!latest) {
      return
    }
    const kg = Math.min(WEIGHT_RANGE[1], Math.max(WEIGHT_RANGE[0], Math.round(latest.kg)))
    if (getSettings().weightKg !== kg) {
      updateSettings({ weightKg: kg })
    }
  }, [latest])

  const save = useCallback(
    async (date: string, kg: number) => {
      if (uid === null) {
        throw new Error('Sign in to save your weight.')
      }
      const entry = { date, kg: roundKg(kg), updatedAt: new Date().toISOString() }
      setEntries((current) => [...(current ?? []).filter((item) => item.date !== date), entry].sort((a, b) => (a.date < b.date ? -1 : 1)))
      await (await loadBody()).saveWeight(uid, entry)
    },
    [uid],
  )

  const remove = useCallback(
    async (date: string) => {
      if (uid === null) {
        return
      }
      setEntries((current) => (current ?? []).filter((item) => item.date !== date))
      await (await loadBody()).deleteWeight(uid, date)
    },
    [uid],
  )

  const value = useMemo<BodyContextValue>(
    () => ({ ready: entries !== null, entries: entries ?? [], latest, save, remove }),
    [entries, latest, save, remove],
  )

  return <BodyContext.Provider value={value}>{children}</BodyContext.Provider>
}

export function useBody(): BodyContextValue {
  const context = useContext(BodyContext)
  if (context === null) {
    throw new Error('useBody must be used within a BodyProvider.')
  }
  return context
}

export function bmiOf(kg: number, heightCm: number | null): number | null {
  if (!heightCm) {
    return null
  }
  const meters = heightCm / 100
  return Math.round((kg / (meters * meters)) * 10) / 10
}

export type BmiBand = 'under' | 'healthy' | 'over' | 'obese'

export function bmiBand(bmi: number): BmiBand {
  return bmi < 18.5 ? 'under' : bmi < 25 ? 'healthy' : bmi < 30 ? 'over' : 'obese'
}
