import { sampleSkeleton, type PreparedAnimation } from './animate'
import { partExtent, propParts, skeletonParts } from './parts'

export interface Bounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface ViewBox {
  x: number
  y: number
  width: number
  height: number
  centerX: number
}

const boundsCache = new WeakMap<PreparedAnimation, Bounds>()

export function animationBounds(prepared: PreparedAnimation, samples = 36): Bounds {
  const cached = boundsCache.get(prepared)
  if (cached) {
    return cached
  }
  const bounds: Bounds = { minX: Infinity, maxX: -Infinity, minY: 0, maxY: -Infinity }
  const include = (x: number, y: number) => {
    bounds.minX = Math.min(bounds.minX, x)
    bounds.maxX = Math.max(bounds.maxX, x)
    bounds.minY = Math.min(bounds.minY, y)
    bounds.maxY = Math.max(bounds.maxY, y)
  }
  const count = prepared.cycleMs > 0 ? samples : 1
  for (let index = 0; index < count; index += 1) {
    const skeleton = sampleSkeleton(prepared, (prepared.cycleMs * index) / count)
    for (const part of skeletonParts(skeleton)) {
      for (const point of partExtent(part)) {
        include(point[0], point[1])
      }
    }
  }
  const props = propParts(prepared.props)
  for (const part of [...props.back, ...props.under]) {
    if (part.kind === 'poly' && part.id.startsWith('wall')) {
      const xs = part.points.map((point) => point[0])
      include(Math.min(...xs), 0)
      include(Math.max(...xs), 0)
      continue
    }
    for (const point of partExtent(part)) {
      include(point[0], point[1])
    }
  }
  boundsCache.set(prepared, bounds)
  return bounds
}

export function viewBoxFor(bounds: Bounds, aspect?: number, padding = 0.14): ViewBox {
  let minX = bounds.minX - padding
  let maxX = bounds.maxX + padding
  const minY = Math.min(bounds.minY, 0) - 0.08
  let maxY = bounds.maxY + padding
  if (aspect !== undefined && aspect > 0) {
    const width = maxX - minX
    const height = maxY - minY
    if (width / height < aspect) {
      const extra = (height * aspect - width) / 2
      minX -= extra
      maxX += extra
    } else {
      maxY = minY + width / aspect
    }
  }
  return {
    x: minX,
    y: -maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
  }
}
