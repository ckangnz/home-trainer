import { describe, expect, it } from 'vitest'
import type { Exercise } from './types'
import { catalogName, collectExercises, exerciseInfo, playableAnimation } from './registry'
import { defineExerciseSuite } from './catalogSuite'
import { EXERCISES } from '.'

const modules = import.meta.glob<Record<string, unknown>>('./catalog/*.ts', { eager: true })
const only = process.env.CATALOG
const COLLECTED = collectExercises(only ? { [`./catalog/${only}.ts`]: modules[`./catalog/${only}.ts`] } : modules)
const SELECTED: Exercise[] = COLLECTED.map(({ exercise }) => ({ ...exercise, animation: playableAnimation(exercise) }))

describe.skipIf(Boolean(only))('exercise index', () => {
  it('matches the catalogs (run `npm run exercises:index` after editing a catalog)', () => {
    expect(EXERCISES).toEqual(COLLECTED.map(({ exercise, catalog }) => exerciseInfo(exercise, catalog)))
  })
})

describe('exercise catalog', () => {
  it('uses unique slug ids', () => {
    const ids = SELECTED.map((exercise) => exercise.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })
})

const checks = import.meta.glob('./catalog-checks/*.test.ts')

describe.skipIf(Boolean(only))('catalog check files', () => {
  it('has one check file per catalog', () => {
    const names = Object.keys(modules).map(catalogName).sort()
    const covered = Object.keys(checks).map((path) => path.replace(/^.*\//, '').replace(/\.test\.ts$/, '')).sort()
    expect(covered).toEqual(names)
  })
})

if (only) {
  defineExerciseSuite(SELECTED)
}
