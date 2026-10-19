import type { Look, SkinTone, TrainerId } from './look'
import type { Part, Tone } from './types'
import type { Shadow } from './parts'
import type { ViewBox } from './framing'

export type Palette = Record<Tone | 'floor' | 'shadow' | 'stage', string>

type EquipmentTone = 'prop' | 'propSoft' | 'iron' | 'ironLight' | 'foam' | 'foamLight' | 'band'

const EQUIPMENT: Pick<Palette, EquipmentTone> = {
  prop: '#9aa8bd',
  propSoft: '#dde5ef',
  iron: '#3a4354',
  ironLight: '#7d8899',
  foam: '#2a9d8f',
  foamLight: '#8fd5c9',
  band: '#e0457b',
}

const SKIN: Record<SkinTone, Pick<Palette, 'skin' | 'skinFar' | 'skinShade'>> = {
  light: { skin: '#f2c6a3', skinFar: '#dcab85', skinShade: '#c48b62' },
  medium: { skin: '#cf9466', skinFar: '#b77c4f', skinShade: '#9c6540' },
  deep: { skin: '#8a5638', skinFar: '#74462c', skinShade: '#5c3620' },
}

const OUTFIT: Record<TrainerId, Omit<Palette, 'skin' | 'skinFar' | 'skinShade' | EquipmentTone | 'floor' | 'shadow' | 'stage'>> = {
  female: {
    top: '#ff6a2b',
    topFar: '#d9531c',
    bottom: '#22305a',
    bottomFar: '#182340',
    shoe: '#f8fafc',
    shoeFar: '#d5dce6',
    sole: '#ff6a2b',
    hair: '#3a2315',
    hairShade: '#24150b',
    eye: '#1f1a17',
    accent: '#ff6a2b',
  },
  male: {
    top: '#ff6a2b',
    topFar: '#d9531c',
    bottom: '#1f2a44',
    bottomFar: '#161e33',
    shoe: '#f8fafc',
    shoeFar: '#d5dce6',
    sole: '#22305a',
    hair: '#1c1410',
    hairShade: '#0f0a07',
    eye: '#1f1a17',
    accent: '#ff6a2b',
  },
}

export function paletteFor(look: Look): Palette {
  return {
    ...SKIN[look.skin],
    ...OUTFIT[look.trainer],
    ...EQUIPMENT,
    floor: '#cbd5e1',
    shadow: '#0f172a',
    stage: '#f8fafc',
  }
}

export const DEFAULT_PALETTE: Palette = paletteFor({ trainer: 'female', skin: 'medium' })

function fixed(value: number): string {
  return Number(value.toFixed(4)).toString()
}

export function polyPoints(points: readonly (readonly [number, number])[]): string {
  return points.map((point) => `${fixed(point[0])},${fixed(point[1])}`).join(' ')
}

export function partToSvg(part: Part, palette: Palette): string {
  switch (part.kind) {
    case 'seg':
      return `<line x1="${fixed(part.a[0])}" y1="${fixed(part.a[1])}" x2="${fixed(part.b[0])}" y2="${fixed(part.b[1])}" stroke="${palette[part.tone]}" stroke-width="${fixed(part.width)}" stroke-linecap="round"/>`
    case 'poly': {
      const color = palette[part.tone]
      return part.closed
        ? `<polygon points="${polyPoints(part.points)}" fill="${color}" stroke="${color}" stroke-width="${fixed(part.width)}" stroke-linejoin="round"/>`
        : `<polyline points="${polyPoints(part.points)}" fill="none" stroke="${color}" stroke-width="${fixed(part.width)}" stroke-linejoin="round" stroke-linecap="round"/>`
    }
    case 'circle':
      return `<circle cx="${fixed(part.center[0])}" cy="${fixed(part.center[1])}" r="${fixed(part.r)}" fill="${palette[part.tone]}"/>`
    case 'path': {
      const fill = part.tone ? palette[part.tone] : 'none'
      const stroke = part.outline ? ` stroke="${palette[part.outline]}" stroke-width="${fixed(part.outlineWidth ?? 0.006)}" stroke-linejoin="round" stroke-linecap="round"` : ''
      return `<path d="${part.d}" fill="${fill}"${stroke}/>`
    }
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
