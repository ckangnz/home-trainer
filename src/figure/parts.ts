import { add, dir, length, lerpAngle, lerpVec, scale, sub, type Vec2 } from './math'
import { RIG, mirrorSign } from './rig'
import { DEFAULT_LOOK, TRAINERS, type Look, type TrainerBuild } from './look'
import { ellipseOutline, limbOutline, localShape, localStroke, localToWorld, smoothClosed, type LimbShape, type Outline } from './shapes'
import type { LimbSide, Part, Prop, Skeleton, Tone } from './types'

const CHAIR = { seat: 0.46, depth: 0.42, back: 0.92 }

const LINE = 0.006

type Local = readonly Vec2[]

function shape(id: string, outline: Outline, tone: Tone | null, outlineTone?: Tone, width = LINE): Part {
  return { kind: 'path', id, d: outline.d, points: outline.points, tone, outline: outlineTone, outlineWidth: outlineTone ? width : undefined }
}

function inflate(limb: LimbShape, amount: number): LimbShape {
  return {
    r0: limb.r0 + amount,
    r1: limb.r1 + amount,
    left: limb.left ? [limb.left[0], limb.left[1] + amount] : undefined,
    right: limb.right ? [limb.right[0], limb.right[1] + amount] : undefined,
  }
}

function oriented(limb: LimbShape, skeleton: Skeleton, side: LimbSide): LimbShape {
  if (mirrorSign(skeleton.view, side) > 0) {
    return limb
  }
  return { ...limb, left: limb.right, right: limb.left }
}

function armParts(skeleton: Skeleton, side: LimbSide, far: boolean, build: TrainerBuild): Part[] {
  const p = skeleton.points
  const skin: Tone = far ? 'skinFar' : 'skin'
  const upper = oriented(build.upperArm, skeleton, side)
  const parts: Part[] = [shape(`upperArm${side}`, limbOutline(p[`shoulder${side}`], p[`elbow${side}`], upper), skin)]
  if (build.sleeve !== null) {
    parts.push(
      shape(
        `sleeve${side}`,
        limbOutline(p[`shoulder${side}`], p[`elbow${side}`], inflate(upper, 0.006), build.sleeve, true),
        far ? 'topFar' : 'top',
      ),
    )
  }
  parts.push(
    shape(`forearm${side}`, limbOutline(p[`elbow${side}`], p[`wrist${side}`], oriented(build.forearm, skeleton, side)), skin),
    shape(`hand${side}`, limbOutline(p[`wrist${side}`], p[`hand${side}`], build.hand), skin),
  )
  return parts
}

function shoeOutline(skeleton: Skeleton, side: LimbSide): { shoe: Outline; sole: Outline } {
  const p = skeleton.points
  const ankle = p[`ankle${side}`]
  const toe = p[`toe${side}`]
  const heel = p[`heel${side}`]
  const span = sub(toe, heel)
  const forward = scale(span, 1 / (length(span) || 1e-6))
  const sign = mirrorSign(skeleton.view, side)
  const up: Vec2 = sign > 0 ? [-forward[1], forward[0]] : [forward[1], -forward[0]]
  const r = RIG.soleRadius
  const at = (base: Vec2, along: number, rise: number): Vec2 => add(add(base, scale(forward, along)), scale(up, rise))
  const shoe = [
    at(ankle, -0.042, 0.012),
    at(heel, -0.022, 0.004),
    at(heel, -0.006, -r * 0.95),
    at(lerpVec(heel, toe, 0.5), 0, -r),
    at(toe, 0, -r * 0.92),
    at(toe, r * 0.95, -r * 0.1),
    at(toe, -0.006, r * 0.78),
    at(lerpVec(ankle, toe, 0.55), 0, 0.016),
    at(ankle, 0.034, 0.016),
  ]
  const sole = [at(heel, -0.016, -r * 0.55), at(heel, -0.004, -r * 0.97), at(toe, 0, -r * 0.94), at(toe, r * 0.9, -r * 0.42), at(toe, 0, -r * 0.5)]
  return { shoe: { d: smoothClosed(shoe), points: shoe }, sole: { d: smoothClosed(sole), points: sole } }
}

function legParts(skeleton: Skeleton, side: LimbSide, far: boolean, build: TrainerBuild): Part[] {
  const p = skeleton.points
  const thigh = oriented(build.thigh, skeleton, side)
  const shin = oriented(build.shin, skeleton, side)
  const legging = build.shorts === null
  const skin: Tone = far ? 'skinFar' : 'skin'
  const bottom: Tone = far ? 'bottomFar' : 'bottom'
  const parts: Part[] = [
    shape(`shin${side}`, limbOutline(p[`knee${side}`], p[`ankle${side}`], shin), legging ? bottom : skin),
    shape(`thigh${side}`, limbOutline(p[`hip${side}`], p[`knee${side}`], thigh), legging ? bottom : skin),
  ]
  if (build.shorts !== null) {
    parts.push(shape(`shorts${side}`, limbOutline(p[`hip${side}`], p[`knee${side}`], inflate(thigh, 0.007), build.shorts, true), bottom))
  }
  const { shoe, sole } = shoeOutline(skeleton, side)
  parts.push(shape(`shoe${side}`, shoe, far ? 'shoeFar' : 'shoe', 'shoeFar'), shape(`sole${side}`, sole, 'sole'))
  return parts
}

interface SpineFrame {
  at: (t: number) => Vec2
  angle: (t: number) => number
}

function spineFrame(skeleton: Skeleton): SpineFrame {
  const p = skeleton.points
  const lower = length(sub(p.waist, p.hip))
  const upper = length(sub(p.neck, p.waist))
  const total = lower + upper || 1e-6
  const waistT = lower / total
  const phiLs = skeleton.phi.lowerSpine
  const phiUs = skeleton.phi.upperSpine
  return {
    at: (t) => {
      const distance = t * total
      return distance <= lower ? add(p.hip, scale(dir(phiLs), distance)) : add(p.waist, scale(dir(phiUs), distance - lower))
    },
    angle: (t) => {
      const blend = Math.min(1, Math.max(0, (t - (waistT - 0.16)) / 0.32))
      return lerpAngle(phiLs, phiUs, blend * blend * (3 - 2 * blend))
    },
  }
}

function widthsAt(stations: readonly (readonly number[])[], t: number): number[] {
  if (t <= stations[0][0]) {
    return stations[0].slice(1)
  }
  for (let index = 1; index < stations.length; index += 1) {
    const next = stations[index]
    if (t <= next[0]) {
      const prev = stations[index - 1]
      const fraction = (t - prev[0]) / (next[0] - prev[0])
      return prev.slice(1).map((value, column) => value + (next[column + 1] - value) * fraction)
    }
  }
  return stations[stations.length - 1].slice(1)
}

function torsoRegion(skeleton: Skeleton, build: TrainerBuild, from: number, to: number): Outline {
  const frame = spineFrame(skeleton)
  const side = skeleton.view === 'side'
  const stations: readonly (readonly number[])[] = side ? build.torsoSide : build.torsoFront.map(([t, w]) => [t, w, w])
  const ts = [from, ...stations.map((station) => station[0]).filter((t) => t > from && t < to), to]
  const front: Vec2[] = []
  const back: Vec2[] = []
  for (const t of ts) {
    const [ahead, behind] = widthsAt(stations, t)
    const center = frame.at(t)
    const normal = dir(frame.angle(t) - 90)
    front.push(add(center, scale(normal, ahead)))
    back.push(add(center, scale(normal, -behind)))
  }
  const points = [frame.at(from), ...front, frame.at(to), ...back.reverse()]
  return { d: smoothClosed(points), points }
}

const SEAM = 0.004

function torsoParts(skeleton: Skeleton, build: TrainerBuild): Part[] {
  const side = skeleton.view === 'side'
  const start = side ? -0.2 : -0.13
  const topTo = side || build.sleeve !== null ? build.topTo : 0.95
  return [
    shape('torso', torsoRegion(skeleton, build, start, 1.03), 'skin', 'skin', SEAM),
    shape('bottoms', torsoRegion(skeleton, build, start, build.beltT), 'bottom', 'bottom', SEAM),
    shape('top', torsoRegion(skeleton, build, build.topFrom, topTo), 'top', 'top', SEAM),
  ]
}

const SIDE_FACE = {
  nose: [0.086, -0.012] as Vec2,
  eye: [0.052, 0.012] as Vec2,
  brow: [
    [0.036, 0.039],
    [0.051, 0.045],
    [0.067, 0.042],
  ] as Local,
  ear: [-0.008, -0.004] as Vec2,
}

const HAIR: Record<TrainerBuild['hair'], { side: Local; front: Local }> = {
  ponytail: {
    side: [
      [0.074, 0.066],
      [0.04, 0.104],
      [-0.016, 0.121],
      [-0.07, 0.1],
      [-0.1, 0.046],
      [-0.1, -0.02],
      [-0.086, -0.06],
      [-0.058, -0.05],
      [-0.046, 0],
      [-0.022, 0.044],
      [0.018, 0.068],
      [0.054, 0.074],
    ],
    front: [
      [-0.093, 0.016],
      [-0.095, 0.06],
      [-0.07, 0.1],
      [-0.025, 0.12],
      [0.03, 0.119],
      [0.075, 0.1],
      [0.095, 0.06],
      [0.093, 0.016],
      [0.076, 0.048],
      [0.04, 0.071],
      [0.004, 0.079],
      [-0.044, 0.072],
      [-0.076, 0.046],
    ],
  },
  short: {
    side: [
      [0.08, 0.058],
      [0.052, 0.1],
      [0, 0.124],
      [-0.062, 0.113],
      [-0.101, 0.06],
      [-0.105, 0],
      [-0.09, -0.04],
      [-0.07, -0.022],
      [-0.052, 0.028],
      [0, 0.068],
      [0.05, 0.07],
    ],
    front: [
      [-0.095, 0.022],
      [-0.097, 0.07],
      [-0.06, 0.113],
      [0, 0.124],
      [0.06, 0.113],
      [0.097, 0.07],
      [0.095, 0.022],
      [0.08, 0.058],
      [0.04, 0.076],
      [0, 0.08],
      [-0.04, 0.076],
      [-0.08, 0.058],
    ],
  },
}

const PONYTAIL: Local = [
  [-0.07, 0.086],
  [-0.116, 0.1],
  [-0.166, 0.076],
  [-0.2, 0.012],
  [-0.206, -0.07],
  [-0.182, -0.13],
  [-0.157, -0.1],
  [-0.152, -0.032],
  [-0.127, 0.03],
  [-0.092, 0.056],
]

const HAIR_FLOOR = 0.008

function restingOnFloor(outline: Outline): Outline {
  if (outline.points.every((point) => point[1] >= HAIR_FLOOR)) {
    return outline
  }
  const points = outline.points.map((point): Vec2 => (point[1] < HAIR_FLOOR ? [point[0], HAIR_FLOOR] : point))
  return { d: smoothClosed(points), points }
}

function headParts(skeleton: Skeleton, build: TrainerBuild): { behind: Part[]; front: Part[] } {
  const p = skeleton.points
  const phiHead = skeleton.phi.head
  const rotation = phiHead - 90
  const center = p.head
  const neckTop = add(p.neck, scale(dir(phiHead), RIG.neck + 0.045))
  const neck = shape('neck', limbOutline(p.neck, neckTop, { r0: build.neck * 1.12, r1: build.neck }), 'skin')
  const head = shape('head', ellipseOutline(center, build.head.rx, build.head.ry, rotation, 14), 'skin')
  if (skeleton.view === 'side') {
    const behind: Part[] = []
    if (build.hair === 'ponytail') {
      behind.push(
        shape('ponytail', restingOnFloor(localShape(center, rotation, PONYTAIL)), 'hair'),
        shape('hairTie', ellipseOutline(localToWorld(center, rotation, [-0.1, 0.074]), 0.018, 0.022, rotation + 20, 8), 'accent'),
      )
    }
    return {
      behind,
      front: [
        neck,
        shape('nose', ellipseOutline(localToWorld(center, rotation, SIDE_FACE.nose), 0.017, 0.02, rotation, 8), 'skin'),
        head,
        shape('hair', restingOnFloor(localShape(center, rotation, HAIR[build.hair].side)), 'hair'),
        shape('ear', ellipseOutline(localToWorld(center, rotation, SIDE_FACE.ear), 0.016, 0.024, rotation, 8), 'skinShade'),
        shape('eye', ellipseOutline(localToWorld(center, rotation, SIDE_FACE.eye), 0.0085, 0.0125, rotation, 8), 'eye'),
        shape('brow', localStroke(center, rotation, SIDE_FACE.brow), null, 'hair', 0.008),
      ],
    }
  }
  const spot = (local: Vec2) => localToWorld(center, rotation, local)
  const behind: Part[] = [
    shape('earL', ellipseOutline(spot([build.head.rx - 0.002, -0.006]), 0.014, 0.023, rotation, 8), 'skinShade'),
    shape('earR', ellipseOutline(spot([-build.head.rx + 0.002, -0.006]), 0.014, 0.023, rotation, 8), 'skinShade'),
  ]
  if (build.hair === 'ponytail') {
    behind.push(shape('ponytail', ellipseOutline(spot([0, 0.122]), 0.044, 0.032, rotation, 10), 'hair'))
  }
  return {
    behind: [neck, ...behind],
    front: [
      head,
      shape('hair', localShape(center, rotation, HAIR[build.hair].front), 'hair'),
      shape('eyeL', ellipseOutline(spot([0.033, 0.008]), 0.0085, 0.012, rotation, 8), 'eye'),
      shape('eyeR', ellipseOutline(spot([-0.033, 0.008]), 0.0085, 0.012, rotation, 8), 'eye'),
      shape('browL', localStroke(center, rotation, [[0.02, 0.033], [0.034, 0.038], [0.048, 0.034]]), null, 'hair', 0.008),
      shape('browR', localStroke(center, rotation, [[-0.02, 0.033], [-0.034, 0.038], [-0.048, 0.034]]), null, 'hair', 0.008),
      shape('nose', localStroke(center, rotation, [[0.002, -0.004], [0.008, -0.022], [0, -0.028]]), null, 'skinShade', 0.006),
      shape('mouth', localStroke(center, rotation, [[-0.02, -0.05], [0, -0.058], [0.02, -0.05]]), null, 'skinShade', 0.007),
    ],
  }
}

export function skeletonParts(skeleton: Skeleton, look: Look = DEFAULT_LOOK): Part[] {
  const build = TRAINERS[look.trainer]
  const head = headParts(skeleton, build)
  if (skeleton.view === 'side') {
    return [
      ...armParts(skeleton, 'R', true, build),
      ...legParts(skeleton, 'R', true, build),
      ...head.behind,
      ...torsoParts(skeleton, build),
      ...head.front,
      ...legParts(skeleton, 'L', false, build),
      ...armParts(skeleton, 'L', false, build),
    ]
  }
  return [
    ...legParts(skeleton, 'R', false, build),
    ...legParts(skeleton, 'L', false, build),
    ...torsoParts(skeleton, build),
    ...armParts(skeleton, 'R', false, build),
    ...armParts(skeleton, 'L', false, build),
    ...head.behind,
    ...head.front,
  ]
}

function rect(id: string, x0: number, y0: number, x1: number, y1: number, tone: Tone, width = 0.02): Part {
  return {
    kind: 'poly',
    id,
    points: [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ],
    width,
    tone,
    closed: true,
  }
}

export function propParts(props: Prop[]): { back: Part[]; under: Part[] } {
  const back: Part[] = []
  const under: Part[] = []
  props.forEach((prop, index) => {
    if (prop.kind === 'chair') {
      const f = prop.facing
      const front = prop.x
      const rear = prop.x - f * CHAIR.depth
      back.push(
        { kind: 'seg', id: `chair${index}-back`, a: [rear, CHAIR.seat], b: [rear - f * 0.04, CHAIR.back], width: 0.05, tone: 'prop' },
        { kind: 'seg', id: `chair${index}-legBack`, a: [rear + f * 0.02, CHAIR.seat], b: [rear + f * 0.02, 0.01], width: 0.04, tone: 'prop' },
        { kind: 'seg', id: `chair${index}-legFront`, a: [front - f * 0.03, CHAIR.seat], b: [front - f * 0.03, 0.01], width: 0.04, tone: 'prop' },
        { kind: 'seg', id: `chair${index}-seat`, a: [rear, CHAIR.seat - 0.015], b: [front, CHAIR.seat - 0.015], width: 0.05, tone: 'prop' },
      )
    } else if (prop.kind === 'wall') {
      back.push(rect(`wall${index}`, prop.x, 0, prop.x + prop.side * 0.22, 2.25, 'propSoft', 0))
    } else {
      under.push(rect(`mat${index}`, prop.x0, -0.004, prop.x1, 0.018, 'propSoft', 0.016))
    }
  })
  return { back, under }
}

export const CHAIR_SEAT_HEIGHT = CHAIR.seat

export interface Shadow {
  cx: number
  rx: number
  opacity: number
}

export function shadowFor(skeleton: Skeleton): Shadow {
  const near = Object.values(skeleton.points).filter((point) => point[1] < 0.32)
  if (near.length === 0) {
    const height = Math.max(0, skeleton.points.hip[1] - 0.97)
    return { cx: skeleton.points.hip[0], rx: 0.26, opacity: Math.max(0.12, 0.35 - height) }
  }
  const xs = near.map((point) => point[0])
  const min = Math.min(...xs)
  const max = Math.max(...xs)
  return { cx: (min + max) / 2, rx: (max - min) / 2 + 0.14, opacity: 0.35 }
}

export function partExtent(part: Part): Vec2[] {
  switch (part.kind) {
    case 'seg':
      return expand([part.a, part.b], part.width / 2)
    case 'poly':
      return expand(part.points, part.width / 2)
    case 'circle':
      return expand([part.center], part.r)
    case 'path':
      return part.points
  }
}

function expand(points: Vec2[], radius: number): Vec2[] {
  return points.flatMap((point) => [
    add(point, scale(dir(0), radius)),
    add(point, scale(dir(90), radius)),
    add(point, scale(dir(180), radius)),
    add(point, scale(dir(270), radius)),
  ])
}
