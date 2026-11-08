import type { CustomFood } from '../types'
import type { FoodCategory, FoodItem } from './types'

export const FOOD_CATEGORIES: FoodCategory[] = ['korean', 'japanese', 'chinese', 'seasian', 'indian', 'italian', 'mexican', 'fastfood', 'meals', 'protein', 'grains', 'dairy', 'fruit', 'veg', 'fats', 'snacks', 'drinks']

export const CATEGORY_ICONS: Record<FoodCategory | 'mine', string> = {
  mine: '⭐',
  korean: '🍲',
  japanese: '🍣',
  chinese: '🥡',
  seasian: '🍜',
  indian: '🍛',
  italian: '🍝',
  mexican: '🌮',
  fastfood: '🍔',
  meals: '🥗',
  protein: '🍗',
  grains: '🍚',
  dairy: '🥛',
  fruit: '🍎',
  veg: '🥦',
  fats: '🥜',
  snacks: '🍪',
  drinks: '🥤',
}

export const loadFoodList = (): Promise<FoodItem[]> => import('./foods').then((module) => module.FOODS)

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim()
}

function rank(haystack: string, query: string): number {
  if (haystack.startsWith(query)) {
    return 0
  }
  if (haystack.split(/[\s,()/-]+/).some((word) => word.startsWith(query))) {
    return 1
  }
  return haystack.includes(query) ? 2 : -1
}

export function customToItem(food: CustomFood): FoodItem {
  return { id: `custom:${food.id}`, name: food.name, qty: 1, unit: 'serving', label: food.serving || undefined, kcal: food.kcal, protein: food.protein, category: 'meals', custom: true }
}

export function sameCustomFood(a: Omit<CustomFood, 'id' | 'createdAt'>, b: Omit<CustomFood, 'id' | 'createdAt'>): boolean {
  const key = (food: Omit<CustomFood, 'id' | 'createdAt'>) => [normalize(food.name), normalize(food.serving), food.kcal, food.protein].join('|')
  return key(a) === key(b)
}

export function searchFoods(foods: FoodItem[], query: string, category: FoodCategory | null = null, limit = 40): FoodItem[] {
  const needle = normalize(query)
  const pool = category ? foods.filter((food) => food.category === category && !food.custom) : foods
  if (!needle) {
    return pool.slice(0, limit)
  }
  const terms = needle.split(/\s+/)
  return pool
    .map((food) => {
      const fields = [normalize(food.name), food.ko ? normalize(food.ko) : '']
      let score = 0
      for (const term of terms) {
        const best = Math.min(...fields.map((field) => rank(field, term)).filter((value) => value >= 0))
        if (!Number.isFinite(best)) {
          return null
        }
        score += best
      }
      return { food, score: score - (food.custom ? 1.5 : 0) }
    })
    .filter((entry): entry is { food: FoodItem; score: number } => entry !== null)
    .sort((a, b) => a.score - b.score || a.food.name.length - b.food.name.length)
    .slice(0, limit)
    .map((entry) => entry.food)
}

export function scaled(food: FoodItem, servings: number): { kcal: number; protein: number } {
  return { kcal: Math.round(food.kcal * servings), protein: Math.round(food.protein * servings) }
}
