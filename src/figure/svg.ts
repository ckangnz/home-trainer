import { along } from './math'
import type { Part, Tone } from './types'
import type { Shadow } from './parts'
import type { ViewBox } from './framing'

export type Palette = Record<Tone | 'floor' | 'shadow' | 'stage', string>

export const DEFAULT_PALETTE: Palette = {
  skin: '#3d4a66',
  skinFar: '#97a3bb',
  shirt: '#f97316',
  shorts: '#1e293b',
  shortsFar: '#7d899f',
  shoe: '#111827',
  shoeFar: '#8b96ab',
  hair: '#141b2d',
  prop: '#9aa8bd',
  propSoft: '#dde5ef',
  floor: '#cbd5e1',
  shadow: '#0f172a',
  stage: '#f8fafc',
}

function fixed(value: number): string {
  return Number(value.toFixed(4)).toString()
}

export function polyPoints(points: readonly (readonly [number, number])[]): string {
  return points.map((point) => `${fixed(point[0])},${fixed(point[1])}`).join(' ')
}

export function capPath(part: Extract<Part, { kind: 'cap' }>): string {
  const start = along(part.center, part.from, part.r)
  const end = along(part.center, part.to, part.r)
  const sweep = part.to - part.from
  const large = Math.abs(sweep) > 180 ? 1 : 0
  return `M${fixed(start[0])} ${fixed(start[1])}A${fixed(part.r)} ${fixed(part.r)} 0 ${large} 1 ${fixed(end[0])} ${fixed(end[1])}Z`
}

export function partToSvg(part: Part, palette: Palette): string {
  const color = palette[part.tone]
  switch (part.kind) {
    case 'seg':
      return `<line x1="${fixed(part.a[0])}" y1="${fixed(part.a[1])}" x2="${fixed(part.b[0])}" y2="${fixed(part.b[1])}" stroke="${color}" stroke-width="${fixed(part.width)}" stroke-linecap="round"/>`
    case 'poly':
      return part.closed
        ? `<polygon points="${polyPoints(part.points)}" fill="${color}" stroke="${color}" stroke-width="${fixed(part.width)}" stroke-linejoin="round"/>`
        : `<polyline points="${polyPoints(part.points)}" fill="none" stroke="${color}" stroke-width="${fixed(part.width)}" stroke-linejoin="round" stroke-linecap="round"/>`
    case 'circle':
      return `<circle cx="${fixed(part.center[0])}" cy="${fixed(part.center[1])}" r="${fixed(part.r)}" fill="${color}"/>`
    case 'cap':
      return `<path d="${capPath(part)}" fill="${color}"/>`
  }
}

export function sceneTransform(viewBox: ViewBox, mirrored: boolean): string {
  return mirrored ? `translate(${fixed(viewBox.centerX * 2)},0) scale(-1,-1)` : 'scale(1,-1)'
}

export interface SceneSvgInput {
  viewBox: ViewBox
  parts: Part[]
  back: Part[]
  under: Part[]
  shadow: Shadow
  mirrored?: boolean
  palette?: Palette
  pixelWidth?: number
}

export function sceneToSvg(input: SceneSvgInput): string {
  const palette = input.palette ?? DEFAULT_PALETTE
  const { viewBox } = input
  const width = input.pixelWidth ?? 320
  const height = Math.round((width * viewBox.height) / viewBox.width)
  const floor = `<line x1="${fixed(viewBox.x - 1)}" y1="0" x2="${fixed(viewBox.x + viewBox.width + 1)}" y2="0" stroke="${palette.floor}" stroke-width="0.012"/>`
  const shadow = `<ellipse cx="${fixed(input.shadow.cx)}" cy="0.004" rx="${fixed(input.shadow.rx)}" ry="0.035" fill="${palette.shadow}" opacity="${fixed(input.shadow.opacity * 0.4)}"/>`
  const stage = `<rect x="${fixed(viewBox.x - 1)}" y="${fixed(-(viewBox.y + viewBox.height) - 1)}" width="${fixed(viewBox.width + 2)}" height="${fixed(viewBox.height + 2)}" fill="${palette.stage}"/>`
  const body = [
    stage,
    ...input.back.map((part) => partToSvg(part, palette)),
    floor,
    ...input.under.map((part) => partToSvg(part, palette)),
    shadow,
    ...input.parts.map((part) => partToSvg(part, palette)),
  ].join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${fixed(viewBox.x)} ${fixed(viewBox.y)} ${fixed(viewBox.width)} ${fixed(viewBox.height)}"><g transform="${sceneTransform(viewBox, input.mirrored ?? false)}">${body}</g></svg>`
}
