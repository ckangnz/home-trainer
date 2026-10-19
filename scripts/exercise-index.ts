import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { collectExercises, exerciseInfo } from '../src/exercises/registry'

const modules = import.meta.glob<Record<string, unknown>>('../src/exercises/catalog/*.ts', { eager: true })
const index = collectExercises(modules).map(({ exercise, catalog }) => exerciseInfo(exercise, catalog))
const target = resolve(import.meta.dirname, '../src/exercises/index.json')
writeFileSync(target, `${JSON.stringify(index, null, 1)}\n`)
console.log(`Wrote ${index.length} exercises to src/exercises/index.json`)
