import { describe, expect, it } from 'vitest'
import { CURATED_WORKOUTS } from './curated'
import { NO_FILTERS, durationBucket, filterWorkouts, filtersFromParams, matchesGear, paramsFromFilters } from './filters'

describe('workout filters', () => {
  it('round-trips filters through the URL', () => {
    const filters = { ...NO_FILTERS, query: 'abs', goal: 'strength' as const, area: 'core' as const, level: 2 as const, gear: 'none' as const, duration: 'short' as const }
    expect(filtersFromParams(paramsFromFilters(filters))).toEqual(filters)
    expect(filtersFromParams(new URLSearchParams('goal=nope&level=9'))).toEqual(NO_FILTERS)
  })

  it('combines goal, area, level, equipment, and time', () => {
    const results = filterWorkouts(CURATED_WORKOUTS, { ...NO_FILTERS, goal: 'strength', gear: 'none' })
    expect(results.length).toBeGreaterThan(0)
    for (const workout of results) {
      expect(workout.goal).toBe('strength')
      expect(matchesGear(workout, 'none')).toBe(true)
    }
    for (const workout of filterWorkouts(CURATED_WORKOUTS, { ...NO_FILTERS, duration: 'short', level: 1 })) {
      expect(durationBucket(workout)).toBe('short')
      expect(workout.level).toBe(1)
    }
  })

  it('covers every goal and the main body areas', () => {
    for (const goal of ['cardio', 'strength', 'flexibility', 'recovery'] as const) {
      expect(filterWorkouts(CURATED_WORKOUTS, { ...NO_FILTERS, goal }).length, goal).toBeGreaterThan(1)
    }
    for (const area of ['fullBody', 'core', 'glutes', 'legs', 'arms'] as const) {
      expect(filterWorkouts(CURATED_WORKOUTS, { ...NO_FILTERS, area }).length, area).toBeGreaterThan(1)
    }
  })

  it('searches inside workouts by exercise name', () => {
    expect(filterWorkouts(CURATED_WORKOUTS, { ...NO_FILTERS, query: 'jumping jacks' }).map((workout) => workout.id)).toContain('classic-7-minute')
  })
})
