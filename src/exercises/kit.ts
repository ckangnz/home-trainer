import type { Vec2 } from '@/figure/math'
import { ANKLE_REST_HEIGHT, HAND_REST_HEIGHT, RIG, STAND_HIP_HEIGHT, WIDTH } from '@/figure/rig'
import type { Easing } from '@/figure/math'
import { BALL_RADIUS, BENCH_HEIGHT, ROLLER_RADIUS } from '@/figure/parts'
import type { Feel, FigureAnimation, Keyframe, PoseSpec, Prop, Reach, Triple, View } from '@/figure/types'

export { BALL_RADIUS, BENCH_HEIGHT, ROLLER_RADIUS }

export const HIP = STAND_HIP_HEIGHT

export const LYING_HIP = 0.115

export function flat(x: number, y = 0, angle = 0): Reach {
  return { at: [x, y + ANKLE_REST_HEIGHT], angle }
}

export function toes(x: number, angle = -40, y = 0): Reach {
  return { at: [x, y + RIG.soleRadius], angle, point: 'tip' }
}

export function heel(x: number, angle = 30, y = 0): Reach {
  return { at: [x, y + RIG.soleRadius], angle, point: 'heel' }
}

export function palm(x: number, y = 0, angle = 0): Reach {
  return { at: [x, y + HAND_REST_HEIGHT], angle }
}

export function fingertips(x: number, y = 0, angle = -90): Reach {
  return { at: [x, y + HAND_REST_HEIGHT], angle, point: 'tip' }
}

export function hand(at: Vec2, angle?: number, bend?: 1 | -1): Reach {
  return { at, angle, bend }
}

export function foot(at: Vec2, angle?: number, bend?: 1 | -1): Reach {
  return { at, angle, bend }
}

export function arms(both: Triple | Reach): Pick<PoseSpec, 'armL' | 'armR'> {
  return { armL: both, armR: both }
}

export function legs(both: Triple | Reach): Pick<PoseSpec, 'legL' | 'legR'> {
  return { legL: both, legR: both }
}

export function pose(base: PoseSpec, ...overrides: PoseSpec[]): PoseSpec {
  return Object.assign({}, base, ...overrides)
}

export function key(posed: PoseSpec, ms: number, hold = 0, ease: Easing = 'inOut'): Keyframe {
  return { pose: posed, ms, hold, ease }
}

export function anim(view: View, keyframes: Keyframe[], extra: { props?: Prop[]; thumb?: number; feel?: Feel } = {}): FigureAnimation {
  return { view, keyframes, ...extra }
}

export function breathe(posed: PoseSpec, view: View, cycleMs = 3200, props?: Prop[]): FigureAnimation {
  const exhale = pose(posed, { spine: (posed.spine ?? 0) + 2, neck: (posed.neck ?? 0) + 1 })
  return anim(view, [key(posed, cycleMs / 2, 0), key(exhale, cycleMs / 2, 0)], { props, thumb: 0 })
}

export const STAND: PoseSpec = {
  root: [0, HIP],
  torso: 0,
  armL: [8, 12],
  armR: [8, 12],
  legL: flat(0),
  legR: flat(0),
}

export const FLOOR_SHIN = WIDTH.shin / 2

export const FLOOR_FOREARM = WIDTH.forearm / 2

export const HIGH_PLANK: PoseSpec = {
  torso: 73.5,
  neck: -10,
  ...legs([0, 0, 10]),
  anchor: { joint: 'toeL', at: [-0.75, RIG.soleRadius] },
  ...arms(palm(0.58)),
}

export const FOREARM_PLANK: PoseSpec = {
  torso: 84,
  neck: -10,
  ...legs([0, 0, 10]),
  anchor: { joint: 'toeL', at: [-0.85, RIG.soleRadius] },
  ...arms(hand([0.76, FLOOR_FOREARM], 0)),
}

export const ALL_FOURS: PoseSpec = {
  torso: 77,
  neck: -14,
  ...legs([77, 90, 90]),
  anchor: { joint: 'kneeL', at: [-0.1, FLOOR_SHIN] },
  ...arms(palm(0.36)),
}

export const SUPINE_KNEES: PoseSpec = {
  root: [0, LYING_HIP],
  torso: -90,
  ...legs(flat(0.46)),
  ...arms([10, 0]),
}

export const SUPINE_FLAT: PoseSpec = {
  root: [0, LYING_HIP],
  torso: -90,
  ...legs([-2, 0, 0]),
  ...arms([4, 0]),
}

export const PRONE: PoseSpec = {
  root: [0, LYING_HIP],
  torso: 90,
  neck: -6,
  ...legs([0, 0, 90]),
  ...arms([0, 0]),
}

export const SEATED: PoseSpec = {
  root: [0, 0.1],
  torso: 0,
  ...legs([93, 0, 0]),
  ...arms(palm(-0.18)),
}

export const KNEEL_TALL: PoseSpec = {
  torso: 0,
  ...legs([0, 90, 90]),
  anchor: { joint: 'kneeL', at: [0, FLOOR_SHIN] },
  ...arms([8, 12]),
}

export const SIDE_LYING_FRONT: PoseSpec = {
  root: [0, 0.2],
  torso: -86,
  anchor: 'ground',
  armR: [175, 10],
  armL: [4, 6],
  ...legs([-3, 0, 90]),
}

export const STAND_FRONT: PoseSpec = {
  root: [0, HIP],
  torso: 0,
  armL: [8, 8],
  armR: [8, 8],
  legL: flat(RIG.hipHalfWidth + 0.02),
  legR: flat(-RIG.hipHalfWidth - 0.02),
}

export const STAND_HOLD: PoseSpec = {
  ...STAND,
  ...arms([4, 6]),
}

export const STAND_HOLD_PROPS: Prop[] = [{ kind: 'dumbbell', hand: 'both' }]

export const SUPINE_ON_BENCH: PoseSpec = {
  root: [0, BENCH_HEIGHT + LYING_HIP],
  torso: -90,
  ...legs(flat(0.5)),
  ...arms([90, 0]),
}

export const SUPINE_ON_BENCH_PROPS: Prop[] = [{ kind: 'bench', x0: -0.85, x1: 0.18 }]

export const ROLLER_CALF: PoseSpec = {
  root: [0, 0.24],
  torso: -25,
  ...legs([62, 0, 0]),
  ...arms(palm(-0.28)),
}

export const ROLLER_CALF_PROPS: Prop[] = [{ kind: 'foamRoller', under: 'kneeL', dx: 0.2 }]

export const ROLLER_UPPER_BACK: PoseSpec = {
  root: [0, LYING_HIP],
  torso: -70,
  ...legs(flat(0.42)),
  ...arms([35, 150]),
}

export const ROLLER_UPPER_BACK_PROPS: Prop[] = [{ kind: 'foamRoller', under: 'waist', dx: -0.14 }]

export const BASE_POSES: Record<string, { view: View; pose: PoseSpec; props?: Prop[] }> = {
  STAND: { view: 'side', pose: STAND },
  STAND_FRONT: { view: 'front', pose: STAND_FRONT },
  HIGH_PLANK: { view: 'side', pose: HIGH_PLANK },
  FOREARM_PLANK: { view: 'side', pose: FOREARM_PLANK },
  ALL_FOURS: { view: 'side', pose: ALL_FOURS },
  SUPINE_KNEES: { view: 'side', pose: SUPINE_KNEES },
  SUPINE_FLAT: { view: 'side', pose: SUPINE_FLAT },
  PRONE: { view: 'side', pose: PRONE },
  SEATED: { view: 'side', pose: SEATED },
  KNEEL_TALL: { view: 'side', pose: KNEEL_TALL },
  SIDE_LYING_FRONT: { view: 'front', pose: SIDE_LYING_FRONT },
  STAND_HOLD: { view: 'side', pose: STAND_HOLD, props: STAND_HOLD_PROPS },
  SUPINE_ON_BENCH: { view: 'side', pose: SUPINE_ON_BENCH, props: SUPINE_ON_BENCH_PROPS },
  ROLLER_CALF: { view: 'side', pose: ROLLER_CALF, props: ROLLER_CALF_PROPS },
  ROLLER_UPPER_BACK: { view: 'side', pose: ROLLER_UPPER_BACK, props: ROLLER_UPPER_BACK_PROPS },
}
