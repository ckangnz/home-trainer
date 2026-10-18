import { add, along, angleOf, clamp, DEG, dir, length, scale as scaleVec, sub, wrap180, type Vec2 } from './math'
import {
  DEFAULT_ARM,
  DEFAULT_LEG,
  LIMBS,
  RIG,
  STAND_HIP_HEIGHT,
  WIDTH,
  isArm,
  limbSide,
  mirrorAbsolute,
  mirrorSign,
} from './rig'
import type {
  Anchor,
  JointId,
  LimbId,
  LimbSpec,
  PoseSpec,
  Reach,
  SegmentId,
  Skeleton,
  Triple,
  View,
} from './types'

export type Triple3 = readonly [number, number, number]

export interface NormalizedPose {
  root: Vec2
  torso: number
  spine: number
  neck: number
  limbs: Record<LimbId, Triple3 | Reach>
  anchor?: Anchor
  scale: Partial<Record<SegmentId, number>>
}

export function isReach(spec: LimbSpec | Triple3): spec is Reach {
  return !Array.isArray(spec)
}

function fullTriple(triple: Triple): Triple3 {
  return [triple[0], triple[1], triple[2] ?? 0]
}

export function normalizePose(spec: PoseSpec): NormalizedPose {
  const limbs = {} as Record<LimbId, Triple3 | Reach>
  for (const limb of LIMBS) {
    const value = spec[limb]
    if (value === undefined) {
      limbs[limb] = isArm(limb) ? DEFAULT_ARM : DEFAULT_LEG
    } else if (isReach(value)) {
      limbs[limb] = value
    } else {
      limbs[limb] = fullTriple(value)
    }
  }
  return {
    root: spec.root ?? [0, STAND_HIP_HEIGHT],
    torso: spec.torso ?? 0,
    spine: spec.spine ?? 0,
    neck: spec.neck ?? 0,
    limbs,
    anchor: spec.anchor,
    scale: spec.scale ?? {},
  }
}

function segScale(pose: NormalizedPose, view: View, segment: SegmentId): number {
  const base = view === 'front' && (segment === 'footL' || segment === 'footR') ? 0.55 : 1
  return base * (pose.scale[segment] ?? 1)
}

interface Trunk {
  phiLs: number
  phiUs: number
  phiHead: number
  waist: Vec2
  neck: Vec2
  head: Vec2
  shoulder: Record<'L' | 'R', Vec2>
  hip: Record<'L' | 'R', Vec2>
}

function solveTrunk(pose: NormalizedPose, view: View, root: Vec2): Trunk {
  const phiLs = 90 - pose.torso
  const phiUs = phiLs - pose.spine
  const phiHead = phiUs - pose.neck
  const waist = along(root, phiLs, RIG.lowerSpine * segScale(pose, view, 'lowerSpine'))
  const neck = along(waist, phiUs, RIG.upperSpine * segScale(pose, view, 'upperSpine'))
  const head = along(neck, phiHead, RIG.neck + RIG.headRadius)
  const shoulderCenter = along(neck, phiUs + 180, RIG.shoulderDrop)
  if (view === 'side') {
    return {
      phiLs,
      phiUs,
      phiHead,
      waist,
      neck,
      head,
      shoulder: { L: shoulderCenter, R: shoulderCenter },
      hip: { L: root, R: root },
    }
  }
  return {
    phiLs,
    phiUs,
    phiHead,
    waist,
    neck,
    head,
    shoulder: {
      L: along(shoulderCenter, phiUs - 90, RIG.shoulderHalfWidth),
      R: along(shoulderCenter, phiUs + 90, RIG.shoulderHalfWidth),
    },
    hip: {
      L: along(root, phiLs - 90, RIG.hipHalfWidth),
      R: along(root, phiLs + 90, RIG.hipHalfWidth),
    },
  }
}

interface LimbChain {
  joints: [Vec2, Vec2, Vec2, Vec2]
  heel?: Vec2
  phi: [number, number, number]
  rel: Triple3
}

function footPoints(ankle: Vec2, phiFoot: number, sign: 1 | -1, footScale: number) {
  const forward = dir(phiFoot)
  const up = dir(phiFoot + sign * 90)
  const toe = add(add(ankle, scaleVec(forward, RIG.footToe * footScale)), scaleVec(up, -RIG.ankleHeight))
  const heel = add(add(ankle, scaleVec(forward, -RIG.footHeel * footScale)), scaleVec(up, -RIG.ankleHeight))
  return { toe, heel }
}

function ankleFromToe(toe: Vec2, phiFoot: number, sign: 1 | -1, footScale: number): Vec2 {
  const forward = dir(phiFoot)
  const up = dir(phiFoot + sign * 90)
  return sub(sub(toe, scaleVec(forward, RIG.footToe * footScale)), scaleVec(up, -RIG.ankleHeight))
}

function ankleFromHeel(heel: Vec2, phiFoot: number, sign: 1 | -1, footScale: number): Vec2 {
  const forward = dir(phiFoot)
  const up = dir(phiFoot + sign * 90)
  return add(add(heel, scaleVec(forward, RIG.footHeel * footScale)), scaleVec(up, RIG.ankleHeight))
}

function armRel(phiUs: number, phi: [number, number, number], sign: 1 | -1): Triple3 {
  return [
    wrap180(sign * (phi[0] - (phiUs - 180))),
    wrap180(sign * (phi[1] - phi[0])),
    wrap180(sign * (phi[2] - phi[1])),
  ]
}

function legRel(phiLs: number, phi: [number, number, number], sign: 1 | -1): Triple3 {
  return [
    wrap180(sign * (phi[0] - (phiLs - 180))),
    wrap180(-sign * (phi[1] - phi[0])),
    wrap180(90 - sign * (phi[2] - phi[1])),
  ]
}

function fkArm(base: Vec2, phiUs: number, angles: Triple3, sign: 1 | -1, lengths: [number, number, number]): LimbChain {
  const phiUpper = phiUs - 180 + sign * angles[0]
  const phiFore = phiUpper + sign * angles[1]
  const phiHand = phiFore + sign * angles[2]
  const elbow = along(base, phiUpper, lengths[0])
  const wrist = along(elbow, phiFore, lengths[1])
  const tip = along(wrist, phiHand, lengths[2])
  return { joints: [base, elbow, wrist, tip], phi: [phiUpper, phiFore, phiHand], rel: angles }
}

function fkLeg(
  base: Vec2,
  phiLs: number,
  angles: Triple3,
  sign: 1 | -1,
  lengths: [number, number],
  footScale: number,
): LimbChain {
  const phiThigh = phiLs - 180 + sign * angles[0]
  const phiShin = phiThigh - sign * angles[1]
  const phiFoot = phiShin + sign * (90 - angles[2])
  const knee = along(base, phiThigh, lengths[0])
  const ankle = along(knee, phiShin, lengths[1])
  const { toe, heel } = footPoints(ankle, phiFoot, sign, footScale)
  return { joints: [base, knee, ankle, toe], heel, phi: [phiThigh, phiShin, phiFoot], rel: angles }
}

export function twoBone(base: Vec2, target: Vec2, l1: number, l2: number, bendSign: number) {
  const offset = sub(target, base)
  const reach = length(offset)
  const baseAngle = reach < 1e-9 ? -90 : angleOf(offset)
  const minReach = Math.abs(l1 - l2) + 1e-6
  const maxReach = l1 + l2 - 1e-6
  const clamped = clamp(reach, minReach, maxReach)
  const cosAlpha = clamp((l1 * l1 + clamped * clamped - l2 * l2) / (2 * l1 * clamped), -1, 1)
  const alpha = Math.acos(cosAlpha) / DEG
  const phi1 = baseAngle + Math.sign(bendSign || 1) * alpha
  const middle = along(base, phi1, l1)
  const end = along(base, baseAngle, clamped)
  const phi2 = angleOf(sub(end, middle))
  return { phi1, phi2, middle, end, reached: Math.abs(reach - clamped) < 1e-6 }
}

function ikArm(
  base: Vec2,
  phiUs: number,
  reach: Reach,
  sign: 1 | -1,
  view: View,
  lengths: [number, number, number],
): LimbChain {
  const bend = reach.bend ?? 1
  const bendSign = view === 'side' ? -sign * bend : sign * bend
  const phiHandGiven = reach.angle === undefined ? undefined : mirrorAbsolute(reach.angle, sign)
  let wristTarget = reach.at
  if (reach.point === 'tip') {
    wristTarget = along(reach.at, (phiHandGiven ?? -90) + 180, lengths[2])
  }
  const solved = twoBone(base, wristTarget, lengths[0], lengths[1], bendSign)
  const phiHand = phiHandGiven ?? solved.phi2
  const tip = along(solved.end, phiHand, lengths[2])
  const phi: [number, number, number] = [solved.phi1, solved.phi2, phiHand]
  return { joints: [base, solved.middle, solved.end, tip], phi, rel: armRel(phiUs, phi, sign) }
}

function ikLeg(
  base: Vec2,
  phiLs: number,
  reach: Reach,
  sign: 1 | -1,
  lengths: [number, number],
  footScale: number,
): LimbChain {
  const bendSign = sign * (reach.bend ?? 1)
  const phiFootGiven = reach.angle === undefined ? undefined : mirrorAbsolute(reach.angle, sign)
  let ankleTarget = reach.at
  if (reach.point === 'tip') {
    ankleTarget = ankleFromToe(reach.at, phiFootGiven ?? mirrorAbsolute(0, sign), sign, footScale)
  } else if (reach.point === 'heel') {
    ankleTarget = ankleFromHeel(reach.at, phiFootGiven ?? mirrorAbsolute(0, sign), sign, footScale)
  }
  const solved = twoBone(base, ankleTarget, lengths[0], lengths[1], bendSign)
  const phiFoot = phiFootGiven ?? solved.phi2 + sign * 90
  const { toe, heel } = footPoints(solved.end, phiFoot, sign, footScale)
  const phi: [number, number, number] = [solved.phi1, solved.phi2, phiFoot]
  return { joints: [base, solved.middle, solved.end, toe], heel, phi, rel: legRel(phiLs, phi, sign) }
}

const LIMB_JOINTS: Record<LimbId, JointId[]> = {
  armL: ['shoulderL', 'elbowL', 'wristL', 'handL'],
  armR: ['shoulderR', 'elbowR', 'wristR', 'handR'],
  legL: ['hipL', 'kneeL', 'ankleL', 'toeL', 'heelL'],
  legR: ['hipR', 'kneeR', 'ankleR', 'toeR', 'heelR'],
}

export function limbOfJoint(joint: JointId): LimbId | null {
  for (const limb of LIMBS) {
    if (LIMB_JOINTS[limb].includes(joint)) {
      return limb
    }
  }
  return null
}

const GROUND_RADIUS: Partial<Record<JointId, number>> = {
  hip: WIDTH.torsoSide / 2,
  waist: WIDTH.torsoSide / 2,
  neck: WIDTH.torsoSide / 2,
  head: RIG.headRadius,
  elbowL: WIDTH.upperArm / 2,
  elbowR: WIDTH.upperArm / 2,
  wristL: WIDTH.forearm / 2,
  wristR: WIDTH.forearm / 2,
  handL: WIDTH.hand / 2,
  handR: WIDTH.hand / 2,
  kneeL: WIDTH.thigh / 2,
  kneeR: WIDTH.thigh / 2,
  ankleL: WIDTH.shin / 2,
  ankleR: WIDTH.shin / 2,
  toeL: RIG.soleRadius,
  toeR: RIG.soleRadius,
  heelL: RIG.soleRadius,
  heelR: RIG.soleRadius,
}

function limbLengths(pose: NormalizedPose, view: View, limb: LimbId) {
  const side = limbSide(limb)
  if (isArm(limb)) {
    return {
      arm: [
        RIG.upperArm * segScale(pose, view, `upperArm${side}`),
        RIG.forearm * segScale(pose, view, `forearm${side}`),
        RIG.hand * segScale(pose, view, `hand${side}`),
      ] as [number, number, number],
      leg: undefined,
      foot: 1,
    }
  }
  return {
    arm: undefined,
    leg: [
      RIG.thigh * segScale(pose, view, `thigh${side}`),
      RIG.shin * segScale(pose, view, `shin${side}`),
    ] as [number, number],
    foot: segScale(pose, view, `foot${side}`),
  }
}

function solveChains(pose: NormalizedPose, view: View, trunk: Trunk, includeReach: boolean) {
  const chains: Partial<Record<LimbId, LimbChain>> = {}
  for (const limb of LIMBS) {
    const spec = pose.limbs[limb]
    if (isReach(spec) && !includeReach) {
      continue
    }
    const side = limbSide(limb)
    const sign = mirrorSign(view, side)
    const lengths = limbLengths(pose, view, limb)
    if (lengths.arm) {
      chains[limb] = isReach(spec)
        ? ikArm(trunk.shoulder[side], trunk.phiUs, spec, sign, view, lengths.arm)
        : fkArm(trunk.shoulder[side], trunk.phiUs, spec, sign, lengths.arm)
    } else if (lengths.leg) {
      chains[limb] = isReach(spec)
        ? ikLeg(trunk.hip[side], trunk.phiLs, spec, sign, lengths.leg, lengths.foot)
        : fkLeg(trunk.hip[side], trunk.phiLs, spec, sign, lengths.leg, lengths.foot)
    }
  }
  return chains
}

function collectPoints(root: Vec2, trunk: Trunk, chains: Partial<Record<LimbId, LimbChain>>) {
  const points: Partial<Record<JointId, Vec2>> = {
    hip: root,
    waist: trunk.waist,
    neck: trunk.neck,
    head: trunk.head,
  }
  for (const limb of LIMBS) {
    const chain = chains[limb]
    if (!chain) {
      continue
    }
    const ids = LIMB_JOINTS[limb]
    chain.joints.forEach((point, index) => {
      points[ids[index]] = point
    })
    if (chain.heel && ids[4]) {
      points[ids[4]] = chain.heel
    }
  }
  return points
}

function resolveRoot(pose: NormalizedPose, view: View): Vec2 {
  const anchor = pose.anchor
  if (anchor === undefined) {
    return pose.root
  }
  const trunk = solveTrunk(pose, view, pose.root)
  const chains = solveChains(pose, view, trunk, false)
  const points = collectPoints(pose.root, trunk, chains)
  if (anchor === 'ground') {
    let lowest = Infinity
    for (const [joint, point] of Object.entries(points) as [JointId, Vec2][]) {
      lowest = Math.min(lowest, point[1] - (GROUND_RADIUS[joint] ?? 0))
    }
    return [pose.root[0], pose.root[1] - lowest]
  }
  const point = points[anchor.joint]
  if (point === undefined) {
    throw new Error(`Anchor joint "${anchor.joint}" belongs to a reach limb and cannot anchor the pose.`)
  }
  return add(pose.root, sub(anchor.at, point))
}

export function solvePose(pose: NormalizedPose, view: View): Skeleton {
  const root = resolveRoot(pose, view)
  const trunk = solveTrunk(pose, view, root)
  const chains = solveChains(pose, view, trunk, true) as Record<LimbId, LimbChain>
  const points = collectPoints(root, trunk, chains) as Record<JointId, Vec2>
  return {
    view,
    points,
    phi: {
      lowerSpine: trunk.phiLs,
      upperSpine: trunk.phiUs,
      head: trunk.phiHead,
      upperArmL: chains.armL.phi[0],
      forearmL: chains.armL.phi[1],
      handL: chains.armL.phi[2],
      thighL: chains.legL.phi[0],
      shinL: chains.legL.phi[1],
      footL: chains.legL.phi[2],
      upperArmR: chains.armR.phi[0],
      forearmR: chains.armR.phi[1],
      handR: chains.armR.phi[2],
      thighR: chains.legR.phi[0],
      shinR: chains.legR.phi[1],
      footR: chains.legR.phi[2],
    },
    rel: {
      torso: pose.torso,
      spine: pose.spine,
      neck: pose.neck,
      limbs: {
        armL: chains.armL.rel,
        armR: chains.armR.rel,
        legL: chains.legL.rel,
        legR: chains.legR.rel,
      },
    },
  }
}

export function solveSpec(spec: PoseSpec, view: View): Skeleton {
  return solvePose(normalizePose(spec), view)
}
