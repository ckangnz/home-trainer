export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks'

export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snacks']

export interface FoodOption {
  id: string
  name: string
  portion?: string
  notes?: string
  kcal?: number
  protein?: number
  foodId?: string
  servings?: number
}

export interface NutritionTargets {
  kcal?: number
  protein?: number
}

export type PlanSource = { kind: 'friend'; uid: string; planId: string; ownerName?: string }

export interface MealPlanBody {
  name: string
  description?: string
  targets?: NutritionTargets
  meals: Record<MealSlot, FoodOption[]>
}

export interface MealPlan extends MealPlanBody {
  id: string
  ownerId: string
  source?: PlanSource
  createdAt: string
  updatedAt: string
}

export type LogStatus = 'planned' | 'swapped' | 'skipped'

export interface FoodLogEntry {
  id: string
  meal: MealSlot
  status: LogStatus
  name: string
  optionId?: string
  portion?: string
  time?: string
  note?: string
  kcal?: number
  protein?: number
  foodId?: string
  servings?: number
}

export interface FoodLog {
  date: string
  entries: FoodLogEntry[]
  cheat?: boolean
  updatedAt: string
}

export interface CustomFood {
  id: string
  name: string
  serving: string
  kcal: number
  protein: number
  createdAt: string
}

export interface FoodPrefs {
  activePlanId: string | null
  shareWithFriends: boolean
}

export const FOOD_LIMITS = {
  options: 20,
  customFoods: 300,
  entries: 40,
  name: 80,
  portion: 60,
  notes: 200,
  planName: 60,
}
