import { describe, expect, it } from 'vitest'
import { distance, ease, type Easing } from './math'
import { ANKLE_REST_HEIGHT, STAND_HIP_HEIGHT } from './rig'
import { prepareAnimation, sampleSkeleton } from './animate'
import { shadowFor, skeletonParts } from './parts'
import { blinkAmount, breathAmount, SecondaryMotion, STILL, stepSpring } from './secondary'
import { solveSpec } from './solve'
import type { FigureAnimation, JointId, Part, Skeleton } from './types'

const EASINGS: Easing[] = ['linear', 'in', 'out', 'inOut', 'natural', 'back', 'spring', 'anticipate']

function points(parts: Part[], id: string) {
  const part = parts.find((candidate) => candidate.id === id)
  if (!part || part.kind !== 'path') {
    throw new Error(`missing ${id}`)
  }
  return part.points
}

function moved(skeleton: Skeleton, dx: number, dy: number): Skeleton {
  const shifted = { ...skeleton.points }
  for (const joint of Object.keys(shifted) as JointId[]) {
    shifted[joint] = [shifted[joint][0] + dx, shifted[joint][1] + dy]
  }
  return { ...skeleton, points: shifted }
}

describe('easing curves', () => {
  it('start at 0 and end at 1', () => {
    for (const kind of EASINGS) {
      expect(ease(kind, 0)).toBeCloseTo(0, 6)
      expect(ease(kind, 1)).toBeCloseTo(1, 6)
    }
  })

  it('keeps the default and natural curves inside the keyframe range', () => {
    for (const kind of ['inOut', 'natural'] as const) {
      let previous = 0
      for (let t = 0.02; t <= 1; t += 0.02) {
        const value = ease(kind, t)
        expect(value).toBeGreaterThanOrEqual(previous - 1e-9)
        expect(value).toBeLessThanOrEqual(1 + 1e-9)
        previous = value
      }
    }
  })

  it('overshoots for back and spring and dips first for anticipate', () => {
    const sample = (kind: Easing) => Array.from({ length: 50 }, (_, index) => ease(kind, index / 49))
    expect(Math.max(...sample('back'))).toBeGreaterThan(1.03)
    expect(Math.max(...sample('back'))).toBeLessThan(1.1)
    expect(Math.max(...sample('spring'))).toBeGreaterThan(1.03)
    expect(Math.min(...sample('anticipate'))).toBeLessThan(-0.03)
  })
})

describe('springs', () => {
  it('settles at force / stiffness and overshoots when underdamped', () => {
    let spring = { x: 0, v: 0 }
    let peak = 0
    for (let frame = 0; frame < 240; frame += 1) {
      spring = stepSpring(spring, 100, 1 / 60, { stiffness: 100, damping: 6 })
      peak = Math.max(peak, spring.x)
    }
    expect(spring.x).toBeCloseTo(1, 2)
    expect(peak).toBeGreaterThan(1.2)
  })

  it('stays stable for long frame gaps', () => {
    const spring = stepSpring({ x: 1, v: 0 }, 0, 0.5, { stiffness: 420, damping: 16 })
    expect(Number.isFinite(spring.x)).toBe(true)
    expect(Math.abs(spring.x)).toBeLessThan(1)
  })
})

describe('blinks and breathing', () => {
  it('blinks briefly every 3 to 5 seconds, deterministically', () => {
    const starts: number[] = []
    let closed = 0
    let wasOpen = true
    for (let time = 0; time < 30000; time += 10) {
      const value = blinkAmount(time, 3)
      expect(value).toBe(blinkAmount(time, 3))
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
      if (value > 0) {
        closed += 1
        if (wasOpen) {
          starts.push(time)
        }
      }
      wasOpen = value === 0
    }
    expect(starts.length).toBeGreaterThanOrEqual(6)
    for (let index = 1; index < starts.length; index += 1) {
      const gap = starts[index] - starts[index - 1]
      expect(gap).toBeGreaterThanOrEqual(2990)
      expect(gap).toBeLessThanOrEqual(5010)
    }
    expect(closed / 3000).toBeLessThan(0.06)
    expect(blinkAmount(30000, 1)).not.toBeNaN()
  })

  it('breathes in a smooth 0 to 1 cycle', () => {
    expect(breathAmount(0)).toBeCloseTo(0)
    expect(breathAmount(2100)).toBeCloseTo(1)
    expect(breathAmount(4200)).toBeCloseTo(0)
  })
})

describe('secondary motion', () => {
  const stand = solveSpec({}, 'side')

  it('rests when the head does not move', () => {
    const motion = new SecondaryMotion()
    for (let frame = 0; frame < 60; frame += 1) {
      const result = motion.step(stand, 33, frame * 33)
      expect(result.ponytail).toBe(0)
      expect(result.hair).toBe(0)
    }
  })

  it('swings the ponytail when the head accelerates and settles afterwards', () => {
    const motion = new SecondaryMotion()
    let y = 0
    let velocity = 0
    let peak = 0
    let clock = 0
    for (let frame = 0; frame < 30; frame += 1) {
      velocity += frame < 6 ? 0.25 : frame < 12 ? -0.25 : 0
      y += velocity * 0.033
      clock += 33
      const result = motion.step(moved(stand, 0, y), 33, clock)
      peak = Math.max(peak, Math.abs(result.ponytail))
      expect(Math.abs(result.ponytail)).toBeLessThanOrEqual(30)
      expect(Math.abs(result.hair)).toBeLessThanOrEqual(0.008)
    }
    expect(peak).toBeGreaterThan(3)
    let last = 0
    for (let frame = 0; frame < 120; frame += 1) {
      clock += 33
      last = motion.step(moved(stand, 0, y), 33, clock).ponytail
    }
    expect(Math.abs(last)).toBeLessThan(0.5)
  })

  it('ignores big clock gaps instead of snapping', () => {
    const motion = new SecondaryMotion()
    motion.step(stand, 33, 0)
    const result = motion.step(moved(stand, 0.5, 0.3), 2000, 2000)
    expect(result.ponytail).toBe(0)
  })

  it('changes only the hair, eyes and chest outline and keeps part ids', () => {
    const plain = skeletonParts(stand)
    expect(skeletonParts(stand, undefined, [], STILL)).toEqual(plain)
    const lively = skeletonParts(stand, undefined, [], { ponytail: 20, hair: 0.006, blink: 1, breath: 1 })
    expect(lively.map((part) => part.id)).toEqual(plain.map((part) => part.id))
    const eyeHeight = (parts: Part[]) => {
      const ys = points(parts, 'eye').map((point) => point[1])
      return Math.max(...ys) - Math.min(...ys)
    }
    expect(eyeHeight(lively)).toBeLessThan(eyeHeight(plain) * 0.3)
    expect(points(lively, 'ponytail')).not.toEqual(points(plain, 'ponytail'))
    for (const id of ['shoeL', 'handL', 'thighR', 'forearmR']) {
      expect(points(lively, id)).toEqual(points(plain, id))
    }
  })
})

describe('feel', () => {
  const jump: FigureAnimation = {
    view: 'side',
    feel: 'bouncy',
    keyframes: [
      { pose: { root: [-0.1, 0.72], torso: 25, legL: { at: [0, ANKLE_REST_HEIGHT], angle: 0 }, legR: { at: [0, ANKLE_REST_HEIGHT], angle: 0 }, armL: [-30, 10], armR: [-30, 10] }, ms: 500 },
      { pose: { root: [0, STAND_HIP_HEIGHT], legL: { at: [0, ANKLE_REST_HEIGHT], angle: 0 }, legR: { at: [0, ANKLE_REST_HEIGHT], angle: 0 }, armL: [140, 10], armR: [140, 10] }, ms: 500 },
    ],
  }

  it('lets free limbs overshoot while planted feet stay put', () => {
    const smooth = prepareAnimation({ ...jump, feel: 'smooth' })
    const bouncy = prepareAnimation(jump)
    let calmPeak = -Infinity
    let livelyPeak = -Infinity
    for (let time = 0; time < 1000; time += 10) {
      const skeleton = sampleSkeleton(bouncy, time)
      expect(distance(skeleton.points.ankleL, [0, ANKLE_REST_HEIGHT])).toBeLessThan(0.005)
      livelyPeak = Math.max(livelyPeak, skeleton.points.wristL[1])
      calmPeak = Math.max(calmPeak, sampleSkeleton(smooth, time).points.wristL[1])
    }
    expect(livelyPeak).toBeGreaterThan(calmPeak + 0.005)
  })

  it('falls back to the calm curve when overshoot would push limbs into the floor', () => {
    const lying: FigureAnimation = {
      view: 'side',
      feel: 'bouncy',
      keyframes: [
        { pose: { root: [0, 0.115], torso: -90, legL: [40, 0, 0], legR: [40, 0, 0] }, ms: 500 },
        { pose: { root: [0, 0.115], torso: -90, legL: [-2, 0, 0], legR: [-2, 0, 0] }, ms: 500 },
      ],
    }
    const prepared = prepareAnimation(lying)
    const lowest = solveSpec(lying.keyframes[1].pose, 'side').points.heelL[1]
    for (let time = 0; time < 1000; time += 10) {
      expect(sampleSkeleton(prepared, time).points.heelL[1]).toBeGreaterThanOrEqual(lowest - 0.001)
    }
  })

  it('shrinks and fades the shadow while airborne', () => {
    const ground = shadowFor(solveSpec({}, 'side'))
    const air = shadowFor(solveSpec({ root: [0, STAND_HIP_HEIGHT + 0.25] }, 'side'))
    expect(air.rx).toBeLessThan(ground.rx)
    expect(air.opacity).toBeLessThan(ground.opacity)
  })
})
