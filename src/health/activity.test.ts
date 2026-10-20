import { describe, expect, it } from 'vitest'
import type { Completion } from '@/data/models'
import { activityFor } from './activity'
import { completionActivity } from './fromCompletion'

const part = (category: Parameters<typeof activityFor>[0][number]['category'], ms = 30000) => ({ category, ms })

describe('health activity type', () => {
  it('records stretch, yoga, and foam rolling sessions as non-strength activities', () => {
    expect(activityFor([part('stretch'), part('mobility'), part('stretch')])).toBe('flexibility')
    expect(activityFor([part('yoga'), part('yoga'), part('stretch')])).toBe('yoga')
    expect(activityFor([part('recovery'), part('recovery'), part('stretch')])).toBe('recovery')
    expect(activityFor([part('stretch')], true)).toBe('cooldown')
  })

  it('weights the decision by time', () => {
    expect(activityFor([part('cardio', 120000), part('stretch', 30000)])).toBe('hiit')
    expect(activityFor([part('weights', 90000), part('upperBody', 60000), part('stretch', 30000)])).toBe('traditionalStrength')
    expect(activityFor([part('core'), part('core'), part('core'), part('upperBody')])).toBe('coreTraining')
    expect(activityFor([part('lowerBody'), part('upperBody'), part('stretch')])).toBe('functionalStrength')
    expect(activityFor([part('cardio'), part('lowerBody'), part('upperBody')])).toBe('hiit')
    expect(activityFor([])).toBe('functionalStrength')
  })

  it('falls back to the workout source for older history entries', () => {
    const base = { id: 'c', ownerId: 'u', schemaVersion: 2, title: 'T', startedAt: '', completedAt: '', durationMs: 1, exercises: 1, totalExercises: 1 }
    const stretchOnly = { ...base, source: { kind: 'curated', id: 'full-body-stretch' } } as Completion
    expect(completionActivity(stretchOnly, () => ['neck-side-stretch', 'pigeon-pose', 'childs-pose'])).toBe('flexibility')
    expect(completionActivity({ ...base, source: { kind: 'cooldown', id: 'stretch' } } as Completion)).toBe('cooldown')
    expect(completionActivity({ ...stretchOnly, exerciseIds: ['burpees', 'jumping-jacks'] }, () => ['childs-pose'])).toBe('hiit')
  })
})
