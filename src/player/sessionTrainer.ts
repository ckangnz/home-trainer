import { useSyncExternalStore } from 'react'
import { TRAINER_ORDER, type TrainerId } from '@/figure/look'
import { getSettings } from '@/settings/settings'

let active: TrainerId | null = null
let previous: TrainerId | null = null
const listeners = new Set<() => void>()
export function pickWorkoutTrainer(last: TrainerId | null, random = Math.random): TrainerId {
  const pool = TRAINER_ORDER.filter(id => id !== last)
  return pool[Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)))]
}
export function startSessionTrainer(): TrainerId {
  const settings = getSettings()
  active = settings.randomTrainer ? pickWorkoutTrainer(previous) : settings.trainer
  if (settings.randomTrainer) previous = active
  listeners.forEach(fn => fn())
  return active
}
export function endSessionTrainer() {
  active = null
  listeners.forEach(fn => fn())
}
export function getWorkoutTrainer(): TrainerId { return active ?? getSettings().trainer }
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
export function useWorkoutTrainer(): TrainerId | null {
  return useSyncExternalStore(subscribe, () => active, () => null)
}
