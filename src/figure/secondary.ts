import { clamp, dir, type Vec2 } from './math'
import type { Skeleton } from './types'

export interface Secondary {
  ponytail: number
  hair: number
  blink: number
  breath: number
}

export const STILL: Secondary = { ponytail: 0, hair: 0, blink: 0, breath: 0 }

export interface Spring {
  x: number
  v: number
}

export interface SpringTuning {
  stiffness: number
  damping: number
}

const MAX_SUBSTEP = 1 / 120

export function stepSpring(spring: Spring, force: number, dtSeconds: number, tuning: SpringTuning): Spring {
  let { x, v } = spring
  let remaining = Math.max(0, dtSeconds)
  while (remaining > 1e-9) {
    const h = Math.min(MAX_SUBSTEP, remaining)
    v += (force - tuning.stiffness * x - tuning.damping * v) * h
    x += v * h
    remaining -= h
  }
  return { x, v }
}

const BLINK_MS = 150

function hash(value: number): number {
  const s = Math.sin(value * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

export function blinkAmount(timeMs: number, seed = 0): number {
  if (timeMs < 0) {
    return 0
  }
  let start = 1200 + hash(seed) * 1500
  let index = 0
  while (start + BLINK_MS < timeMs) {
    index += 1
    start += 3000 + hash(seed + index * 7.31) * 2000
  }
  const phase = (timeMs - start) / BLINK_MS
  if (phase < 0 || phase > 1) {
    return 0
  }
  return Math.sin(phase * Math.PI)
}

const BREATH_MS = 4200

export function breathAmount(timeMs: number): number {
  return (1 - Math.cos((timeMs / BREATH_MS) * Math.PI * 2)) / 2
}

const PONYTAIL: SpringTuning = { stiffness: 190, damping: 7.5 }

const PONYTAIL_GAIN = 230

const PONYTAIL_LIMIT = 30

const HAIR: SpringTuning = { stiffness: 420, damping: 16 }

const HAIR_GAIN = 0.35

const HAIR_LIMIT = 0.008

const TAIL_LOCAL_ANGLE = 228

const SMOOTHING = 0.45

const MAX_GAP_MS = 250

export class SecondaryMotion {
  private head: Vec2 | null = null
  private velocity: Vec2 = [0, 0]
  private acceleration: Vec2 = [0, 0]
  private ponytail: Spring = { x: 0, v: 0 }
  private hair: Spring = { x: 0, v: 0 }
  private readonly seed: number

  constructor(seed = 0) {
    this.seed = seed
  }

  reset() {
    this.head = null
    this.velocity = [0, 0]
    this.acceleration = [0, 0]
    this.ponytail = { x: 0, v: 0 }
    this.hair = { x: 0, v: 0 }
  }

  step(skeleton: Skeleton, dtMs: number, clockMs: number): Secondary {
    const head = skeleton.points.head
    const dt = dtMs / 1000
    if (this.head === null || dtMs <= 0 || dtMs > MAX_GAP_MS) {
      this.head = head
      this.velocity = [0, 0]
      this.acceleration = [0, 0]
    } else {
      const velocity: Vec2 = [(head[0] - this.head[0]) / dt, (head[1] - this.head[1]) / dt]
      const raw: Vec2 = [(velocity[0] - this.velocity[0]) / dt, (velocity[1] - this.velocity[1]) / dt]
      this.acceleration = [
        this.acceleration[0] + (raw[0] - this.acceleration[0]) * SMOOTHING,
        this.acceleration[1] + (raw[1] - this.acceleration[1]) * SMOOTHING,
      ]
      this.velocity = velocity
      this.head = head
    }
    const lever = dir(skeleton.phi.head - 90 + TAIL_LOCAL_ANGLE)
    const torque = lever[0] * -this.acceleration[1] - lever[1] * -this.acceleration[0]
    const up = dir(skeleton.phi.head)
    const lift = -(this.acceleration[0] * up[0] + this.acceleration[1] * up[1])
    if (dt > 0 && dtMs <= MAX_GAP_MS) {
      this.ponytail = stepSpring(this.ponytail, clamp(torque, -60, 60) * PONYTAIL_GAIN, dt, PONYTAIL)
      this.hair = stepSpring(this.hair, clamp(lift, -60, 60) * HAIR_GAIN, dt, HAIR)
    }
    return {
      ponytail: clamp(this.ponytail.x, -PONYTAIL_LIMIT, PONYTAIL_LIMIT),
      hair: clamp(this.hair.x, -HAIR_LIMIT, HAIR_LIMIT),
      blink: blinkAmount(clockMs, this.seed),
      breath: breathAmount(clockMs),
    }
  }
}
