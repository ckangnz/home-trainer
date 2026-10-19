import type { Easing, Vec2 } from './math'

export type View = 'side' | 'front'

export type LimbId = 'armL' | 'armR' | 'legL' | 'legR'

export type LimbSide = 'L' | 'R'

export type Triple = readonly [number, number, number?]

export interface Reach {
  at: Vec2
  angle?: number
  bend?: 1 | -1
  point?: 'end' | 'tip' | 'heel'
}

export type LimbSpec = Triple | Reach

export type JointId =
  | 'hip'
  | 'waist'
  | 'neck'
  | 'head'
  | 'shoulderL'
  | 'elbowL'
  | 'wristL'
  | 'handL'
  | 'hipL'
  | 'kneeL'
  | 'ankleL'
  | 'toeL'
  | 'heelL'
  | 'shoulderR'
  | 'elbowR'
  | 'wristR'
  | 'handR'
  | 'hipR'
  | 'kneeR'
  | 'ankleR'
  | 'toeR'
  | 'heelR'

export type SegmentId =
  | 'lowerSpine'
  | 'upperSpine'
  | 'upperArmL'
  | 'forearmL'
  | 'handL'
  | 'thighL'
  | 'shinL'
  | 'footL'
  | 'upperArmR'
  | 'forearmR'
  | 'handR'
  | 'thighR'
  | 'shinR'
  | 'footR'

export type Anchor = { joint: JointId; at: Vec2 } | 'ground'

export interface PoseSpec {
  root?: Vec2
  torso?: number
  spine?: number
  neck?: number
  armL?: LimbSpec
  armR?: LimbSpec
  legL?: LimbSpec
  legR?: LimbSpec
  gripL?: number
  gripR?: number
  anchor?: Anchor
  scale?: Partial<Record<SegmentId, number>>
}

export interface Keyframe {
  pose: PoseSpec
  ms: number
  hold?: number
  ease?: Easing
}

export type Grip = 'L' | 'R' | 'both'

export type Prop =
  | { kind: 'chair'; x: number; facing: 1 | -1 }
  | { kind: 'wall'; x: number; side: 1 | -1 }
  | { kind: 'mat'; x0: number; x1: number }
  | { kind: 'bench'; x0: number; x1: number }
  | { kind: 'box'; x0: number; x1: number; height: number }
  | { kind: 'dumbbell'; hand: Grip; hold?: 'handle' | 'end' }
  | { kind: 'kettlebell'; hand: Grip; hang?: 'down' | 'arm' }
  | { kind: 'barbell'; plate?: number }
  | { kind: 'band'; from: Vec2 | JointId; hand: Grip }
  | { kind: 'strap'; foot: LimbSide; hand: Grip }
  | { kind: 'foamRoller'; under: JointId; dx?: number }
  | { kind: 'massageBall'; under: JointId; dx?: number; y?: number }

export type Feel = 'smooth' | 'bouncy'

export interface FigureAnimation {
  view: View
  keyframes: Keyframe[]
  props?: Prop[]
  thumb?: number
  feel?: Feel
}

export interface Skeleton {
  view: View
  points: Record<JointId, Vec2>
  phi: {
    lowerSpine: number
    upperSpine: number
    head: number
    upperArmL: number
    forearmL: number
    handL: number
    thighL: number
    shinL: number
    footL: number
    upperArmR: number
    forearmR: number
    handR: number
    thighR: number
    shinR: number
    footR: number
  }
  rel: {
    torso: number
    spine: number
    neck: number
    limbs: Record<LimbId, readonly [number, number, number]>
  }
  grip: Record<LimbSide, number>
}

export type Tone =
  | 'skin'
  | 'skinFar'
  | 'skinShade'
  | 'skinLight'
  | 'lip'
  | 'blush'
  | 'top'
  | 'topLight'
  | 'topFar'
  | 'bottom'
  | 'bottomFar'
  | 'bottomLight'
  | 'trim'
  | 'shoe'
  | 'shoeFar'
  | 'sole'
  | 'shoeAccent'
  | 'hair'
  | 'hairShade'
  | 'hairLight'
  | 'hairFade'
  | 'eye'
  | 'accent'
  | 'prop'
  | 'propSoft'
  | 'iron'
  | 'ironLight'
  | 'foam'
  | 'foamLight'
  | 'band'

export type Part =
  | { kind: 'seg'; id: string; a: Vec2; b: Vec2; width: number; tone: Tone }
  | { kind: 'poly'; id: string; points: Vec2[]; width: number; tone: Tone; closed: boolean }
  | { kind: 'circle'; id: string; center: Vec2; r: number; tone: Tone }
  | { kind: 'path'; id: string; d: string; points: Vec2[]; tone: Tone | null; outline?: Tone; outlineWidth?: number }
