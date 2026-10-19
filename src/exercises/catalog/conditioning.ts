import { along, type Vec2 } from '@/figure/math'
import { CHAIR_SEAT_HEIGHT } from '@/figure/parts'
import { RIG } from '@/figure/rig'
import { solveSpec } from '@/figure/solve'
import type { Keyframe, PoseSpec, Prop, Reach } from '@/figure/types'
import type { Exercise } from '../types'
import {
  FLOOR_SHIN,
  HIGH_PLANK,
  HIP,
  PRONE,
  STAND,
  STAND_FRONT,
  SUPINE_FLAT,
  SUPINE_KNEES,
  anim,
  arms,
  flat,
  foot,
  hand,
  key,
  legs,
  palm,
  pose,
  toes,
} from '../kit'

const TOE = RIG.footToe
const SEAT = CHAIR_SEAT_HEIGHT
const FLAT_TOE = toes(TOE, 0)

function toeAt(x: number, y: number, angle: number): Reach {
  return { at: [x, y], angle, point: 'tip' }
}

function clasped(base: PoseSpec, drop = 0.21, gap = 0.035): PoseSpec {
  const skeleton = solveSpec(base, 'front')
  const { shoulderL, shoulderR } = skeleton.points
  const up = skeleton.phi.upperSpine
  const center: Vec2 = [(shoulderL[0] + shoulderR[0]) / 2, (shoulderL[1] + shoulderR[1]) / 2]
  const chest = along(center, up + 180, drop)
  return pose(base, {
    armL: hand(along(chest, up - 90, gap), up),
    armR: hand(along(chest, up + 90, gap), 180 - up),
  })
}

const SOFT_LEGS = { thighL: 0.97, thighR: 0.97, shinL: 0.98, shinR: 0.98 }
const CLAP: PoseSpec = {
  armL: { at: [0.03, 1.36], angle: 90 },
  armR: { at: [-0.03, 1.36], angle: 90 },
  scale: { ...SOFT_LEGS, upperArmL: 0.62, upperArmR: 0.62, forearmL: 0.5, forearmR: 0.5, handL: 0.8, handR: 0.8 },
}

const sealClosed = pose(STAND_FRONT, { anchor: 'ground' }, legs([3, 0, 0]), CLAP)
const sealAirOut = pose(STAND_FRONT, { root: [0, HIP + 0.06] }, arms([88, 30]), legs([11, 0, 0]))
const sealOpen = pose(STAND_FRONT, { anchor: 'ground', scale: SOFT_LEGS }, arms([92, 0]), legs([17, 0, 0]))
const sealAirIn = pose(STAND_FRONT, { root: [0, HIP + 0.05] }, arms([86, 30]), legs([9, 0, 0]))

const SQUAT_JACK_WIDE = 0.36
const squatJackIn = clasped(pose(STAND_FRONT, {
  root: [0, 0.86],
  scale: { thighL: 0.8, thighR: 0.8, shinL: 0.95, shinR: 0.95 },
  legL: flat(RIG.hipHalfWidth + 0.01),
  legR: flat(-RIG.hipHalfWidth - 0.01),
}))
const squatJackAir = clasped(pose(STAND_FRONT, { root: [0, HIP + 0.1], ...legs([14, 0, 30]) }))
const squatJackOut = clasped(pose(STAND_FRONT, {
  root: [0, 0.62],
  scale: { thighL: 0.75, thighR: 0.75, footL: 1.35, footR: 1.35, lowerSpine: 0.95 },
  legL: flat(SQUAT_JACK_WIDE),
  legR: flat(-SQUAT_JACK_WIDE),
}))

const tuckLoad = pose(STAND, { root: [-0.14, 0.7], torso: 28, neck: -12 }, arms([-30, 14]), legs(FLAT_TOE))
const tuckTakeoff = pose(STAND, { root: [0.02, 1.0], torso: 4, neck: -4, ...arms([80, 20]), ...legs(toes(TOE, -45)) })
const tuckAir = pose(STAND, {
  root: [0, HIP + 0.32],
  torso: 14,
  spine: 8,
  neck: -8,
  ...arms([70, 40]),
  legL: [112, 128, 30],
  legR: [104, 128, 30],
})
const tuckLand = pose(STAND, { root: [-0.1, 0.82], torso: 18, neck: -8 }, arms([40, 30]), legs(FLAT_TOE))

const THRUST_HANDS = 0.36
const THRUST_NECK: Vec2 = [0.43, 0.6]
const thrustStand = pose(STAND, arms([8, 12]), legs(FLAT_TOE))
const thrustSquat: PoseSpec = {
  root: [-0.12, 0.34],
  torso: 50,
  spine: 12,
  neck: -28,
  ...legs(FLAT_TOE),
  ...arms(palm(THRUST_HANDS)),
}
const thrustKick: PoseSpec = {
  torso: 100,
  neck: -18,
  anchor: { joint: 'neck', at: THRUST_NECK },
  ...legs(toeAt(-0.82, 0.14, -110)),
  ...arms(palm(THRUST_HANDS)),
}
const thrustPlank: PoseSpec = {
  torso: 73.5,
  neck: -10,
  anchor: { joint: 'neck', at: THRUST_NECK },
  ...legs(toes(-0.946, -84)),
  ...arms(palm(THRUST_HANDS)),
}
const thrustTuck: PoseSpec = {
  torso: 96,
  neck: -20,
  anchor: { joint: 'neck', at: THRUST_NECK },
  ...legs(toeAt(-0.45, 0.2, -125)),
  ...arms(palm(THRUST_HANDS)),
}

const FEET_FRONT = 0.16
const FEET_BACK = -0.16
function fastFeet(liftLeft: boolean): PoseSpec {
  const up = toeAt(0, 0.1, -35)
  const down = toes(0, -25)
  return {
    root: [-0.14, 0.8],
    torso: 26,
    neck: -14,
    legL: liftLeft ? { ...up, at: [FEET_FRONT + TOE - 0.04, 0.1] } : { ...down, at: [FEET_FRONT + TOE - 0.04, RIG.soleRadius] },
    legR: liftLeft ? { ...down, at: [FEET_BACK + TOE - 0.04, RIG.soleRadius] } : { ...up, at: [FEET_BACK + TOE - 0.04, 0.1] },
    armL: liftLeft ? [30, 80] : [10, 85],
    armR: liftLeft ? [10, 85] : [30, 80],
  }
}

const STANCE_FRONT = flat(0.3)
const STANCE_BACK = toes(-0.32 + TOE, -20)
const guard: PoseSpec = {
  root: [0, 0.91],
  torso: 6,
  neck: -6,
  legL: STANCE_FRONT,
  legR: STANCE_BACK,
  armL: [52, 128, 10],
  armR: [36, 140, 10],
}
const jab = pose(guard, { root: [0.03, 0.9], torso: 10, armL: [92, 2, 0] })
const cross = pose(guard, { root: [0.06, 0.89], torso: 15, armR: [96, 2, 0], armL: [40, 135, 10], legR: toes(-0.32 + TOE, -40) })

const BROAD_START = -0.42
const BROAD_END = 0.48
const BROAD_STEP = (BROAD_END - BROAD_START) / 2

function broadStand(toeX: number): PoseSpec {
  return pose(STAND, { root: [toeX - TOE, HIP] }, arms([8, 12]), legs(toes(toeX, 0)))
}

const broadLoad = pose(STAND, { root: [BROAD_START - TOE - 0.22, 0.56], torso: 42, neck: -16 }, arms([-48, 12]), legs(toes(BROAD_START, 0)))
const broadTakeoff = pose(STAND, { root: [BROAD_START - TOE + 0.16, 0.92], torso: 34, neck: -10 }, arms([150, 10]), legs(toes(BROAD_START, -55)))
const broadAir = pose(STAND, {
  root: [(BROAD_START + BROAD_END) / 2 - TOE, HIP + 0.14],
  torso: 22,
  neck: -10,
  ...arms([110, 14]),
  ...legs([62, 70, 25]),
})
const broadLand = pose(STAND, { root: [BROAD_END - TOE - 0.2, 0.58], torso: 38, neck: -16 }, arms([70, 18]), legs(toes(BROAD_END, 0)))
const broadBack1 = pose(STAND, {
  root: [BROAD_END - TOE - 0.08, 0.95],
  torso: 3,
  legL: toes(BROAD_END, 0),
  legR: toeAt(BROAD_END - 0.22, 0.1, -25),
  armL: [-20, 30],
  armR: [20, 30],
})
const broadBack2 = pose(STAND, {
  root: [BROAD_END - TOE - BROAD_STEP / 2 - 0.02, 0.94],
  torso: 3,
  legL: toes(BROAD_END, -25),
  legR: toes(BROAD_END - BROAD_STEP, -5),
  armL: [10, 30],
  armR: [-10, 30],
})
const broadBack3 = pose(STAND, {
  root: [BROAD_END - TOE - BROAD_STEP - 0.04, 0.95],
  torso: 3,
  legL: toeAt(BROAD_END - BROAD_STEP - 0.25, 0.1, -25),
  legR: toes(BROAD_END - BROAD_STEP, 0),
  armL: [20, 30],
  armR: [-20, 30],
})
const broadBack4 = pose(STAND, {
  root: [BROAD_START - TOE + BROAD_STEP / 2, 0.94],
  torso: 3,
  legL: toes(BROAD_START, -5),
  legR: toes(BROAD_END - BROAD_STEP, -25),
  armL: [-10, 30],
  armR: [10, 30],
})
const broadBack5 = pose(STAND, {
  root: [BROAD_START - TOE + 0.06, 0.95],
  torso: 3,
  legL: toes(BROAD_START, 0),
  legR: toeAt(BROAD_START + 0.2, 0.1, -25),
  armL: [-20, 30],
  armR: [20, 30],
})

const SHUFFLE_HALF = 0.26
const SHUFFLE_STEP = 0.28
const SHUFFLE_HIP = 0.8
const SHUFFLE_SCALE = { thighL: 0.86, thighR: 0.86, shinL: 0.97, shinR: 0.97, lowerSpine: 0.95, upperSpine: 0.97 }

function shuffleStance(hipX: number, leftX: number, rightX: number, leftLift = 0, rightLift = 0, hipY = SHUFFLE_HIP): PoseSpec {
  return pose(STAND_FRONT, {
    root: [hipX, hipY],
    torso: 0,
    legL: flat(leftX, leftLift),
    legR: flat(rightX, rightLift),
    ...arms([12, -45]),
    scale: { ...SHUFFLE_SCALE, forearmL: 0.7, forearmR: 0.7 },
  })
}

function shuffleRight(from: number): PoseSpec[] {
  const to = from + SHUFFLE_STEP
  return [
    shuffleStance(from + SHUFFLE_STEP * 0.35, from + SHUFFLE_HALF + SHUFFLE_STEP * 0.6, from - SHUFFLE_HALF, 0.07, 0, SHUFFLE_HIP + 0.02),
    shuffleStance(from + SHUFFLE_STEP * 0.6, to + SHUFFLE_HALF, from - SHUFFLE_HALF + SHUFFLE_STEP * 0.5, 0, 0.06, SHUFFLE_HIP - 0.01),
    shuffleStance(to, to + SHUFFLE_HALF, to - SHUFFLE_HALF),
  ]
}

function shuffleLeft(from: number): PoseSpec[] {
  const to = from - SHUFFLE_STEP
  return [
    shuffleStance(from - SHUFFLE_STEP * 0.35, from + SHUFFLE_HALF, from - SHUFFLE_HALF - SHUFFLE_STEP * 0.6, 0, 0.07, SHUFFLE_HIP + 0.02),
    shuffleStance(from - SHUFFLE_STEP * 0.6, from + SHUFFLE_HALF - SHUFFLE_STEP * 0.5, to - SHUFFLE_HALF, 0.06, 0, SHUFFLE_HIP - 0.01),
    shuffleStance(to, to + SHUFFLE_HALF, to - SHUFFLE_HALF),
  ]
}

const SHUFFLE_START = -SHUFFLE_STEP
const shuffleKeys: Keyframe[] = [
  shuffleStance(SHUFFLE_START, SHUFFLE_START + SHUFFLE_HALF, SHUFFLE_START - SHUFFLE_HALF),
  ...shuffleRight(SHUFFLE_START),
  ...shuffleRight(SHUFFLE_START + SHUFFLE_STEP),
  ...shuffleLeft(SHUFFLE_START + SHUFFLE_STEP * 2),
  ...shuffleLeft(SHUFFLE_START + SHUFFLE_STEP),
]
  .slice(0, -1)
  .map((spec) => key(spec, 120, 0, 'inOut'))

const CURTSY_FRONT = RIG.hipHalfWidth + 0.04
const curtsyStand = pose(STAND_FRONT, { legL: flat(CURTSY_FRONT), legR: flat(-RIG.hipHalfWidth - 0.02) })
const curtsyLift = pose(STAND_FRONT, {
  root: [0.05, 0.83],
  legL: flat(CURTSY_FRONT),
  legR: foot([0.3, 0.26], -70),
  scale: { thighL: 0.92, thighR: 0.96, shinR: 0.96, footR: 0.8 },
})
const curtsyBottom = pose(STAND_FRONT, {
  root: [0.08, 0.54],
  torso: 2,
  legL: flat(CURTSY_FRONT + 0.02),
  legR: toes(0.4, -80),
  scale: { thighL: 0.68, thighR: 0.95, shinR: 0.45, footR: 0.8, lowerSpine: 0.96 },
})

const sldTop = pose(STAND, { root: [0, HIP - 0.01], legL: flat(0), legR: [14, 55, 20] }, arms([6, 10]))
const sldBottom = pose(STAND, {
  root: [-0.12, 0.9],
  torso: 82,
  neck: -14,
  legL: flat(0),
  legR: [-4, 4, 15],
  ...arms([84, 4]),
})

const goodTop = pose(
  STAND,
  {
    armL: [160, 150],
    armR: [156, 152],
    scale: { upperArmL: 0.55, upperArmR: 0.55, forearmL: 0.8, forearmR: 0.8 },
  },
  legs(FLAT_TOE),
)
const goodBottom = pose(goodTop, { root: [-0.2, 0.93], torso: 72, neck: -18 })

const diamondTop = pose(HIGH_PLANK, { torso: 72, ...arms(palm(0.5)) })
const diamondBottom = pose(diamondTop, { torso: 85, neck: -12, scale: { upperArmL: 0.92, upperArmR: 0.92 } })

const DECLINE_CHAIR: Prop = { kind: 'chair', x: -0.62, facing: 1 }
const DECLINE_TOE: Vec2 = [-0.78, SEAT + RIG.soleRadius]
const declineBody: PoseSpec = { torso: 91, neck: -12, ...legs([0, 0, 25]), anchor: { joint: 'toeL', at: DECLINE_TOE } }
const DECLINE_HANDS = palm(solveSpec(declineBody, 'side').points.shoulderL[0] + 0.04)
const declineTop = pose(declineBody, arms(DECLINE_HANDS))
const declineBottom = pose(declineBody, { torso: 102, neck: -16, ...legs([0, 0, 32]), ...arms(DECLINE_HANDS) })

const BEAR_HIP = 0.5
const BEAR_STEP = 0.22
const BEAR_LIFT = 0.07

function bear(rootX: number, hands: [number, number], feet: [number, number], lifted: 'A' | 'B' | null): PoseSpec {
  const lift = (on: boolean) => (on ? BEAR_LIFT : 0)
  return {
    root: [rootX, BEAR_HIP],
    torso: 80,
    neck: -22,
    armL: palm(hands[0], lift(lifted === 'B')),
    armR: palm(hands[1], lift(lifted === 'A')),
    legL: toes(feet[0], -45, lift(lifted === 'A')),
    legR: toes(feet[1], -45, lift(lifted === 'B')),
  }
}

const BEAR_X = -0.3
const BEAR_HAND = 0.46
const BEAR_FOOT = -0.36
function bearAt(rootShift: number, a: number, b: number, lifted: 'A' | 'B' | null): PoseSpec {
  const x = BEAR_X + rootShift
  return bear(x, [BEAR_X + BEAR_HAND + b, BEAR_X + BEAR_HAND + a], [BEAR_X + BEAR_FOOT + a, BEAR_X + BEAR_FOOT + b], lifted)
}

const bearKeys: Keyframe[] = [
  key(bearAt(0, 0, 0, null), 220, 40),
  key(bearAt(BEAR_STEP * 0.25, BEAR_STEP * 0.5, 0, 'A'), 220),
  key(bearAt(BEAR_STEP * 0.5, BEAR_STEP, 0, null), 220, 40),
  key(bearAt(BEAR_STEP * 0.75, BEAR_STEP, BEAR_STEP * 0.5, 'B'), 220),
  key(bearAt(BEAR_STEP, BEAR_STEP, BEAR_STEP, null), 220, 40),
  key(bearAt(BEAR_STEP * 0.75, BEAR_STEP * 0.5, BEAR_STEP, 'A'), 220),
  key(bearAt(BEAR_STEP * 0.5, 0, BEAR_STEP, null), 220, 40),
  key(bearAt(BEAR_STEP * 0.25, 0, BEAR_STEP * 0.5, 'B'), 220),
]

const pullBase = pose(PRONE, { torso: 88, spine: -12, neck: -6 })
const PULL_SHOULDER = solveSpec(pullBase, 'side').points.shoulderL
const pullReach = pose(pullBase, arms(hand([PULL_SHOULDER[0] + 0.56, PULL_SHOULDER[1] + 0.05], 0)))
const pullDown = pose(pullBase, {
  spine: -20,
  neck: -10,
  ...arms(hand([PULL_SHOULDER[0] + 0.2, PULL_SHOULDER[1] + 0.06], 0)),
  scale: { upperArmL: 0.6, upperArmR: 0.6, forearmL: 0.9, forearmR: 0.9 },
})
const PRONE_MAT: Prop = { kind: 'mat', x0: -1.2, x1: 1.3 }

const tapBase = pose(SUPINE_KNEES, { spine: 24, neck: 14 }, legs(flat(0.4)))
const tapLeft = pose(tapBase, { armL: [10, 0], armR: [18, 6], scale: { upperArmR: 0.85, forearmR: 0.85 } })
const tapRight = pose(tapBase, { armL: [18, 6], armR: [10, 0], scale: { upperArmL: 0.85, forearmL: 0.85 } })

const sidePlankUp: PoseSpec = {
  torso: 72,
  legL: [-2, 0, 80],
  legR: [-4, 0, 80],
  armL: [72, 90],
  armR: [100, 0],
  scale: { forearmL: 0.3, handL: 0.6 },
  anchor: { joint: 'elbowL', at: [0.6, 0.045] },
}
const SIDE_PLANK_SOLVED = solveSpec(sidePlankUp, 'front')
const SIDE_PLANK_SUPPORT: PoseSpec = {
  anchor: { joint: 'ankleL', at: SIDE_PLANK_SOLVED.points.ankleL },
  armL: hand(SIDE_PLANK_SOLVED.points.wristL, SIDE_PLANK_SOLVED.phi.handL),
}
const sidePlankHold = pose(sidePlankUp, SIDE_PLANK_SUPPORT)
const sidePlankDip = pose(sidePlankUp, SIDE_PLANK_SUPPORT, { torso: 54, legL: [-27, 0, 80], legR: [24, 0, 80], armR: [94, 0] })

const reachDown = pose(SUPINE_FLAT, { neck: 4 }, arms([95, 0]), legs([90, 0, 20]))
const reachUp = pose(reachDown, { spine: 38, neck: 16 }, arms([82, 0]))

const tuckSeat: PoseSpec = {
  root: [0, 0.1],
  torso: -38,
  spine: 6,
  neck: 10,
  ...arms(palm(-0.3)),
}
const tuckIn = pose(tuckSeat, legs([118, 125, 25]))
const tuckOut = pose(tuckSeat, { torso: -48, neck: 14 }, legs([62, 8, 30]))

function breathing(inhale: PoseSpec, exhale: PoseSpec, cycleMs = 3600, props?: Prop[]) {
  return anim('side', [key(inhale, cycleMs / 2), key(exhale, cycleMs / 2)], { props, thumb: 0 })
}

const warriorOne: PoseSpec = {
  root: [-0.03, 0.63],
  torso: -2,
  spine: -6,
  neck: -6,
  legL: flat(0.5),
  legR: flat(-0.6, 0, -8),
  ...arms([178, 0]),
  scale: { footR: 0.65 },
}
const warriorOneExhale = pose(warriorOne, { root: [-0.02, 0.62] })

const warriorThree: PoseSpec = {
  root: [-0.02, HIP - 0.01],
  torso: 90,
  neck: -12,
  legL: flat(0.02),
  legR: [0, 0, 80],
  ...arms([178, 0]),
}
const warriorThreeExhale = pose(warriorThree, { torso: 88, legR: [2, 0, 80] })

const LOW_LUNGE_KNEE: Vec2 = [-0.36, FLOOR_SHIN]
const lowLunge: PoseSpec = {
  torso: 0,
  spine: -10,
  neck: -10,
  legR: [-35, 55, 90],
  legL: flat(0.46),
  anchor: { joint: 'kneeR', at: LOW_LUNGE_KNEE },
  ...arms([176, 0]),
}
const lowLungeExhale = pose(lowLunge, { spine: -13, legR: [-38, 52, 90] })

const updogBody: PoseSpec = {
  torso: 60.5,
  spine: -24,
  neck: -22,
  ...legs([-10, 0, 92]),
  anchor: { joint: 'toeL', at: [-0.95, RIG.soleRadius] },
}
const UPDOG_SHOULDER = solveSpec(updogBody, 'side').points.shoulderL
const upwardDog = pose(updogBody, arms(palm(UPDOG_SHOULDER[0] + 0.02)))
const upwardDogExhale = pose(upwardDog, { spine: -21, neck: -20 })

const boat: PoseSpec = {
  root: [0, 0.1],
  torso: -36,
  spine: -4,
  neck: 6,
  ...legs([100, 0, 30]),
  ...arms([56, 0]),
}
const boatExhale = pose(boat, { torso: -34, spine: -2, ...legs([98, 0, 30]) })

export const CONDITIONING: Exercise[] = [
  {
    id: 'seal-jacks',
    name: 'Seal jacks',
    category: 'cardio',
    tags: ['upperBody'],
    muscles: ['shoulders', 'chest', 'calves', 'upperBack', 'adductors'],
    equipment: 'none',
    level: 1,
    impact: 'high',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim(
      'front',
      [key(sealClosed, 200, 0, 'out'), key(sealAirOut, 170, 0, 'in'), key(sealOpen, 200, 0, 'out'), key(sealAirIn, 170, 0, 'in')],
      { thumb: 2 },
    ),
    summary: 'A jumping jack variation that claps your arms together in front of you to open your chest and shoulders as your heart rate rises.',
    steps: [
      'Stand with your feet together and your arms straight out in front of you at shoulder height.',
      'Jump your feet out wide as you open your arms out to the sides.',
      'Jump your feet back together as you bring your palms together in front of your chest.',
      'Keep a quick, steady rhythm.',
    ],
    tips: ['Keep your arms at shoulder height the whole time.', 'Step out one foot at a time for a lower-impact version.'],
  },
  {
    id: 'squat-jacks',
    name: 'Squat jacks',
    category: 'cardio',
    tags: ['lowerBody'],
    muscles: ['quads', 'glutes', 'adductors', 'calves'],
    equipment: 'none',
    level: 2,
    impact: 'high',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim(
      'front',
      [key(squatJackIn, 240, 0, 'out'), key(squatJackAir, 200, 0, 'in'), key(squatJackOut, 300, 120, 'out'), key(squatJackAir, 220, 0, 'in')],
      { thumb: 2 },
    ),
    summary: 'A jumping jack performed from a squat that hops your feet wide and narrow to fire up your legs and lungs.',
    steps: [
      'Stand with your feet together, knees soft and hands clasped in front of your chest.',
      'Jump your feet out wide and sink into a low squat.',
      'Jump your feet back together, staying in a shallow squat.',
      'Keep bouncing between wide and narrow without standing all the way up.',
    ],
    tips: ['Keep your chest lifted and your knees tracking over your toes.', 'Step side to side instead of jumping for a lower-impact version.'],
  },
  {
    id: 'tuck-jumps',
    name: 'Tuck jumps',
    category: 'cardio',
    tags: ['lowerBody'],
    muscles: ['quads', 'glutes', 'hipFlexors', 'calves', 'abs'],
    equipment: 'none',
    level: 3,
    impact: 'high',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim(
      'side',
      [key(tuckLoad, 380, 100), key(tuckTakeoff, 180, 0, 'in'), key(tuckAir, 220, 60, 'out'), key(tuckLand, 260, 0, 'in')],
      { thumb: 2 },
    ),
    summary: 'An explosive vertical jump that pulls both knees up toward your chest to build power and challenge your conditioning.',
    steps: [
      'Stand with your feet hip-width apart and your arms by your sides.',
      'Dip into a quarter squat and swing your arms back.',
      'Jump straight up and drive both knees toward your chest.',
      'Release your legs and land softly with bent knees, then go again.',
    ],
    tips: ['Bring your knees up to your hands rather than reaching down.', 'Do squat jumps instead if you need a lower-intensity version.'],
  },
  {
    id: 'squat-thrusts',
    name: 'Squat thrusts',
    category: 'fullBody',
    tags: ['cardio', 'core'],
    muscles: ['fullBody', 'quads', 'shoulders', 'abs', 'hipFlexors'],
    equipment: 'none',
    level: 2,
    impact: 'high',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim(
      'side',
      [
        key(thrustStand, 380, 150, 'in'),
        key(thrustSquat, 520),
        key(thrustKick, 200, 0, 'in'),
        key(thrustPlank, 200, 180, 'out'),
        key(thrustTuck, 220, 0, 'in'),
        key(thrustSquat, 240, 0, 'out'),
      ],
      { thumb: 3 },
    ),
    summary: 'A burpee without the jump or push-up that drives your feet back to a plank and in again for full-body conditioning.',
    steps: [
      'Stand tall with your feet hip-width apart.',
      'Squat down and plant your hands on the floor in front of your feet.',
      'Jump your feet back into a high plank.',
      'Jump your feet back in toward your hands and stand up tall.',
    ],
    tips: ['Brace your core so your hips do not sag in the plank.', 'Step your feet back and in one at a time to lower the impact.'],
  },
  {
    id: 'fast-feet',
    name: 'Fast feet',
    category: 'cardio',
    tags: ['lowerBody'],
    muscles: ['calves', 'quads', 'glutes', 'hipFlexors'],
    equipment: 'none',
    level: 1,
    impact: 'high',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim(
      'side',
      [
        key(fastFeet(true), 80, 0, 'linear'),
        key(fastFeet(false), 80, 0, 'linear'),
        key(fastFeet(true), 80, 0, 'linear'),
        key(fastFeet(false), 80, 0, 'linear'),
        key(fastFeet(true), 80, 0, 'linear'),
        key(fastFeet(false), 80, 0, 'linear'),
      ],
      { thumb: 0 },
    ),
    summary: 'Rapid, light steps on the balls of your feet in an athletic stance that sharpen footwork and lift your heart rate.',
    steps: [
      'Stand with your feet hip-width apart and sink into a quarter squat.',
      'Lean your chest slightly forward and bend your elbows in front of you.',
      'Run on the spot with tiny, quick steps on the balls of your feet.',
      'Keep your feet close to the floor and your hips low.',
    ],
    tips: ['Think quick and quiet rather than high.', 'Stay low the whole time instead of bouncing up.'],
  },
  {
    id: 'jab-cross',
    name: 'Shadow boxing jab-cross',
    category: 'cardio',
    tags: ['upperBody'],
    muscles: ['shoulders', 'obliques', 'chest', 'triceps', 'calves'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim(
      'side',
      [
        key(guard, 200, 80, 'in'),
        key(jab, 170, 60, 'out'),
        key(guard, 200, 60, 'in'),
        key(cross, 190, 70, 'out'),
      ],
      { thumb: 1 },
    ),
    summary: 'Quick straight punches from a boxing stance that raise your heart rate and work your shoulders, arms and core.',
    steps: [
      'Stand in a staggered stance with your left foot forward and your fists up by your chin.',
      'Snap your lead hand straight out at shoulder height, then pull it back to your chin.',
      'Pivot your back foot and rotate your hips to punch straight out with your rear hand.',
      'Return to your guard and keep the jab-cross combination flowing.',
    ],
    tips: [
      'Keep your non-punching hand up by your face.',
      'Turn from your hips instead of just swinging your arms.',
      'Switch to the other stance halfway through.',
    ],
  },
  {
    id: 'broad-jumps',
    name: 'Broad jumps',
    category: 'cardio',
    tags: ['lowerBody'],
    muscles: ['glutes', 'quads', 'hamstrings', 'calves'],
    equipment: 'none',
    level: 3,
    impact: 'high',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 8 },
    animation: anim(
      'side',
      [
        key(broadStand(BROAD_START), 300, 100),
        key(broadLoad, 450, 120),
        key(broadTakeoff, 180, 0, 'in'),
        key(broadAir, 220, 0, 'out'),
        key(broadLand, 240, 150, 'in'),
        key(broadStand(BROAD_END), 450, 100),
        key(broadBack1, 230),
        key(broadBack2, 230),
        key(broadBack3, 230),
        key(broadBack4, 230),
        key(broadBack5, 230),
      ],
      { thumb: 2 },
    ),
    summary: 'A two-footed jump forward for distance that builds explosive hip and leg power, followed by an easy walk back.',
    steps: [
      'Stand with your feet hip-width apart and plenty of clear space in front of you.',
      'Sit your hips back and swing your arms behind you.',
      'Swing your arms forward and jump as far forward as you can.',
      'Land softly in a squat with both feet, then stand and walk back to the start.',
    ],
    tips: ['Stick each landing before you walk back.', 'Land with your knees in line with your toes.'],
  },
  {
    id: 'lateral-shuffles',
    name: 'Lateral shuffles',
    category: 'cardio',
    tags: ['lowerBody'],
    muscles: ['abductors', 'glutes', 'quads', 'adductors', 'calves'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim('front', shuffleKeys, { thumb: 1 }),
    summary: 'Quick side-to-side shuffle steps in a low athletic stance that work your hips and legs and raise your heart rate.',
    steps: [
      'Stand with your feet wider than your hips and sink into a quarter squat.',
      'Step sideways with your lead foot, then bring your trailing foot after it.',
      'Shuffle a few steps in one direction without letting your feet touch.',
      'Change direction and shuffle back the other way.',
    ],
    tips: ['Stay low and keep your chest up.', 'Push off the trailing foot rather than reaching with the lead leg.'],
  },
  {
    id: 'curtsy-lunge',
    name: 'Curtsy lunge',
    category: 'lowerBody',
    tags: [],
    muscles: ['glutes', 'quads', 'abductors', 'adductors'],
    equipment: 'none',
    level: 2,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim(
      'front',
      [
        key(clasped(curtsyStand), 400, 150),
        key(clasped(curtsyLift), 350),
        key(clasped(curtsyBottom), 650, 150),
        key(clasped(curtsyLift), 600),
      ],
      { thumb: 2 },
    ),
    summary: 'A lunge that steps one leg back and across behind the other to target the glutes and outer hips from a new angle.',
    steps: [
      'Stand tall with your feet hip-width apart and your hands at your chest.',
      'Step one foot back and across behind the other, like a curtsy.',
      'Bend both knees to lower until your front thigh is near parallel to the floor.',
      'Press through your front heel to return to standing, then finish all reps before switching sides.',
    ],
    tips: ['Keep your hips facing forward as you step across.', 'Keep your front knee in line with your front toes.'],
  },
  {
    id: 'single-leg-deadlift',
    name: 'Single-leg deadlift',
    category: 'lowerBody',
    tags: [],
    muscles: ['hamstrings', 'glutes', 'lowerBack', 'abs'],
    equipment: 'none',
    level: 2,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(sldTop, 1000, 200), key(sldBottom, 1300, 250)], { thumb: 1 }),
    summary: 'A one-legged hip hinge that strengthens the back of your legs and glutes while challenging your balance.',
    steps: [
      'Stand on one leg with a soft bend in that knee.',
      'Hinge forward at the hips as your free leg reaches straight back.',
      'Let your arms hang toward the floor until your body and back leg are nearly level.',
      'Squeeze your glute to stand back up, then finish all reps before switching legs.',
    ],
    tips: ['Keep your hips square to the floor.', 'Lightly tap the back toes down between reps if you lose balance.'],
  },
  {
    id: 'good-mornings',
    name: 'Bodyweight good mornings',
    category: 'lowerBody',
    tags: ['warmup'],
    muscles: ['hamstrings', 'glutes', 'lowerBack'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 15 },
    animation: anim('side', [key(goodTop, 1000, 200), key(goodBottom, 1200, 200)], { thumb: 1 }),
    summary: 'A standing hip hinge with your hands behind your head that strengthens your hamstrings, glutes and back.',
    steps: [
      'Stand with your feet hip-width apart and your fingertips behind your head.',
      'Soften your knees and push your hips back as your chest tips forward.',
      'Lower until your torso is nearly parallel to the floor or you feel a stretch in your hamstrings.',
      'Drive your hips forward to stand tall again.',
    ],
    tips: ['Keep your back flat and your elbows wide.', 'Move from your hips, not your waist.'],
  },
  {
    id: 'diamond-push-up',
    name: 'Diamond push-up',
    category: 'upperBody',
    tags: [],
    muscles: ['triceps', 'chest', 'shoulders', 'abs'],
    equipment: 'none',
    level: 3,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 8 },
    animation: anim('side', [key(diamondTop, 900, 150), key(diamondBottom, 1200, 100)], { thumb: 1 }),
    summary: 'A close-hand push-up with your fingers forming a diamond under your chest that puts extra work on your triceps.',
    steps: [
      'Start in a high plank and bring your hands together under your chest.',
      'Touch your thumbs and index fingers to make a diamond shape.',
      'Bend your elbows back along your ribs to lower your chest toward your hands.',
      'Press back up to straight arms, keeping your body in one line.',
    ],
    tips: ['Keep your elbows close to your sides.', 'Drop to your knees to make it easier.'],
  },
  {
    id: 'decline-push-up',
    name: 'Decline push-up',
    category: 'upperBody',
    tags: [],
    muscles: ['chest', 'shoulders', 'triceps', 'abs'],
    equipment: 'chair',
    level: 3,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 8 },
    animation: anim('side', [key(declineTop, 900, 150), key(declineBottom, 1100, 100)], {
      props: [DECLINE_CHAIR],
      thumb: 1,
    }),
    summary: 'A push-up with your feet raised on a sturdy chair that shifts more load onto your upper chest and shoulders.',
    steps: [
      'Place a sturdy chair against a wall and kneel facing away from it.',
      'Put your hands on the floor under your shoulders and rest your toes on the seat behind you.',
      'Lower your chest toward the floor, keeping your body in one straight line.',
      'Press back up until your arms are straight.',
    ],
    tips: ['Brace your core so your hips do not sag.', 'Use a lower step to make it easier.'],
  },
  {
    id: 'bear-crawl',
    name: 'Bear crawl',
    category: 'fullBody',
    tags: ['upperBody', 'core', 'cardio'],
    muscles: ['shoulders', 'abs', 'quads', 'triceps', 'hipFlexors'],
    equipment: 'none',
    level: 2,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim('side', bearKeys, { thumb: 1 }),
    summary: 'A low crawl on your hands and toes with your knees hovering that builds shoulder strength, coordination and core control.',
    steps: [
      'Start on all fours, then tuck your toes and lift your knees just off the floor.',
      'Step one hand and the opposite foot forward at the same time.',
      'Repeat with the other hand and foot, keeping your knees low.',
      'Crawl a few steps forward, then crawl backward to where you started.',
    ],
    tips: ['Keep your back flat and your hips level with your shoulders.', 'Take small steps so your knees stay close to the floor.'],
  },
  {
    id: 'superman-pulls',
    name: 'Superman pulls',
    category: 'upperBody',
    tags: [],
    muscles: ['lats', 'upperBack', 'lowerBack', 'traps'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(pullReach, 900, 200), key(pullDown, 900, 300)], { props: [PRONE_MAT], thumb: 1 }),
    summary: 'A face-down pull of your elbows toward your ribs with your chest lifted that strengthens your upper back and lats.',
    steps: [
      'Lie face down and lift your chest and arms slightly, reaching your arms overhead.',
      'Pull your elbows down and back toward your ribs, squeezing your shoulder blades together.',
      'Reach your arms long overhead again without letting them touch the floor.',
      'Keep your gaze down and your chest lifted throughout.',
    ],
    tips: ['Squeeze your shoulder blades down, not up toward your ears.', 'Lift only a few centimeters to protect your lower back.'],
  },
  {
    id: 'heel-taps',
    name: 'Heel taps',
    category: 'core',
    tags: [],
    muscles: ['obliques', 'abs'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim('side', [key(tapLeft, 420, 80), key(tapRight, 420, 80)], { props: [{ kind: 'mat', x0: -1, x1: 0.75 }], thumb: 0 }),
    summary: 'A lying side-to-side reach toward each heel with your shoulders lifted that works your obliques and abs.',
    steps: [
      'Lie on your back with your knees bent, feet flat and arms by your sides.',
      'Curl your head and shoulders off the floor.',
      'Reach one hand toward that heel by bending sideways at the waist.',
      'Switch sides with a smooth side-to-side motion.',
    ],
    tips: ['Keep your shoulders lifted the whole time.', 'Bring your feet closer to your hips to shorten the reach.'],
  },
  {
    id: 'side-plank-dips',
    name: 'Side plank hip dips',
    category: 'core',
    tags: [],
    muscles: ['obliques', 'abs', 'abductors', 'shoulders'],
    equipment: 'mat',
    level: 2,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('front', [key(sidePlankHold, 800, 150), key(sidePlankDip, 800, 100)], {
      props: [{ kind: 'mat', x0: -0.95, x1: 0.85 }],
      thumb: 0,
    }),
    summary: 'A side plank where you lower and lift your hips with control to strengthen your obliques and the sides of your hips.',
    steps: [
      'Lie on your side with your elbow under your shoulder and your legs stacked.',
      'Lift your hips into a side plank with your body in a straight line.',
      'Lower your hips until they almost touch the floor.',
      'Lift them back up past straight, then finish all reps before switching sides.',
    ],
    tips: ['Keep your hips stacked rather than rolling forward.', 'Bend your bottom knee to the floor for an easier version.'],
  },
  {
    id: 'toe-reaches',
    name: 'Toe reaches',
    category: 'core',
    tags: [],
    muscles: ['abs', 'obliques'],
    equipment: 'mat',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 15 },
    animation: anim('side', [key(reachDown, 800, 100), key(reachUp, 700, 200)], { props: [{ kind: 'mat', x0: -1, x1: 0.5 }], thumb: 1 }),
    summary: 'A crunch with your legs pointing at the ceiling where you reach your hands toward your toes to work your upper abs.',
    steps: [
      'Lie on your back and lift both legs straight up toward the ceiling.',
      'Reach your arms up toward your feet.',
      'Curl your head and shoulders off the floor to reach for your toes.',
      'Lower your shoulders back down with control.',
    ],
    tips: ['Keep your legs still and pointing straight up.', 'Breathe out each time you reach up.'],
  },
  {
    id: 'seated-knee-tucks',
    name: 'Seated knee tucks',
    category: 'core',
    tags: [],
    muscles: ['abs', 'hipFlexors', 'obliques'],
    equipment: 'mat',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 15 },
    animation: anim('side', [key(tuckIn, 800, 150), key(tuckOut, 900, 150)], { props: [{ kind: 'mat', x0: -0.6, x1: 1.0 }], thumb: 1 }),
    summary: 'A seated crunch where you lean back and draw your knees in and out to strengthen your lower abs and hip flexors.',
    steps: [
      'Sit on the floor and lean back onto your hands behind your hips.',
      'Lift your feet and draw your knees in toward your chest.',
      'Extend your legs out long as you lean back slightly.',
      'Pull your knees back in, keeping your feet off the floor.',
    ],
    tips: ['Keep your chest lifted and your back long.', 'Tap your heels down between reps for an easier version.'],
  },
  {
    id: 'warrior-one',
    name: 'Warrior I',
    category: 'yoga',
    tags: ['lowerBody'],
    muscles: ['quads', 'glutes', 'hipFlexors', 'shoulders'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: breathing(warriorOne, warriorOneExhale),
    summary: 'A strong forward-facing lunge with your arms overhead that builds leg strength and opens the front of your back hip.',
    steps: [
      'Step one foot forward into a long stance and turn your back foot out about 45 degrees.',
      'Keep your back heel down and square your hips toward the front.',
      'Bend your front knee until it is over your ankle.',
      'Reach your arms overhead with your palms facing each other and breathe, then switch sides.',
    ],
    tips: ['Press firmly through the outer edge of your back foot.', 'Shorten your stance if your back heel lifts.'],
  },
  {
    id: 'warrior-three',
    name: 'Warrior III',
    category: 'yoga',
    tags: ['lowerBody', 'core'],
    muscles: ['glutes', 'hamstrings', 'lowerBack', 'abs'],
    equipment: 'none',
    level: 3,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: breathing(warriorThree, warriorThreeExhale),
    summary: 'A one-legged balance with your body and back leg level to the floor that strengthens your standing leg, glutes and back.',
    steps: [
      'Stand tall and shift your weight onto one foot.',
      'Hinge forward at the hips as you lift your other leg straight back.',
      'Reach your arms forward so your body forms a T shape with the standing leg.',
      'Hold and breathe, then lower the leg and switch sides.',
    ],
    tips: ['Keep your hips level and your back toes pointing down.', 'Rest your hands on a chair for support if needed.'],
  },
  {
    id: 'low-lunge',
    name: 'Low lunge',
    category: 'yoga',
    tags: ['stretch'],
    muscles: ['hipFlexors', 'quads', 'glutes', 'shoulders'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: breathing(lowLunge, lowLungeExhale, 3600, [{ kind: 'mat', x0: -0.95, x1: 0.8 }]),
    summary: 'A kneeling lunge with your arms reaching up that stretches the front of your back hip and thigh and opens your chest.',
    steps: [
      'Step one foot forward between your hands and lower your back knee to the mat.',
      'Rest the top of your back foot on the floor.',
      'Lift your chest and sweep your arms overhead.',
      'Sink your hips gently forward and breathe, then switch sides.',
    ],
    tips: ['Keep your front knee over your ankle.', 'Fold a towel under your back knee for comfort.'],
  },
  {
    id: 'upward-dog',
    name: 'Upward-facing dog',
    category: 'yoga',
    tags: ['stretch'],
    muscles: ['lowerBack', 'chest', 'abs', 'triceps', 'shoulders'],
    equipment: 'mat',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: breathing(upwardDog, upwardDogExhale, 3600, [{ kind: 'mat', x0: -1.15, x1: 0.75 }]),
    summary: 'A straight-arm backbend with your thighs lifted off the floor that opens your chest and strengthens your arms and back.',
    steps: [
      'Lie face down with the tops of your feet on the mat and your hands beside your lower ribs.',
      'Press into your hands and straighten your arms to lift your chest.',
      'Lift your thighs and knees off the mat so only your hands and the tops of your feet touch it.',
      'Draw your shoulders back and down and breathe.',
    ],
    tips: ['Keep your shoulders stacked over your wrists.', 'Rest your thighs on the mat and try cobra if this feels strong.'],
  },
  {
    id: 'boat-pose',
    name: 'Boat pose',
    category: 'yoga',
    tags: ['core'],
    muscles: ['abs', 'hipFlexors', 'obliques', 'lowerBack'],
    equipment: 'mat',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: breathing(boat, boatExhale, 3600, [{ kind: 'mat', x0: -0.6, x1: 0.95 }]),
    summary: 'A seated balance in a V shape with your legs lifted that builds core strength and balance.',
    steps: [
      'Sit with your knees bent and your feet flat on the mat.',
      'Lean back slightly with a long spine until you balance behind your sit bones.',
      'Lift your feet and straighten your legs as far as you comfortably can.',
      'Reach your arms forward alongside your legs and breathe.',
    ],
    tips: ['Keep your chest lifted instead of rounding your back.', 'Bend your knees to make it easier.'],
  },
]
