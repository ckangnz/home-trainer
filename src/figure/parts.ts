import { add, angleOf, dir, length, lerpAngle, lerpVec, scale, sub, type Vec2 } from './math'
import { RIG, mirrorSign } from './rig'
import { DEFAULT_LOOK, TRAINERS, type Look, type TrainerBuild } from './look'
import { ellipseOutline, limbOutline, smoothClosed, smoothOpen, type LimbShape, type Outline } from './shapes'
import { headParts, shape } from './head'
import { STILL, type Secondary } from './secondary'
import type { Grip, JointId, LimbSide, Part, Prop, Skeleton, Tone } from './types'

const CHAIR = { seat: 0.46, depth: 0.42, back: 0.92 }

const BENCH = { height: 0.45, pad: 0.08, inset: 0.1 }

const ROLLER = { r: 0.075, length: 0.9 }

const BALL_R = 0.035

const DUMBBELL = { head: 0.062, rim: 0.066, face: 0.052, hub: 0.022, handle: 0.075, offset: 0.1, half: 0.024, bar: 0.026, edge: 0.006, line: 0.002, cup: 0.03 }

const KETTLEBELL = { drop: 0.13, rx: 0.08, ry: 0.074, handle: 0.045, handleWidth: 0.02 }

const BARBELL = { plate: 0.19, half: 0.82, plateAt: 0.66, bar: 0.026 }

const BAND_WIDTH = 0.012

const STRAP_WIDTH = 0.016

const STRIPE_WIDTH = 0.011

const SWOOSH_WIDTH = 0.012

export function buildFor(look: Look): TrainerBuild {
  return TRAINERS[look.trainer] ?? TRAINERS[DEFAULT_LOOK.trainer]
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

interface Bone {
  at: (t: number, offset: number) => Vec2
  radius: (t: number) => number
}

function bone(a: Vec2, b: Vec2, limb: LimbShape): Bone {
  const span = sub(b, a)
  const full = length(span) || 1e-6
  const u = scale(span, 1 / full)
  const n: Vec2 = [-u[1], u[0]]
  const radius = (t: number) => limb.r0 + (limb.r1 - limb.r0) * t
  return {
    radius,
    at: (t, offset) => add(add(a, scale(u, full * t)), scale(n, offset * radius(t))),
  }
}

const SHEEN_STEPS = [0, 0.25, 0.5, 0.75, 1]

function sheen(a: Vec2, b: Vec2, limb: LimbShape, from: number, to: number, offset: number, width: number): Outline {
  const frame = bone(a, b, limb)
  const at = (s: number, side: number) => frame.at(from + (to - from) * s, offset + side * Math.sin(Math.PI * s) * width)
  const points = [...SHEEN_STEPS.map((s) => at(s, 1)), ...SHEEN_STEPS.slice(1, -1).reverse().map((s) => at(s, -1))]
  return { d: smoothClosed(points), points }
}

function armParts(skeleton: Skeleton, side: LimbSide, far: boolean, build: TrainerBuild, grip: Part[] = []): Part[] {
  const p = skeleton.points
  const skin: Tone = far ? 'skinFar' : 'skin'
  const sign = mirrorSign(skeleton.view, side)
  const shoulder = p[`shoulder${side}`]
  const elbow = p[`elbow${side}`]
  const wrist = p[`wrist${side}`]
  const upper = oriented(build.upperArm, skeleton, side)
  const forearm = oriented(build.forearm, skeleton, side)
  const parts: Part[] = [shape(`upperArm${side}`, limbOutline(shoulder, elbow, upper), skin)]
  if (!far) {
    parts.push(shape(`upperArmSheen${side}`, sheen(shoulder, elbow, upper, 0.1, 0.66, 0.4 * sign, 0.3), 'skinLight'))
  }
  if (build.sleeve !== null) {
    parts.push(shape(`sleeve${side}`, limbOutline(shoulder, elbow, inflate(upper, 0.006), build.sleeve, true), far ? 'topFar' : 'top'))
  }
  parts.push(shape(`forearm${side}`, limbOutline(elbow, wrist, forearm), skin))
  if (!far) {
    parts.push(shape(`forearmSheen${side}`, sheen(elbow, wrist, forearm, 0.08, 0.5, 0.36 * sign, 0.26), 'skinLight'))
  }
  parts.push(...grip, shape(`hand${side}`, limbOutline(wrist, p[`hand${side}`], build.hand), skin))
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

function shoeOutline(skeleton: Skeleton, side: LimbSide): { shoe: Outline; sole: Outline; swoosh: Outline } {
  const p = skeleton.points
  const ankle = p[`ankle${side}`]
  const toe = p[`toe${side}`]
  const heel = p[`heel${side}`]
  const { forward, up } = footFrame(skeleton, side)
  const r = RIG.soleRadius
  const at = (base: Vec2, along: number, rise: number): Vec2 => add(add(base, scale(forward, along)), scale(up, rise))
  const shoe = [
    at(ankle, -0.04, 0.014),
    at(heel, -0.022, 0.004),
    at(heel, -0.006, -r * 0.95),
    at(lerpVec(heel, toe, 0.5), 0, -r),
    at(toe, 0, -r * 0.92),
    at(toe, r * 0.92, -r * 0.12),
    at(toe, -0.008, r * 0.7),
    at(lerpVec(ankle, toe, 0.55), 0, 0.014),
    at(ankle, 0.032, 0.016),
  ]
  const sole = [at(heel, -0.016, -r * 0.55), at(heel, -0.004, -r * 0.97), at(toe, 0, -r * 0.94), at(toe, r * 0.88, -r * 0.42), at(toe, 0, -r * 0.5)]
  const swoosh = [at(heel, 0.004, r * 0.55), at(lerpVec(heel, toe, 0.36), 0, -r * 0.18), at(lerpVec(heel, toe, 0.66), 0, r * 0.1), at(lerpVec(heel, toe, 0.86), 0, r * 0.42)]
  return {
    shoe: { d: smoothClosed(shoe), points: shoe },
    sole: { d: smoothClosed(sole), points: sole },
    swoosh: { d: smoothOpen(swoosh), points: swoosh },
  }
}

function stripeLine(thigh: Bone, shin: Bone | null, thighTo: number, shinTo: number, offset: number): Outline {
  const points = [thigh.at(0.06, offset), thigh.at(thighTo * 0.5, offset), thigh.at(thighTo, offset)]
  if (shin) {
    points.push(shin.at(shinTo * 0.5, offset), shin.at(shinTo, offset))
  }
  return { d: smoothOpen(points), points }
}

function legParts(skeleton: Skeleton, side: LimbSide, far: boolean, build: TrainerBuild): Part[] {
  const p = skeleton.points
  const hip = p[`hip${side}`]
  const knee = p[`knee${side}`]
  const ankle = p[`ankle${side}`]
  const sign = mirrorSign(skeleton.view, side)
  const thighShape = oriented(build.thigh, skeleton, side)
  const shinShape = oriented(build.shin, skeleton, side)
  const { kind, length: cover, stripe } = build.bottom
  const skin: Tone = far ? 'skinFar' : 'skin'
  const bottom: Tone = far ? 'bottomFar' : 'bottom'
  const loose = kind === 'joggers' ? 0.01 : 0
  const thigh = inflate(thighShape, loose)
  const shin = inflate(shinShape, loose * 0.8)
  const shinCovered = kind === 'joggers' || (kind === 'leggings' && cover >= 1)
  const thighCovered = kind !== 'shorts'
  const parts: Part[] = [shape(`shin${side}`, limbOutline(knee, ankle, shin), shinCovered ? bottom : skin)]
  if (!far) {
    parts.push(shape(`calfSheen${side}`, sheen(knee, ankle, shin, 0.1, 0.56, -0.42 * sign, 0.28), shinCovered ? 'bottomLight' : 'skinLight'))
  }
  if (kind === 'leggings' && cover < 1) {
    parts.push(shape(`capri${side}`, limbOutline(knee, ankle, inflate(shin, 0.003), cover, true), bottom))
  }
  if (kind === 'joggers') {
    parts.push(shape(`cuff${side}`, limbOutline(lerpVec(knee, ankle, 0.88), ankle, { r0: shin.r1 + 0.006, r1: shin.r1 + 0.002 }), far ? 'bottomFar' : 'trim'))
  }
  parts.push(shape(`thigh${side}`, limbOutline(hip, knee, thigh), thighCovered ? bottom : skin))
  if (!far) {
    parts.push(shape(`thighSheen${side}`, sheen(hip, knee, thigh, 0.14, 0.78, 0.4 * sign, 0.26), thighCovered ? 'bottomLight' : 'skinLight'))
  }
  if (kind === 'shorts') {
    const fit = build.gender === 'female' ? 0.004 : 0.012
    parts.push(shape(`shorts${side}`, limbOutline(hip, knee, inflate(thigh, fit), cover, true), bottom))
  }
  if (stripe && !far) {
    const offset = skeleton.view === 'side' ? 0 : 0.7 * sign
    const thighBone = bone(hip, knee, thigh)
    const shinBone = kind === 'shorts' ? null : bone(knee, ankle, shin)
    const thighTo = kind === 'shorts' ? cover * 0.97 : 1
    const shinTo = kind === 'joggers' ? 0.86 : Math.min(cover, 1) * 0.97
    parts.push(shape(`stripe${side}`, stripeLine(thighBone, shinBone, thighTo, shinTo, offset), null, 'trim', STRIPE_WIDTH))
  }
  const { shoe, sole, swoosh } = shoeOutline(skeleton, side)
  parts.push(shape(`shoe${side}`, shoe, far ? 'shoeFar' : 'shoe', 'shoeFar'), shape(`sole${side}`, sole, 'sole'))
  if (!far) {
    parts.push(shape(`swoosh${side}`, swoosh, null, 'shoeAccent', SWOOSH_WIDTH))
  }
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

function stationsFor(skeleton: Skeleton, build: TrainerBuild): readonly (readonly number[])[] {
  return skeleton.view === 'side' ? build.torsoSide : build.torsoFront.map(([t, w]) => [t, w, w])
}

function torsoRegion(skeleton: Skeleton, build: TrainerBuild, from: number, to: number, breath = 0): Outline {
  const frame = spineFrame(skeleton)
  const stations = stationsFor(skeleton, build)
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

function torsoPoint(skeleton: Skeleton, build: TrainerBuild, t: number, offset: number): Vec2 {
  const frame = spineFrame(skeleton)
  const [ahead, behind] = widthsAt(stationsFor(skeleton, build), t)
  const width = offset >= 0 ? ahead : behind
  return add(frame.at(t), scale(dir(frame.angle(t) - 90), offset * width))
}

function torsoSheen(skeleton: Skeleton, build: TrainerBuild, from: number, to: number, offset: number, width: number): Outline {
  const at = (s: number, side: number) => torsoPoint(skeleton, build, from + (to - from) * s, offset + side * Math.sin(Math.PI * s) * width)
  const points = [...SHEEN_STEPS.map((s) => at(s, 1)), ...SHEEN_STEPS.slice(1, -1).reverse().map((s) => at(s, -1))]
  return { d: smoothClosed(points), points }
}

const SEAM = 0.004

const BAND = 0.035

function torsoParts(skeleton: Skeleton, build: TrainerBuild, breath: number): Part[] {
  const side = skeleton.view === 'side'
  const start = side ? -0.2 : -0.13
  const sleeveless = build.sleeve === null
  const topTo = side || !sleeveless ? build.topTo : Math.min(build.topTo, 0.95)
  const midriff = build.topFrom - build.beltT > 0.06
  const parts: Part[] = [
    shape('torso', torsoRegion(skeleton, build, start, 1.03, breath), 'skin', 'skin', SEAM),
    shape('bottoms', torsoRegion(skeleton, build, start, build.beltT, breath), 'bottom', 'bottom', SEAM),
  ]
  if (side) {
    parts.push(shape('seatSheen', torsoSheen(skeleton, build, -0.12, 0.2, -0.5, 0.26), 'bottomLight'))
  }
  if (midriff) {
    parts.push(shape('waistband', torsoRegion(skeleton, build, build.beltT - BAND, build.beltT, breath), 'trim', 'trim', SEAM))
    if (!side) {
      const abs = [torsoPoint(skeleton, build, build.beltT + 0.03, 0), torsoPoint(skeleton, build, build.topFrom - 0.02, 0)]
      parts.push(shape('abs', { d: smoothOpen(abs), points: abs }, null, 'skinShade', 0.004))
    }
  }
  parts.push(shape('top', torsoRegion(skeleton, build, build.topFrom, topTo, breath), 'top', 'top', SEAM))
  const sheenFrom = Math.max(build.topFrom + 0.05, 0.64)
  const sheenTo = Math.min(topTo - 0.04, 0.94)
  parts.push(shape('topSheen', torsoSheen(skeleton, build, sheenFrom, sheenTo, side ? 0.55 : -0.55, 0.22), 'topLight'))
  if (build.top === 'crop' || build.top === 'bra') {
    parts.push(shape('underband', torsoRegion(skeleton, build, build.topFrom, build.topFrom + BAND, breath), 'trim', 'trim', SEAM))
  }
  if (!side && sleeveless && build.strap > 0) {
    for (const [tag, offset] of [['L', 0.5], ['R', -0.5]] as const) {
      const from = torsoPoint(skeleton, build, topTo - 0.03, offset)
      const to = torsoPoint(skeleton, build, 1.0 - build.strap * 0.7, offset * 1.25)
      parts.push({ kind: 'seg', id: `strap${tag}`, a: from, b: to, width: build.strap, tone: 'top' })
    }
  }
  return parts
}

export function skeletonParts(skeleton: Skeleton, look: Look = DEFAULT_LOOK, props: readonly Prop[] = [], motion: Secondary = STILL): Part[] {
  const build = buildFor(look)
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
    ...head.back,
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

function hull(points: Vec2[]): Vec2[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: Vec2, a: Vec2, b: Vec2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const chain = (list: Vec2[]) => {
    const out: Vec2[] = []
    for (const point of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], point) <= 1e-12) {
        out.pop()
      }
      out.push(point)
    }
    out.pop()
    return out
  }
  const result = [...chain(sorted), ...chain([...sorted].reverse())]
  return result.length > 0 ? result : [sorted[0]]
}

export interface HandleView {
  grip: Vec2
  along: Vec2
  across: Vec2
  inPlane: number
  facing: number
}

export function handleView(skeleton: Skeleton, side: LimbSide): HandleView {
  const p = skeleton.points
  const along = unit(sub(p[`hand${side}`], p[`wrist${side}`]), dir(skeleton.phi[`hand${side}`]))
  const turn = skeleton.grip[side] * (Math.PI / 180)
  return { grip: gripPoint(skeleton, side), along, across: [-along[1], along[0]], inPlane: Math.sin(turn), facing: Math.cos(turn) }
}

const HEX_STEPS = [30, 90, 150, 210, 270, 330]

function disc(view: HandleView, center: Vec2, r: number): Vec2[] {
  const squash = Math.abs(view.facing)
  return HEX_STEPS.map((deg) => {
    const angle = deg * (Math.PI / 180)
    return add(add(center, scale(view.along, r * Math.cos(angle))), scale(view.across, r * Math.sin(angle) * squash))
  })
}

function poly(id: string, points: Vec2[], width: number, tone: Tone): Part {
  return { kind: 'poly', id, points, width, tone, closed: true }
}

function dumbbellParts(view: HandleView, id: string): { under: Part[]; over: Part[] } {
  const toward = view.facing >= 0 ? 1 : -1
  const shift = scale(view.across, toward * view.inPlane)
  const at = (distance: number) => add(view.grip, scale(shift, distance))
  const head = (center: number) => {
    const inner = disc(view, at(center - DUMBBELL.half), DUMBBELL.head)
    const outer = disc(view, at(center + DUMBBELL.half), DUMBBELL.head)
    return hull([...inner, ...outer])
  }
  const face = at(DUMBBELL.offset + DUMBBELL.half)
  const squash = Math.abs(view.facing)
  return {
    under: [
      poly(`${id}-far`, head(-DUMBBELL.offset), DUMBBELL.edge, 'iron'),
      seg(`${id}-bar`, at(-DUMBBELL.handle), at(DUMBBELL.handle), DUMBBELL.bar, 'ironLight'),
    ],
    over: [
      poly(`${id}-near`, head(DUMBBELL.offset), DUMBBELL.edge, 'iron'),
      poly(`${id}-rim`, disc(view, face, DUMBBELL.rim), DUMBBELL.line, 'ironLight'),
      poly(`${id}-face`, disc(view, face, DUMBBELL.face), DUMBBELL.line, 'iron'),
      shape(`${id}-hub`, ellipseOutline(face, DUMBBELL.hub, DUMBBELL.hub * squash, angleOf(view.along), 12), 'ironLight'),
    ],
  }
}

function heldByEnd(skeleton: Skeleton, hands: LimbSide[]): HandleView {
  const p = skeleton.points
  const wrists = hands.map((side) => p[`wrist${side}`])
  const palms = wrists.length === 2 ? lerpVec(wrists[0], wrists[1], 0.5) : wrists[0]
  const toElbow = unit(
    hands.map((side) => unit(sub(p[`elbow${side}`], p[`wrist${side}`]), [0, -1])).reduce((sum, v) => add(sum, v), [0, 0] as Vec2),
    [0, -1],
  )
  const center = add(palms, scale(toElbow, DUMBBELL.offset - DUMBBELL.half - DUMBBELL.cup))
  return { grip: center, along: [-toElbow[1], toElbow[0]], across: toElbow, inPlane: 1, facing: 0 }
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
        if (prop.hold === 'end') {
          const parts = dumbbellParts(heldByEnd(skeleton, handsOf(prop.hand)), id)
          slots[side ? 'gripL' : 'overL'].push(...parts.under, ...parts.over)
          return
        }
        for (const hand of handsOf(prop.hand)) {
          const parts = dumbbellParts(handleView(skeleton, hand), `${id}${hand}`)
          slots[grip(hand)].push(...parts.under)
          slots[over(hand)].push(...parts.over)
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
