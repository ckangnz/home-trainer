import { add, angleOf, dir, length, lerpAngle, lerpVec, scale, sub, type Vec2 } from './math'
import { RIG, mirrorSign } from './rig'
import { DEFAULT_LOOK, TRAINERS, type Look, type TrainerBuild } from './look'
import { ellipseOutline, limbOutline, localShape, localStroke, localToWorld, smoothClosed, smoothOpen, type LimbShape, type Outline } from './shapes'
import { STILL, type Secondary } from './secondary'
import type { Grip, JointId, LimbSide, Part, Prop, Skeleton, Tone } from './types'

const CHAIR = { seat: 0.46, depth: 0.42, back: 0.92 }

const BENCH = { height: 0.45, pad: 0.08, inset: 0.1 }

const ROLLER = { r: 0.075, length: 0.9 }

const BALL_R = 0.035

const DUMBBELL = { head: 0.06, hub: 0.022, handle: 0.075, offset: 0.1, headHalf: 0.048, headWidth: 0.05, bar: 0.026 }

const KETTLEBELL = { drop: 0.13, rx: 0.08, ry: 0.074, handle: 0.045, handleWidth: 0.02 }

const BARBELL = { plate: 0.19, half: 0.82, plateAt: 0.66, bar: 0.026 }

const BAND_WIDTH = 0.012

const STRAP_WIDTH = 0.016

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

function armParts(skeleton: Skeleton, side: LimbSide, far: boolean, build: TrainerBuild, grip: Part[] = []): Part[] {
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
    ...grip,
    shape(`hand${side}`, limbOutline(p[`wrist${side}`], p[`hand${side}`], build.hand), skin),
  )
  return parts
}

function footFrame(skeleton: Skeleton, side: LimbSide): { forward: Vec2; up: Vec2 } {
  const p = skeleton.points
  const span = sub(p[`toe${side}`], p[`heel${side}`])
  const forward = scale(span, 1 / (length(span) || 1e-6))
  const sign = mirrorSign(skeleton.view, side)
  const up: Vec2 = sign > 0 ? [-forward[1], forward[0]] : [forward[1], -forward[0]]
  return { forward, up }
}

function shoeOutline(skeleton: Skeleton, side: LimbSide): { shoe: Outline; sole: Outline } {
  const p = skeleton.points
  const ankle = p[`ankle${side}`]
  const toe = p[`toe${side}`]
  const heel = p[`heel${side}`]
  const { forward, up } = footFrame(skeleton, side)
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

const BREATH_SWELL = 0.035

function chestSwell(t: number): number {
  const x = Math.min(1, Math.max(0, (t - 0.5) / 0.45))
  return Math.sin(x * Math.PI)
}

function torsoRegion(skeleton: Skeleton, build: TrainerBuild, from: number, to: number, breath = 0): Outline {
  const frame = spineFrame(skeleton)
  const side = skeleton.view === 'side'
  const stations: readonly (readonly number[])[] = side ? build.torsoSide : build.torsoFront.map(([t, w]) => [t, w, w])
  const ts = [from, ...stations.map((station) => station[0]).filter((t) => t > from && t < to), to]
  const front: Vec2[] = []
  const back: Vec2[] = []
  for (const t of ts) {
    const swell = 1 + breath * BREATH_SWELL * chestSwell(t)
    const [ahead, behind] = widthsAt(stations, t).map((width) => width * swell)
    const center = frame.at(t)
    const normal = dir(frame.angle(t) - 90)
    front.push(add(center, scale(normal, ahead)))
    back.push(add(center, scale(normal, -behind)))
  }
  const points = [frame.at(from), ...front, frame.at(to), ...back.reverse()]
  return { d: smoothClosed(points), points }
}

const SEAM = 0.004

function torsoParts(skeleton: Skeleton, build: TrainerBuild, breath: number): Part[] {
  const side = skeleton.view === 'side'
  const start = side ? -0.2 : -0.13
  const topTo = side || build.sleeve !== null ? build.topTo : 0.95
  return [
    shape('torso', torsoRegion(skeleton, build, start, 1.03, breath), 'skin', 'skin', SEAM),
    shape('bottoms', torsoRegion(skeleton, build, start, build.beltT, breath), 'bottom', 'bottom', SEAM),
    shape('top', torsoRegion(skeleton, build, build.topFrom, topTo, breath), 'top', 'top', SEAM),
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

const TIE: Vec2 = [-0.1, 0.074]

const BLINK_CLOSE = 0.88

function swung(outline: Outline, pivot: Vec2, degrees: number): Outline {
  if (degrees === 0) {
    return outline
  }
  const turn = dir(degrees)
  const points = outline.points.map((point): Vec2 => {
    const dx = point[0] - pivot[0]
    const dy = point[1] - pivot[1]
    return [pivot[0] + dx * turn[0] - dy * turn[1], pivot[1] + dx * turn[1] + dy * turn[0]]
  })
  return { d: smoothClosed(points), points }
}

function shifted(outline: Outline, offset: Vec2): Outline {
  if (offset[0] === 0 && offset[1] === 0) {
    return outline
  }
  const points = outline.points.map((point) => add(point, offset))
  return { d: smoothClosed(points), points }
}

function headParts(skeleton: Skeleton, build: TrainerBuild, motion: Secondary): { behind: Part[]; front: Part[] } {
  const p = skeleton.points
  const phiHead = skeleton.phi.head
  const rotation = phiHead - 90
  const center = p.head
  const neckTop = add(p.neck, scale(dir(phiHead), RIG.neck + 0.045))
  const neck = shape('neck', limbOutline(p.neck, neckTop, { r0: build.neck * 1.12, r1: build.neck }), 'skin')
  const head = shape('head', ellipseOutline(center, build.head.rx, build.head.ry, rotation, 14), 'skin')
  const eyeOpen = 1 - BLINK_CLOSE * motion.blink
  const hairLift = scale(dir(phiHead), motion.hair)
  if (skeleton.view === 'side') {
    const behind: Part[] = []
    if (build.hair === 'ponytail') {
      const tie = localToWorld(center, rotation, TIE)
      behind.push(
        shape('ponytail', restingOnFloor(swung(localShape(center, rotation, PONYTAIL), tie, motion.ponytail)), 'hair'),
        shape('hairTie', ellipseOutline(tie, 0.018, 0.022, rotation + 20, 8), 'accent'),
      )
    }
    return {
      behind,
      front: [
        neck,
        shape('nose', ellipseOutline(localToWorld(center, rotation, SIDE_FACE.nose), 0.017, 0.02, rotation, 8), 'skin'),
        head,
        shape('hair', restingOnFloor(shifted(localShape(center, rotation, HAIR[build.hair].side), hairLift)), 'hair'),
        shape('ear', ellipseOutline(localToWorld(center, rotation, SIDE_FACE.ear), 0.016, 0.024, rotation, 8), 'skinShade'),
        shape('eye', ellipseOutline(localToWorld(center, rotation, SIDE_FACE.eye), 0.0085, 0.0125 * eyeOpen, rotation, 8), 'eye'),
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
      shape('hair', shifted(localShape(center, rotation, HAIR[build.hair].front), hairLift), 'hair'),
      shape('eyeL', ellipseOutline(spot([0.033, 0.008]), 0.0085, 0.012 * eyeOpen, rotation, 8), 'eye'),
      shape('eyeR', ellipseOutline(spot([-0.033, 0.008]), 0.0085, 0.012 * eyeOpen, rotation, 8), 'eye'),
      shape('browL', localStroke(center, rotation, [[0.02, 0.033], [0.034, 0.038], [0.048, 0.034]]), null, 'hair', 0.008),
      shape('browR', localStroke(center, rotation, [[-0.02, 0.033], [-0.034, 0.038], [-0.048, 0.034]]), null, 'hair', 0.008),
      shape('nose', localStroke(center, rotation, [[0.002, -0.004], [0.008, -0.022], [0, -0.028]]), null, 'skinShade', 0.006),
      shape('mouth', localStroke(center, rotation, [[-0.02, -0.05], [0, -0.058], [0.02, -0.05]]), null, 'skinShade', 0.007),
    ],
  }
}

export function skeletonParts(skeleton: Skeleton, look: Look = DEFAULT_LOOK, props: readonly Prop[] = [], motion: Secondary = STILL): Part[] {
  const build = TRAINERS[look.trainer]
  const head = headParts(skeleton, build, motion)
  const held = heldSlots(skeleton, props)
  if (skeleton.view === 'side') {
    return [
      ...armParts(skeleton, 'R', true, build, held.gripR),
      ...held.overR,
      ...legParts(skeleton, 'R', true, build),
      ...held.afterLegR,
      ...held.under,
      ...head.behind,
      ...torsoParts(skeleton, build, motion.breath),
      ...head.front,
      ...held.mid,
      ...legParts(skeleton, 'L', false, build),
      ...held.afterLegL,
      ...armParts(skeleton, 'L', false, build, held.gripL),
      ...held.overL,
      ...held.top,
    ]
  }
  return [
    ...held.under,
    ...legParts(skeleton, 'R', false, build),
    ...held.afterLegR,
    ...legParts(skeleton, 'L', false, build),
    ...held.afterLegL,
    ...torsoParts(skeleton, build, motion.breath),
    ...held.mid,
    ...armParts(skeleton, 'R', false, build, held.gripR),
    ...held.overR,
    ...armParts(skeleton, 'L', false, build, held.gripL),
    ...held.overL,
    ...head.behind,
    ...head.front,
    ...held.top,
  ]
}

type Slot = 'under' | 'gripL' | 'gripR' | 'overL' | 'overR' | 'afterLegL' | 'afterLegR' | 'mid' | 'top'

const SLOTS: readonly Slot[] = ['under', 'gripL', 'gripR', 'overL', 'overR', 'afterLegL', 'afterLegR', 'mid', 'top']

const GRIP_ALONG = 0.42

export function gripPoint(skeleton: Skeleton, side: LimbSide): Vec2 {
  return lerpVec(skeleton.points[`wrist${side}`], skeleton.points[`hand${side}`], GRIP_ALONG)
}

function handsOf(grip: Grip): LimbSide[] {
  return grip === 'both' ? ['L', 'R'] : [grip]
}

function unit(v: Vec2, fallback: Vec2): Vec2 {
  const size = length(v)
  return size < 1e-6 ? fallback : scale(v, 1 / size)
}

function seg(id: string, a: Vec2, b: Vec2, width: number, tone: Tone): Part {
  return { kind: 'seg', id, a, b, width, tone }
}

function circle(id: string, center: Vec2, r: number, tone: Tone): Part {
  return { kind: 'circle', id, center, r, tone }
}

function hexagon(center: Vec2, r: number, rotation: number): Vec2[] {
  return Array.from({ length: 6 }, (_, index) => add(center, scale(dir(rotation + index * 60), r)))
}

function dumbbellParts(skeleton: Skeleton, side: LimbSide, id: string): Part[] {
  const grip = gripPoint(skeleton, side)
  if (skeleton.view === 'side') {
    return [
      { kind: 'poly', id: `${id}-rim`, points: hexagon(grip, DUMBBELL.head, skeleton.phi[`hand${side}`] + 30), width: 0.016, tone: 'ironLight', closed: true },
      { kind: 'poly', id: `${id}-head`, points: hexagon(grip, DUMBBELL.head - 0.012, skeleton.phi[`hand${side}`] + 30), width: 0.01, tone: 'iron', closed: true },
      circle(`${id}-hub`, grip, DUMBBELL.hub, 'ironLight'),
    ]
  }
  const across: Vec2 = [1, 0]
  const up: Vec2 = [0, 1]
  const head = (sign: 1 | -1, suffix: string) => {
    const center = add(grip, scale(across, sign * DUMBBELL.offset))
    return seg(`${id}-${suffix}`, add(center, scale(up, -DUMBBELL.headHalf)), add(center, scale(up, DUMBBELL.headHalf)), DUMBBELL.headWidth, 'iron')
  }
  return [
    seg(`${id}-bar`, add(grip, scale(across, -DUMBBELL.handle)), add(grip, scale(across, DUMBBELL.handle)), DUMBBELL.bar, 'ironLight'),
    head(-1, 'headA'),
    head(1, 'headB'),
  ]
}

function kettlebellParts(skeleton: Skeleton, hands: LimbSide[], hang: 'down' | 'arm', id: string): Part[] {
  const grips = hands.map((side) => gripPoint(skeleton, side))
  const grip = grips.length === 2 ? lerpVec(grips[0], grips[1], 0.5) : grips[0]
  const reach = hands
    .map((side) => sub(skeleton.points[`hand${side}`], skeleton.points[`wrist${side}`]))
    .reduce((sum, v) => add(sum, v), [0, 0] as Vec2)
  const down = hang === 'arm' ? unit(reach, [0, -1]) : ([0, -1] as Vec2)
  const across: Vec2 = [-down[1], down[0]]
  const center = add(grip, scale(down, KETTLEBELL.drop))
  const at = (alongDown: number, alongAcross: number): Vec2 => add(add(grip, scale(down, alongDown)), scale(across, alongAcross))
  const handle = [
    at(KETTLEBELL.drop - 0.04, KETTLEBELL.handle + 0.012),
    at(0.012, KETTLEBELL.handle),
    at(-0.012, 0),
    at(0.012, -KETTLEBELL.handle),
    at(KETTLEBELL.drop - 0.04, -KETTLEBELL.handle - 0.012),
  ]
  return [
    { kind: 'path', id: `${id}-handle`, d: smoothOpen(handle), points: handle, tone: null, outline: 'iron', outlineWidth: KETTLEBELL.handleWidth },
    shape(`${id}-bell`, ellipseOutline(center, KETTLEBELL.rx, KETTLEBELL.ry, angleOf(across), 14), 'iron'),
    shape(`${id}-shine`, ellipseOutline(add(center, add(scale(down, -0.03), scale(across, 0.035))), 0.016, 0.01, angleOf(across) - 40, 8), 'ironLight'),
  ]
}

function barbellParts(skeleton: Skeleton, plate: number, id: string): Part[] {
  const left = gripPoint(skeleton, 'L')
  const right = gripPoint(skeleton, 'R')
  const center = lerpVec(left, right, 0.5)
  if (skeleton.view === 'side') {
    return [
      circle(`${id}-plate`, center, plate, 'iron'),
      circle(`${id}-ring`, center, plate * 0.7, 'ironLight'),
      circle(`${id}-face`, center, plate * 0.62, 'iron'),
      circle(`${id}-sleeve`, center, 0.026, 'ironLight'),
    ]
  }
  const along = unit(sub(left, right), [1, 0])
  const normal: Vec2 = [-along[1], along[0]]
  const plateParts = ([1, -1] as const).flatMap((sign) => {
    const at = add(center, scale(along, sign * BARBELL.plateAt))
    const collar = add(center, scale(along, sign * (BARBELL.plateAt - 0.06)))
    const tag = sign > 0 ? 'L' : 'R'
    return [
      seg(`${id}-plate${tag}`, add(at, scale(normal, -(plate - 0.03))), add(at, scale(normal, plate - 0.03)), 0.06, 'iron'),
      seg(`${id}-collar${tag}`, add(collar, scale(normal, -0.035)), add(collar, scale(normal, 0.035)), 0.024, 'ironLight'),
    ]
  })
  return [seg(`${id}-bar`, add(center, scale(along, -BARBELL.half)), add(center, scale(along, BARBELL.half)), BARBELL.bar, 'ironLight'), ...plateParts]
}

function anchorPoint(skeleton: Skeleton, from: Vec2 | JointId): Vec2 {
  if (typeof from !== 'string') {
    return from
  }
  if (from === 'ankleL' || from === 'ankleR') {
    const side: LimbSide = from === 'ankleL' ? 'L' : 'R'
    const { up } = footFrame(skeleton, side)
    const mid = lerpVec(skeleton.points[`heel${side}`], skeleton.points[`toe${side}`], 0.45)
    return add(mid, scale(up, -RIG.soleRadius * 0.8))
  }
  return skeleton.points[from]
}

function underX(skeleton: Skeleton, joint: JointId, dx = 0): number {
  return skeleton.points[joint][0] + dx
}

function rollerParts(skeleton: Skeleton, joint: JointId, dx: number | undefined, id: string): Part[] {
  const x = underX(skeleton, joint, dx)
  const center: Vec2 = [x, ROLLER.r]
  if (skeleton.view === 'front') {
    const half = ROLLER.length / 2 - ROLLER.r
    return [
      seg(`${id}-body`, [x - half, ROLLER.r], [x + half, ROLLER.r], ROLLER.r * 2, 'foam'),
      seg(`${id}-shine`, [x - half, ROLLER.r * 1.45], [x + half, ROLLER.r * 1.45], 0.014, 'foamLight'),
    ]
  }
  const spin = (-x / ROLLER.r) * (180 / Math.PI)
  return [
    circle(`${id}-body`, center, ROLLER.r, 'foam'),
    circle(`${id}-cap`, center, ROLLER.r * 0.62, 'foamLight'),
    circle(`${id}-core`, center, ROLLER.r * 0.3, 'foam'),
    circle(`${id}-mark`, add(center, scale(dir(spin), ROLLER.r * 0.82)), 0.009, 'foamLight'),
  ]
}

function strapParts(skeleton: Skeleton, foot: LimbSide, hands: LimbSide[], id: string): Part[] {
  const { up } = footFrame(skeleton, foot)
  const ball = lerpVec(skeleton.points[`heel${foot}`], skeleton.points[`toe${foot}`], 0.68)
  const sole = add(ball, scale(up, -RIG.soleRadius * 1.05))
  const top = add(ball, scale(up, RIG.soleRadius * 0.95))
  return [
    ...hands.map((side) => seg(`${id}-strand${side}`, sole, gripPoint(skeleton, side), STRAP_WIDTH, 'band')),
    seg(`${id}-wrap`, top, sole, STRAP_WIDTH * 1.6, 'band'),
  ]
}

function heldSlots(skeleton: Skeleton, props: readonly Prop[]): Record<Slot, Part[]> {
  const slots = Object.fromEntries(SLOTS.map((slot) => [slot, [] as Part[]])) as Record<Slot, Part[]>
  const grip = (side: LimbSide): Slot => (side === 'L' ? 'gripL' : 'gripR')
  const over = (side: LimbSide): Slot => (side === 'L' ? 'overL' : 'overR')
  const side = skeleton.view === 'side'
  props.forEach((prop, index) => {
    const id = `${prop.kind}${index}`
    switch (prop.kind) {
      case 'dumbbell':
        for (const hand of handsOf(prop.hand)) {
          slots[side ? over(hand) : grip(hand)].push(...dumbbellParts(skeleton, hand, `${id}${hand}`))
        }
        return
      case 'kettlebell': {
        const hands = handsOf(prop.hand)
        slots[hands.length === 2 ? 'mid' : grip(hands[0])].push(...kettlebellParts(skeleton, hands, prop.hang ?? 'down', id))
        return
      }
      case 'barbell':
        slots[side ? 'top' : 'mid'].push(...barbellParts(skeleton, prop.plate ?? BARBELL.plate, id))
        return
      case 'band': {
        const anchor = anchorPoint(skeleton, prop.from)
        for (const hand of handsOf(prop.hand)) {
          slots[grip(hand)].push(seg(`${id}-strand${hand}`, anchor, gripPoint(skeleton, hand), BAND_WIDTH, 'band'))
        }
        if (typeof prop.from !== 'string') {
          slots.under.push(circle(`${id}-anchor`, anchor, 0.016, 'band'))
        }
        return
      }
      case 'strap':
        slots[prop.foot === 'L' ? 'afterLegL' : 'afterLegR'].push(...strapParts(skeleton, prop.foot, handsOf(prop.hand), id))
        return
      case 'foamRoller':
        slots.under.push(...rollerParts(skeleton, prop.under, prop.dx, id))
        return
      case 'massageBall': {
        const center: Vec2 = [underX(skeleton, prop.under, prop.dx), prop.y ?? BALL_R]
        slots.under.push(circle(`${id}-ball`, center, BALL_R, 'band'), circle(`${id}-shine`, add(center, [-0.011, 0.012]), 0.008, 'propSoft'))
        return
      }
      default:
        return
    }
  })
  return slots
}

export function heldPropParts(skeleton: Skeleton, props: readonly Prop[]): Part[] {
  const slots = heldSlots(skeleton, props)
  return SLOTS.flatMap((slot) => slots[slot])
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

function benchParts(x0: number, x1: number, id: string): Part[] {
  const lo = Math.min(x0, x1)
  const hi = Math.max(x0, x1)
  const padY = BENCH.height - BENCH.pad / 2
  const legA = lo + Math.min(BENCH.inset, (hi - lo) / 4)
  const legB = hi - Math.min(BENCH.inset, (hi - lo) / 4)
  const railY = BENCH.height - BENCH.pad - 0.03
  return [
    seg(`${id}-legA`, [legA, railY], [legA, 0.03], 0.035, 'iron'),
    seg(`${id}-legB`, [legB, railY], [legB, 0.03], 0.035, 'iron'),
    seg(`${id}-footA`, [legA - 0.07, 0.015], [legA + 0.07, 0.015], 0.03, 'iron'),
    seg(`${id}-footB`, [legB - 0.07, 0.015], [legB + 0.07, 0.015], 0.03, 'iron'),
    seg(`${id}-rail`, [legA, railY], [legB, railY], 0.035, 'iron'),
    seg(`${id}-pad`, [lo + BENCH.pad / 2, padY], [hi - BENCH.pad / 2, padY], BENCH.pad, 'prop'),
  ]
}

function boxPart(x0: number, x1: number, height: number, id: string): Part {
  const lo = Math.min(x0, x1)
  const hi = Math.max(x0, x1)
  const points: Vec2[] = [
    [lo, 0],
    [hi, 0],
    [hi, height],
    [lo, height],
  ]
  const d = `M${points.map((point) => `${Number(point[0].toFixed(4))} ${Number(point[1].toFixed(4))}`).join('L')}Z`
  return { kind: 'path', id, d, points, tone: 'propSoft', outline: 'prop', outlineWidth: 0.016 }
}

export function propParts(props: readonly Prop[]): { back: Part[]; under: Part[] } {
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
    } else if (prop.kind === 'mat') {
      under.push(rect(`mat${index}`, prop.x0, -0.004, prop.x1, 0.018, 'propSoft', 0.016))
    } else if (prop.kind === 'bench') {
      back.push(...benchParts(prop.x0, prop.x1, `bench${index}`))
    } else if (prop.kind === 'box') {
      back.push(boxPart(prop.x0, prop.x1, prop.height, `box${index}`))
    }
  })
  return { back, under }
}

export const CHAIR_SEAT_HEIGHT = CHAIR.seat

export const BENCH_HEIGHT = BENCH.height

export const ROLLER_RADIUS = ROLLER.r

export const BALL_RADIUS = BALL_R

export interface Shadow {
  cx: number
  rx: number
  opacity: number
}

const SHADOW_LIFT_FROM = 0.06

export function shadowFor(skeleton: Skeleton): Shadow {
  const points = Object.values(skeleton.points)
  const near = points.filter((point) => point[1] < 0.32)
  if (near.length === 0) {
    const height = Math.max(0, skeleton.points.hip[1] - 0.97)
    return { cx: skeleton.points.hip[0], rx: 0.26, opacity: Math.max(0.12, 0.35 - height) }
  }
  const xs = near.map((point) => point[0])
  const min = Math.min(...xs)
  const max = Math.max(...xs)
  const lift = Math.max(0, Math.min(...points.map((point) => point[1])) - SHADOW_LIFT_FROM)
  const shrink = Math.max(0.72, 1 - lift * 1.1)
  const fade = Math.max(0.4, 1 - lift * 2.4)
  return { cx: (min + max) / 2, rx: ((max - min) / 2 + 0.14) * shrink, opacity: 0.35 * fade }
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
