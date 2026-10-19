import { distance, ease, lerp, lerpAngle, lerpVec, overshoots, type Easing, type Vec2 } from './math'
import { LIMBS, isArm, limbSide, mirrorSign } from './rig'
import { isReach, normalizePose, solvePose, type NormalizedPose, type Triple3 } from './solve'
import type { Anchor, Feel, FigureAnimation, JointId, LimbId, Prop, Reach, SegmentId, Skeleton, View } from './types'

export type { NormalizedPose }

interface PreparedKeyframe {
  pose: NormalizedPose
  skeleton: Skeleton
  ms: number
  hold: number
  ease: Easing
}

interface TimelineSegment {
  from: number
  to: number
  start: number
  end: number
  moving: boolean
  lively: boolean
}

export interface PreparedAnimation {
  view: View
  keyframes: PreparedKeyframe[]
  timeline: TimelineSegment[]
  cycleMs: number
  props: Prop[]
  thumb: number
  feel: Feel
}

const prepareCache = new WeakMap<FigureAnimation, PreparedAnimation>()

export function prepareAnimation(animation: FigureAnimation): PreparedAnimation {
  const cached = prepareCache.get(animation)
  if (cached) {
    return cached
  }
  if (animation.keyframes.length === 0) {
    throw new Error('A figure animation needs at least one keyframe.')
  }
  const keyframes = animation.keyframes.map((keyframe) => {
    const pose = normalizePose(keyframe.pose)
    return {
      pose,
      skeleton: solvePose(pose, animation.view),
      ms: Math.max(0, keyframe.ms),
      hold: Math.max(0, keyframe.hold ?? 0),
      ease: keyframe.ease ?? 'inOut',
    }
  })
  const feel = animation.feel ?? 'smooth'
  const timeline: TimelineSegment[] = []
  let cursor = 0
  keyframes.forEach((keyframe, index) => {
    if (keyframe.hold > 0) {
      timeline.push({ from: index, to: index, start: cursor, end: cursor + keyframe.hold, moving: false, lively: false })
      cursor += keyframe.hold
    }
    const next = (index + 1) % keyframes.length
    const moveMs = keyframes[next].ms
    if (moveMs > 0 && keyframes.length > 1) {
      const lively = wantsLively(keyframes[next], feel) && livelyIsSafe(keyframes[index], keyframes[next], animation.view)
      timeline.push({ from: index, to: next, start: cursor, end: cursor + moveMs, moving: true, lively })
      cursor += moveMs
    }
  })
  const thumb = Math.min(Math.max(0, animation.thumb ?? (keyframes.length > 1 ? 1 : 0)), keyframes.length - 1)
  const prepared: PreparedAnimation = {
    view: animation.view,
    keyframes,
    timeline,
    cycleMs: cursor,
    props: animation.props ?? [],
    thumb,
    feel,
  }
  prepareCache.set(animation, prepared)
  return prepared
}

function sameAnchor(a: Anchor | undefined, b: Anchor | undefined): boolean {
  if (a === undefined || b === undefined) {
    return false
  }
  if (a === 'ground' || b === 'ground') {
    return a === b
  }
  return a.joint === b.joint
}

function blendAnchor(a: Anchor, b: Anchor, t: number): Anchor {
  if (a === 'ground' || b === 'ground') {
    return 'ground'
  }
  return { joint: a.joint, at: lerpVec(a.at, b.at, t) }
}

function blendReach(a: Reach, b: Reach, t: number): Reach {
  return {
    at: lerpVec(a.at, b.at, t),
    angle: a.angle !== undefined && b.angle !== undefined ? lerpAngle(a.angle, b.angle, t) : undefined,
    bend: t < 0.5 ? a.bend : b.bend,
    point: a.point,
  }
}

type ContactPoint = NonNullable<Reach['point']>

function sharedPoint(a: Reach, b: Reach): ContactPoint {
  const first = a.point ?? 'end'
  const second = b.point ?? 'end'
  if (first === second) {
    return first
  }
  if (first === 'tip' || second === 'tip') {
    return 'tip'
  }
  return first === 'heel' || second === 'heel' ? 'heel' : 'end'
}

function contactPosition(skeleton: Skeleton, limb: LimbId, point: ContactPoint): Vec2 {
  const side = limbSide(limb)
  if (isArm(limb)) {
    return point === 'tip' ? skeleton.points[`hand${side}`] : skeleton.points[`wrist${side}`]
  }
  if (point === 'tip') {
    return skeleton.points[`toe${side}`]
  }
  return point === 'heel' ? skeleton.points[`heel${side}`] : skeleton.points[`ankle${side}`]
}

function asContact(spec: Reach, skeleton: Skeleton, limb: LimbId, point: ContactPoint): Reach {
  if ((spec.point ?? 'end') === point) {
    return spec
  }
  const side = limbSide(limb)
  const sign = mirrorSign(skeleton.view, side)
  const phi = isArm(limb) ? skeleton.phi[`hand${side}`] : skeleton.phi[`foot${side}`]
  return { at: contactPosition(skeleton, limb, point), angle: sign > 0 ? phi : 180 - phi, bend: spec.bend, point }
}

function blendTriple(a: Triple3, b: Triple3, t: number): Triple3 {
  return [lerpAngle(a[0], b[0], t), lerpAngle(a[1], b[1], t), lerpAngle(a[2], b[2], t)]
}

function blendScale(a: NormalizedPose['scale'], b: NormalizedPose['scale'], t: number) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<SegmentId>
  const result: Partial<Record<SegmentId, number>> = {}
  for (const key of keys) {
    result[key] = lerp(a[key] ?? 1, b[key] ?? 1, t)
  }
  return result
}

interface BlendWeights {
  contact: number
  free: number
  root: number
}

function blendPose(a: PreparedKeyframe, b: PreparedKeyframe, weights: BlendWeights): NormalizedPose {
  const { contact: t, free, root } = weights
  const limbs = {} as Record<LimbId, Triple3 | Reach>
  for (const limb of LIMBS) {
    const specA = a.pose.limbs[limb]
    const specB = b.pose.limbs[limb]
    if (isReach(specA) && isReach(specB) && (specA.bend ?? 1) === (specB.bend ?? 1)) {
      const point = sharedPoint(specA, specB)
      limbs[limb] = blendReach(asContact(specA, a.skeleton, limb, point), asContact(specB, b.skeleton, limb, point), t)
    } else {
      limbs[limb] = blendTriple(a.skeleton.rel.limbs[limb], b.skeleton.rel.limbs[limb], free)
    }
  }
  const anchored = sameAnchor(a.pose.anchor, b.pose.anchor)
  const pose: NormalizedPose = {
    root: lerpVec(a.skeleton.points.hip, b.skeleton.points.hip, root),
    torso: lerpAngle(a.pose.torso, b.pose.torso, free),
    spine: lerpAngle(a.pose.spine, b.pose.spine, free),
    neck: lerpAngle(a.pose.neck, b.pose.neck, free),
    limbs,
    anchor: anchored ? blendAnchor(a.pose.anchor as Anchor, b.pose.anchor as Anchor, t) : undefined,
    scale: blendScale(a.pose.scale, b.pose.scale, t),
  }
  return pose
}

interface SamplePoint {
  keyframe?: PreparedKeyframe
  pose: NormalizedPose
}

function locate(prepared: PreparedAnimation, timeMs: number): SamplePoint {
  const { keyframes, timeline, cycleMs } = prepared
  if (keyframes.length === 1 || cycleMs <= 0 || timeline.length === 0) {
    return { keyframe: keyframes[0], pose: keyframes[0].pose }
  }
  const t = ((timeMs % cycleMs) + cycleMs) % cycleMs
  const segment = timeline.find((candidate) => t >= candidate.start && t < candidate.end) ?? timeline[timeline.length - 1]
  if (!segment.moving) {
    return { keyframe: keyframes[segment.from], pose: keyframes[segment.from].pose }
  }
  const from = keyframes[segment.from]
  const target = keyframes[segment.to]
  const progress = (t - segment.start) / (segment.end - segment.start)
  return { pose: blendPose(from, target, blendWeights(from, target, progress, segment.lively)) }
}

const LANDING_DROP = 0.02

const LIVELY_PROBES = [0.2, 0.3, 0.4, 0.5, 0.6, 0.75, 0.9]

const NEAR_FLOOR = 0.16

const END_JOINT: Record<LimbId, Record<NonNullable<Reach['point']>, JointId>> = {
  armL: { end: 'wristL', tip: 'handL', heel: 'wristL' },
  armR: { end: 'wristR', tip: 'handR', heel: 'wristR' },
  legL: { end: 'ankleL', tip: 'toeL', heel: 'heelL' },
  legR: { end: 'ankleR', tip: 'toeR', heel: 'heelR' },
}

function wantsLively(target: PreparedKeyframe, feel: Feel): boolean {
  return overshoots(target.ease) || feel === 'bouncy'
}

function livelyIsSafe(from: PreparedKeyframe, target: PreparedKeyframe, view: View): boolean {
  for (const progress of LIVELY_PROBES) {
    const calm = solvePose(blendPose(from, target, blendWeights(from, target, progress, false)), view)
    const pose = blendPose(from, target, blendWeights(from, target, progress, true))
    const lively = solvePose(pose, view)
    for (const joint of Object.keys(lively.points) as JointId[]) {
      const y = lively.points[joint][1]
      if (y < NEAR_FLOOR && y < calm.points[joint][1] - 0.004) {
        return false
      }
    }
    for (const limb of LIMBS) {
      const spec = pose.limbs[limb]
      if (isReach(spec) && distance(lively.points[END_JOINT[limb][spec.point ?? 'end']], spec.at) > 0.008) {
        return false
      }
    }
  }
  return true
}

function blendWeights(from: PreparedKeyframe, target: PreparedKeyframe, progress: number, lively: boolean): BlendWeights {
  const springy = overshoots(target.ease)
  const contact = ease(springy ? 'inOut' : target.ease, progress)
  if (!lively) {
    return { contact, free: contact, root: contact }
  }
  const free = ease(springy ? target.ease : 'back', progress)
  const landing = target.skeleton.points.hip[1] < from.skeleton.points.hip[1] - LANDING_DROP
  return { contact, free, root: landing ? free : contact }
}

export function samplePose(prepared: PreparedAnimation, timeMs: number): NormalizedPose {
  return locate(prepared, timeMs).pose
}

export function sampleSkeleton(prepared: PreparedAnimation, timeMs: number): Skeleton {
  const located = locate(prepared, timeMs)
  return located.keyframe ? located.keyframe.skeleton : solvePose(located.pose, prepared.view)
}

export function thumbSkeleton(prepared: PreparedAnimation): Skeleton {
  return prepared.keyframes[prepared.thumb].skeleton
}
