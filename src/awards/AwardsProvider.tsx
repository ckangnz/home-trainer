import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { useData } from '@/data/DataProvider'
import { awardFromId } from './catalog'
import { EMPTY_PROGRESS, evaluateAwards, type Evaluation, type StoredProgress } from './evaluate'
import type { AwardDef, EarnedAward } from './types'

type AwardsModule = typeof import('@/data/awards')

interface AwardsContextValue {
  ready: boolean
  earned: Map<string, EarnedAward>
  evaluation: Evaluation
  fresh: AwardDef[]
  dismissFresh: () => void
}

const AwardsContext = createContext<AwardsContextValue | null>(null)

const loadAwards = (): Promise<AwardsModule> => import('@/data/awards')

export function AwardsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const { completions, ready: dataReady } = useData()
  const [earnedList, setEarnedList] = useState<EarnedAward[] | null>(null)
  const [stored, setStored] = useState<StoredProgress | null>(null)
  const [fresh, setFresh] = useState<AwardDef[]>([])
  const saving = useRef(new Set<string>())
  const savedProgress = useRef('')

  useEffect(() => {
    setEarnedList(null)
    setStored(null)
    setFresh([])
    saving.current.clear()
    savedProgress.current = ''
    if (uid === null) {
      return
    }
    let cancelled = false
    let stops: (() => void)[] = []
    loadAwards()
      .then((module) => {
        if (cancelled) {
          return
        }
        stops = [
          module.subscribeAwards(uid, setEarnedList, () => setEarnedList((current) => current ?? [])),
          module.subscribeProgress(
            uid,
            (progress) => {
              savedProgress.current = JSON.stringify(progress)
              setStored(progress)
            },
            () => setStored((current) => current ?? EMPTY_PROGRESS),
          ),
        ]
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      stops.forEach((stop) => stop())
    }
  }, [uid])

  const earned = useMemo(() => new Map((earnedList ?? []).map((award) => [award.id, award])), [earnedList])
  const evaluation = useMemo(() => evaluateAwards(completions, stored ?? EMPTY_PROGRESS, new Date()), [completions, stored])
  const ready = uid !== null && dataReady && earnedList !== null && stored !== null

  useEffect(() => {
    if (!ready || uid === null) {
      return
    }
    const now = new Date().toISOString()
    const added = evaluation.earned.filter((award) => !earned.has(award.id) && !saving.current.has(award.id))
    const progressJson = JSON.stringify(evaluation.progress)
    if (added.length === 0 && progressJson === savedProgress.current) {
      return
    }
    added.forEach((award) => saving.current.add(award.id))
    savedProgress.current = progressJson
    if (added.length > 0) {
      setFresh((current) => [...current, ...added.filter((award) => !current.some((entry) => entry.id === award.id))])
    }
    loadAwards()
      .then((module) =>
        module.saveAwards(
          uid,
          added.map((award) => ({ id: award.id, earnedAt: now })),
          evaluation.progress,
        ),
      )
      .catch(() => {
        added.forEach((award) => saving.current.delete(award.id))
        savedProgress.current = ''
      })
  }, [ready, uid, evaluation, earned])

  const dismissFresh = useCallback(() => setFresh([]), [])

  const value = useMemo<AwardsContextValue>(
    () => ({ ready, earned, evaluation, fresh, dismissFresh }),
    [ready, earned, evaluation, fresh, dismissFresh],
  )

  return <AwardsContext.Provider value={value}>{children}</AwardsContext.Provider>
}

export function useAwards(): AwardsContextValue {
  const context = useContext(AwardsContext)
  if (context === null) {
    throw new Error('useAwards must be used within an AwardsProvider.')
  }
  return context
}

export function earnedAwards(earned: Map<string, EarnedAward>): { award: AwardDef; earnedAt: string }[] {
  return [...earned.values()]
    .map((entry) => ({ award: awardFromId(entry.id), earnedAt: entry.earnedAt }))
    .filter((entry): entry is { award: AwardDef; earnedAt: string } => entry.award !== null)
}
