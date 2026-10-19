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

const SKIN: Record<SkinTone, Pick<Palette, 'skin' | 'skinFar' | 'skinShade' | 'skinLight' | 'lip'>> = {
  light: { skin: '#f3c7a5', skinFar: '#ddab86', skinShade: '#c48b62', skinLight: '#fbdcc2', lip: '#c86f68' },
  medium: { skin: '#cf9466', skinFar: '#b77c4f', skinShade: '#9c6540', skinLight: '#e2ab7f', lip: '#a0544a' },
  deep: { skin: '#8a5638', skinFar: '#73462c', skinShade: '#5c3620', skinLight: '#a46a47', lip: '#64332a' },
}

type OutfitTone = 'top' | 'topFar' | 'bottom' | 'bottomFar' | 'trim' | 'shoe' | 'shoeFar' | 'sole' | 'shoeAccent' | 'hair' | 'hairShade' | 'hairLight' | 'eye' | 'accent'

const OUTFIT: Record<TrainerId, Pick<Palette, OutfitTone>> = {
  female: {
    top: '#ff6a2b',
    topFar: '#d9531c',
    bottom: '#22305a',
    bottomFar: '#182340',
    trim: '#ff8a52',
    shoe: '#f8fafc',
    shoeFar: '#d5dce6',
    sole: '#ff6a2b',
    shoeAccent: '#ff6a2b',
    hair: '#3a2315',
    hairShade: '#24150b',
    hairLight: '#6b4428',
    eye: '#1f1a17',
    accent: '#ff6a2b',
  },
  male: {
    top: '#ff6a2b',
    topFar: '#d9531c',
    bottom: '#1f2a44',
    bottomFar: '#161e33',
    trim: '#ff8a52',
    shoe: '#f8fafc',
    shoeFar: '#d5dce6',
    sole: '#22305a',
    shoeAccent: '#22305a',
    hair: '#4a2e1c',
    hairShade: '#2e1c10',
    hairLight: '#7a5234',
    eye: '#1f1a17',
    accent: '#ff6a2b',
  },
  sofia: {
    top: '#e2367a',
    topFar: '#b8245f',
    bottom: '#2a1f3d',
    bottomFar: '#1d152b',
    trim: '#ff6fa5',
    shoe: '#fdf2f8',
    shoeFar: '#e5d3de',
    sole: '#e2367a',
    shoeAccent: '#e2367a',
    hair: '#3b2416',
    hairShade: '#26160c',
    hairLight: '#9a6a3f',
    eye: '#21160f',
    accent: '#e2367a',
  },
  zara: {
    top: '#ffc229',
    topFar: '#e09f0c',
    bottom: '#6a3df0',
    bottomFar: '#5128c9',
    trim: '#ffd666',
    shoe: '#f8fafc',
    shoeFar: '#d5dce6',
    sole: '#6a3df0',
    shoeAccent: '#6a3df0',
    hair: '#17110e',
    hairShade: '#0b0806',
    hairLight: '#3d2e26',
    eye: '#140e0b',
    accent: '#6a3df0',
  },
  marcus: {
    top: '#2563eb',
    topFar: '#1d4fc4',
    bottom: '#1e2533',
    bottomFar: '#151a24',
    trim: '#ef4444',
    shoe: '#1f2937',
    shoeFar: '#111827',
    sole: '#f8fafc',
    shoeAccent: '#ef4444',
    hair: '#141010',
    hairShade: '#080606',
    hairLight: '#3a3030',
    eye: '#140e0b',
    accent: '#ef4444',
  },
  kai: {
    top: '#14a38b',
    topFar: '#0f806d',
    bottom: '#4b5563',
    bottomFar: '#394150',
    trim: '#e5e7eb',
    shoe: '#f8fafc',
    shoeFar: '#d5dce6',
    sole: '#14a38b',
    shoeAccent: '#14a38b',
    hair: '#231812',
    hairShade: '#140d09',
    hairLight: '#54402f',
    eye: '#1a1310',
    accent: '#14a38b',
  },
  nina: {
    top: '#8b5cf6',
    topFar: '#7044dc',
    bottom: '#1c1b2e',
    bottomFar: '#13121f',
    trim: '#c4b5fd',
    shoe: '#f8fafc',
    shoeFar: '#d5dce6',
    sole: '#8b5cf6',
    shoeAccent: '#8b5cf6',
    hair: '#b4532a',
    hairShade: '#8a3c1b',
    hairLight: '#e38b55',
    eye: '#2a1d16',
    accent: '#8b5cf6',
  },
}

function channels(hex: string): number[] {
  return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16))
}

export function mixColor(from: string, to: string, amount: number): string {
  const a = channels(from)
  const b = channels(to)
  return `#${a.map((value, index) => Math.round(value + (b[index] - value) * amount).toString(16).padStart(2, '0')).join('')}`
}

export function paletteFor(look: Look): Palette {
  const skin = SKIN[look.skin] ?? SKIN.medium
  const outfit = OUTFIT[look.trainer] ?? OUTFIT.female
  return {
    ...skin,
    ...outfit,
    blush: mixColor(skin.skin, '#f0607a', 0.16),
    hairFade: mixColor(outfit.hair, skin.skin, 0.42),
    topLight: mixColor(outfit.top, '#ffffff', 0.2),
    bottomLight: mixColor(outfit.bottom, '#ffffff', 0.1),
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
