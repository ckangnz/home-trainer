import { describe, expect, it } from 'vitest'
import { FOODS } from './foods'
import { customToItem, scaled, searchFoods } from './search'

describe('food search', () => {
  it('has unique ids and sane values', () => {
    expect(new Set(FOODS.map((food) => food.id)).size).toBe(FOODS.length)
    expect(FOODS.length).toBeGreaterThan(180)
    for (const food of FOODS) {
      expect(food.kcal).toBeGreaterThanOrEqual(0)
      expect(food.protein * 4).toBeLessThanOrEqual(food.kcal + 5)
      expect(food.ko).toBeTruthy()
    }
  })

  it('ranks prefix matches first and matches Korean names', () => {
    expect(searchFoods(FOODS, 'chicken')[0].name).toMatch(/^Chicken/)
    expect(searchFoods(FOODS, '김치').map((food) => food.id)).toContain('kimchi-stew')
    expect(searchFoods(FOODS, 'greek yog').map((food) => food.id).sort()).toEqual(['greek-yogurt', 'greek-yogurt-full'])
    expect(searchFoods(FOODS, 'zzzz')).toEqual([])
  })

  it('includes custom foods and filters by category', () => {
    const custom = customToItem({ id: 'c1', name: 'Mum’s chicken soup', serving: '1 bowl', kcal: 320, protein: 28, createdAt: '' })
    expect(searchFoods([custom, ...FOODS], 'chicken')[0].id).toBe('custom:c1')
    expect(searchFoods(FOODS, '', 'fruit').every((food) => food.category === 'fruit')).toBe(true)
  })

  it('scales nutrition by servings', () => {
    const egg = FOODS.find((food) => food.id === 'egg')!
    expect(scaled(egg, 2)).toEqual({ kcal: 156, protein: 12 })
  })
})
