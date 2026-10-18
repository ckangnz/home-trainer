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

export type Easing = 'linear' | 'in' | 'out' | 'inOut'

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
  }
}
