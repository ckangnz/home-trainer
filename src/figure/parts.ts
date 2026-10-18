import { add, along, dir, lerpAngle, scale, type Vec2 } from './math'
import { RIG, WIDTH } from './rig'
import type { LimbSide, Part, Prop, Skeleton, Tone } from './types'

const CHAIR = { seat: 0.46, depth: 0.42, back: 0.92 }

const PELVIS_RISE = 0.1

function armParts(skeleton: Skeleton, side: LimbSide, far: boolean): Part[] {
  const p = skeleton.points
  const tone: Tone = far ? 'skinFar' : 'skin'
  return [
    { kind: 'seg', id: `upperArm${side}`, a: p[`shoulder${side}`], b: p[`elbow${side}`], width: WIDTH.upperArm, tone },
    { kind: 'seg', id: `forearm${side}`, a: p[`elbow${side}`], b: p[`wrist${side}`], width: WIDTH.forearm, tone },
    { kind: 'seg', id: `hand${side}`, a: p[`wrist${side}`], b: p[`hand${side}`], width: WIDTH.hand, tone },
  ]
}

function legParts(skeleton: Skeleton, side: LimbSide, far: boolean): Part[] {
  const p = skeleton.points
  return [
    { kind: 'seg', id: `shin${side}`, a: p[`knee${side}`], b: p[`ankle${side}`], width: WIDTH.shin, tone: far ? 'skinFar' : 'skin' },
    { kind: 'seg', id: `thigh${side}`, a: p[`hip${side}`], b: p[`knee${side}`], width: WIDTH.thigh, tone: far ? 'shortsFar' : 'shorts' },
    {
      kind: 'poly',
      id: `foot${side}`,
      points: [p[`ankle${side}`], p[`toe${side}`], p[`heel${side}`]],
      width: WIDTH.foot,
      tone: far ? 'shoeFar' : 'shoe',
      closed: true,
    },
  ]
}

function headParts(skeleton: Skeleton): Part[] {
  const p = skeleton.points
  const phiHead = skeleton.phi.head
  const neckTop = along(p.neck, phiHead, RIG.neck + RIG.headRadius * 0.4)
  const cap =
    skeleton.view === 'side'
      ? { from: phiHead - 35, to: phiHead + 150 }
      : { from: phiHead - 78, to: phiHead + 78 }
  return [
    { kind: 'seg', id: 'neck', a: p.neck, b: neckTop, width: WIDTH.neck, tone: 'skin' },
    { kind: 'circle', id: 'head', center: p.head, r: RIG.headRadius, tone: 'skin' },
    { kind: 'cap', id: 'hair', center: p.head, r: RIG.headRadius, from: cap.from, to: cap.to, tone: 'hair' },
  ]
}

function frontTorso(skeleton: Skeleton): Part[] {
  const p = skeleton.points
  const phiLs = skeleton.phi.lowerSpine
  const phiWaist = lerpAngle(phiLs, skeleton.phi.upperSpine, 0.5)
  const waistL = along(p.waist, phiWaist - 90, RIG.waistHalfWidth)
  const waistR = along(p.waist, phiWaist + 90, RIG.waistHalfWidth)
  const beltL = along(p.hipL, phiLs, PELVIS_RISE)
  const beltR = along(p.hipR, phiLs, PELVIS_RISE)
  return [
    {
      kind: 'poly',
      id: 'torso',
      points: [p.hipL, waistL, p.shoulderL, p.shoulderR, waistR, p.hipR],
      width: WIDTH.torsoFrontEdge,
      tone: 'shirt',
      closed: true,
    },
    { kind: 'poly', id: 'pelvis', points: [p.hipL, beltL, beltR, p.hipR], width: WIDTH.torsoFrontEdge, tone: 'shorts', closed: true },
  ]
}

function sideTorso(skeleton: Skeleton): Part[] {
  const p = skeleton.points
  return [
    { kind: 'poly', id: 'torso', points: [p.hip, p.waist, p.neck], width: WIDTH.torsoSide, tone: 'shirt', closed: false },
    { kind: 'seg', id: 'pelvis', a: p.hip, b: along(p.hip, skeleton.phi.lowerSpine, PELVIS_RISE), width: WIDTH.torsoSide, tone: 'shorts' },
  ]
}

export function skeletonParts(skeleton: Skeleton): Part[] {
  if (skeleton.view === 'side') {
    return [
      ...armParts(skeleton, 'R', true),
      ...legParts(skeleton, 'R', true),
      ...sideTorso(skeleton),
      ...headParts(skeleton),
      ...legParts(skeleton, 'L', false),
      ...armParts(skeleton, 'L', false),
    ]
  }
  return [
    ...legParts(skeleton, 'R', false),
    ...legParts(skeleton, 'L', false),
    ...frontTorso(skeleton),
    ...armParts(skeleton, 'R', false),
    ...armParts(skeleton, 'L', false),
    ...headParts(skeleton),
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
    case 'cap':
      return expand([part.center], part.r)
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
