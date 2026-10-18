import type { LimbId, LimbSide, View } from './types'

export const RIG = {
  lowerSpine: 0.24,
  upperSpine: 0.28,
  neck: 0.075,
  headRadius: 0.115,
  upperArm: 0.31,
  forearm: 0.27,
  hand: 0.09,
  thigh: 0.44,
  shin: 0.43,
  footToe: 0.165,
  footHeel: 0.045,
  ankleHeight: 0.065,
  soleRadius: 0.032,
  shoulderDrop: 0.035,
  shoulderHalfWidth: 0.175,
  hipHalfWidth: 0.095,
  waistHalfWidth: 0.115,
} as const

export const WIDTH = {
  torsoSide: 0.23,
  torsoFrontEdge: 0.07,
  neck: 0.075,
  upperArm: 0.09,
  forearm: 0.075,
  hand: 0.07,
  thigh: 0.135,
  shin: 0.1,
  foot: 0.06,
} as const

export const ANKLE_REST_HEIGHT = RIG.soleRadius + RIG.ankleHeight

export const STAND_HIP_HEIGHT = ANKLE_REST_HEIGHT + RIG.shin + RIG.thigh

export const HAND_REST_HEIGHT = WIDTH.forearm / 2

export const DEFAULT_ARM = [8, 12, 0] as const

export const DEFAULT_LEG = [0, 0, 0] as const

export const LIMBS: readonly LimbId[] = ['armL', 'armR', 'legL', 'legR']

export function limbSide(limb: LimbId): LimbSide {
  return limb.endsWith('L') ? 'L' : 'R'
}

export function isArm(limb: LimbId): boolean {
  return limb.startsWith('arm')
}

export function mirrorSign(view: View, side: LimbSide): 1 | -1 {
  if (view === 'side') {
    return 1
  }
  return side === 'L' ? 1 : -1
}

export function mirrorAbsolute(angle: number, sign: 1 | -1): number {
  return sign > 0 ? angle : 180 - angle
}
