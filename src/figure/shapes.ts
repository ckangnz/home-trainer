import { add, dir, length, scale, sub, type Vec2 } from './math'

export interface Outline {
  d: string
  points: Vec2[]
}

export interface LimbShape {
  r0: number
  r1: number
  left?: readonly [number, number]
  right?: readonly [number, number]
}

function n4(value: number): string {
  return Number(value.toFixed(4)).toString()
}

function pt(point: Vec2): string {
  return `${n4(point[0])} ${n4(point[1])}`
}

export function smoothClosed(points: Vec2[]): string {
  const count = points.length
  if (count < 3) {
    return ''
  }
  let d = `M${pt(points[0])}`
  for (let index = 0; index < count; index += 1) {
    const p0 = points[(index - 1 + count) % count]
    const p1 = points[index]
    const p2 = points[(index + 1) % count]
    const p3 = points[(index + 2) % count]
    const c1: Vec2 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Vec2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`
  }
  return `${d}Z`
}

export function smoothOpen(points: Vec2[]): string {
  const count = points.length
  if (count < 2) {
    return ''
  }
  let d = `M${pt(points[0])}`
  for (let index = 0; index < count - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)]
    const p1 = points[index]
    const p2 = points[index + 1]
    const p3 = points[Math.min(count - 1, index + 2)]
    const c1: Vec2 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Vec2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`
  }
  return d
}

export function limbOutline(a: Vec2, b: Vec2, shape: LimbShape, upTo = 1, hem = false): Outline {
  const span = sub(b, a)
  const full = length(span) || 1e-6
  const u = scale(span, 1 / full)
  const n: Vec2 = [-u[1], u[0]]
  const end = add(a, scale(u, full * upTo))
  const r1 = shape.r0 + (shape.r1 - shape.r0) * upTo
  const at = (fraction: number, offset: number): Vec2 => add(add(a, scale(u, full * fraction)), scale(n, offset))
  const left = shape.left
  const right = shape.right
  const points: Vec2[] = []
  points.push(at(0, shape.r0))
  if (left && left[0] < upTo) {
    points.push(at(left[0] * 0.55, (shape.r0 + left[1]) / 2 + (left[1] - shape.r0) * 0.25))
    points.push(at(left[0], left[1]))
    points.push(at(left[0] + (upTo - left[0]) * 0.55, (left[1] + r1) / 2))
  } else {
    points.push(at(upTo * 0.5, (shape.r0 + r1) / 2))
  }
  points.push(add(end, scale(n, r1)))
  if (hem) {
    points.push(add(add(end, scale(n, r1 * 0.5)), scale(u, r1 * 0.12)))
    points.push(add(add(end, scale(n, -r1 * 0.5)), scale(u, r1 * 0.12)))
  } else {
    points.push(add(add(end, scale(n, r1 * 0.72)), scale(u, r1 * 0.7)))
    points.push(add(end, scale(u, r1)))
    points.push(add(add(end, scale(n, -r1 * 0.72)), scale(u, r1 * 0.7)))
  }
  points.push(add(end, scale(n, -r1)))
  if (right && right[0] < upTo) {
    points.push(at(right[0] + (upTo - right[0]) * 0.55, -(right[1] + r1) / 2))
    points.push(at(right[0], -right[1]))
    points.push(at(right[0] * 0.55, -((shape.r0 + right[1]) / 2 + (right[1] - shape.r0) * 0.25)))
  } else {
    points.push(at(upTo * 0.5, -(shape.r0 + r1) / 2))
  }
  points.push(at(0, -shape.r0))
  points.push(add(add(a, scale(n, -shape.r0 * 0.72)), scale(u, -shape.r0 * 0.7)))
  points.push(add(a, scale(u, -shape.r0)))
  points.push(add(add(a, scale(n, shape.r0 * 0.72)), scale(u, -shape.r0 * 0.7)))
  return { d: smoothClosed(points), points }
}

export function localToWorld(center: Vec2, rotationDeg: number, local: Vec2): Vec2 {
  const x = dir(rotationDeg)
  const y = dir(rotationDeg + 90)
  return [center[0] + x[0] * local[0] + y[0] * local[1], center[1] + x[1] * local[0] + y[1] * local[1]]
}

export function ellipseOutline(center: Vec2, rx: number, ry: number, rotationDeg: number, steps = 12): Outline {
  const points: Vec2[] = []
  for (let index = 0; index < steps; index += 1) {
    const angle = (Math.PI * 2 * index) / steps
    points.push(localToWorld(center, rotationDeg, [Math.cos(angle) * rx, Math.sin(angle) * ry]))
  }
  return { d: smoothClosed(points), points }
}

export function localShape(center: Vec2, rotationDeg: number, local: readonly Vec2[], mirrorX = false): Outline {
  const points = local.map((point) => localToWorld(center, rotationDeg, mirrorX ? [-point[0], point[1]] : point))
  return { d: smoothClosed(points), points }
}

export function localStroke(center: Vec2, rotationDeg: number, local: readonly Vec2[]): Outline {
  const points = local.map((point) => localToWorld(center, rotationDeg, point))
  return { d: smoothOpen(points), points }
}
