import { newId } from '@/workouts/routine'
import { dayScore, intakeOf } from './models'
import type { FoodLog, FoodLogEntry, FoodOption, MealSlot } from './types'

export interface OtherFood {
  name: string
  portion?: string
  note?: string
  kcal?: number
  protein?: number
  foodId?: string
  servings?: number
}

function nutritionFrom(source: { kcal?: number; protein?: number; foodId?: string; servings?: number }, entry: FoodLogEntry): FoodLogEntry {
  if (source.kcal !== undefined) entry.kcal = source.kcal
  if (source.protein !== undefined) entry.protein = source.protein
  if (source.foodId) entry.foodId = source.foodId
  if (source.servings !== undefined) entry.servings = source.servings
  return entry
}

function withoutSkipped(entries: FoodLogEntry[], meal: MealSlot): FoodLogEntry[] {
  return entries.filter((entry) => !(entry.meal === meal && entry.status === 'skipped'))
}

export function togglePlanned(entries: FoodLogEntry[], meal: MealSlot, option: FoodOption, time?: string): FoodLogEntry[] {
  const existing = entries.find((entry) => entry.meal === meal && entry.status === 'planned' && entry.optionId === option.id)
  if (existing) {
    return entries.filter((entry) => entry.id !== existing.id)
  }
  const entry: FoodLogEntry = { id: newId(), meal, status: 'planned', optionId: option.id, name: option.name }
  if (option.portion) entry.portion = option.portion
  if (time) entry.time = time
  return [...withoutSkipped(entries, meal), nutritionFrom(option, entry)]
}

export function addOther(entries: FoodLogEntry[], meal: MealSlot, food: OtherFood, time?: string): FoodLogEntry[] {
  const entry: FoodLogEntry = { id: newId(), meal, status: 'swapped', name: food.name.trim() }
  if (food.portion?.trim()) entry.portion = food.portion.trim()
  if (food.note?.trim()) entry.note = food.note.trim()
  if (time) entry.time = time
  return [...withoutSkipped(entries, meal), nutritionFrom(food, entry)]
}

export function toggleSkipped(entries: FoodLogEntry[], meal: MealSlot, time?: string): FoodLogEntry[] {
  const forMeal = entries.filter((entry) => entry.meal === meal)
  const rest = entries.filter((entry) => entry.meal !== meal)
  if (forMeal.length > 0 && forMeal.every((entry) => entry.status === 'skipped')) {
    return rest
  }
  const entry: FoodLogEntry = { id: newId(), meal, status: 'skipped', name: 'Skipped' }
  if (time) entry.time = time
  return [...rest, entry]
}

export function updateEntry(entries: FoodLogEntry[], id: string, food: OtherFood): FoodLogEntry[] {
  return entries.map((entry) => {
    if (entry.id !== id) {
      return entry
    }
    const next: FoodLogEntry = { id: entry.id, meal: entry.meal, status: entry.status, name: food.name.trim() }
    if (entry.optionId) next.optionId = entry.optionId
    if (entry.time) next.time = entry.time
    if (food.portion?.trim()) next.portion = food.portion.trim()
    if (food.note?.trim()) next.note = food.note.trim()
    return nutritionFrom(food, next)
  })
}

export function removeEntry(entries: FoodLogEntry[], id: string): FoodLogEntry[] {
  return entries.filter((entry) => entry.id !== id)
}

export function clockTime(date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export interface RangeSummary {
  onPlan: number
  logged: number
  total: number
  percent: number | null
  perfectDays: number
  cheatDays: number
  averageKcal: number | null
  averageProtein: number | null
}

export function summarize(logs: Map<string, FoodLog>, days: string[]): RangeSummary {
  let onPlan = 0
  let logged = 0
  let perfectDays = 0
  let cheatDays = 0
  let kcal = 0
  let protein = 0
  let trackedDays = 0
  for (const day of days) {
    const log = logs.get(day)
    const intake = intakeOf(log?.entries ?? [])
    if (intake.kcal > 0) {
      trackedDays += 1
      kcal += intake.kcal
      protein += intake.protein
    }
    if (log?.cheat) {
      cheatDays += 1
      continue
    }
    const score = dayScore(log)
    onPlan += score.onPlan
    logged += score.logged
    if (score.onPlan === score.total) {
      perfectDays += 1
    }
  }
  return {
    onPlan,
    logged,
    total: (days.length - cheatDays) * 3,
    percent: logged > 0 ? Math.round((onPlan / logged) * 100) : null,
    perfectDays,
    cheatDays,
    averageKcal: trackedDays > 0 ? Math.round(kcal / trackedDays) : null,
    averageProtein: trackedDays > 0 ? Math.round(protein / trackedDays) : null,
  }
}

export type DayStatus = 'all' | 'some' | 'off' | 'cheat' | 'none'

export function dayStatus(log: FoodLog | undefined): DayStatus {
  if (log?.cheat) {
    return 'cheat'
  }
  const score = dayScore(log)
  if (score.logged === 0) {
    return 'none'
  }
  if (score.onPlan === score.total) {
    return 'all'
  }
  return score.onPlan > 0 ? 'some' : 'off'
}
