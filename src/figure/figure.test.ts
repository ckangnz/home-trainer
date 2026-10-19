import { describe, expect, it } from 'vitest'
import { distance, lerpAngle, wrap180, type Vec2 } from './math'
import { ANKLE_REST_HEIGHT, RIG, STAND_HIP_HEIGHT } from './rig'
import { isReach, solveSpec, twoBone } from './solve'
import { prepareAnimation, samplePose, sampleSkeleton } from './animate'
import { BENCH_HEIGHT, gripPoint, heldPropParts, partExtent, propParts, ROLLER_RADIUS, skeletonParts } from './parts'
import { animationBounds, viewBoxFor } from './framing'
import type { FigureAnimation, Part, PoseSpec, Prop } from './types'

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

  it('produces finite render parts for every trainer', () => {
    const prepared = prepareAnimation(squat)
    for (const trainer of ['female', 'male'] as const) {
      const parts = skeletonParts(sampleSkeleton(prepared, 700), { trainer, skin: 'medium' })
      expect(new Set(parts.map((part) => part.id)).size).toBe(parts.length)
      for (const part of parts) {
        const serialized = JSON.stringify(part)
        expect(serialized).not.toContain('NaN')
        if (part.kind === 'path') {
          const numbers = part.d.match(/-?\d+(\.\d+)?/g) ?? []
          expect(numbers.length).toBeGreaterThan(4)
          expect(numbers.every((value) => Number.isFinite(Number(value)))).toBe(true)
        }
      }
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

describe('equipment props', () => {
  const curl: FigureAnimation = {
    view: 'side',
    keyframes: [
      { pose: { armL: [4, 6], armR: [4, 6] }, ms: 900 },
      { pose: { armL: [10, 140], armR: [10, 140] }, ms: 900 },
    ],
  }

  const withProps = (animation: FigureAnimation, props: Prop[]): FigureAnimation => ({ ...animation, props })

  const find = (parts: Part[], id: string): Part => {
    const part = parts.find((candidate) => candidate.id === id)
    if (!part) {
      throw new Error(`missing ${id}`)
    }
    return part
  }

  const index = (parts: Part[], id: string) => parts.findIndex((part) => part.id === id)

  it('keeps a dumbbell in each hand on every frame', () => {
    const prepared = prepareAnimation(withProps(curl, [{ kind: 'dumbbell', hand: 'both' }]))
    for (const time of [0, 300, 900, 1400]) {
      const skeleton = sampleSkeleton(prepared, time)
      const parts = skeletonParts(skeleton, undefined, prepared.props)
      for (const side of ['L', 'R'] as const) {
        const hub = find(parts, `dumbbell0${side}-hub`)
        expect(hub.kind).toBe('circle')
        if (hub.kind === 'circle') {
          close(hub.center, gripPoint(skeleton, side))
          expect(distance(hub.center, skeleton.points[`wrist${side}`])).toBeLessThan(RIG.hand)
        }
      }
    }
  })

  it('keeps the same part ids across frames so the live renderer can patch them', () => {
    const props: Prop[] = [
      { kind: 'dumbbell', hand: 'L' },
      { kind: 'kettlebell', hand: 'R' },
      { kind: 'band', from: [0.9, 1.1], hand: 'both' },
      { kind: 'strap', foot: 'L', hand: 'both' },
      { kind: 'foamRoller', under: 'hip' },
    ]
    const prepared = prepareAnimation(withProps(curl, props))
    const ids = (time: number) => skeletonParts(sampleSkeleton(prepared, time), undefined, prepared.props).map((part) => part.id)
    const first = ids(0)
    expect(new Set(first).size).toBe(first.length)
    expect(ids(450)).toEqual(first)
    expect(ids(1200)).toEqual(first)
  })

  it('layers held equipment with the near and far side of the body', () => {
    const side = skeletonParts(
      sampleSkeleton(prepareAnimation(curl), 0),
      undefined,
      [{ kind: 'dumbbell', hand: 'both' }, { kind: 'barbell' }, { kind: 'foamRoller', under: 'hip' }, { kind: 'kettlebell', hand: 'L' }],
    )
    expect(index(side, 'dumbbell0L-head')).toBeGreaterThan(index(side, 'handL'))
    expect(index(side, 'dumbbell0R-head')).toBeLessThan(index(side, 'torso'))
    expect(index(side, 'barbell1-plate')).toBeGreaterThan(index(side, 'handL'))
    expect(index(side, 'foamRoller2-body')).toBeLessThan(index(side, 'torso'))
    expect(index(side, 'kettlebell3-bell')).toBeLessThan(index(side, 'handL'))
    expect(index(side, 'kettlebell3-bell')).toBeGreaterThan(index(side, 'forearmL'))
    const front = skeletonParts(solveSpec({}, 'front'), undefined, [{ kind: 'dumbbell', hand: 'L' }, { kind: 'barbell' }])
    expect(index(front, 'dumbbell0L-bar')).toBeLessThan(index(front, 'handL'))
    expect(index(front, 'barbell1-bar')).toBeGreaterThan(index(front, 'torso'))
    expect(index(front, 'barbell1-bar')).toBeLessThan(index(front, 'upperArmR'))
  })

  it('rolls a foam roller along the floor under its joint', () => {
    const prepared = prepareAnimation({
      view: 'side',
      keyframes: [
        { pose: { root: [0.1, 0.24], torso: -25, legL: [62, 0], legR: [62, 0] }, ms: 1000 },
        { pose: { root: [-0.1, 0.24], torso: -25, legL: [62, 0], legR: [62, 0] }, ms: 1000 },
      ],
      props: [{ kind: 'foamRoller', under: 'kneeL', dx: 0.2 }],
    })
    const marks: number[] = []
    for (const time of [0, 400, 1000, 1500]) {
      const skeleton = sampleSkeleton(prepared, time)
      const parts = heldPropParts(skeleton, prepared.props)
      const body = find(parts, 'foamRoller0-body')
      const mark = find(parts, 'foamRoller0-mark')
      if (body.kind === 'circle' && mark.kind === 'circle') {
        expect(body.center[0]).toBeCloseTo(skeleton.points.kneeL[0] + 0.2)
        expect(body.center[1]).toBeCloseTo(ROLLER_RADIUS)
        expect(Math.min(...partExtent(body).map((point) => point[1]))).toBeCloseTo(0)
        marks.push(mark.center[1])
      }
    }
    expect(marks.length).toBe(4)
    expect(Math.max(...marks) - Math.min(...marks)).toBeGreaterThan(0.01)
  })

  it('anchors bands to points or joints and straps to the sole', () => {
    const skeleton = solveSpec({ armL: [80, 0] }, 'side')
    const parts = heldPropParts(skeleton, [
      { kind: 'band', from: [1, 1.1], hand: 'L' },
      { kind: 'band', from: 'ankleL', hand: 'L' },
      { kind: 'strap', foot: 'L', hand: 'L' },
    ])
    const wall = find(parts, 'band0-strandL')
    const floor = find(parts, 'band1-strandL')
    const strap = find(parts, 'strap2-strandL')
    if (wall.kind === 'seg' && floor.kind === 'seg' && strap.kind === 'seg') {
      close(wall.a, [1, 1.1])
      close(wall.b, gripPoint(skeleton, 'L'))
      expect(floor.a[1]).toBeGreaterThan(0)
      expect(floor.a[1]).toBeLessThan(RIG.soleRadius)
      expect(strap.a[1]).toBeLessThan(skeleton.points.ankleL[1])
    } else {
      throw new Error('expected segments')
    }
  })

  it('draws static benches and boxes on the floor and frames held equipment', () => {
    const { back } = propParts([
      { kind: 'bench', x0: -0.8, x1: 0.2 },
      { kind: 'box', x0: 0.4, x1: 0.8, height: 0.4 },
    ])
    const pad = find(back, 'bench0-pad')
    const top = Math.max(...partExtent(pad).map((point) => point[1]))
    expect(top).toBeCloseTo(BENCH_HEIGHT)
    for (const part of back) {
      expect(Math.min(...partExtent(part).map((point) => point[1]))).toBeGreaterThanOrEqual(0)
    }
    const press = prepareAnimation({ view: 'front', keyframes: [{ pose: {}, ms: 0 }], props: [{ kind: 'barbell' }] })
    const bounds = animationBounds(press)
    expect(bounds.maxX - bounds.minX).toBeGreaterThan(1.6)
  })
})
