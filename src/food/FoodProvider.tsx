import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { toDateKey } from '@/history/streaks'
import { newId } from '@/workouts/routine'
import { parsePlanBody } from './models'
import type { CustomFood, FoodLog, FoodLogEntry, FoodPrefs, MealPlan, MealPlanBody } from './types'

type FoodModule = typeof import('@/data/food')

export const LIVE_DAYS = 70

interface FoodContextValue {
  ready: boolean
  plans: MealPlan[]
  prefs: FoodPrefs
  activePlan: MealPlan | null
  logs: Map<string, FoodLog>
  customFoods: CustomFood[]
  liveFrom: string
  savePlan: (body: MealPlanBody, id?: string) => Promise<MealPlan>
  importPlan: (plan: MealPlan, ownerName: string) => Promise<MealPlan>
  removePlan: (id: string) => Promise<void>
  setActivePlan: (id: string | null) => Promise<void>
  setShareWithFriends: (share: boolean) => Promise<void>
  saveLog: (date: string, entries: FoodLogEntry[], cheat: boolean) => Promise<void>
  addCustomFood: (food: Omit<CustomFood, 'id' | 'createdAt'>) => Promise<CustomFood>
  updateCustomFood: (id: string, food: Omit<CustomFood, 'id' | 'createdAt'>) => Promise<CustomFood>
  removeCustomFood: (id: string) => Promise<void>
}

const FoodContext = createContext<FoodContextValue | null>(null)

const DEFAULT_PREFS: FoodPrefs = { activePlanId: null, shareWithFriends: false }

export const loadFood = (): Promise<FoodModule> => import('@/data/food')

export function daysAgo(days: number, from = new Date()): string {
  return toDateKey(new Date(from.getFullYear(), from.getMonth(), from.getDate() - days))
}

export function FoodProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const [plans, setPlans] = useState<MealPlan[] | null>(null)
  const [prefs, setPrefs] = useState<FoodPrefs | null>(null)
  const [logList, setLogList] = useState<FoodLog[] | null>(null)
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([])
  const liveFrom = useMemo(() => daysAgo(LIVE_DAYS), [])

  useEffect(() => {
    setPlans(null)
    setPrefs(null)
    setLogList(null)
    setCustomFoods([])
    if (uid === null) {
      return
    }
    let cancelled = false
    let stops: (() => void)[] = []
    loadFood()
      .then((module) => {
        if (cancelled) {
          return
        }
        stops = [
          module.subscribeMealPlans(uid, setPlans, () => setPlans((current) => current ?? [])),
          module.subscribeFoodPrefs(uid, setPrefs, () => setPrefs((current) => current ?? DEFAULT_PREFS)),
          module.subscribeFoodLogs(uid, liveFrom, setLogList, () => setLogList((current) => current ?? [])),
          module.subscribeCustomFoods(uid, setCustomFoods, () => {}),
        ]
      })
      .catch(() => {
        setPlans([])
        setPrefs(DEFAULT_PREFS)
        setLogList([])
      })
    return () => {
      cancelled = true
      stops.forEach((stop) => stop())
    }
  }, [uid, liveFrom])

  const currentPrefs = prefs ?? DEFAULT_PREFS
  const planList = useMemo(() => plans ?? [], [plans])
  const activePlan = planList.find((plan) => plan.id === currentPrefs.activePlanId) ?? planList[0] ?? null
  const logs = useMemo(() => new Map((logList ?? []).map((log) => [log.date, log])), [logList])

  const requireUid = useCallback(() => {
    if (uid === null) {
      throw new Error('Sign in to save your food log.')
    }
    return uid
  }, [uid])

  const writePrefs = useCallback(
    async (next: FoodPrefs) => {
      const owner = requireUid()
      setPrefs(next)
      await (await loadFood()).saveFoodPrefs(owner, next)
    },
    [requireUid],
  )

  const storePlan = useCallback(
    async (plan: MealPlan) => {
      setPlans((current) => [plan, ...(current ?? []).filter((item) => item.id !== plan.id)])
      await (await loadFood()).saveMealPlan(plan)
      if (!currentPrefs.activePlanId || !planList.some((item) => item.id === currentPrefs.activePlanId)) {
        await writePrefs({ ...currentPrefs, activePlanId: plan.id })
      }
      return plan
    },
    [currentPrefs, planList, writePrefs],
  )

  const savePlan = useCallback(
    (body: MealPlanBody, id?: string) => {
      const owner = requireUid()
      const now = new Date().toISOString()
      const existing = id ? planList.find((plan) => plan.id === id) : undefined
      const clean = parsePlanBody(body) ?? body
      return storePlan({
        ...clean,
        id: existing?.id ?? newId(),
        ownerId: owner,
        source: existing?.source,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      })
    },
    [planList, requireUid, storePlan],
  )

  const importPlan = useCallback(
    (plan: MealPlan, ownerName: string) => {
      const owner = requireUid()
      const now = new Date().toISOString()
      return storePlan({
        name: plan.name,
        description: plan.description,
        targets: plan.targets,
        meals: plan.meals,
        id: newId(),
        ownerId: owner,
        source: { kind: 'friend', uid: plan.ownerId, planId: plan.id, ownerName },
        createdAt: now,
        updatedAt: now,
      })
    },
    [requireUid, storePlan],
  )

  const removePlan = useCallback(
    async (id: string) => {
      const owner = requireUid()
      setPlans((current) => (current ?? []).filter((plan) => plan.id !== id))
      await (await loadFood()).deleteMealPlan(owner, id)
      if (currentPrefs.activePlanId === id) {
        const next = planList.find((plan) => plan.id !== id)
        await writePrefs({ ...currentPrefs, activePlanId: next?.id ?? null })
      }
    },
    [currentPrefs, planList, requireUid, writePrefs],
  )

  const setActivePlan = useCallback((id: string | null) => writePrefs({ ...currentPrefs, activePlanId: id }), [currentPrefs, writePrefs])

  const setShareWithFriends = useCallback(
    (share: boolean) => writePrefs({ ...currentPrefs, activePlanId: activePlan?.id ?? currentPrefs.activePlanId, shareWithFriends: share }),
    [activePlan, currentPrefs, writePrefs],
  )

  const saveLog = useCallback(
    async (date: string, entries: FoodLogEntry[], cheat: boolean) => {
      const owner = requireUid()
      const log: FoodLog = { date, entries, updatedAt: new Date().toISOString() }
      if (cheat) log.cheat = true
      setLogList((current) => {
        const rest = (current ?? []).filter((item) => item.date !== date)
        return entries.length > 0 || cheat ? [...rest, log].sort((a, b) => (a.date < b.date ? -1 : 1)) : rest
      })
      await (await loadFood()).saveFoodLog(owner, log)
    },
    [requireUid],
  )

  const addCustomFood = useCallback(
    async (food: Omit<CustomFood, 'id' | 'createdAt'>) => {
      const owner = requireUid()
      const created: CustomFood = { ...food, id: newId(), createdAt: new Date().toISOString() }
      setCustomFoods((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))
      await (await loadFood()).saveCustomFood(owner, created)
      return created
    },
    [requireUid],
  )

  const updateCustomFood = useCallback(
    async (id: string, food: Omit<CustomFood, 'id' | 'createdAt'>) => {
      const owner = requireUid()
      const existing = customFoods.find((item) => item.id === id)
      const updated: CustomFood = { ...food, id, createdAt: existing?.createdAt ?? new Date().toISOString() }
      setCustomFoods((current) => current.map((item) => (item.id === id ? updated : item)).sort((a, b) => a.name.localeCompare(b.name)))
      await (await loadFood()).saveCustomFood(owner, updated)
      return updated
    },
    [customFoods, requireUid],
  )

  const removeCustomFood = useCallback(
    async (id: string) => {
      const owner = requireUid()
      setCustomFoods((current) => current.filter((food) => food.id !== id))
      await (await loadFood()).deleteCustomFood(owner, id)
    },
    [requireUid],
  )

  const value = useMemo<FoodContextValue>(
    () => ({
      ready: plans !== null && prefs !== null && logList !== null,
      plans: planList,
      prefs: currentPrefs,
      activePlan,
      logs,
      customFoods,
      liveFrom,
      savePlan,
      importPlan,
      removePlan,
      setActivePlan,
      setShareWithFriends,
      saveLog,
      addCustomFood,
      updateCustomFood,
      removeCustomFood,
    }),
    [
      plans,
      prefs,
      logList,
      planList,
      currentPrefs,
      activePlan,
      logs,
      customFoods,
      liveFrom,
      savePlan,
      importPlan,
      removePlan,
      setActivePlan,
      setShareWithFriends,
      saveLog,
      addCustomFood,
      updateCustomFood,
      removeCustomFood,
    ],
  )

  return <FoodContext.Provider value={value}>{children}</FoodContext.Provider>
}

export function useFood(): FoodContextValue {
  const context = useContext(FoodContext)
  if (context === null) {
    throw new Error('useFood must be used within a FoodProvider.')
  }
  return context
}
