import { useId, type CSSProperties, type ReactNode } from 'react'
import type { AwardDef, AwardIcon, AwardKind, AwardTier, FunId, HolidayId } from './types'
import './badge.css'

export type BadgeState = 'earned' | 'locked'

export type BadgeSize = 'sm' | 'md' | 'lg' | 'xl'

export interface BadgeProps {
  award: AwardDef
  state?: BadgeState
  size?: BadgeSize
  celebrate?: boolean
  label?: string
  className?: string
}

interface Metal {
  rim: string[]
  hi: string
  light: string
  mid: string
  dark: string
  deep: string
  text: string
  glyph: string[]
  glow: string
}

type Tone = 'metal' | 'cut' | 'line' | 'fire'

interface GlyphPart {
  d: string
  tone?: Tone
  w?: number
  t?: string
}

const METALS: Record<AwardTier | 'locked', Metal> = {
  bronze: {
    rim: ['#ffd9b3', '#e9a56c', '#b5703c', '#e3a06a', '#8a4d24', '#5a2f14'],
    hi: '#ffe2c4',
    light: '#eaa86f',
    mid: '#b8743f',
    dark: '#7a4420',
    deep: '#3f2210',
    text: '#3a1c08',
    glyph: ['#ffe6cc', '#f0b27c', '#c47f48'],
    glow: '#f0a868',
  },
  silver: {
    rim: ['#ffffff', '#dfe2e7', '#9da3ad', '#d9dce2', '#727985', '#454a54'],
    hi: '#ffffff',
    light: '#e6ebf2',
    mid: '#aab4c3',
    dark: '#6c7789',
    deep: '#2a313f',
    text: '#1d2430',
    glyph: ['#ffffff', '#e2e8f0', '#a9b4c4'],
    glow: '#dfe7f2',
  },
  gold: {
    rim: ['#fff8c8', '#ffd75e', '#e2a01a', '#ffd04d', '#a86c06', '#6b4202'],
    hi: '#fff8cc',
    light: '#ffd75e',
    mid: '#e8a91c',
    dark: '#a66b07',
    deep: '#4a2e02',
    text: '#3b2400',
    glyph: ['#fffbe0', '#ffdc6a', '#e9a81f'],
    glow: '#ffcf40',
  },
  platinum: {
    rim: ['#f6fcff', '#c9e4ff', '#86acd8', '#d4ebff', '#5a82b6', '#2c4876'],
    hi: '#f4fbff',
    light: '#cfe6ff',
    mid: '#94b7e0',
    dark: '#5f86b8',
    deep: '#1b2e4f',
    text: '#13233d',
    glyph: ['#ffffff', '#d6ebff', '#93b8e2'],
    glow: '#bfe0ff',
  },
  diamond: {
    rim: ['#f4fffe', '#a6eeff', '#c7b0ff', '#ffb8e8', '#9af2d8', '#7f6be0'],
    hi: '#ffffff',
    light: '#c9f4ff',
    mid: '#b9a6ff',
    dark: '#6a5bc4',
    deep: '#21185a',
    text: '#1e1450',
    glyph: ['#ffffff', '#c6f4ff', '#d5bfff'],
    glow: '#c9b3ff',
  },
  locked: {
    rim: ['#9aa3b5', '#737c91', '#515a6e', '#6c7589', '#3e4657', '#2a3140'],
    hi: '#a7b0c2',
    light: '#737c91',
    mid: '#566074',
    dark: '#2f3647',
    deep: '#161b27',
    text: '#c3cad9',
    glyph: ['#8a93a6', '#5d6679', '#454d61'],
    glow: '#6b7489',
  },
}

const LOCKED_LINE = '#9aa4b9'

const KIND_ENAMEL: Record<AwardKind, [string, string]> = {
  streak: ['#b2361a', '#3d0e07'],
  milestone: ['#2d4180', '#0c1330'],
  month: ['#14707b', '#05252a'],
  perfectMonth: ['#6233a0', '#1c0b36'],
  holiday: ['#2a3a8c', '#0c1240'],
  fun: ['#2f8fd0', '#0b3256'],
}

const THEME_ENAMEL: Record<HolidayId | FunId, [string, string]> = {
  newYear: ['#2d3f9a', '#0b1140'],
  lunarNewYear: ['#c0242e', '#4a070c'],
  valentines: ['#cc3572', '#4d0a26'],
  chuseok: ['#2a4c94', '#081633'],
  halloween: ['#6a2f9a', '#1b0b2e'],
  christmasEve: ['#21497f', '#0a1a33'],
  christmas: ['#1f8550', '#062a18'],
  newYearsEve: ['#43298a', '#110826'],
  earlyBird: ['#2f8fd0', '#0b3256'],
  nightOwl: ['#33307e', '#0b0a26'],
}

const LOCKED_ENAMEL: [string, string] = ['#2a334a', '#131927']

const HOLIDAYS: readonly string[] = ['newYear', 'lunarNewYear', 'valentines', 'chuseok', 'halloween', 'christmasEve', 'christmas', 'newYearsEve']

const FUNS: readonly string[] = ['earlyBird', 'nightOwl']

const r2 = (value: number) => Math.round(value * 100) / 100

function polar(cx: number, cy: number, radius: number, degrees: number): [number, number] {
  const radians = (degrees * Math.PI) / 180
  return [r2(cx + radius * Math.cos(radians)), r2(cy + radius * Math.sin(radians))]
}

function circle(cx: number, cy: number, radius: number): string {
  return `M${r2(cx - radius)} ${r2(cy)}a${r2(radius)} ${r2(radius)} 0 1 0 ${r2(radius * 2)} 0a${r2(radius)} ${r2(radius)} 0 1 0 ${r2(-radius * 2)} 0Z`
}

function ellipse(cx: number, cy: number, rx: number, ry: number): string {
  return `M${r2(cx - rx)} ${r2(cy)}a${r2(rx)} ${r2(ry)} 0 1 0 ${r2(rx * 2)} 0a${r2(rx)} ${r2(ry)} 0 1 0 ${r2(-rx * 2)} 0Z`
}

function roundRect(x: number, y: number, w: number, h: number, radius: number): string {
  const r = Math.min(radius, w / 2, h / 2)
  return `M${r2(x + r)} ${r2(y)}H${r2(x + w - r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x + w)} ${r2(y + r)}V${r2(y + h - r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x + w - r)} ${r2(y + h)}H${r2(x + r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x)} ${r2(y + h - r)}V${r2(y + r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x + r)} ${r2(y)}Z`
}

function star(cx: number, cy: number, outer: number, inner: number, points = 5, rotation = -90): string {
  const coords: string[] = []
  for (let index = 0; index < points * 2; index += 1) {
    const [x, y] = polar(cx, cy, index % 2 === 0 ? outer : inner, rotation + (index * 180) / points)
    coords.push(`${x} ${y}`)
  }
  return `M${coords.join('L')}Z`
}

function roundedPolygon(points: [number, number][], radius: number): string {
  const count = points.length
  let d = ''
  for (let index = 0; index < count; index += 1) {
    const [px, py] = points[index]
    const [ax, ay] = points[(index - 1 + count) % count]
    const [bx, by] = points[(index + 1) % count]
    const la = Math.hypot(ax - px, ay - py)
    const lb = Math.hypot(bx - px, by - py)
    const ta = Math.min(radius / la, 0.5)
    const tb = Math.min(radius / lb, 0.5)
    const start = `${r2(px + (ax - px) * ta)} ${r2(py + (ay - py) * ta)}`
    const end = `${r2(px + (bx - px) * tb)} ${r2(py + (by - py) * tb)}`
    d += `${index === 0 ? 'M' : 'L'}${start}Q${r2(px)} ${r2(py)} ${end}`
  }
  return `${d}Z`
}

function ray(cx: number, cy: number, from: number, to: number, degrees: number, width: number): string {
  const [ax, ay] = polar(cx, cy, from, degrees)
  const [bx, by] = polar(cx, cy, to, degrees)
  const mid = from + (to - from) * 0.35
  const [mx, my] = polar(cx, cy, mid, degrees)
  const radians = ((degrees + 90) * Math.PI) / 180
  const ox = r2((Math.cos(radians) * width) / 2)
  const oy = r2((Math.sin(radians) * width) / 2)
  return `M${ax} ${ay}L${r2(mx + ox)} ${r2(my + oy)}L${bx} ${by}L${r2(mx - ox)} ${r2(my - oy)}Z`
}

interface ShapeGeometry {
  d: string
  transform?: string
}

function shapeFor(kind: AwardKind, inset: number): ShapeGeometry {
  switch (kind) {
    case 'streak': {
      const radius = 50 - inset * 1.12
      const points = Array.from({ length: 6 }, (_, index) => polar(60, 62, radius, -90 + index * 60))
      return { d: roundedPolygon(points, Math.max(3, 10 - inset * 0.6)) }
    }
    case 'milestone':
      return { d: circle(60, 58, 42 - inset) }
    case 'month':
    case 'perfectMonth':
      return { d: roundRect(19 + inset, 25 + inset, 82 - inset * 2, 78 - inset * 2, Math.max(4, 18 - inset * 0.9)) }
    case 'holiday': {
      const base = 46 - inset
      const coords: string[] = []
      for (let index = 0; index < 192; index += 1) {
        const degrees = (index * 360) / 192
        const radius = base + 2.8 * Math.cos((degrees * 16 * Math.PI) / 180)
        const [x, y] = polar(60, 58, radius, degrees - 90)
        coords.push(`${x} ${y}`)
      }
      return { d: `M${coords.join('L')}Z` }
    }
    case 'fun': {
      const x0 = 13 + inset
      const x1 = 107 - inset
      const y0 = 25 + inset
      const y1 = 93 - inset
      const r = Math.max(3, 11 - inset * 0.7)
      const n = Math.max(4, 9 - inset * 0.4)
      const cy = (y0 + y1) / 2
      const d = `M${r2(x0 + r)} ${r2(y0)}H${r2(x1 - r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x1)} ${r2(y0 + r)}V${r2(cy - n)}A${r2(n)} ${r2(n)} 0 0 0 ${r2(x1)} ${r2(cy + n)}V${r2(y1 - r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x1 - r)} ${r2(y1)}H${r2(x0 + r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x0)} ${r2(y1 - r)}V${r2(cy + n)}A${r2(n)} ${r2(n)} 0 0 0 ${r2(x0)} ${r2(cy - n)}V${r2(y0 + r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x0 + r)} ${r2(y0)}Z`
      return { d, transform: 'rotate(-8 60 59)' }
    }
  }
}

const HEART = 'M0 20C-6 15-22 5-22-6C-22-14-16-19-10-19C-5-19-2-16 0-12C2-16 5-19 10-19C16-19 22-14 22-6C22 5 6 15 0 20Z'

const FLUTE = [
  { d: 'M-5.5-19H5.5C5.5-8 4-2.5 0-1.5C-4-2.5-5.5-8-5.5-19Z' },
  { d: 'M-0.9-2H0.9V11.5H-0.9Z' },
  { d: 'M-6 11.5H6A1.2 1.2 0 0 1 6 14H-6A1.2 1.2 0 0 1-6 11.5Z' },
  { d: 'M-4.8-12.5H4.8', tone: 'line' as const, w: 1.2 },
  { d: `${circle(-1.5, -9, 0.9)}${circle(1.6, -6.5, 0.8)}${circle(-0.4, -4.5, 0.7)}`, tone: 'cut' as const },
]

function glyphFor(icon: AwardIcon): GlyphPart[] {
  switch (icon) {
    case 'flame':
      return [
        { d: 'M1-24C3-15 15-10 16 4C17 15 9 23 0 23C-9 23-17 16-16 5C-15-3-10-7-8-13C-5-8-5-5-3-3C-2-11-3-18 1-24Z' },
        { d: 'M1 1C5.5 6 8.5 10 8 14.5C7.5 18.5 4.5 21 0 21C-4.5 21-7.5 18.5-7 14.5C-6.5 10-2 7 1 1Z', tone: 'fire' },
      ]
    case 'trophy':
      return [
        { d: 'M-13-20H13V-7C13 3 7 9 0 9C-7 9-13 3-13-7Z' },
        { d: 'M-13-17H-21V-11C-21-4-17 0-11 0.5L-11.5-3.5C-15-4-17.5-7-17.5-11V-13.5H-13Z' },
        { d: 'M13-17H21V-11C21-4 17 0 11 0.5L11.5-3.5C15-4 17.5-7 17.5-11V-13.5H13Z' },
        { d: 'M-3 8H3L4 15H-4Z' },
        { d: roundRect(-12, 15, 24, 7, 2) },
        { d: star(0, -7, 6.5, 2.7), tone: 'cut' },
      ]
    case 'calendar':
      return [
        { d: roundRect(-21, -16, 42, 38, 5) },
        { d: 'M-21-6H21', tone: 'line', w: 1.6 },
        { d: roundRect(-13, -22, 4.5, 10, 2.25) },
        { d: roundRect(8.5, -22, 4.5, 10, 2.25) },
        {
          d: [-12, -2, 8].flatMap((y) => [-13, -3, 7].map((x) => roundRect(x, y, 6, 6, 1.2))).join(''),
          tone: 'cut',
        },
      ]
    case 'crown':
      return [
        { d: 'M-21 10L-23-12L-11-1L0-19L11-1L23-12L21 10Z' },
        { d: roundRect(-21, 12.5, 42, 8.5, 2) },
        { d: `${circle(-23, -13.5, 2.8)}${circle(0, -20.5, 3)}${circle(23, -13.5, 2.8)}` },
        { d: `${circle(0, 16.75, 2.3)}${circle(-11, 16.75, 1.8)}${circle(11, 16.75, 1.8)}`, tone: 'cut' },
        { d: star(0, 1, 4.5, 1.9), tone: 'cut' },
      ]
    case 'newYear':
      return [
        {
          d: Array.from({ length: 12 }, (_, index) => ray(0, 0, 6.5, index % 2 === 0 ? 19 : 14, index * 30 - 90, 3.4)).join(''),
        },
        {
          d: Array.from({ length: 6 }, (_, index) => {
            const [x, y] = polar(0, 0, 22.5, index * 60 - 90)
            return circle(x, y, 1.9)
          }).join(''),
        },
        { d: circle(0, 0, 4.2) },
        { d: `${star(-17, -16, 3.6, 1, 4)}${star(17, 15, 3, 0.9, 4)}` },
      ]
    case 'lunarNewYear':
      return [
        { d: 'M-1-24H1V-19H-1Z' },
        { d: 'M-8-19H8A2 2 0 0 1 10-17V-14H-10V-17A2 2 0 0 1-8-19Z' },
        { d: ellipse(0, 0, 18.5, 14.5) },
        { d: 'M-10 14H10V17A2 2 0 0 1 8 19H-8A2 2 0 0 1-10 17Z' },
        { d: 'M-1.5 19H1.5L3 25H-3Z' },
        { d: 'M0-13.5V13.5M-8.5-12.6C-12.5-5-12.5 5-8.5 12.6M8.5-12.6C12.5-5 12.5 5 8.5 12.6', tone: 'line', w: 1.5 },
      ]
    case 'valentines':
      return [
        { d: HEART },
        { d: HEART, tone: 'line', w: 2.2, t: 'translate(0 -0.5) scale(0.62)' },
        { d: star(15.5, -17.5, 4.6, 1.2, 4), t: 'translate(3 -2)' },
      ]
    case 'chuseok':
      return [
        { d: circle(0, -1, 21) },
        { d: `${ellipse(0, 0, 1.9, 6.4)}`, tone: 'cut', t: 'translate(-9 -11) rotate(-18)' },
        { d: `${ellipse(0, 0, 1.9, 6.4)}`, tone: 'cut', t: 'translate(-4 -12) rotate(8)' },
        { d: `${circle(-6.5, -3, 4.6)}${ellipse(2, 5, 8.5, 6.8)}${circle(11, 3, 2.4)}`, tone: 'cut' },
        { d: 'M-16.5 10.5H-5.5C-5.5 14.5-8 17-11 17C-14 17-16.5 14.5-16.5 10.5Z', tone: 'cut' },
        { d: 'M-4.5 1.5L-11.5 8.5', tone: 'line', w: 2 },
      ]
    case 'halloween':
      return [
        { d: 'M0-11C9-14 23-11 23 4C23 17 12 21 0 19C-12 21-23 17-23 4C-23-11-9-14 0-11Z' },
        { d: 'M-2.5-11C-2.5-17 0-21 5-23L7-19.5C3.5-18 2.5-15 2.5-11Z' },
        { d: 'M4-18C8-22.5 13-22 15.5-18.5C11-16.5 7-16.5 4-18Z' },
        { d: 'M-13-0.5L-4-0.5L-8.5-7.5ZM4-0.5L13-0.5L8.5-7.5ZM-1.8 4.5L1.8 4.5L0 1.5Z', tone: 'cut' },
        { d: 'M-14 7C-9 15.5 9 15.5 14 7L10 9L7 7L3.5 10.5L0 8L-3.5 10.5L-7 7L-10 9Z', tone: 'cut' },
      ]
    case 'christmasEve':
      return [
        { d: 'M-6.5-3H6.5V21A2 2 0 0 1 4.5 23H-4.5A2 2 0 0 1-6.5 21Z' },
        { d: 'M0-24C5.5-17.5 6-11 0-7C-6-11-5.5-17.5 0-24Z' },
        { d: 'M-0.7-7H0.7V-3H-0.7Z' },
        { d: 'M-2.8 1V18', tone: 'line', w: 1.4 },
        { d: 'M-7 19C-12 15-18 16-21 20C-15 23-11 22-7 19ZM7 19C12 15 18 16 21 20C15 23 11 22 7 19Z' },
        { d: `${star(15, -14, 5, 1.3, 4)}${star(-15, -9, 3.6, 1, 4)}` },
      ]
    case 'christmas':
      return [
        { d: 'M0-15L9.5-4.5H5L14.5 5.5H9L19 16H-19L-9 5.5H-14.5L-5-4.5H-9.5Z' },
        { d: 'M-3.5 16H3.5V23H-3.5Z' },
        { d: star(0, -18.5, 7, 2.9) },
        { d: `${circle(-4.5, 0.5, 1.9)}${circle(5.5, 9, 1.9)}${circle(-8.5, 12, 1.7)}${circle(2, -7, 1.5)}${circle(11, 13, 1.5)}`, tone: 'cut' },
      ]
    case 'newYearsEve':
      return [
        ...FLUTE.map((part) => ({ ...part, t: 'translate(-9 7) rotate(18)' })),
        ...FLUTE.map((part) => ({ ...part, t: 'translate(9 7) rotate(-18)' })),
        { d: `${star(0, -19, 6, 1.4, 4)}${star(-13, -21, 3, 0.8, 4)}${star(13, -21, 3, 0.8, 4)}` },
      ]
    case 'earlyBird':
      return [
        { d: 'M-13.5 4A13.5 13.5 0 0 1 13.5 4Z' },
        { d: Array.from({ length: 7 }, (_, index) => ray(0, 4, 17, 24, 180 + 15 + index * 25, 3.6)).join('') },
        { d: roundRect(-23, 7, 46, 3.6, 1.8) },
        { d: roundRect(-16, 13.5, 32, 3.4, 1.7) },
        { d: roundRect(-9, 19.5, 18, 3.2, 1.6) },
      ]
    case 'nightOwl':
      return [
        { d: 'M-14-14L-11-23L-4.5-16C-1.5-17 1.5-17 4.5-16L11-23L14-14C18.5-8 18.5 4 16.5 10C13.5 18 7.5 22 0 22C-7.5 22-13.5 18-16.5 10C-18.5 4-18.5-8-14-14Z' },
        { d: `${circle(-6.8, -5.5, 6.4)}${circle(6.8, -5.5, 6.4)}`, tone: 'cut' },
        { d: `${circle(-6.8, -5.5, 2.7)}${circle(6.8, -5.5, 2.7)}` },
        { d: 'M-2.4 1L2.4 1L0 5.5Z', tone: 'cut' },
        { d: 'M-7 11L-3.5 13.5L0 11L3.5 13.5L7 11M-5 16L-2.5 18L0 16L2.5 18L5 16', tone: 'line', w: 1.3 },
      ]
  }
}

function themeOf(award: AwardDef): HolidayId | FunId | undefined {
  if (award.holiday) return award.holiday
  if (award.fun) return award.fun
  if (HOLIDAYS.includes(award.icon) || FUNS.includes(award.icon)) return award.icon as HolidayId | FunId
  return undefined
}

function enamelFor(award: AwardDef, locked: boolean): [string, string] {
  if (locked) return LOCKED_ENAMEL
  const theme = themeOf(award)
  if ((award.kind === 'holiday' || award.kind === 'fun') && theme) return THEME_ENAMEL[theme]
  return KIND_ENAMEL[award.kind]
}

function plateText(award: AwardDef): string | undefined {
  const monthly = award.kind === 'month' || award.kind === 'perfectMonth'
  const parts = [monthly ? undefined : award.value, award.year].filter((part): part is number => typeof part === 'number')
  return parts.length > 0 ? parts.join(' · ') : undefined
}

function Glyph({ parts, metal, ids, locked, cut }: { parts: GlyphPart[]; metal: Metal; ids: Ids; locked: boolean; cut: string }) {
  return (
    <>
      {!locked && (
        <g transform="translate(0 1.6)" opacity="0.45">
          {parts
            .filter((part) => (part.tone ?? 'metal') === 'metal')
            .map((part, index) => (
              <path key={index} d={part.d} transform={part.t} fill="#000" />
            ))}
        </g>
      )}
      {parts.map((part, index) => {
        const tone = part.tone ?? 'metal'
        if (locked) {
          return (
            <path
              key={index}
              d={part.d}
              transform={part.t}
              fill={tone === 'metal' ? 'rgba(143,153,174,0.12)' : 'none'}
              stroke={LOCKED_LINE}
              strokeWidth={tone === 'line' ? (part.w ?? 1.4) : 1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )
        }
        if (tone === 'line') {
          return (
            <path key={index} d={part.d} transform={part.t} fill="none" stroke={cut} strokeWidth={part.w ?? 1.4} strokeLinecap="round" strokeLinejoin="round" />
          )
        }
        if (tone === 'cut') {
          return <path key={index} d={part.d} transform={part.t} fill={cut} />
        }
        if (tone === 'fire') {
          return <path key={index} d={part.d} transform={part.t} fill={`url(#${ids.crest})`} stroke={metal.deep} strokeWidth="0.5" strokeOpacity="0.5" />
        }
        return <path key={index} d={part.d} transform={part.t} fill={`url(#${ids.glyph})`} stroke={metal.deep} strokeWidth="0.6" strokeOpacity="0.6" strokeLinejoin="round" />
      })}
    </>
  )
}

interface Ids {
  rim: string
  bevel: string
  face: string
  glyph: string
  plate: string
  shine: string
  gloss: string
  crest: string
  clipRim: string
  clipFace: string
}

function MetalPath({ d, transform, ids, metal }: { d: string; transform?: string; ids: Ids; metal: Metal }) {
  return <path d={d} transform={transform} fill={`url(#${ids.rim})`} stroke={metal.deep} strokeWidth="0.8" strokeOpacity="0.7" strokeLinejoin="round" />
}

function BehindDecor({ award, ids, metal, locked }: { award: AwardDef; ids: Ids; metal: Metal; locked: boolean }) {
  if (award.kind === 'streak') {
    return (
      <g fill={`url(#${ids.crest})`} stroke={locked ? metal.deep : '#7a1f06'} strokeWidth="0.8" strokeOpacity="0.6" strokeLinejoin="round">
        <path d="M37 26C34 19 36 12 41 7C41 13 45 15 48 19Z" />
        <path d="M83 26C86 19 84 12 79 7C79 13 75 15 72 19Z" />
        <path d="M60-1C62 6 71 10 71 19C71 23 49 23 49 19C49 10 58 6 60-1Z" />
      </g>
    )
  }
  if (award.kind === 'milestone') {
    const leaves: ReactNode[] = []
    for (const side of [-1, 1]) {
      for (let index = 0; index < 7; index += 1) {
        const degrees = side < 0 ? 128 + index * 19 : 52 - index * 19
        const [x, y] = polar(60, 58, 49, degrees)
        const tangent = degrees + (side < 0 ? 90 : -90) + side * 28
        leaves.push(<path key={`${side}-${index}`} d={ellipse(0, 0, 6.6, 2.7)} transform={`translate(${x} ${y}) rotate(${r2(tangent)})`} />)
      }
    }
    const [lx0, ly0] = polar(60, 58, 47.5, 126)
    const [lx1, ly1] = polar(60, 58, 47.5, 246)
    const [rx0, ry0] = polar(60, 58, 47.5, 54)
    const [rx1, ry1] = polar(60, 58, 47.5, -66)
    return (
      <g stroke={metal.deep} strokeWidth="0.6" strokeOpacity="0.7">
        <path
          d={`M${lx0} ${ly0}A47.5 47.5 0 0 1 ${lx1} ${ly1}M${rx0} ${ry0}A47.5 47.5 0 0 0 ${rx1} ${ry1}`}
          fill="none"
          stroke={metal.mid}
          strokeOpacity="1"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <g fill={`url(#${ids.rim})`}>{leaves}</g>
      </g>
    )
  }
  if (award.kind === 'perfectMonth') {
    return (
      <g fill={metal.light} opacity={locked ? 0.35 : 0.5}>
        {Array.from({ length: 20 }, (_, index) => (
          <path key={index} d={ray(60, 62, 34, 59, index * 18 - 90, 8)} />
        ))}
      </g>
    )
  }
  return null
}

function FrontDecor({ award, ids, metal, locked }: { award: AwardDef; ids: Ids; metal: Metal; locked: boolean }) {
  const decor: ReactNode[] = []
  if (award.kind === 'month') {
    for (const x of [38, 77]) {
      decor.push(<path key={`hole-${x}`} d={ellipse(x + 2.5, 30.5, 3.4, 2.2)} fill="#000" opacity="0.55" />)
      decor.push(<MetalPath key={`ring-${x}`} d={roundRect(x, 15, 5, 16, 2.5)} ids={ids} metal={metal} />)
    }
  }
  if (award.kind === 'perfectMonth') {
    decor.push(
      <g key="crown" transform="translate(60 21) scale(0.62)">
        <Glyph parts={glyphFor('crown')} metal={metal} ids={ids} locked={locked} cut={metal.dark} />
      </g>,
    )
  }
  if (award.tier === 'diamond' && !locked) {
    decor.push(
      <path
        key="sparkle"
        d={`${star(24, 28, 6.5, 1.3, 4)}${star(99, 40, 4.5, 1, 4)}${star(18, 74, 3.5, 0.8, 4)}`}
        fill="#ffffff"
        opacity="0.95"
      />,
    )
  }
  return <>{decor}</>
}

export function Badge({ award, state = 'earned', size = 'md', celebrate = false, label, className }: BadgeProps) {
  const rawId = useId()
  const uid = `bdg${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const ids: Ids = {
    rim: `${uid}-rim`,
    bevel: `${uid}-bevel`,
    face: `${uid}-face`,
    glyph: `${uid}-glyph`,
    plate: `${uid}-plate`,
    shine: `${uid}-shine`,
    gloss: `${uid}-gloss`,
    crest: `${uid}-crest`,
    clipRim: `${uid}-clip-rim`,
    clipFace: `${uid}-clip-face`,
  }
  const locked = state === 'locked'
  const metal = METALS[locked ? 'locked' : award.tier]
  const [enamelLight, enamelDark] = enamelFor(award, locked)
  const outer = shapeFor(award.kind, 0)
  const bevel = shapeFor(award.kind, 3.5)
  const face = shapeFor(award.kind, 7.5)
  const monthly = award.kind === 'month' || award.kind === 'perfectMonth'
  const showMonth = monthly && typeof award.month === 'number'
  const plate = plateText(award)
  const glyphY = award.kind === 'streak' ? 58 : monthly ? 64 : award.kind === 'fun' ? 56 : 54
  const glyphScale = award.kind === 'fun' ? 0.88 : monthly ? 0.85 : 1
  const centerIcon: AwardIcon = monthly ? 'calendar' : award.icon
  const crestStops = locked ? [metal.hi, metal.mid, metal.dark] : ['#ffe27a', '#ff7a2e', '#c2330c']
  const rimOffsets = [0, 0.22, 0.45, 0.62, 0.82, 1]
  const plateFont = plate ? (plate.length <= 2 ? 21 : plate.length === 3 ? 19.5 : plate.length === 4 ? 17.5 : 12.5) : 0
  const plateWidth = plate ? Math.max(38, plate.length * plateFont * 0.6 + 16) : 0
  const plateLeft = 60 - plateWidth / 2
  const plateRight = 60 + plateWidth / 2
  const style = { '--badge-glow': metal.glow } as CSSProperties
  const classes = ['badge', `badge--${size}`, celebrate ? 'badge--celebrate' : '', className ?? ''].filter(Boolean).join(' ')

  return (
    <span
      className={classes}
      role="img"
      aria-label={label ?? award.id}
      data-state={state}
      data-tier={award.tier}
      data-kind={award.kind}
      data-icon={award.icon}
      data-size={size}
      data-celebrate={celebrate ? 'true' : undefined}
      style={style}
    >
      {celebrate && (
        <span className="badge__fx" aria-hidden="true">
          <span className="badge__glow" />
          {Array.from({ length: 12 }, (_, index) => (
            <span key={index} className="badge__particle" style={{ '--i': index } as CSSProperties} />
          ))}
        </span>
      )}
      <svg className="badge__svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={ids.rim} x1="0.1" y1="0" x2="0.9" y2="1">
            {metal.rim.map((color, index) => (
              <stop key={index} offset={rimOffsets[index]} stopColor={color} />
            ))}
          </linearGradient>
          <linearGradient id={ids.bevel} x1="0.9" y1="1" x2="0.1" y2="0">
            {metal.rim.map((color, index) => (
              <stop key={index} offset={rimOffsets[index]} stopColor={color} />
            ))}
          </linearGradient>
          <radialGradient id={ids.face} cx="0.5" cy="0.38" r="0.7">
            <stop offset="0" stopColor={enamelLight} />
            <stop offset="1" stopColor={enamelDark} />
          </radialGradient>
          <linearGradient id={ids.glyph} x1="0" y1="0" x2="0.25" y2="1">
            <stop offset="0" stopColor={metal.glyph[0]} />
            <stop offset="0.5" stopColor={metal.glyph[1]} />
            <stop offset="1" stopColor={metal.glyph[2]} />
          </linearGradient>
          <linearGradient id={ids.plate} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={locked ? '#4a5367' : metal.hi} />
            <stop offset="0.55" stopColor={locked ? '#363e50' : metal.light} />
            <stop offset="1" stopColor={locked ? '#262c3a' : metal.mid} />
          </linearGradient>
          <linearGradient id={ids.crest} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={crestStops[0]} />
            <stop offset="0.55" stopColor={crestStops[1]} />
            <stop offset="1" stopColor={crestStops[2]} />
          </linearGradient>
          <linearGradient id={ids.gloss} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={ids.shine} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={ids.clipRim}>
            <path d={outer.d} transform={outer.transform} />
          </clipPath>
          <clipPath id={ids.clipFace}>
            <path d={face.d} transform={face.transform} />
          </clipPath>
        </defs>
        <g className="badge__art">
          <BehindDecor award={award} ids={ids} metal={metal} locked={locked} />
          <path d={outer.d} transform={`translate(0 2.5) ${outer.transform ?? ''}`.trim()} fill="#000" opacity="0.4" />
          <path d={outer.d} transform={outer.transform} fill={`url(#${ids.rim})`} />
          <path d={outer.d} transform={outer.transform} fill="none" stroke={metal.deep} strokeWidth="1" strokeOpacity="0.8" />
          <path d={bevel.d} transform={bevel.transform} fill={`url(#${ids.bevel})`} />
          <path d={face.d} transform={face.transform} fill={`url(#${ids.face})`} />
          <g clipPath={`url(#${ids.clipFace})`}>
            <g fill="#ffffff" opacity={locked ? 0.03 : 0.06}>
              {Array.from({ length: 16 }, (_, index) => (
                <path key={index} d={ray(60, glyphY, 0, 80, index * 22.5, 12)} />
              ))}
            </g>
            {monthly && <rect x="0" y="0" width="120" height={25 + 7.5 + 13} fill={`url(#${ids.rim})`} />}
            {monthly && <rect x="0" y={25 + 7.5 + 13} width="120" height="1.2" fill="#000" opacity="0.35" />}
            <ellipse cx="60" cy="22" rx="56" ry="34" fill={`url(#${ids.gloss})`} />
            <path d={face.d} transform={face.transform} fill="none" stroke="#000" strokeOpacity="0.5" strokeWidth="5" />
          </g>
          <path d={face.d} transform={face.transform} fill="none" stroke={metal.hi} strokeOpacity="0.35" strokeWidth="0.8" />
          {showMonth ? (
            <text
              x="60"
              y="78"
              textAnchor="middle"
              fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
              fontWeight="800"
              fontSize="32"
              letterSpacing="-1"
              fill={locked ? 'none' : `url(#${ids.glyph})`}
              stroke={locked ? LOCKED_LINE : metal.deep}
              strokeWidth={locked ? 1.4 : 0.8}
              className="badge__month"
            >
              {award.month}
            </text>
          ) : (
            <g transform={`translate(60 ${glyphY}) scale(${glyphScale})`}>
              <Glyph parts={glyphFor(centerIcon)} metal={metal} ids={ids} locked={locked} cut={enamelDark} />
            </g>
          )}
          <FrontDecor award={award} ids={ids} metal={metal} locked={locked} />
          {plate && (
            <g className="badge__plate">
              <path
                d={`M${r2(plateLeft + 4)} 91H${r2(plateLeft - 9)}L${r2(plateLeft - 4)} 100.5L${r2(plateLeft - 9)} 110H${r2(plateLeft + 4)}ZM${r2(plateRight - 4)} 91H${r2(plateRight + 9)}L${r2(plateRight + 4)} 100.5L${r2(plateRight + 9)} 110H${r2(plateRight - 4)}Z`}
                fill={metal.dark}
                stroke={metal.deep}
                strokeWidth="0.8"
                strokeLinejoin="round"
              />
              <path d={roundRect(plateLeft, 86, plateWidth, 22, 5)} transform="translate(0 1.5)" fill="#000" opacity="0.35" />
              <path d={roundRect(plateLeft, 86, plateWidth, 22, 5)} fill={`url(#${ids.plate})`} stroke={metal.deep} strokeWidth="0.9" />
              <path d={`M${r2(plateLeft + 5)} 87.5H${r2(plateRight - 5)}`} stroke="#ffffff" strokeOpacity="0.6" strokeWidth="0.8" strokeLinecap="round" />
              <text
                x="60"
                y={r2(97 + plateFont * 0.355)}
                textAnchor="middle"
                fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                fontWeight="800"
                fontSize={plateFont}
                fill={metal.text}
                className="badge__value"
              >
                {plate}
              </text>
            </g>
          )}
          {!locked && (
            <g clipPath={`url(#${ids.clipRim})`}>
              <g transform="rotate(22 60 60)">
                <rect className="badge__shine" x="-70" y="-40" width="30" height="200" fill={`url(#${ids.shine})`} />
              </g>
            </g>
          )}
          {locked && (
            <g className="badge__lock">
              <path d={circle(97, 24, 11.5)} fill="#0e1424" stroke="#5c6579" strokeWidth="1.5" />
              <path d="M93.4 24V21.2A3.6 3.6 0 0 1 100.6 21.2V24" fill="none" stroke="#c3cad9" strokeWidth="1.9" strokeLinecap="round" />
              <path d={roundRect(91.2, 23.2, 11.6, 8.6, 1.8)} fill="#c3cad9" />
              <path d={circle(97, 27.2, 1.3)} fill="#0e1424" />
            </g>
          )}
        </g>
      </svg>
    </span>
  )
}
