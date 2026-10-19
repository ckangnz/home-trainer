import { describe, expect, it } from 'vitest'
import { prepareAnimation, samplePose, sampleSkeleton } from '@/figure/animate'
import { distance } from '@/figure/math'
import { BALL_RADIUS, BENCH_HEIGHT, partExtent, propParts, ROLLER_RADIUS, skeletonParts } from '@/figure/parts'
import { LIMBS } from '@/figure/rig'
import { isReach } from '@/figure/solve'
import type { JointId, LimbId, Prop, Skeleton } from '@/figure/types'
import type { Equipment, Exercise } from './types'
import { collectExercises, exerciseInfo, playableAnimation } from './registry'
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

const SAMPLES = 48

const END_JOINT: Record<LimbId, Record<'end' | 'tip' | 'heel', JointId>> = {
  armL: { end: 'wristL', tip: 'handL', heel: 'wristL' },
  armR: { end: 'wristR', tip: 'handR', heel: 'wristR' },
  legL: { end: 'ankleL', tip: 'toeL', heel: 'heelL' },
  legR: { end: 'ankleR', tip: 'toeR', heel: 'heelR' },
}

const EQUIPMENT_PROP: Partial<Record<Equipment, Prop['kind']>> = {
  chair: 'chair',
  wall: 'wall',
  dumbbells: 'dumbbell',
  kettlebell: 'kettlebell',
  barbell: 'barbell',
  bench: 'bench',
  band: 'band',
  foamRoller: 'foamRoller',
  massageBall: 'massageBall',
  strap: 'strap',
  box: 'box',
}

const TRUNK: readonly JointId[] = ['hip', 'waist', 'neck', 'head']

function propClashes(skeleton: Skeleton, props: readonly Prop[]): string[] {
  const clashes: string[] = []
  for (const prop of props) {
    if (prop.kind === 'bench' || prop.kind === 'box') {
      const lo = Math.min(prop.x0, prop.x1) + 0.03
      const hi = Math.max(prop.x0, prop.x1) - 0.03
      const top = prop.kind === 'bench' ? BENCH_HEIGHT : prop.height
      for (const joint of TRUNK) {
        const [x, y] = skeleton.points[joint]
        if (x > lo && x < hi && y < top - 0.03) {
          clashes.push(`${joint} sinks into the ${prop.kind}`)
        }
      }
    }
    if (prop.kind === 'foamRoller' || (prop.kind === 'massageBall' && prop.y === undefined)) {
      const r = prop.kind === 'foamRoller' ? ROLLER_RADIUS : BALL_RADIUS
      const center: [number, number] = [skeleton.points[prop.under][0] + (prop.dx ?? 0), r]
      for (const [joint, point] of Object.entries(skeleton.points)) {
        if (distance(point, center) < r) {
          clashes.push(`${joint} sinks into the ${prop.kind}`)
        }
      }
    }
  }
  return clashes
}

describe('exercise catalog', () => {
  it('uses unique slug ids', () => {
    const ids = SELECTED.map((exercise) => exercise.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })
})

describe.each(SELECTED.map((exercise) => [exercise.id, exercise] as const))('%s', (_id, exercise) => {
  it('has complete, well-formed content', () => {
    expect(exercise.name.length).toBeGreaterThan(2)
    expect(exercise.name.length).toBeLessThanOrEqual(32)
    expect(exercise.summary.length).toBeGreaterThan(10)
    expect(exercise.summary.length).toBeLessThanOrEqual(140)
    expect(exercise.steps.length).toBeGreaterThanOrEqual(3)
    expect(exercise.steps.length).toBeLessThanOrEqual(6)
    expect(exercise.tips.length).toBeGreaterThanOrEqual(1)
    expect(exercise.tips.length).toBeLessThanOrEqual(4)
    for (const line of [...exercise.steps, ...exercise.tips]) {
      expect(line.trim()).toMatch(/[.!]$/)
    }
    expect(exercise.muscles.length).toBeGreaterThan(0)
    expect(exercise.tags).not.toContain(exercise.category)
  })

  it('has a sensible default target', () => {
    const target = exercise.defaultTarget
    if (target.kind === 'time') {
      expect(target.seconds).toBeGreaterThanOrEqual(10)
      expect(target.seconds).toBeLessThanOrEqual(120)
    } else {
      expect(target.reps).toBeGreaterThanOrEqual(4)
      expect(target.reps).toBeLessThanOrEqual(40)
    }
  })

  it('shows the props its equipment needs', () => {
    const kinds = (exercise.animation.props ?? []).map((prop) => prop.kind)
    const needed = EQUIPMENT_PROP[exercise.equipment]
    if (needed) {
      expect(kinds).toContain(needed)
    }
  })

  it('animates within the floor and frame with every contact reached', () => {
    const prepared = prepareAnimation(exercise.animation)
    if (prepared.keyframes.length > 1) {
      expect(prepared.cycleMs).toBeGreaterThanOrEqual(400)
      expect(prepared.cycleMs).toBeLessThanOrEqual(12000)
    }
    let minX = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    const statics = propParts(prepared.props)
    for (const part of [...statics.back, ...statics.under]) {
      for (const point of partExtent(part)) {
        expect(point[1], `${part.id} sinks below the floor`).toBeGreaterThanOrEqual(-0.03)
      }
    }
    for (let index = 0; index < SAMPLES; index += 1) {
      const time = (prepared.cycleMs * index) / SAMPLES
      const skeleton = sampleSkeleton(prepared, time)
      for (const point of Object.values(skeleton.points)) {
        expect(Number.isFinite(point[0]) && Number.isFinite(point[1])).toBe(true)
      }
      expect(propClashes(skeleton, prepared.props), `at ${Math.round(time)}ms`).toEqual([])
      for (const part of skeletonParts(skeleton, undefined, prepared.props)) {
        for (const point of partExtent(part)) {
          expect(point[1], `${part.id} sinks below the floor at ${Math.round(time)}ms`).toBeGreaterThanOrEqual(-0.03)
          minX = Math.min(minX, point[0])
          maxX = Math.max(maxX, point[0])
          maxY = Math.max(maxY, point[1])
        }
      }
      const pose = samplePose(prepared, time)
      for (const limb of LIMBS) {
        const spec = pose.limbs[limb]
        if (isReach(spec)) {
          const joint = END_JOINT[limb][spec.point ?? 'end']
          expect(
            distance(skeleton.points[joint], spec.at),
            `${limb} misses its target at ${Math.round(time)}ms`,
          ).toBeLessThan(0.02)
        }
      }
    }
    expect(maxX - minX).toBeLessThanOrEqual(3.4)
    expect(maxY).toBeLessThanOrEqual(2.6)
  })
})
