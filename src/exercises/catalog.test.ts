import { describe, expect, it } from 'vitest'
import { prepareAnimation, samplePose, sampleSkeleton } from '@/figure/animate'
import { distance } from '@/figure/math'
import { partExtent, skeletonParts } from '@/figure/parts'
import { LIMBS } from '@/figure/rig'
import { isReach } from '@/figure/solve'
import type { JointId, LimbId } from '@/figure/types'
import type { Exercise } from './types'
import { EXERCISES } from '.'

const catalogs = import.meta.glob<Record<string, Exercise[]>>('./catalog/*.ts')
const only = process.env.CATALOG
const SELECTED: Exercise[] = only
  ? Object.values(await catalogs[`./catalog/${only}.ts`]()).flat()
  : EXERCISES

const SAMPLES = 48

const END_JOINT: Record<LimbId, Record<'end' | 'tip' | 'heel', JointId>> = {
  armL: { end: 'wristL', tip: 'handL', heel: 'wristL' },
  armR: { end: 'wristR', tip: 'handR', heel: 'wristR' },
  legL: { end: 'ankleL', tip: 'toeL', heel: 'heelL' },
  legR: { end: 'ankleR', tip: 'toeR', heel: 'heelR' },
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
    if (exercise.equipment === 'chair') {
      expect(kinds).toContain('chair')
    }
    if (exercise.equipment === 'wall') {
      expect(kinds).toContain('wall')
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
    for (let index = 0; index < SAMPLES; index += 1) {
      const time = (prepared.cycleMs * index) / SAMPLES
      const skeleton = sampleSkeleton(prepared, time)
      for (const point of Object.values(skeleton.points)) {
        expect(Number.isFinite(point[0]) && Number.isFinite(point[1])).toBe(true)
      }
      for (const part of skeletonParts(skeleton)) {
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
