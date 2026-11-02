import { describe, expect, it } from 'vitest'
import { addOther, dayStatus, removeEntry, summarize, togglePlanned, toggleSkipped, updateEntry } from './log'
import { dayScore, parseLog, parsePlanBody } from './models'
import type { FoodLog, FoodOption } from './types'

const oats: FoodOption = { id: 'oats', name: 'Oats', portion: '1 cup' }
const eggs: FoodOption = { id: 'eggs', name: 'Eggs' }

describe('food log editing', () => {
  it('toggles a planned option on and off', () => {
    const once = togglePlanned([], 'breakfast', oats, '08:00')
    expect(once).toHaveLength(1)
    expect(once[0]).toMatchObject({ meal: 'breakfast', status: 'planned', optionId: 'oats', portion: '1 cup', time: '08:00' })
    expect(togglePlanned(once, 'breakfast', oats)).toHaveLength(0)
  })

  it('replaces a skip when food is logged', () => {
    const skipped = toggleSkipped([], 'lunch')
    expect(skipped[0].status).toBe('skipped')
    const ate = addOther(skipped, 'lunch', { name: ' Ramen ', portion: '' })
    expect(ate).toHaveLength(1)
    expect(ate[0]).toMatchObject({ status: 'swapped', name: 'Ramen' })
    expect(ate[0].portion).toBeUndefined()
  })

  it('skipping clears the meal and skipping again un-skips', () => {
    const logged = togglePlanned(togglePlanned([], 'dinner', oats), 'dinner', eggs)
    const skipped = toggleSkipped(logged, 'dinner')
    expect(skipped).toHaveLength(1)
    expect(toggleSkipped(skipped, 'dinner')).toHaveLength(0)
  })

  it('updates an entry in place and keeps its status and time', () => {
    const logged = addOther([], 'lunch', { name: 'Ramen', kcal: 500, protein: 10, servings: 1, note: 'late' }, '13:00')
    const [updated] = updateEntry(logged, logged[0].id, { name: 'Ramen', kcal: 250, protein: 5, servings: 0.5 })
    expect(updated).toEqual({ id: logged[0].id, meal: 'lunch', status: 'swapped', name: 'Ramen', time: '13:00', kcal: 250, protein: 5, servings: 0.5 })
  })

  it('removes a single entry', () => {
    const logged = togglePlanned(togglePlanned([], 'snacks', oats), 'snacks', eggs)
    expect(removeEntry(logged, logged[0].id).map((entry) => entry.optionId)).toEqual(['eggs'])
  })
})

describe('food scores', () => {
  const log = (entries: FoodLog['entries']): FoodLog => ({ date: '2026-11-03', entries, updatedAt: '' })

  it('counts main meals on plan and ignores snacks', () => {
    let entries = togglePlanned([], 'breakfast', oats)
    entries = addOther(entries, 'lunch', { name: 'Pizza' })
    entries = addOther(entries, 'snacks', { name: 'Chips' })
    expect(dayScore(log(entries))).toEqual({ onPlan: 1, logged: 2, total: 3 })
    expect(dayStatus(log(entries))).toBe('some')
  })

  it('treats an extra off-plan item as off plan for that meal', () => {
    const entries = addOther(togglePlanned([], 'dinner', oats), 'dinner', { name: 'Dessert' })
    expect(dayScore(log(entries)).onPlan).toBe(0)
  })

  it('summarizes a range of days', () => {
    const full = ['breakfast', 'lunch', 'dinner'].reduce((entries, meal) => togglePlanned(entries, meal as 'lunch', oats), [] as FoodLog['entries'])
    const logs = new Map([['2026-11-02', { ...log(full), date: '2026-11-02' }]])
    expect(summarize(logs, ['2026-11-02', '2026-11-03'])).toMatchObject({ onPlan: 3, logged: 3, total: 6, percent: 100, perfectDays: 1, cheatDays: 0 })
    expect(summarize(new Map(), ['2026-11-03']).percent).toBeNull()
    expect(dayStatus(undefined)).toBe('none')
  })
})

describe('cheat days and intake', () => {
  it('excludes cheat days from the on-plan score and averages intake', () => {
    const planned = togglePlanned([], 'breakfast', { id: 'oats', name: 'Oats', kcal: 300, protein: 10 })
    const pizza = addOther([], 'dinner', { name: 'Pizza', kcal: 900, protein: 30 })
    const logs = new Map<string, FoodLog>([
      ['2026-11-02', { date: '2026-11-02', entries: planned, updatedAt: '' }],
      ['2026-11-03', { date: '2026-11-03', entries: pizza, cheat: true, updatedAt: '' }],
    ])
    expect(summarize(logs, ['2026-11-02', '2026-11-03'])).toEqual({
      onPlan: 1,
      logged: 1,
      total: 3,
      percent: 100,
      perfectDays: 0,
      cheatDays: 1,
      averageKcal: 600,
      averageProtein: 20,
    })
    expect(dayStatus(logs.get('2026-11-03'))).toBe('cheat')
    expect(planned[0]).toMatchObject({ kcal: 300, protein: 10 })
  })
})

describe('food parsing', () => {
  it('cleans a plan body', () => {
    const body = parsePlanBody({ name: '  ', meals: { breakfast: [{ id: 'a', name: ' Oats ', kcal: 320.4, protein: -1 }, { id: 'b' }], lunch: 'x' } })
    expect(body).toEqual({ name: 'My meal plan', meals: { breakfast: [{ id: 'a', name: 'Oats', kcal: 320 }], lunch: [], dinner: [], snacks: [] } })
    expect(parsePlanBody(null)).toBeNull()
  })

  it('drops invalid log entries', () => {
    const parsed = parseLog('2026-11-03', {
      entries: [
        { id: '1', meal: 'lunch', status: 'planned', name: 'Rice', time: '12:30' },
        { id: '2', meal: 'brunch', status: 'planned', name: 'Toast' },
        { id: '3', meal: 'dinner', status: 'eaten', name: 'Soup' },
        { id: '4', meal: 'dinner', status: 'skipped', time: 'late' },
      ],
      updatedAt: 'x',
    })
    expect(parsed?.entries).toEqual([
      { id: '1', meal: 'lunch', status: 'planned', name: 'Rice', time: '12:30' },
      { id: '4', meal: 'dinner', status: 'skipped', name: 'Skipped' },
    ])
    expect(parseLog('bad', { entries: [] })).toBeNull()
  })
})
