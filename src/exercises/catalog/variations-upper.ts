import { along, type Vec2 } from '@/figure/math'
import { CHAIR_SEAT_HEIGHT } from '@/figure/parts'
import { RIG } from '@/figure/rig'
import { solveSpec } from '@/figure/solve'
import type { Anchor, Keyframe, LimbSpec, PoseSpec, Prop, Reach } from '@/figure/types'
import type { Exercise } from '../types'
import {
  BENCH_HEIGHT,
  FLOOR_FOREARM,
  FLOOR_SHIN,
  FOREARM_PLANK,
  HIGH_PLANK,
  HIP,
  SEATED,
  STAND,
  STAND_FRONT,
  STAND_HOLD,
  STAND_HOLD_PROPS,
  SUPINE_KNEES,
  anim,
  arms,
  breathe,
  flat,
  foot,
  grips,
  hand,
  heel,
  key,
  legs,
  palm,
  pose,
} from '../kit'

type Side = 'L' | 'R'

function mat(x0: number, x1: number): Prop[] {
  return [{ kind: 'mat', x0, x1 }]
}

function toePin(spec: PoseSpec, side: Side): Reach {
  const skeleton = solveSpec(spec, 'side')
  return { at: skeleton.points[`toe${side}`], angle: skeleton.phi[`foot${side}`], point: 'tip' }
}

function pinFeet(spec: PoseSpec): PoseSpec {
  const skeleton = solveSpec(spec, 'side')
  return { ...spec, root: skeleton.points.hip, anchor: undefined, legL: toePin(spec, 'L'), legR: toePin(spec, 'R') }
}

function sided(side: Side, limb: 'arm' | 'leg', working: LimbSpec, other: LimbSpec): PoseSpec {
  return side === 'L' ? { [`${limb}L`]: working, [`${limb}R`]: other } : { [`${limb}L`]: other, [`${limb}R`]: working }
}

const TOE_ANCHOR: Anchor = { joint: 'toeL', at: [-0.75, RIG.soleRadius] }
const WAVE_HANDS = arms(palm(0.64))
const BENT_ARMS = { upperArmL: 0.85, upperArmR: 0.85 }

const wavePlank: PoseSpec = { torso: 72.5, neck: -10, ...legs([0, 0, 10]), anchor: TOE_ANCHOR, ...WAVE_HANDS }
const waveKnees = pose(wavePlank, { torso: 55, neck: -12, ...legs([5, 49.2, 30]) })
const waveKneesLow = pose(wavePlank, { torso: 74, neck: -12, ...legs([-10, 15.2, 30]), scale: BENT_ARMS })
const waveFlat = pose(wavePlank, { torso: 90, neck: -8, ...legs([0, 0, 45]), scale: { upperArmL: 0.7, upperArmR: 0.7 } })
const waveChestUp = pose(wavePlank, { torso: 64, spine: -22, neck: -16, ...legs([-26, 0, 45]) })
const wavePlankBottom = pose(wavePlank, { torso: 86, neck: -12, scale: BENT_ARMS })

const STAGGER_NEAR = 0.74
const STAGGER_FAR = 0.44
const staggerTop = pose(HIGH_PLANK, { torso: 72.5, armL: palm(STAGGER_NEAR), armR: palm(STAGGER_FAR) })
const staggerBottom = pose(staggerTop, { torso: 86, neck: -12, scale: BENT_ARMS })

const spiderTop = pinFeet(pose(HIGH_PLANK, { torso: 72.5 }))
const spiderBottomBase = pinFeet(pose(HIGH_PLANK, { torso: 84, neck: -12, scale: BENT_ARMS }))

function spiderLeg(side: Side, leg: [number, number, number], thigh: number, shin = 1): PoseSpec {
  const scale = side === 'L' ? { thighL: thigh, shinL: shin } : { thighR: thigh, shinR: shin }
  const planted = side === 'L' ? spiderBottomBase.legR : spiderBottomBase.legL
  return pose(spiderBottomBase, sided(side, 'leg', leg, planted as Reach), { torso: 81, scale: { ...BENT_ARMS, ...scale } })
}

function spiderRep(side: Side): Keyframe[] {
  const lift = spiderLeg(side, [60, 100, 40], 0.4, 0.8)
  const swing = spiderLeg(side, [130, 165, 50], 0.62)
  const knee = pose(spiderLeg(side, [165, 172, 60], 0.95), { neck: -4 })
  return [
    key(spiderTop, 700, 120),
    key(spiderBottomBase, 800),
    key(lift, 220),
    key(swing, 160),
    key(knee, 200, 220),
    key(swing, 160),
    key(lift, 160),
    key(spiderBottomBase, 200),
  ]
}

const DIVE_HANDS = arms(palm(0.6))
const DIVE_ANCHOR: Anchor = { joint: 'toeL', at: [-0.62, RIG.soleRadius] }
function diveBody(torso: number, spine: number, neck: number, hip: number, ankle: number, extra: PoseSpec = {}): PoseSpec {
  return { torso, spine, neck, ...legs([hip, 0, ankle]), anchor: DIVE_ANCHOR, ...DIVE_HANDS, ...extra }
}
const diveDog = diveBody(133, -4, 12, 94, 38)
const diveSwoop = diveBody(118, 0, -6, 60, 20, { scale: { upperArmL: 0.8, upperArmR: 0.8 } })
const diveSkim = diveBody(93, -6, -14, 14, 12, { scale: BENT_ARMS })
const diveUp = diveBody(64, -24, -20, -26, 10)

const plankRoot = pinFeet(pose(HIGH_PLANK, { torso: 72.5 }))

function armReach(side: Side): PoseSpec {
  return pose(plankRoot, sided(side, 'arm', [166, 0, 0], palm(0.58)), { neck: -14 })
}

const forearmBase = pinFeet(FOREARM_PLANK)

function legLift(side: Side): PoseSpec {
  return pose(forearmBase, sided(side, 'leg', [-14, 0, 12], forearmBase.legR as Reach))
}

const KNEE_PLANK_KNEE: Vec2 = [-0.32, FLOOR_SHIN]
const kneePlank: PoseSpec = {
  torso: 72,
  neck: -10,
  legL: [0, 65, 60],
  legR: [0, 72, 60],
  anchor: { joint: 'kneeL', at: KNEE_PLANK_KNEE },
  ...arms(hand([0.6, FLOOR_FOREARM], 0)),
}

const pikePlank = pose(HIGH_PLANK, { torso: 72.5 })
const pikeUp = pose(pikePlank, { torso: 130, spine: -2, neck: 14, ...legs([85, 0, 40]) })

function climbLeg(base: PoseSpec, side: Side, leg: [number, number, number]): PoseSpec {
  return pose(base, sided(side, 'leg', leg, side === 'L' ? (base.legR as Reach) : (base.legL as Reach)))
}

function climbRep(base: PoseSpec, side: Side, path: [number, number, number][], ms: number[]): Keyframe[] {
  const [planted, hold, ...moves] = ms
  const drive = path[path.length - 1]
  const out = path.map((leg, index) => key(climbLeg(base, side, leg), moves[index], leg === drive ? hold : 0))
  const back = path
    .slice(0, -1)
    .reverse()
    .map((leg, index) => key(climbLeg(base, side, leg), moves[path.length + index]))
  return [key(base, planted), ...out, ...back]
}

const slowClimbBase = plankRoot
const SLOW_CLIMB = [250, 300, 250, 200, 250, 250, 200]

const INCLINE_EDGE = 0.55
const inclinePlank = pinFeet({
  torso: 55,
  neck: -8,
  ...legs([0, 0, 10]),
  anchor: { joint: 'toeL', at: [INCLINE_EDGE - 1.12, RIG.soleRadius] },
  ...arms(palm(INCLINE_EDGE + 0.03, CHAIR_SEAT_HEIGHT)),
})
const INCLINE_CLIMB = [100, 40, 110, 130, 120]

function chestHold(base: PoseSpec): PoseSpec {
  const skeleton = solveSpec(base, 'side')
  const up = skeleton.phi.upperSpine
  const chest = along(along(skeleton.points.neck, up + 180, 0.1), up - 90, 0.16)
  return pose(base, arms(hand(chest, up - 90)), { scale: { upperArmL: 0.8, upperArmR: 0.8 } })
}
const weightedCrunchDown = chestHold(SUPINE_KNEES)
const weightedCrunchUp = chestHold(pose(SUPINE_KNEES, { spine: 30, neck: 14 }))

const longArmDown = pose(SUPINE_KNEES, arms([176, 0]))
const longArmUp = pose(SUPINE_KNEES, { spine: 30, neck: 12 }, arms([168, 0]))

const floorPressDown = pose(SUPINE_KNEES, arms([4, 96]), { scale: { upperArmL: 0.65, upperArmR: 0.65 } })
const floorPressUp = pose(SUPINE_KNEES, arms([90, 2]))

const arnoldStart = pose(STAND_FRONT, arms([14, 174]), grips(90), { scale: { upperArmL: 0.45, upperArmR: 0.45 } })
const arnoldOpen = pose(STAND_FRONT, arms([82, 100]), grips(-90))
const arnoldTop = pose(STAND_FRONT, arms([168, 10]), grips(-90))

const pressRack = pose(STAND_FRONT, arms([82, 100]))
const pressLeftUp = pose(pressRack, { armL: [168, 10] })
const pressRightUp = pose(pressRack, { armR: [168, 10] })

const CURL_BENCH: Prop = { kind: 'bench', x0: -0.62, x1: 0.24 }
const concentrationSeat: PoseSpec = {
  root: [0.06, BENCH_HEIGHT + 0.1],
  torso: 38,
  neck: -14,
  legL: flat(0.56),
  legR: flat(0.52),
}
const FAR_KNEE = solveSpec(concentrationSeat, 'side').points.kneeR
const concentrationBase = pose(concentrationSeat, { armR: hand([FAR_KNEE[0] - 0.06, FAR_KNEE[1] + 0.08], -40) })
const concentrationDown = pose(concentrationBase, { armL: [40, 8] })
const concentrationUp = pose(concentrationBase, { armL: [40, 140] })

const curlPressCurl = pose(STAND, arms([12, 138]))
const curlPressTop = pose(STAND, arms([176, 6]))

const rowSeat = pose(SEATED, { torso: -2, neck: 0, ...legs(foot([0.84, 0.1], 88)) })
const ROW_BAND: Prop = { kind: 'band', from: [0.92, 0.17], hand: 'both' }
const rowReach = pose(rowSeat, { torso: 8 }, arms([82, 6]))
const rowPull = pose(rowSeat, { torso: -4 }, arms([-18, 100]))

const HINGE: PoseSpec = { root: [-0.21, 0.89], torso: 64, neck: -16, legL: flat(0), legR: flat(0) }
const hingeHang = pose(STAND, HINGE, arms([64, 4]), grips(90))
const hingeRowLeft = pose(hingeHang, { armL: [4, 72] })
const hingeRowRight = pose(hingeHang, { armR: [4, 72] })

const DIP_HANDS = arms(palm(-0.04, CHAIR_SEAT_HEIGHT, -30))
const straightDipTop: PoseSpec = { root: [0.13, 0.55], torso: 4, neck: -4, ...legs(heel(0.86, 40)), ...DIP_HANDS }
const straightDipBottom = pose(straightDipTop, { root: [0.15, 0.3], torso: 8, neck: -8 })

const floorDipBase: PoseSpec = { neck: 10, ...legs(flat(0.42)), ...arms(palm(-0.42, 0, 0)) }
const floorDipUp = pose(floorDipBase, { root: [0, 0.3], torso: -55 })
const floorDipDown = pose(floorDipBase, { root: [-0.02, 0.17], torso: -62, neck: 14 })

const STEP_WIDE = 0.34
const STEP_SHIFT = 0.02
function stepJack(side: Side, phase: 'lift' | 'out'): PoseSpec {
  const sign = side === 'L' ? 1 : -1
  const hipY = phase === 'out' ? HIP - 0.012 : HIP - 0.006
  const straight = (hipY - (HIP - RIG.thigh - RIG.shin)) / (RIG.thigh + RIG.shin) - 0.002
  const plantedSide = side === 'L' ? 'R' : 'L'
  return pose(STAND_FRONT, {
    root: [sign * STEP_SHIFT, hipY],
    ...sided(side, 'leg', phase === 'out' ? { at: [sign * STEP_WIDE, RIG.soleRadius], angle: -55, point: 'tip' } : foot([sign * 0.2, 0.17]), flat(-sign * (RIG.hipHalfWidth - STEP_SHIFT))),
    ...arms(phase === 'out' ? [162, 10] : [92, 14]),
    scale: { [`thigh${plantedSide}`]: straight, [`shin${plantedSide}`]: straight },
  })
}

const SOFT_LEGS = { thighL: 0.97, thighR: 0.97, shinL: 0.98, shinR: 0.98 }
const crossOpen = pose(STAND_FRONT, { anchor: 'ground', scale: SOFT_LEGS }, arms([92, 4]), legs([16, 0, 0]))
const crossAirIn = pose(STAND_FRONT, { root: [0, HIP + 0.06] }, arms([50, 30]), legs([2, 0, 0]))
const crossClosed = pose(STAND_FRONT, {
  anchor: 'ground',
  scale: { ...SOFT_LEGS, upperArmL: 0.8, upperArmR: 0.8, forearmL: 0.9, forearmR: 0.9 },
  armL: hand([-0.12, 1.2], 200),
  armR: hand([0.12, 1.26], 200),
  legL: [-11, 0, 0],
  legR: [-9, 0, 0],
})
const crossAirOut = pose(STAND_FRONT, { root: [0, HIP + 0.06] }, arms([60, 20]), legs([8, 0, 0]))

function sideKeys(build: (side: Side) => Keyframe[]): Keyframe[] {
  return [...build('L'), ...build('R')]
}

export const VARIATIONS_UPPER: Exercise[] = [
  {
    id: 'wave-push-up',
    name: 'Wave push-up',
    category: 'upperBody',
    tags: ['core'],
    muscles: ['chest', 'triceps', 'shoulders', 'abs', 'lowerBack'],
    equipment: 'none',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 8 },
    animation: anim(
      'side',
      [
        key(wavePlank, 650, 200),
        key(waveKnees, 650),
        key(waveKneesLow, 700),
        key(waveFlat, 600, 250),
        key(waveChestUp, 750, 150),
        key(waveKnees, 700),
      ],
      { thumb: 1 },
    ),
    summary: 'A rolling push-up that lowers you to the floor one section at a time and peels you back up, building pressing strength with control.',
    steps: [
      'Start in a high plank with your hands under your shoulders.',
      'Lower your knees to the floor, then bend your elbows to bring your chest down.',
      'Lie flat for a moment with your hands beside your chest.',
      'Press your chest up first, then lift your hips onto your knees.',
      'Lift your knees and return to the high plank.',
    ],
    tips: [
      'Keep your hands and toes in place for the whole rep.',
      'Move slowly through each stage rather than flopping down.',
    ],
    family: 'push-up',
    variant: 'Wave',
  },
  {
    id: 'staggered-push-up',
    name: 'Staggered push-up',
    category: 'upperBody',
    tags: ['fullBody'],
    muscles: ['chest', 'shoulders', 'triceps', 'abs'],
    equipment: 'none',
    level: 2,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 8 },
    animation: anim('side', [key(staggerTop, 900, 150), key(staggerBottom, 1100, 100)]),
    summary: 'A push-up with one hand placed further forward than the other, loading each side of your chest and shoulders a little differently.',
    steps: [
      'Start in a high plank, then walk one hand forward and the other back by about a hand length.',
      'Brace your core and keep your hips level.',
      'Bend your elbows to lower your chest toward the floor.',
      'Press back up, then switch the hand positions for the second set.',
    ],
    tips: [
      'Keep the stagger small at first so your shoulders stay comfortable.',
      'Lower your chest straight down rather than twisting toward one hand.',
    ],
    family: 'push-up',
    variant: 'Staggered',
  },
  {
    id: 'spiderman-push-up',
    name: 'Spiderman push-up',
    category: 'upperBody',
    tags: ['core', 'fullBody'],
    muscles: ['chest', 'triceps', 'shoulders', 'obliques', 'hipFlexors'],
    equipment: 'none',
    level: 3,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim(
      'side',
      sideKeys(spiderRep),
      { thumb: 4 },
    ),
    summary: 'A push-up where you draw one knee out toward your elbow at the bottom, adding core and hip work to every rep.',
    steps: [
      'Start in a high plank with your hands under your shoulders.',
      'Bend your elbows to lower your chest toward the floor.',
      'At the bottom, swing one knee out to the side toward the elbow on the same side.',
      'Return the foot, press back up, and use the other knee on the next rep.',
    ],
    tips: [
      'Keep your hips low and level as the knee comes forward.',
      'Let your foot hover just above the floor as it travels.',
    ],
    family: 'push-up',
    variant: 'Spiderman',
  },
  {
    id: 'dive-bomber-push-up',
    name: 'Dive bomber push-up',
    category: 'upperBody',
    tags: ['fullBody'],
    muscles: ['shoulders', 'chest', 'triceps', 'lowerBack', 'abs'],
    equipment: 'none',
    level: 3,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 8 },
    animation: anim(
      'side',
      [key(diveDog, 700, 250), key(diveSwoop, 650), key(diveSkim, 450), key(diveUp, 600, 250), key(diveSkim, 650), key(diveSwoop, 450)],
      { thumb: 1 },
    ),
    summary: 'A swooping push-up that dives from an inverted V down past your hands and up into a chest lift, working your shoulders and back.',
    steps: [
      'Start with your hands and feet on the floor and your hips lifted into an upside-down V.',
      'Bend your elbows and swoop your chest down close to the floor between your hands.',
      'Keep moving forward and straighten your arms to lift your chest.',
      'Reverse the swoop and push your hips back up into the V.',
    ],
    tips: [
      'Keep your hands and feet planted while your body travels between them.',
      'Make the movement smooth and continuous like a wave.',
      'Take a wider stance if the swoop feels cramped.',
    ],
    family: 'push-up',
    variant: 'Dive bomber',
  },
  {
    id: 'negative-push-up',
    name: 'Negative push-up',
    category: 'upperBody',
    tags: [],
    muscles: ['chest', 'triceps', 'shoulders', 'abs'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 8 },
    animation: anim(
      'side',
      [key(wavePlank, 700, 250), key(wavePlankBottom, 3000, 150), key(waveKneesLow, 450), key(waveKnees, 750, 100)],
      { thumb: 1 },
    ),
    summary: 'A push-up that lowers you slowly from a full plank and comes back up from the knees, building strength toward full push-ups.',
    steps: [
      'Start in a high plank with your hands under your shoulders.',
      'Take about three seconds to lower your chest toward the floor.',
      'At the bottom, drop your knees to the floor.',
      'Press up from your knees, then lift them back into the plank.',
    ],
    tips: [
      'Count slowly as you lower so the descent stays even.',
      'Keep your body straight from head to heels on the way down.',
    ],
    family: 'push-up',
    variant: 'Negative',
  },
  {
    id: 'forearm-plank-leg-lift',
    name: 'Plank leg lift',
    category: 'core',
    tags: ['lowerBody'],
    muscles: ['abs', 'glutes', 'shoulders', 'lowerBack'],
    equipment: 'mat',
    level: 2,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim(
      'side',
      [key(forearmBase, 600, 150), key(legLift('L'), 700, 400), key(forearmBase, 600, 150), key(legLift('R'), 700, 400)],
      { props: mat(-1.05, 0.95), thumb: 1 },
    ),
    summary: 'A forearm plank where you lift one straight leg at a time, challenging your core to stay steady while working your glutes.',
    steps: [
      'Start in a forearm plank with your elbows under your shoulders.',
      'Squeeze your glutes and lift one straight leg a little off the floor.',
      'Hold briefly, then lower the foot back down.',
      'Repeat with the other leg, alternating each rep.',
    ],
    tips: [
      'Lift only as high as you can without your hips twisting or your back arching.',
      'Keep pressing your forearms into the floor.',
    ],
    family: 'plank',
    variant: 'Leg lift',
  },
  {
    id: 'plank-arm-reach',
    name: 'Plank arm reach',
    category: 'core',
    tags: ['upperBody'],
    muscles: ['abs', 'shoulders', 'obliques', 'upperBack'],
    equipment: 'none',
    level: 2,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim(
      'side',
      [key(plankRoot, 500, 150), key(armReach('L'), 700, 400), key(plankRoot, 600, 150), key(armReach('R'), 700, 400)],
      { thumb: 1 },
    ),
    summary: 'A high plank where you reach one arm straight out in front at a time, training your core to resist rotating.',
    steps: [
      'Start in a high plank with your hands under your shoulders and feet hip-width apart.',
      'Shift your weight slightly and reach one arm forward at shoulder height.',
      'Hold for a breath, then place the hand back down.',
      'Repeat with the other arm.',
    ],
    tips: [
      'Keep your hips square to the floor as the arm lifts.',
      'Widen your feet to make the balance easier.',
    ],
    family: 'plank',
    variant: 'Arm reach',
  },
  {
    id: 'knee-plank',
    name: 'Knee plank',
    category: 'core',
    tags: [],
    muscles: ['abs', 'shoulders', 'lowerBack'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: breathe(kneePlank, 'side', 3600, mat(-0.55, 0.95)),
    summary: 'A forearm plank held from the knees, a gentler way to build the core strength you need for a full plank.',
    steps: [
      'Kneel on a mat and place your forearms on the floor with your elbows under your shoulders.',
      'Walk your knees back until your body forms a straight line from knees to head.',
      'Brace your abs and squeeze your glutes.',
      'Hold the position while breathing steadily.',
    ],
    tips: [
      'Keep your hips in line rather than letting them rise up.',
      'Move to a full plank once you can hold this for a minute.',
    ],
    family: 'plank',
    variant: 'Knee',
  },
  {
    id: 'plank-to-pike',
    name: 'Plank to pike',
    category: 'core',
    tags: ['upperBody'],
    muscles: ['abs', 'shoulders', 'hipFlexors', 'hamstrings'],
    equipment: 'none',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(pikePlank, 900, 200), key(pikeUp, 1000, 250)], { thumb: 1 }),
    summary: 'Move from a high plank into an upside-down V and back, working your abs and shoulders while stretching the backs of your legs.',
    steps: [
      'Start in a high plank with your hands under your shoulders.',
      'Pull your abs in and push your hips up toward the ceiling.',
      'Let your head drop between your arms at the top.',
      'Lower your hips back to the plank with control.',
    ],
    tips: [
      'Keep your arms straight and your hands pressing into the floor.',
      'Bend your knees slightly if your hamstrings feel tight.',
    ],
    family: 'plank',
    variant: 'Pike',
  },
  {
    id: 'slow-mountain-climbers',
    name: 'Slow mountain climbers',
    category: 'core',
    tags: ['cardio'],
    muscles: ['abs', 'hipFlexors', 'shoulders'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim(
      'side',
      sideKeys((side) => climbRep(slowClimbBase, side, [[45, 100, 30], [85, 150, 40], [118, 140, 30]], SLOW_CLIMB)),
      { thumb: 3 },
    ),
    summary: 'A controlled version of mountain climbers that draws one knee to your chest at a time, building core strength without the jumping.',
    steps: [
      'Start in a high plank with your hands under your shoulders.',
      'Draw one knee in toward your chest and pause.',
      'Return the foot to the floor behind you.',
      'Repeat with the other knee at a slow, steady pace.',
    ],
    tips: [
      'Keep your hips level and in line with your shoulders.',
      'Breathe out as each knee comes in.',
    ],
    family: 'mountain-climber',
    variant: 'Slow',
  },
  {
    id: 'incline-mountain-climbers',
    name: 'Incline mountain climbers',
    category: 'cardio',
    tags: ['core'],
    muscles: ['abs', 'hipFlexors', 'shoulders', 'quads'],
    equipment: 'chair',
    level: 1,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim(
      'side',
      sideKeys((side) => climbRep(inclinePlank, side, [[35, 90, 30], [96, 110, 30]], INCLINE_CLIMB)),
      { props: [{ kind: 'chair', x: INCLINE_EDGE, facing: -1 }], thumb: 2 },
    ),
    summary: 'Mountain climbers with your hands raised on a sturdy chair, an easier angle that keeps your heart rate up while your core works.',
    steps: [
      'Brace a sturdy chair against a wall and place your hands on the front edge of the seat.',
      'Walk your feet back until your body is in a straight line.',
      'Drive one knee toward the chair, then step it back.',
      'Alternate legs at a brisk, steady pace.',
    ],
    tips: [
      'Keep your shoulders over your hands.',
      'Step lightly rather than jumping to keep it low impact.',
    ],
    family: 'mountain-climber',
    variant: 'Incline',
  },
  {
    id: 'weighted-crunch',
    name: 'Weighted crunch',
    category: 'weights',
    tags: ['core'],
    muscles: ['abs', 'obliques'],
    equipment: 'dumbbells',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(weightedCrunchDown, 900, 100), key(weightedCrunchUp, 900, 150)], {
      props: [...mat(-1, 0.75), { kind: 'dumbbell', hand: 'L' }],
      thumb: 1,
    }),
    summary: 'A crunch with a dumbbell held against your chest, adding load so your abs work harder in fewer reps.',
    steps: [
      'Lie on your back with your knees bent and feet flat on the floor.',
      'Hold a light dumbbell against your chest with both hands.',
      'Curl your head and shoulders up off the floor.',
      'Lower back down with control.',
    ],
    tips: [
      'Keep the weight close to your chest so your arms do not do the work.',
      'Start light and add weight only when every rep feels smooth.',
    ],
    family: 'crunch',
    variant: 'Dumbbell',
  },
  {
    id: 'long-arm-crunch',
    name: 'Long-arm crunch',
    category: 'core',
    tags: [],
    muscles: ['abs', 'shoulders'],
    equipment: 'mat',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(longArmDown, 900, 100), key(longArmUp, 900, 150)], { props: mat(-1.45, 0.75), thumb: 1 }),
    summary: 'A crunch with your arms stretched overhead, which makes your abs lift a longer lever on every rep.',
    steps: [
      'Lie on your back with your knees bent and feet flat on the floor.',
      'Stretch your arms overhead with your biceps beside your ears.',
      'Curl your head, arms and shoulders up off the floor together.',
      'Lower back down slowly.',
    ],
    tips: [
      'Keep your arms in line with your ears rather than swinging them forward.',
      'Bend your elbows and hold your head to make it easier.',
    ],
    family: 'crunch',
    variant: 'Long arm',
  },
  {
    id: 'dumbbell-floor-press',
    name: 'Dumbbell floor press',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['chest', 'triceps', 'shoulders'],
    equipment: 'dumbbells',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(floorPressDown, 1300, 200), key(floorPressUp, 1000, 120)], {
      props: [...mat(-1, 0.75), { kind: 'dumbbell', hand: 'both' }],
      thumb: 1,
    }),
    summary: 'A chest press lying on the floor, where the floor limits how low your elbows go and keeps your shoulders comfortable.',
    steps: [
      'Lie on your back with your knees bent and a dumbbell in each hand.',
      'Rest your upper arms on the floor with your elbows bent and the weights above your chest.',
      'Press the dumbbells straight up until your arms are straight.',
      'Lower slowly until your elbows touch the floor.',
    ],
    tips: [
      'Keep your elbows at about 45 degrees from your sides.',
      'Let your elbows touch down softly rather than bouncing.',
    ],
    family: 'push-up',
    variant: 'Floor press',
  },
  {
    id: 'arnold-press',
    name: 'Arnold press',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['shoulders', 'triceps', 'upperBack'],
    equipment: 'dumbbells',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('front', [key(arnoldStart, 900, 150), key(arnoldOpen, 600), key(arnoldTop, 700, 150), key(arnoldOpen, 900)], {
      props: STAND_HOLD_PROPS,
      thumb: 2,
    }),
    summary: 'A shoulder press that starts with your palms facing you and rotates out as you press, working all sides of your shoulders.',
    steps: [
      'Stand tall with a dumbbell in each hand in front of your shoulders, palms facing you.',
      'Open your elbows out to the sides as you turn your palms forward.',
      'Press the weights overhead until your arms are straight.',
      'Reverse the path, turning your palms back toward you as you lower.',
    ],
    tips: [
      'Keep your ribs down so your lower back does not arch.',
      'Make the rotation smooth rather than a separate step.',
    ],
    family: 'press',
    variant: 'Arnold',
  },
  {
    id: 'alternating-dumbbell-press',
    name: 'Alternating shoulder press',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['shoulders', 'triceps', 'abs'],
    equipment: 'dumbbells',
    level: 2,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('front', [key(pressRack, 900, 100), key(pressLeftUp, 800, 120), key(pressRack, 900, 100), key(pressRightUp, 800, 120)], {
      props: STAND_HOLD_PROPS,
      thumb: 1,
    }),
    summary: 'A standing shoulder press that lifts one dumbbell at a time, so your core works to keep you steady.',
    steps: [
      'Stand tall with a dumbbell in each hand at shoulder height, palms facing forward.',
      'Press one dumbbell overhead while the other stays at your shoulder.',
      'Lower it back to your shoulder with control.',
      'Press the other side and keep alternating.',
    ],
    tips: [
      'Avoid leaning away from the arm that is pressing.',
      'Keep your wrists stacked over your elbows.',
    ],
    family: 'press',
    variant: 'Alternating',
  },
  {
    id: 'concentration-curl',
    name: 'Concentration curl',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['biceps', 'forearms'],
    equipment: 'dumbbells',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(concentrationDown, 1300, 150), key(concentrationUp, 1000, 200)], {
      props: [CURL_BENCH, { kind: 'dumbbell', hand: 'L' }],
      thumb: 1,
    }),
    summary: 'A seated curl with your elbow braced against your inner thigh, isolating your biceps so you cannot swing the weight.',
    steps: [
      'Sit on the end of a bench with your feet wide and a dumbbell in one hand.',
      'Lean forward and brace the back of that elbow against your inner thigh.',
      'Curl the dumbbell up toward your shoulder.',
      'Lower it slowly until your arm is straight.',
    ],
    tips: [
      'Keep your upper arm still and let only your forearm move.',
      'Rest your free hand on your other knee for support.',
    ],
    family: 'curl',
    variant: 'Concentration',
  },
  {
    id: 'curl-and-press',
    name: 'Curl and press',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['biceps', 'shoulders', 'triceps'],
    equipment: 'dumbbells',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim(
      'side',
      [key(STAND_HOLD, 900, 150), key(curlPressCurl, 900, 100), key(curlPressTop, 800, 150), key(curlPressCurl, 900, 100)],
      { props: STAND_HOLD_PROPS, thumb: 2 },
    ),
    summary: 'A biceps curl that flows straight into an overhead press, working your arms and shoulders in one move.',
    steps: [
      'Stand tall with a dumbbell in each hand by your sides.',
      'Curl the weights up to your shoulders.',
      'Press them overhead until your arms are straight.',
      'Lower back to your shoulders, then uncurl to your sides.',
    ],
    tips: [
      'Keep your elbows close to your body during the curl.',
      'Brace your core so you press without leaning back.',
    ],
    family: 'curl',
    variant: 'Press',
  },
  {
    id: 'seated-band-row',
    name: 'Seated band row',
    category: 'upperBody',
    tags: [],
    muscles: ['upperBack', 'lats', 'biceps'],
    equipment: 'band',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(rowReach, 1200, 150), key(rowPull, 900, 200)], { props: [ROW_BAND], thumb: 1 }),
    summary: 'A seated row with a band looped around your feet that strengthens your upper back and helps your posture.',
    steps: [
      'Sit tall with your legs out in front and a band looped around the soles of your feet.',
      'Hold one end in each hand with your arms reaching forward.',
      'Pull your elbows back past your sides and squeeze your shoulder blades together.',
      'Let your arms extend forward again with control.',
    ],
    tips: [
      'Sit up tall rather than leaning back to pull.',
      'Keep your shoulders down away from your ears.',
    ],
    family: 'row',
    variant: 'Seated band',
  },
  {
    id: 'alternating-dumbbell-row',
    name: 'Alternating dumbbell row',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['upperBack', 'lats', 'biceps', 'lowerBack'],
    equipment: 'dumbbells',
    level: 2,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim(
      'side',
      [key(hingeHang, 900, 100), key(hingeRowLeft, 800, 150), key(hingeHang, 900, 100), key(hingeRowRight, 800, 150)],
      { props: STAND_HOLD_PROPS, thumb: 1 },
    ),
    summary: 'A bent-over row that pulls one dumbbell at a time, so your core works to keep your back still.',
    steps: [
      'Hold a dumbbell in each hand and hinge forward at your hips with a flat back.',
      'Let the weights hang below your shoulders.',
      'Row one dumbbell up toward your hip, then lower it.',
      'Row the other side and keep alternating.',
    ],
    tips: [
      'Keep your hips and shoulders square instead of twisting toward the lifting arm.',
      'Lead with your elbow and squeeze your shoulder blade at the top.',
    ],
    family: 'row',
    variant: 'Alternating',
  },
  {
    id: 'straight-leg-chair-dip',
    name: 'Straight-leg chair dip',
    category: 'upperBody',
    tags: [],
    muscles: ['triceps', 'shoulders', 'chest'],
    equipment: 'chair',
    level: 3,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(straightDipTop, 900, 150), key(straightDipBottom, 1000, 100)], {
      props: [{ kind: 'chair', x: 0, facing: 1 }],
      thumb: 1,
    }),
    summary: 'A chair dip with your legs straight and heels on the floor, which puts more of your weight on your triceps.',
    steps: [
      'Sit on the edge of a sturdy chair and grip the seat beside your hips.',
      'Walk your feet out until your legs are straight and rest on your heels.',
      'Bend your elbows straight back to lower your hips toward the floor.',
      'Press back up until your arms are straight.',
    ],
    tips: [
      'Keep your hips close to the chair as you lower.',
      'Bend your knees to make it easier.',
    ],
    family: 'dip',
    variant: 'Straight legs',
  },
  {
    id: 'floor-triceps-dip',
    name: 'Floor triceps dip',
    category: 'upperBody',
    tags: [],
    muscles: ['triceps', 'shoulders'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(floorDipUp, 900, 150), key(floorDipDown, 1000, 100)], { thumb: 0 }),
    summary: 'A dip done from the floor with your hands behind you, a beginner-friendly way to work the backs of your arms.',
    steps: [
      'Sit on the floor with your knees bent and feet flat.',
      'Place your hands behind your hips with your fingers pointing toward you.',
      'Press into your hands to lift your hips off the floor.',
      'Bend your elbows to lower your hips toward the floor, then press back up.',
    ],
    tips: [
      'Bend your elbows straight back rather than out to the sides.',
      'Keep your shoulders down away from your ears.',
    ],
    family: 'dip',
    variant: 'Floor',
  },
  {
    id: 'step-jacks',
    name: 'Step jacks',
    category: 'cardio',
    tags: ['warmup'],
    muscles: ['shoulders', 'calves', 'abductors', 'quads'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim(
      'front',
      sideKeys((side) => [key(STAND_FRONT, 260, 60), key(stepJack(side, 'lift'), 240), key(stepJack(side, 'out'), 260, 100), key(stepJack(side, 'lift'), 260)]),
      { thumb: 2 },
    ),
    summary: 'A no-jump jumping jack where you step one foot out as your arms rise, keeping your heart rate up without the impact.',
    steps: [
      'Stand tall with your feet together and arms by your sides.',
      'Step one foot out to the side as you raise your arms overhead.',
      'Step the foot back in as your arms come down.',
      'Repeat to the other side and keep alternating.',
    ],
    tips: [
      'Land softly on the ball of the stepping foot.',
      'Move faster to raise the intensity.',
    ],
    family: 'jumping-jack',
    variant: 'Step',
  },
  {
    id: 'cross-jacks',
    name: 'Cross jacks',
    category: 'cardio',
    tags: ['fullBody'],
    muscles: ['calves', 'adductors', 'abductors', 'shoulders', 'chest'],
    equipment: 'none',
    level: 2,
    impact: 'high',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim(
      'front',
      [key(crossClosed, 200, 0, 'out'), key(crossAirOut, 170, 0, 'in'), key(crossOpen, 200, 0, 'out'), key(crossAirIn, 170, 0, 'in')],
      { thumb: 0 },
    ),
    summary: 'A jumping jack where your arms and legs cross in front of you on each landing, working your inner and outer thighs.',
    steps: [
      'Stand with your feet apart and your arms out at shoulder height.',
      'Jump and cross one foot in front of the other as your arms cross in front of your chest.',
      'Jump back out to the wide stance with your arms out.',
      'Switch which foot crosses in front on each rep.',
    ],
    tips: [
      'Stay light on the balls of your feet.',
      'Keep your arms straight but relaxed.',
    ],
    family: 'jumping-jack',
    variant: 'Cross',
  },
]
