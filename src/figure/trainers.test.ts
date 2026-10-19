import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { distance } from './math'
import { prepareAnimation, sampleSkeleton } from './animate'
import { solveSpec } from './solve'
import { skeletonParts } from './parts'
import { paletteFor, sceneToSvg } from './svg'
import { isTrainerId, TRAINER_ORDER, TRAINERS, type Look, type SkinTone, type TrainerId } from './look'
import { STAND_HIP_HEIGHT } from './rig'
import type { FigureAnimation, Part, PoseSpec, View } from './types'

const POSES: { name: string; view: View; pose: PoseSpec }[] = [
  { name: 'standing side', view: 'side', pose: {} },
  { name: 'standing front', view: 'front', pose: { armL: [170, 0], armR: [170, 0] } },
  { name: 'lying face up', view: 'side', pose: { root: [0, 0.115], torso: -90 } },
  { name: 'lying face down', view: 'side', pose: { root: [0, 0.115], torso: 90 } },
  { name: 'inverted', view: 'side', pose: { root: [0, STAND_HIP_HEIGHT], torso: 150, neck: 20 } },
  { name: 'side lying front', view: 'front', pose: { root: [0, 0.2], torso: 90 } },
]

const HAIR_IDS = ['hair', 'hairBack', 'ponytail', 'puff', 'bun', 'hairFade', 'lockL', 'lockR']

const css = readFileSync(resolve(process.cwd(), 'src/figure/figure.css'), 'utf8')

const SKINS: SkinTone[] = ['light', 'medium', 'deep']

function finite(part: Part) {
  expect(JSON.stringify(part)).not.toContain('NaN')
  if (part.kind === 'path') {
    const numbers = part.d.match(/-?\d+(\.\d+)?/g) ?? []
    expect(numbers.length).toBeGreaterThan(3)
    expect(numbers.every((value) => Number.isFinite(Number(value)))).toBe(true)
  }
}

function tonesOf(parts: Part[]): { fill: Set<string>; stroke: Set<string> } {
  const fill = new Set<string>()
  const stroke = new Set<string>()
  for (const part of parts) {
    if (part.kind === 'seg') {
      stroke.add(part.tone)
    } else if (part.kind === 'circle') {
      fill.add(part.tone)
    } else if (part.kind === 'poly') {
      stroke.add(part.tone)
      if (part.closed) {
        fill.add(part.tone)
      }
    } else {
      if (part.tone) {
        fill.add(part.tone)
      }
      if (part.outline) {
        stroke.add(part.outline)
      }
    }
  }
  return { fill, stroke }
}

describe('trainers', () => {
  it('lists every trainer once with a name, voice gender and default skin', () => {
    expect(new Set(TRAINER_ORDER).size).toBe(TRAINER_ORDER.length)
    expect(TRAINER_ORDER.length).toBeGreaterThanOrEqual(6)
    expect([...TRAINER_ORDER].sort()).toEqual((Object.keys(TRAINERS) as TrainerId[]).sort())
    expect(TRAINER_ORDER).toContain('female')
    expect(TRAINER_ORDER).toContain('male')
    for (const id of TRAINER_ORDER) {
      const trainer = TRAINERS[id]
      expect(trainer.id).toBe(id)
      expect(trainer.name.length).toBeGreaterThan(1)
      expect(['female', 'male']).toContain(trainer.gender)
      expect(SKINS).toContain(trainer.skin)
    }
    expect(new Set(TRAINER_ORDER.map((id) => TRAINERS[id].name)).size).toBe(TRAINER_ORDER.length)
    expect(new Set(TRAINER_ORDER.map((id) => TRAINERS[id].hair)).size).toBe(TRAINER_ORDER.length)
    expect(isTrainerId('kai')).toBe(true)
    expect(isTrainerId('robot')).toBe(false)
    expect(isTrainerId(undefined)).toBe(false)
  })

  for (const id of TRAINER_ORDER) {
    it(`renders ${id} in every view with attached hair and styled tones`, () => {
      for (const { name, view, pose } of POSES) {
        const skeleton = solveSpec(pose, view)
        const look: Look = { trainer: id, skin: TRAINERS[id].skin }
        const parts = skeletonParts(skeleton, look, [], { ponytail: 25, hair: 0.008, blink: 0.5, breath: 1 })
        expect(new Set(parts.map((part) => part.id)).size, name).toBe(parts.length)
        parts.forEach(finite)
        const hair = parts.filter((part) => HAIR_IDS.includes(part.id))
        expect(hair.length, name).toBeGreaterThan(0)
        for (const part of hair) {
          if (part.kind === 'path') {
            const reach = Math.min(...part.points.map((point) => distance(point, skeleton.points.head)))
            expect(reach, `${name} ${part.id}`).toBeLessThan(0.16)
            expect(Math.min(...part.points.map((point) => point[1])), `${name} ${part.id}`).toBeGreaterThan(-0.001)
          }
        }
        const palette = paletteFor(look)
        const { fill, stroke } = tonesOf(parts)
        for (const tone of fill) {
          expect(palette[tone as keyof typeof palette], tone).toMatch(/^#[0-9a-f]{6}$/)
          expect(css, `fill ${tone}`).toContain(`.fig-f-${tone} {`)
        }
        for (const tone of stroke) {
          expect(palette[tone as keyof typeof palette], tone).toMatch(/^#[0-9a-f]{6}$/)
          expect(css, `stroke ${tone}`).toContain(`.fig-s-${tone} {`)
        }
      }
    })
  }

  it('keeps part ids stable across an animation so the live renderer can update in place', () => {
    const squat: FigureAnimation = {
      view: 'side',
      keyframes: [
        { pose: {}, ms: 800 },
        { pose: { root: [-0.15, 0.62], torso: 30, legL: { at: [0, 0.097], angle: 0 }, legR: { at: [0, 0.097], angle: 0 } }, ms: 800 },
      ],
    }
    const prepared = prepareAnimation(squat)
    for (const id of TRAINER_ORDER) {
      const look: Look = { trainer: id, skin: 'medium' }
      const first = skeletonParts(sampleSkeleton(prepared, 0), look).map((part) => part.id)
      for (const time of [300, 800, 1200]) {
        expect(skeletonParts(sampleSkeleton(prepared, time), look, [], { ponytail: -12, hair: -0.004, blink: 1, breath: 0.5 }).map((part) => part.id)).toEqual(first)
      }
    }
  })

  it('falls back to the default look for unknown trainers and skins', () => {
    const skeleton = solveSpec({}, 'front')
    const ghost = { trainer: 'ghost', skin: 'teal' } as unknown as Look
    const parts = skeletonParts(skeleton, ghost)
    expect(parts.map((part) => part.id)).toEqual(skeletonParts(skeleton, { trainer: 'female', skin: 'medium' }).map((part) => part.id))
    const svg = sceneToSvg({ viewBox: { x: -1, y: -2, width: 2, height: 2, centerX: 0 }, parts, back: [], under: [], shadow: { cx: 0, rx: 0.2, opacity: 0.3 }, palette: paletteFor(ghost) })
    expect(svg).not.toContain('undefined')
  })
})
