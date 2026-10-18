import type { LimbShape } from './shapes'

export type TrainerId = 'female' | 'male'

export type SkinTone = 'light' | 'medium' | 'deep'

export interface Look {
  trainer: TrainerId
  skin: SkinTone
}

export const DEFAULT_LOOK: Look = { trainer: 'female', skin: 'medium' }

type Station = readonly [number, number, number]

export interface TrainerBuild {
  id: TrainerId
  name: string
  upperArm: LimbShape
  forearm: LimbShape
  hand: LimbShape
  thigh: LimbShape
  shin: LimbShape
  neck: number
  head: { rx: number; ry: number }
  torsoSide: readonly Station[]
  torsoFront: readonly (readonly [number, number])[]
  beltT: number
  topFrom: number
  topTo: number
  shorts: number | null
  sleeve: number | null
  hair: 'ponytail' | 'short'
}

export const TRAINERS: Record<TrainerId, TrainerBuild> = {
  female: {
    id: 'female',
    name: 'Maya',
    upperArm: { r0: 0.048, r1: 0.034, left: [0.42, 0.043], right: [0.35, 0.045] },
    forearm: { r0: 0.037, r1: 0.025, left: [0.22, 0.039], right: [0.25, 0.038] },
    hand: { r0: 0.026, r1: 0.022 },
    thigh: { r0: 0.077, r1: 0.05, left: [0.32, 0.078], right: [0.28, 0.076] },
    shin: { r0: 0.049, r1: 0.029, left: [0.25, 0.046], right: [0.3, 0.056] },
    neck: 0.03,
    head: { rx: 0.092, ry: 0.11 },
    torsoSide: [
      [-0.2, 0.03, 0.06],
      [-0.1, 0.07, 0.112],
      [0.02, 0.082, 0.112],
      [0.18, 0.075, 0.09],
      [0.4, 0.066, 0.075],
      [0.56, 0.072, 0.08],
      [0.7, 0.094, 0.088],
      [0.82, 0.098, 0.092],
      [0.94, 0.074, 0.084],
      [1.03, 0.038, 0.052],
    ],
    torsoFront: [
      [-0.13, 0.035],
      [-0.06, 0.15],
      [0.08, 0.165],
      [0.24, 0.148],
      [0.42, 0.12],
      [0.6, 0.128],
      [0.76, 0.148],
      [0.9, 0.168],
      [0.98, 0.15],
      [1.04, 0.07],
    ],
    beltT: 0.42,
    topFrom: 0.64,
    topTo: 1.04,
    shorts: null,
    sleeve: null,
    hair: 'ponytail',
  },
  male: {
    id: 'male',
    name: 'Leo',
    upperArm: { r0: 0.062, r1: 0.043, left: [0.42, 0.06], right: [0.35, 0.062] },
    forearm: { r0: 0.048, r1: 0.031, left: [0.22, 0.051], right: [0.25, 0.049] },
    hand: { r0: 0.031, r1: 0.027 },
    thigh: { r0: 0.089, r1: 0.058, left: [0.32, 0.093], right: [0.28, 0.088] },
    shin: { r0: 0.057, r1: 0.034, left: [0.25, 0.052], right: [0.3, 0.069] },
    neck: 0.04,
    head: { rx: 0.096, ry: 0.112 },
    torsoSide: [
      [-0.2, 0.03, 0.055],
      [-0.1, 0.068, 0.1],
      [0.02, 0.082, 0.102],
      [0.18, 0.084, 0.092],
      [0.4, 0.08, 0.084],
      [0.56, 0.088, 0.09],
      [0.7, 0.116, 0.1],
      [0.82, 0.12, 0.103],
      [0.94, 0.086, 0.092],
      [1.03, 0.045, 0.058],
    ],
    torsoFront: [
      [-0.13, 0.035],
      [-0.06, 0.14],
      [0.08, 0.15],
      [0.24, 0.145],
      [0.42, 0.142],
      [0.6, 0.158],
      [0.76, 0.188],
      [0.9, 0.215],
      [0.98, 0.188],
      [1.04, 0.08],
    ],
    beltT: 0.36,
    topFrom: 0.3,
    topTo: 1.05,
    shorts: 0.6,
    sleeve: 0.42,
    hair: 'short',
  },
}
