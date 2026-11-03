export type ServingUnit = 'g' | 'ml' | 'cup' | 'tbsp' | 'piece' | 'slice' | 'bowl' | 'plate' | 'serving' | 'scoop' | 'can' | 'bar' | 'handful' | 'bottle'

export type FoodCategory = 'grains' | 'protein' | 'dairy' | 'fruit' | 'veg' | 'fats' | 'korean' | 'japanese' | 'chinese' | 'seasian' | 'indian' | 'italian' | 'mexican' | 'fastfood' | 'meals' | 'snacks' | 'drinks'

export interface FoodItem {
  id: string
  name: string
  ko?: string
  qty: number
  unit: ServingUnit
  grams?: number
  kcal: number
  protein: number
  category: FoodCategory
  label?: string
  custom?: boolean
}
