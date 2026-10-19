import type { LimbShape } from './shapes'

export type TrainerId = 'female' | 'male' | 'sofia' | 'zara' | 'marcus' | 'kai' | 'nina'

export type SkinTone = 'light' | 'medium' | 'deep'

export type VoiceGender = 'female' | 'male'

export type HairStyle = 'ponytail' | 'short' | 'wavy' | 'puff' | 'fade' | 'bun' | 'bob'

export type TopStyle = 'crop' | 'bra' | 'tank' | 'tee'

export interface Look {
  trainer: TrainerId
  skin: SkinTone
}

export const DEFAULT_LOOK: Look = { trainer: 'female', skin: 'medium' }

type Station = readonly [number, number, number]

export interface BottomStyle {
  kind: 'leggings' | 'shorts' | 'joggers'
  length: number
  stripe: boolean
}

export interface TrainerBuild {
  id: TrainerId
  name: string
  gender: VoiceGender
  tagline: string
  skin: SkinTone
  upperArm: LimbShape
  forearm: LimbShape
  hand: LimbShape
  thigh: LimbShape
  shin: LimbShape
  neck: number
  head: { rx: number; ry: number; jaw: number }
  torsoSide: readonly Station[]
  torsoFront: readonly (readonly [number, number])[]
  beltT: number
  topFrom: number
  topTo: number
  top: TopStyle
  strap: number
  sleeve: number | null
  bottom: BottomStyle
  hair: HairStyle
  beard: 'full' | 'stubble' | null
}

const WOMAN_SIDE: readonly Station[] = [
  [-0.2, 0.03, 0.06],
  [-0.1, 0.074, 0.118],
  [0.02, 0.084, 0.116],
  [0.18, 0.074, 0.088],
  [0.4, 0.064, 0.072],
  [0.56, 0.07, 0.08],
  [0.7, 0.098, 0.088],
  [0.82, 0.1, 0.094],
  [0.94, 0.076, 0.088],
  [1.03, 0.04, 0.054],
]

const WOMAN_FRONT: readonly (readonly [number, number])[] = [
  [-0.13, 0.035],
  [-0.06, 0.146],
  [0.08, 0.162],
  [0.24, 0.142],
  [0.42, 0.116],
  [0.6, 0.126],
  [0.76, 0.15],
  [0.9, 0.172],
  [0.98, 0.158],
  [1.04, 0.07],
]

const MAN_SIDE: readonly Station[] = [
  [-0.2, 0.03, 0.055],
  [-0.1, 0.07, 0.104],
  [0.02, 0.082, 0.104],
  [0.18, 0.082, 0.09],
  [0.4, 0.078, 0.082],
  [0.56, 0.09, 0.09],
  [0.7, 0.12, 0.102],
  [0.82, 0.124, 0.106],
  [0.94, 0.09, 0.096],
  [1.03, 0.046, 0.06],
]

const MAN_FRONT: readonly (readonly [number, number])[] = [
  [-0.13, 0.035],
  [-0.06, 0.14],
  [0.08, 0.148],
  [0.24, 0.14],
  [0.42, 0.136],
  [0.6, 0.158],
  [0.76, 0.192],
  [0.9, 0.222],
  [0.98, 0.196],
  [1.04, 0.082],
]

function widen(stations: readonly Station[], ahead: number, behind: number, from = 0.5): Station[] {
  return stations.map(([t, a, b]) => (t >= from ? [t, a * ahead, b * behind] : [t, a, b]))
}

function broaden(stations: readonly (readonly [number, number])[], factor: number, from = 0.5): [number, number][] {
  return stations.map(([t, w]) => [t, t >= from && t < 1.04 ? w * factor : w])
}

export const TRAINERS: Record<TrainerId, TrainerBuild> = {
  female: {
    id: 'female',
    name: 'Maya',
    gender: 'female',
    tagline: 'Upbeat and encouraging',
    skin: 'medium',
    upperArm: { r0: 0.05, r1: 0.034, left: [0.38, 0.045], right: [0.33, 0.047] },
    forearm: { r0: 0.038, r1: 0.025, left: [0.22, 0.04], right: [0.25, 0.039] },
    hand: { r0: 0.026, r1: 0.022 },
    thigh: { r0: 0.08, r1: 0.05, left: [0.3, 0.08], right: [0.26, 0.08] },
    shin: { r0: 0.049, r1: 0.028, left: [0.25, 0.046], right: [0.28, 0.058] },
    neck: 0.03,
    head: { rx: 0.09, ry: 0.108, jaw: 0.6 },
    torsoSide: WOMAN_SIDE,
    torsoFront: WOMAN_FRONT,
    beltT: 0.46,
    topFrom: 0.64,
    topTo: 1.04,
    top: 'crop',
    strap: 0.036,
    sleeve: null,
    bottom: { kind: 'leggings', length: 1, stripe: true },
    hair: 'ponytail',
    beard: null,
  },
  male: {
    id: 'male',
    name: 'Leo',
    gender: 'male',
    tagline: 'Calm and focused',
    skin: 'light',
    upperArm: { r0: 0.064, r1: 0.043, left: [0.4, 0.062], right: [0.34, 0.064] },
    forearm: { r0: 0.049, r1: 0.031, left: [0.22, 0.052], right: [0.25, 0.05] },
    hand: { r0: 0.031, r1: 0.027 },
    thigh: { r0: 0.09, r1: 0.058, left: [0.32, 0.094], right: [0.28, 0.09] },
    shin: { r0: 0.057, r1: 0.033, left: [0.25, 0.052], right: [0.28, 0.07] },
    neck: 0.041,
    head: { rx: 0.094, ry: 0.11, jaw: 0.74 },
    torsoSide: MAN_SIDE,
    torsoFront: MAN_FRONT,
    beltT: 0.36,
    topFrom: 0.3,
    topTo: 1.05,
    top: 'tee',
    strap: 0,
    sleeve: 0.42,
    bottom: { kind: 'shorts', length: 0.58, stripe: true },
    hair: 'short',
    beard: null,
  },
  sofia: {
    id: 'sofia',
    name: 'Sofia',
    gender: 'female',
    tagline: 'Warm and motivating',
    skin: 'medium',
    upperArm: { r0: 0.049, r1: 0.033, left: [0.38, 0.044], right: [0.33, 0.046] },
    forearm: { r0: 0.037, r1: 0.024, left: [0.22, 0.039], right: [0.25, 0.038] },
    hand: { r0: 0.025, r1: 0.021 },
    thigh: { r0: 0.084, r1: 0.05, left: [0.3, 0.082], right: [0.24, 0.084] },
    shin: { r0: 0.049, r1: 0.027, left: [0.25, 0.046], right: [0.28, 0.058] },
    neck: 0.029,
    head: { rx: 0.088, ry: 0.107, jaw: 0.58 },
    torsoSide: widen(WOMAN_SIDE, 1.02, 1, 0.6).map(([t, a, b]) => (t > -0.15 && t < 0.1 ? [t, a, b * 1.06] : [t, a, b])),
    torsoFront: WOMAN_FRONT.map(([t, w]) => [t, t < 0.2 && t > -0.1 ? w * 1.04 : t > 0.3 && t < 0.5 ? w * 0.97 : w]),
    beltT: 0.5,
    topFrom: 0.74,
    topTo: 1.0,
    top: 'bra',
    strap: 0.026,
    sleeve: null,
    bottom: { kind: 'leggings', length: 1, stripe: false },
    hair: 'wavy',
    beard: null,
  },
  zara: {
    id: 'zara',
    name: 'Zara',
    gender: 'female',
    tagline: 'Bold and high-energy',
    skin: 'deep',
    upperArm: { r0: 0.053, r1: 0.036, left: [0.38, 0.049], right: [0.33, 0.05] },
    forearm: { r0: 0.04, r1: 0.026, left: [0.22, 0.042], right: [0.25, 0.041] },
    hand: { r0: 0.027, r1: 0.023 },
    thigh: { r0: 0.086, r1: 0.054, left: [0.3, 0.088], right: [0.26, 0.086] },
    shin: { r0: 0.052, r1: 0.029, left: [0.25, 0.049], right: [0.28, 0.062] },
    neck: 0.031,
    head: { rx: 0.09, ry: 0.108, jaw: 0.62 },
    torsoSide: WOMAN_SIDE.map(([t, a, b]) => (t > -0.15 && t < 0.1 ? [t, a, b * 1.05] : [t, a, b])),
    torsoFront: broaden(WOMAN_FRONT, 1.03, 0.7),
    beltT: 0.42,
    topFrom: 0.6,
    topTo: 1.04,
    top: 'crop',
    strap: 0.05,
    sleeve: null,
    bottom: { kind: 'shorts', length: 0.74, stripe: true },
    hair: 'puff',
    beard: null,
  },
  marcus: {
    id: 'marcus',
    name: 'Marcus',
    gender: 'male',
    tagline: 'Powerful and driven',
    skin: 'deep',
    upperArm: { r0: 0.074, r1: 0.048, left: [0.4, 0.074], right: [0.32, 0.072] },
    forearm: { r0: 0.056, r1: 0.034, left: [0.22, 0.06], right: [0.25, 0.057] },
    hand: { r0: 0.033, r1: 0.029 },
    thigh: { r0: 0.098, r1: 0.062, left: [0.32, 0.104], right: [0.28, 0.098] },
    shin: { r0: 0.061, r1: 0.035, left: [0.25, 0.056], right: [0.28, 0.077] },
    neck: 0.048,
    head: { rx: 0.094, ry: 0.11, jaw: 0.8 },
    torsoSide: widen(MAN_SIDE, 1.1, 1.06, 0.6),
    torsoFront: broaden(MAN_FRONT, 1.1, 0.7),
    beltT: 0.36,
    topFrom: 0.3,
    topTo: 1.04,
    top: 'tank',
    strap: 0.07,
    sleeve: null,
    bottom: { kind: 'shorts', length: 0.52, stripe: true },
    hair: 'fade',
    beard: 'full',
  },
  kai: {
    id: 'kai',
    name: 'Kai',
    gender: 'male',
    tagline: 'Easygoing and mindful',
    skin: 'medium',
    upperArm: { r0: 0.06, r1: 0.04, left: [0.4, 0.057], right: [0.34, 0.059] },
    forearm: { r0: 0.046, r1: 0.029, left: [0.22, 0.049], right: [0.25, 0.047] },
    hand: { r0: 0.03, r1: 0.026 },
    thigh: { r0: 0.086, r1: 0.055, left: [0.32, 0.088], right: [0.28, 0.085] },
    shin: { r0: 0.054, r1: 0.031, left: [0.25, 0.05], right: [0.28, 0.066] },
    neck: 0.038,
    head: { rx: 0.092, ry: 0.11, jaw: 0.7 },
    torsoSide: widen(MAN_SIDE, 0.97, 0.97, 0.3),
    torsoFront: broaden(MAN_FRONT, 0.96, 0.3),
    beltT: 0.36,
    topFrom: 0.3,
    topTo: 1.05,
    top: 'tee',
    strap: 0,
    sleeve: 0.36,
    bottom: { kind: 'joggers', length: 1, stripe: true },
    hair: 'bun',
    beard: 'stubble',
  },
  nina: {
    id: 'nina',
    name: 'Nina',
    gender: 'female',
    tagline: 'Precise and playful',
    skin: 'light',
    upperArm: { r0: 0.046, r1: 0.032, left: [0.38, 0.042], right: [0.33, 0.044] },
    forearm: { r0: 0.036, r1: 0.024, left: [0.22, 0.038], right: [0.25, 0.037] },
    hand: { r0: 0.025, r1: 0.021 },
    thigh: { r0: 0.076, r1: 0.048, left: [0.3, 0.076], right: [0.26, 0.076] },
    shin: { r0: 0.047, r1: 0.027, left: [0.25, 0.044], right: [0.28, 0.055] },
    neck: 0.029,
    head: { rx: 0.088, ry: 0.106, jaw: 0.6 },
    torsoSide: WOMAN_SIDE.map(([t, a, b]): Station => [t, a * 0.97, b * 0.97]),
    torsoFront: WOMAN_FRONT.map(([t, w]): [number, number] => [t, t < 1.04 ? w * 0.97 : w]),
    beltT: 0.46,
    topFrom: 0.58,
    topTo: 1.05,
    top: 'tee',
    strap: 0,
    sleeve: 0.34,
    bottom: { kind: 'leggings', length: 0.66, stripe: true },
    hair: 'bob',
    beard: null,
  },
}

export const TRAINER_ORDER: readonly TrainerId[] = ['female', 'sofia', 'zara', 'nina', 'male', 'marcus', 'kai']

export function isTrainerId(value: unknown): value is TrainerId {
  return typeof value === 'string' && (TRAINER_ORDER as readonly string[]).includes(value)
}
