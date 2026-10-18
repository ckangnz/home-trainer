import { describe, expect, it } from 'vitest'
import { distance, lerpAngle, wrap180, type Vec2 } from './math'
import { ANKLE_REST_HEIGHT, RIG, STAND_HIP_HEIGHT } from './rig'
import { isReach, solveSpec, twoBone } from './solve'
import { prepareAnimation, samplePose, sampleSkeleton } from './animate'
import { skeletonParts } from './parts'
import { animationBounds, viewBoxFor } from './framing'
import type { FigureAnimation, PoseSpec } from './types'

function close(a: Vec2, b: Vec2, tolerance = 1e-6) {
  expect(distance(a, b)).toBeLessThan(tolerance)
}

describe('angle math', () => {
  it('wraps into (-180, 180]', () => {
    expect(wrap180(190)).toBe(-170)
    expect(wrap180(-180)).toBe(180)
    expect(wrap180(540)).toBe(180)
  })

  it('interpolates along the shortest arc', () => {
    expect(lerpAngle(170, -170, 0.5)).toBeCloseTo(180)
    expect(lerpAngle(10, 50, 0.25)).toBeCloseTo(20)
  })
})

describe('forward kinematics', () => {
  it('stands with the ankle at rest height directly below the hip', () => {
    const skeleton = solveSpec({}, 'side')
    expect(skeleton.points.hip).toEqual([0, STAND_HIP_HEIGHT])
    close(skeleton.points.ankleL, [0, ANKLE_REST_HEIGHT])
    expect(skeleton.points.toeL[1]).toBeCloseTo(RIG.soleRadius)
    expect(skeleton.points.toeL[0]).toBeGreaterThan(0)
    expect(skeleton.points.head[1]).toBeGreaterThan(skeleton.points.neck[1])
  })

  it('preserves bone lengths for arbitrary angles', () => {
    const spec: PoseSpec = {
      torso: 37,
      spine: 12,
      armL: [123, 47, 10],
      armR: [-30, 80],
      legL: [64, 110, -20],
      legR: [-15, 5, 40],
    }
    for (const view of ['side', 'front'] as const) {
      const p = solveSpec(spec, view).points
      expect(distance(p.shoulderL, p.elbowL)).toBeCloseTo(RIG.upperArm)
      expect(distance(p.elbowL, p.wristL)).toBeCloseTo(RIG.forearm)
      expect(distance(p.hipL, p.kneeL)).toBeCloseTo(RIG.thigh)
      expect(distance(p.kneeR, p.ankleR)).toBeCloseTo(RIG.shin)
      expect(distance(p.hip, p.waist)).toBeCloseTo(RIG.lowerSpine)
    }
  })

  it('raises the arm forward with positive shoulder flexion in side view', () => {
    const p = solveSpec({ armL: [90, 0] }, 'side').points
    expect(p.wristL[0]).toBeGreaterThan(p.shoulderL[0] + 0.5)
    expect(p.wristL[1]).toBeCloseTo(p.shoulderL[1])
  })

  it('mirrors symmetric front-view poses about the root', () => {
    const p = solveSpec({ armL: [70, 20], armR: [70, 20], legL: [15, 10], legR: [15, 10] }, 'front').points
    for (const [left, right] of [
      ['wristL', 'wristR'],
      ['kneeL', 'kneeR'],
      ['toeL', 'toeR'],
    ] as const) {
      expect(p[left][0]).toBeCloseTo(-p[right][0])
      expect(p[left][1]).toBeCloseTo(p[right][1])
    }
    expect(p.wristL[0]).toBeGreaterThan(0)
  })
})

describe('inverse kinematics', () => {
  it('reaches reachable targets exactly', () => {
    const solved = twoBone([0, 0], [0.3, -0.4], 0.44, 0.43, 1)
    expect(solved.reached).toBe(true)
    close(solved.end, [0.3, -0.4])
    expect(distance([0, 0], solved.middle)).toBeCloseTo(0.44)
  })

  it('clamps unreachable targets along the target direction', () => {
    const solved = twoBone([0, 0], [3, 0], 0.44, 0.43, 1)
    expect(solved.reached).toBe(false)
    expect(solved.end[0]).toBeCloseTo(0.87, 4)
    expect(solved.end[1]).toBeCloseTo(0)
  })

  it('bends knees forward and keeps planted feet in place for a squat', () => {
    const p = solveSpec(
      { root: [-0.2, 0.5], torso: 35, legL: { at: [0, ANKLE_REST_HEIGHT], angle: 0 } },
      'side',
    ).points
    close(p.ankleL, [0, ANKLE_REST_HEIGHT])
    expect(p.kneeL[0]).toBeGreaterThan(0)
    expect(p.toeL[1]).toBeCloseTo(RIG.soleRadius)
    expect(p.heelL[1]).toBeCloseTo(RIG.soleRadius)
  })

  it('bends elbows back toward the feet in a push-up', () => {
    const p = solveSpec(
      {
        torso: 82,
        legL: [0, 0, 10],
        legR: [0, 0, 10],
        anchor: { joint: 'toeL', at: [-0.75, RIG.soleRadius] },
        armL: { at: [0.55, 0.035], angle: 0 },
      },
      'side',
    ).points
    close(p.wristL, [0.55, 0.035])
    expect(p.elbowL[0]).toBeLessThan(Math.min(p.shoulderL[0], p.wristL[0]))
  })

  it('places a toe contact exactly when pointing the foot', () => {
    const p = solveSpec({ root: [0, 0.8], legL: { at: [-0.3, RIG.soleRadius], angle: -40, point: 'tip' } }, 'side').points
    close(p.toeL, [-0.3, RIG.soleRadius])
  })
})

describe('anchors', () => {
  it('translates the pose so the anchor joint lands on its target', () => {
    const p = solveSpec({ torso: 70, legL: [0, 0, 10], legR: [0, 0, 10], anchor: { joint: 'toeL', at: [-1, 0.03] } }, 'side').points
    close(p.toeL, [-1, 0.03])
  })

  it('grounds the lowest body point on the floor', () => {
    const skeleton = solveSpec({ root: [0, 2], torso: -90, legL: [0, 0, 0], legR: [0, 0, 0], armL: [0, 0], armR: [0, 0], anchor: 'ground' }, 'side')
    const lowest = Math.min(...Object.values(skeleton.points).map((point) => point[1]))
    expect(lowest).toBeGreaterThan(0)
    expect(lowest).toBeLessThan(0.2)
  })

  it('rejects anchors on reach limbs', () => {
    expect(() => solveSpec({ legL: { at: [0, 0.1] }, anchor: { joint: 'ankleL', at: [0, 0.1] } }, 'side')).toThrow()
  })
})

describe('animation sampling', () => {
  const squat: FigureAnimation = {
    view: 'side',
    keyframes: [
      { pose: { legL: { at: [0, ANKLE_REST_HEIGHT], angle: 0 }, legR: { at: [0, ANKLE_REST_HEIGHT], angle: 0 } }, ms: 1000, hold: 200 },
      {
        pose: {
          root: [-0.2, 0.5],
          torso: 35,
          legL: { at: [0, ANKLE_REST_HEIGHT], angle: 0 },
          legR: { at: [0, ANKLE_REST_HEIGHT], angle: 0 },
        },
        ms: 800,
        hold: 100,
      },
    ],
  }

  it('builds a looping timeline from transitions and holds', () => {
    const prepared = prepareAnimation(squat)
    expect(prepared.cycleMs).toBe(2100)
    expect(prepared.timeline.map((segment) => [segment.from, segment.to, segment.moving])).toEqual([
      [0, 0, false],
      [0, 1, true],
      [1, 1, false],
      [1, 0, true],
    ])
  })

  it('returns exact keyframes during holds and wraps time', () => {
    const prepared = prepareAnimation(squat)
    expect(sampleSkeleton(prepared, 50).points.hip).toEqual(prepared.keyframes[0].skeleton.points.hip)
    expect(sampleSkeleton(prepared, 2100 + 50).points.hip).toEqual(prepared.keyframes[0].skeleton.points.hip)
    expect(sampleSkeleton(prepared, 1050).points.hip).toEqual(prepared.keyframes[1].skeleton.points.hip)
  })

  it('keeps shared foot targets planted mid-transition', () => {
    const prepared = prepareAnimation(squat)
    for (const time of [300, 600, 900, 1500, 1800]) {
      const skeleton = sampleSkeleton(prepared, time)
      close(skeleton.points.ankleL, [0, ANKLE_REST_HEIGHT], 1e-6)
      const pose = samplePose(prepared, time)
      expect(isReach(pose.limbs.legL)).toBe(true)
    }
  })

  it('moves continuously between keyframes', () => {
    const prepared = prepareAnimation(squat)
    let previous = sampleSkeleton(prepared, 0).points.hip
    for (let time = 10; time <= 2100; time += 10) {
      const current = sampleSkeleton(prepared, time).points.hip
      expect(distance(previous, current)).toBeLessThan(0.02)
      previous = current
    }
  })

  it('frames the full cycle with the floor visible', () => {
    const prepared = prepareAnimation(squat)
    const bounds = animationBounds(prepared)
    expect(bounds.minY).toBeLessThanOrEqual(0)
    expect(bounds.maxY).toBeGreaterThan(1.6)
    const box = viewBoxFor(bounds, 1)
    expect(box.width).toBeCloseTo(box.height)
    expect(-box.y).toBeGreaterThan(bounds.maxY)
  })

  it('produces finite render parts', () => {
    const prepared = prepareAnimation(squat)
    for (const part of skeletonParts(sampleSkeleton(prepared, 700))) {
      const values = JSON.stringify(part).match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? []
      expect(JSON.stringify(part)).not.toContain('null')
      expect(values.length).toBeGreaterThan(0)
    }
  })

  it('keeps a toe planted while blending from a flat foot to a raised heel', () => {
    const toeX = 0.165
    const prepared = prepareAnimation({
      view: 'side',
      keyframes: [
        { pose: { legL: { at: [0, ANKLE_REST_HEIGHT], angle: 0 } }, ms: 600 },
        { pose: { root: [0, STAND_HIP_HEIGHT + 0.08], legL: { at: [toeX, RIG.soleRadius], angle: -35, point: 'tip' } }, ms: 600 },
      ],
    })
    const start = sampleSkeleton(prepared, 0).points.toeL
    for (const time of [150, 300, 450, 750, 900, 1050]) {
      close(sampleSkeleton(prepared, time).points.toeL, start, 1e-3)
    }
  })

  it('blends joint angles smoothly when the bend direction flips', () => {
    const prepared = prepareAnimation({
      view: 'side',
      keyframes: [
        { pose: { armL: { at: [0.25, 1.2], bend: 1 } }, ms: 1000 },
        { pose: { armL: { at: [0.25, 1.2], bend: -1 } }, ms: 1000 },
      ],
    })
    let previous = sampleSkeleton(prepared, 0).points.elbowL
    for (let time = 20; time <= 2000; time += 20) {
      const elbow = sampleSkeleton(prepared, time).points.elbowL
      expect(distance(previous, elbow)).toBeLessThan(0.03)
      previous = elbow
    }
  })
})
