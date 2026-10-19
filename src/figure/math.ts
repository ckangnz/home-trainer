export type Vec2 = readonly [number, number]

export const DEG = Math.PI / 180

export function dir(deg: number): Vec2 {
  const rad = deg * DEG
  return [Math.cos(rad), Math.sin(rad)]
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return [a[0] + b[0], a[1] + b[1]]
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return [a[0] - b[0], a[1] - b[1]]
}

export function scale(a: Vec2, k: number): Vec2 {
  return [a[0] * k, a[1] * k]
}

export function along(origin: Vec2, deg: number, length: number): Vec2 {
  const d = dir(deg)
  return [origin[0] + d[0] * length, origin[1] + d[1] * length]
}

export function length(v: Vec2): number {
  return Math.hypot(v[0], v[1])
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

export function angleOf(v: Vec2): number {
  return Math.atan2(v[1], v[0]) / DEG
}

export function wrap180(deg: number): number {
  const wrapped = ((((deg + 180) % 360) + 360) % 360) - 180
  return wrapped === -180 ? 180 : wrapped
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lerpAngle(a: number, b: number, t: number): number {
  return a + wrap180(b - a) * t
}

export function lerpVec(a: Vec2, b: Vec2, t: number): Vec2 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
}

export type Easing = 'linear' | 'in' | 'out' | 'inOut' | 'natural' | 'back' | 'spring' | 'anticipate'

function cubicBezier(x1: number, y1: number, x2: number, y2: number, x: number): number {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  let t = x
  for (let index = 0; index < 6; index += 1) {
    const current = ((ax * t + bx) * t + cx) * t - x
    const slope = (3 * ax * t + 2 * bx) * t + cx
    if (Math.abs(current) < 1e-6 || Math.abs(slope) < 1e-6) {
      break
    }
    t = clamp(t - current / slope, 0, 1)
  }
  return ((ay * t + by) * t + cy) * t
}

export function ease(kind: Easing, t: number): number {
  const x = clamp(t, 0, 1)
  switch (kind) {
    case 'linear':
      return x
    case 'in':
      return 1 - Math.cos((x * Math.PI) / 2)
    case 'out':
      return Math.sin((x * Math.PI) / 2)
    case 'inOut':
      return (1 - Math.cos(Math.PI * x)) / 2
    case 'natural':
      return cubicBezier(0.42, 0, 0.22, 1, x)
    case 'back': {
      const u = x - 1
      return 1 + 2.2 * u * u * u + 1.2 * u * u
    }
    case 'spring':
      return 1 - Math.exp(-6 * x) * Math.cos(x * Math.PI * 2.6) * (1 - x)
    case 'anticipate':
      return x * x * (2.2 * x - 1.2)
  }
}

export function overshoots(kind: Easing): boolean {
  return kind === 'back' || kind === 'spring' || kind === 'anticipate'
}
