import {
  FOOD_LIMITS,
  MEAL_SLOTS,
  type CustomFood,
  type FoodLog,
  type FoodLogEntry,
  type FoodOption,
  type FoodPrefs,
  type LogStatus,
  type MealPlan,
  type MealPlanBody,
  type MealSlot,
  type NutritionTargets,
  type PlanSource,
} from './types'

type Json = Record<string, unknown>

const DAY = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^\d{2}:\d{2}$/
const STATUSES: LogStatus[] = ['planned', 'swapped', 'skipped']

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim().slice(0, max)
  return trimmed || undefined
}

function amount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 10000 ? Math.round(value) : undefined
}

function servingsOf(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 50 ? Math.round(value * 100) / 100 : undefined
}

function withNutrition<T extends { kcal?: number; protein?: number; foodId?: string; servings?: number }>(target: T, value: Json): T {
  const kcal = amount(value.kcal)
  const protein = amount(value.protein)
  const foodId = text(value.foodId, 80)
  const servings = servingsOf(value.servings)
  if (kcal !== undefined) target.kcal = kcal
  if (protein !== undefined) target.protein = protein
  if (foodId) target.foodId = foodId
  if (servings !== undefined) target.servings = servings
  return target
}

function parseTargets(value: unknown): NutritionTargets | undefined {
  if (!isObject(value)) {
    return undefined
  }
  const targets: NutritionTargets = {}
  const kcal = amount(value.kcal)
  const protein = amount(value.protein)
  if (kcal) targets.kcal = kcal
  if (protein) targets.protein = protein
  return targets.kcal || targets.protein ? targets : undefined
}

function parseOption(value: unknown): FoodOption | null {
  if (!isObject(value)) {
    return null
  }
  const id = text(value.id, 40)
  const name = text(value.name, FOOD_LIMITS.name)
  if (!id || !name) {
    return null
  }
  const option: FoodOption = { id, name }
  const portion = text(value.portion, FOOD_LIMITS.portion)
  const notes = text(value.notes, FOOD_LIMITS.notes)
  if (portion) option.portion = portion
  if (notes) option.notes = notes
  return withNutrition(option, value)
}

export function parsePlanBody(value: unknown): MealPlanBody | null {
  if (!isObject(value) || !isObject(value.meals)) {
    return null
  }
  const name = text(value.name, FOOD_LIMITS.planName) ?? 'My meal plan'
  const meals = {} as Record<MealSlot, FoodOption[]>
  for (const slot of MEAL_SLOTS) {
    const raw = (value.meals as Json)[slot]
    meals[slot] = Array.isArray(raw)
      ? raw.map(parseOption).filter((option): option is FoodOption => option !== null).slice(0, FOOD_LIMITS.options)
      : []
  }
  const body: MealPlanBody = { name, meals }
  const description = text(value.description, FOOD_LIMITS.notes)
  const targets = parseTargets(value.targets)
  if (description) body.description = description
  if (targets) body.targets = targets
  return body
}

function parseSource(value: unknown): PlanSource | undefined {
  if (!isObject(value) || value.kind !== 'friend') {
    return undefined
  }
  const uid = text(value.uid, 128)
  const planId = text(value.planId, 80)
  if (!uid || !planId) {
    return undefined
  }
  const source: PlanSource = { kind: 'friend', uid, planId }
  const ownerName = text(value.ownerName, 80)
  if (ownerName) source.ownerName = ownerName
  return source
}

export function parsePlan(id: string, ownerId: string, value: unknown): MealPlan | null {
  const body = parsePlanBody(value)
  if (!body || !isObject(value)) {
    return null
  }
  const plan: MealPlan = {
    ...body,
    id,
    ownerId,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : '',
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
  }
  const source = parseSource(value.source)
  if (source) plan.source = source
  return plan
}

function parseEntry(value: unknown): FoodLogEntry | null {
  if (!isObject(value)) {
    return null
  }
  const id = text(value.id, 40)
  const meal = MEAL_SLOTS.includes(value.meal as MealSlot) ? (value.meal as MealSlot) : null
  const status = STATUSES.includes(value.status as LogStatus) ? (value.status as LogStatus) : null
  const name = text(value.name, FOOD_LIMITS.name) ?? (status === 'skipped' ? 'Skipped' : undefined)
  if (!id || !meal || !status || !name) {
    return null
  }
  const entry: FoodLogEntry = { id, meal, status, name }
  const optionId = text(value.optionId, 40)
  const portion = text(value.portion, FOOD_LIMITS.portion)
  const note = text(value.note, FOOD_LIMITS.notes)
  const time = typeof value.time === 'string' && TIME.test(value.time) ? value.time : undefined
  if (optionId) entry.optionId = optionId
  if (portion) entry.portion = portion
  if (note) entry.note = note
  if (time) entry.time = time
  return withNutrition(entry, value)
}

export function parseLog(date: string, value: unknown): FoodLog | null {
  if (!DAY.test(date) || !isObject(value) || !Array.isArray(value.entries)) {
    return null
  }
  const log: FoodLog = {
    date,
    entries: value.entries.map(parseEntry).filter((entry): entry is FoodLogEntry => entry !== null).slice(0, FOOD_LIMITS.entries),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
  }
  if (value.cheat === true) log.cheat = true
  return log
}

export function parseCustomFood(id: string, value: unknown): CustomFood | null {
  if (!isObject(value)) {
    return null
  }
  const name = text(value.name, FOOD_LIMITS.name)
  const kcal = amount(value.kcal)
  const protein = amount(value.protein)
  if (!name || kcal === undefined) {
    return null
  }
  return {
    id,
    name,
    serving: text(value.serving, FOOD_LIMITS.portion) ?? '',
    kcal,
    protein: protein ?? 0,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : '',
  }
}

export function parsePrefs(value: unknown): FoodPrefs {
  if (!isObject(value)) {
    return { activePlanId: null, shareWithFriends: false }
  }
  return {
    activePlanId: text(value.activePlanId, 80) ?? null,
    shareWithFriends: value.shareWithFriends === true,
  }
}

export function emptyPlan(name = 'My meal plan'): MealPlanBody {
  return { name, meals: { breakfast: [], lunch: [], dinner: [], snacks: [] } }
}

export type MealScore = 'planned' | 'swapped' | 'skipped' | 'missing'

export function mealScore(entries: FoodLogEntry[], meal: MealSlot): MealScore {
  const forMeal = entries.filter((entry) => entry.meal === meal)
  if (forMeal.length === 0) {
    return 'missing'
  }
  if (forMeal.some((entry) => entry.status === 'swapped')) {
    return 'swapped'
  }
  if (forMeal.some((entry) => entry.status === 'planned')) {
    return 'planned'
  }
  return 'skipped'
}

export interface DayScore {
  onPlan: number
  logged: number
  total: number
}

export function dayScore(log: FoodLog | undefined): DayScore {
  const meals: MealSlot[] = ['breakfast', 'lunch', 'dinner']
  const entries = log?.entries ?? []
  const scores = meals.map((meal) => mealScore(entries, meal))
  return {
    onPlan: scores.filter((score) => score === 'planned').length,
    logged: scores.filter((score) => score !== 'missing').length,
    total: meals.length,
  }
}

export interface Intake {
  kcal: number
  protein: number
}

export function intakeOf(entries: FoodLogEntry[]): Intake {
  return entries.reduce(
    (sum, entry) => (entry.status === 'skipped' ? sum : { kcal: sum.kcal + (entry.kcal ?? 0), protein: sum.protein + (entry.protein ?? 0) }),
    { kcal: 0, protein: 0 },
  )
}
