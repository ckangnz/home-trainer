import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { prepareAnimation, sampleSkeleton, thumbSkeleton } from '../src/figure/animate'
import { animationBounds, viewBoxFor } from '../src/figure/framing'
import { propParts, shadowFor, skeletonParts } from '../src/figure/parts'
import { SecondaryMotion, STILL, type Secondary } from '../src/figure/secondary'
import { paletteFor, sceneToSvg } from '../src/figure/svg'
import type { Look } from '../src/figure/look'
import { EXERCISES } from '../src/exercises'
import { BASE_POSES } from '../src/exercises/kit'
import type { Exercise } from '../src/exercises/types'

const baseExercises: Exercise[] = Object.entries(BASE_POSES).map(([name, base]) => ({
  id: `base-${name}`,
  name,
  category: 'stretch',
  tags: [],
  muscles: [],
  equipment: 'none',
  level: 1,
  impact: 'low',
  sided: 'symmetric',
  defaultTarget: { kind: 'time', seconds: 30 },
  animation: { view: base.view, keyframes: [{ pose: base.pose, ms: 0 }], props: base.props },
  summary: '',
  steps: [],
  tips: [],
}))
const catalogs = import.meta.glob<Record<string, Exercise[]>>('../src/exercises/catalog/*.ts')
const only = process.env.CATALOG
const external = process.env.SOURCE
const source = process.env.BASES
  ? baseExercises
  : external
    ? Object.values((await import(resolve(external))) as Record<string, Exercise[]>).flat()
    : only
      ? Object.values(await catalogs[`../src/exercises/catalog/${only}.ts`]()).flat()
      : EXERCISES

const look: Look = {
  trainer: process.env.LOOK === 'male' ? 'male' : 'female',
  skin: process.env.SKIN === 'light' || process.env.SKIN === 'deep' ? process.env.SKIN : 'medium',
}
const palette = paletteFor(look)
const FRAMES = Number(process.env.FRAMES ?? 8)
const CELL = Number(process.env.CELL ?? 220)
const outDir = resolve(process.argv[2] ?? 'figure-sheets')
const filter = process.argv[3]?.split(',').filter(Boolean)

mkdirSync(outDir, { recursive: true })

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const ids = new Set(source.map((exercise) => exercise.id))
const selected = source.filter(
  (exercise) => !filter || filter.some((token) => (ids.has(token) ? exercise.id === token : exercise.id.includes(token))),
)
const rows: string[] = []
const labelWidth = 170
const MOTION = Boolean(process.env.MOTION)
const MOTION_STEP_MS = 1000 / 30

function secondaryAt(prepared: ReturnType<typeof prepareAnimation>, time: number): Secondary {
  if (!MOTION) {
    return STILL
  }
  const motion = new SecondaryMotion()
  const end = prepared.cycleMs + time
  let result = STILL
  for (let clock = 0; clock <= end; clock += MOTION_STEP_MS) {
    result = motion.step(sampleSkeleton(prepared, clock), MOTION_STEP_MS, clock)
  }
  return result
}

selected.forEach((exercise, rowIndex) => {
  const prepared = prepareAnimation(exercise.animation)
  const viewBox = viewBoxFor(animationBounds(prepared), 1)
  const props = propParts(prepared.props)
  const sides = exercise.sided === 'perSide' ? [false, true] : [false]
  const cells: string[] = []
  let column = 0
  for (const mirrored of sides) {
    for (let frame = 0; frame < FRAMES; frame += 1) {
      const time = (prepared.cycleMs * frame) / FRAMES
      const skeleton = sampleSkeleton(prepared, time)
      const svg = sceneToSvg({
        viewBox,
        parts: skeletonParts(skeleton, look, prepared.props, secondaryAt(prepared, time)),
        palette,
        back: props.back,
        under: props.under,
        shadow: shadowFor(skeleton),
        mirrored,
        pixelWidth: CELL,
      })
      const x = labelWidth + column * (CELL + 6)
      cells.push(`<g transform="translate(${x},${rowIndex * (CELL + 24)})">${svg.replace('<svg ', '<svg x="0" y="20" ')}<text x="4" y="14" font-size="11" fill="#94a3b8" font-family="Helvetica">${Math.round(time)}ms${mirrored ? ' (side 2)' : ''}</text></g>`)
      column += 1
    }
  }
  rows.push(
    `<g><text x="8" y="${rowIndex * (CELL + 24) + CELL / 2}" font-size="15" fill="#f1f5f9" font-family="Helvetica" font-weight="bold">${escapeXml(exercise.name)}</text><text x="8" y="${rowIndex * (CELL + 24) + CELL / 2 + 18}" font-size="11" fill="#94a3b8" font-family="Helvetica">${exercise.id} · ${prepared.cycleMs}ms · ${exercise.animation.view}</text></g>`,
    ...cells,
  )
})

const GRID = Number(process.env.GRID ?? 0)
if (GRID > 0) {
  const cells = selected.map((exercise, index) => {
    const prepared = prepareAnimation(exercise.animation)
    const viewBox = viewBoxFor(animationBounds(prepared), 1)
    const props = propParts(prepared.props)
    const skeleton = process.env.AT === 'thumb' ? thumbSkeleton(prepared) : sampleSkeleton(prepared, Number(process.env.AT ?? 0) * prepared.cycleMs)
    const svg = sceneToSvg({ viewBox, parts: skeletonParts(skeleton, look, prepared.props), back: props.back, under: props.under, shadow: shadowFor(skeleton), palette, pixelWidth: CELL })
    const x = (index % GRID) * (CELL + 8)
    const y = Math.floor(index / GRID) * (CELL + 26)
    return `<g transform="translate(${x},${y})"><text x="4" y="15" font-size="13" fill="#f1f5f9" font-family="Helvetica">${escapeXml(exercise.name)}</text>${svg.replace('<svg ', '<svg x="0" y="22" ')}</g>`
  })
  const gridWidth = GRID * (CELL + 8)
  const gridHeight = Math.ceil(selected.length / GRID) * (CELL + 26)
  const file = join(outDir, `grid${filter ? `-${filter.join('-')}` : ''}.svg`)
  writeFileSync(file, `<svg xmlns="http://www.w3.org/2000/svg" width="${gridWidth}" height="${gridHeight}" viewBox="0 0 ${gridWidth} ${gridHeight}"><rect width="100%" height="100%" fill="#0f172a"/>${cells.join('')}</svg>`)
  console.log(`Wrote ${file} (${selected.length} exercises)`)
  process.exit(0)
}

const maxColumns = Math.max(...selected.map((exercise) => (exercise.sided === 'perSide' ? 2 : 1) * FRAMES))
const width = labelWidth + maxColumns * (CELL + 6)
const height = selected.length * (CELL + 24)
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#0f172a"/>${rows.join('')}</svg>`
const file = join(outDir, `sheet${filter ? `-${filter.join('-')}` : ''}.svg`)
writeFileSync(file, sheet)
console.log(`Wrote ${file} (${selected.length} exercises)`)
