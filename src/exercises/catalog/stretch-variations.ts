import { add, distance, lerpVec, sub, type Vec2 } from '@/figure/math'
import { ANKLE_REST_HEIGHT, RIG } from '@/figure/rig'
import { solveSpec } from '@/figure/solve'
import type { JointId, PoseSpec, Prop, Reach, View } from '@/figure/types'
import type { Exercise } from '../types'
import {
  FLOOR_FOREARM,
  FLOOR_SHIN,
  HIP,
  LYING_HIP,
  SEATED,
  SIDE_LYING_FRONT,
  STAND,
  SUPINE_FLAT,
  anim,
  arms,
  flat,
  hand,
  key,
  legs,
  palm,
  pose,
  toes,
} from '../kit'

function jointsOf(spec: PoseSpec, view: View): Record<JointId, Vec2> {
  return solveSpec(spec, view).points
}

function hold(a: PoseSpec, b: PoseSpec, view: View, props?: Prop[], ms = 1700): ReturnType<typeof anim> {
  return anim(view, [key(a, ms, 200), key(b, ms, 300)], { props, thumb: 1 })
}

const MAT = (x0: number, x1: number): Prop[] => [{ kind: 'mat', x0, x1 }]

function legThrough(hip: Vec2, knee: Vec2, ankle: Vec2, sign: 1 | -1, angle: number) {
  const toAnkle = sub(ankle, hip)
  const toKnee = sub(knee, hip)
  const bend: 1 | -1 = sign * (toAnkle[0] * toKnee[1] - toAnkle[1] * toKnee[0]) > 0 ? 1 : -1
  const reach: Reach = { at: ankle, angle, bend }
  return { reach, thigh: distance(hip, knee) / RIG.thigh, shin: distance(knee, ankle) / RIG.shin }
}

const SEAT_HIP = 0.56
const CHAIR_EDGE = 0.1

function crossAnkle(base: PoseSpec, view: View, offset: Vec2, angle: number): PoseSpec {
  const p = jointsOf(base, view)
  return pose(base, {
    legL: { at: add(p.kneeR, offset), angle },
    scale: { thighL: 0.62, shinL: 0.74, footL: 0.6 },
  })
}

function chairFourPose(torso: number, spine: number): PoseSpec {
  const seated = pose(STAND, { root: [-0.12, SEAT_HIP], torso, spine, neck: -4, legR: flat(0.3) })
  const crossed = crossAnkle(seated, 'side', [0.02, 0.07], -10)
  const p = jointsOf(crossed, 'side')
  return pose(crossed, {
    armL: hand(add(p.kneeL, [0.01, 0.05]), -60),
    armR: hand(add(p.ankleL, [0, 0.05]), -30),
  })
}
const chairFourTall = chairFourPose(2, 0)
const chairFourHinge = chairFourPose(26, 4)

function floorFourPose(torso: number): PoseSpec {
  const seated = pose(SEATED, { root: [0, 0.1], torso, neck: 4, legR: flat(0.4) })
  const crossed = crossAnkle(seated, 'side', [0.02, 0.07], -10)
  return pose(crossed, arms(palm(-0.3)))
}
const floorFourBack = floorFourPose(-22)
const floorFourLean = floorFourPose(-6)

const FOUR_WALL = 0.55
function wallFourPose(rootX: number): PoseSpec {
  const legged = pose(SUPINE_FLAT, {
    root: [rootX, LYING_HIP],
    neck: 4,
    legR: { at: [FOUR_WALL - ANKLE_REST_HEIGHT, 0.6], angle: 90 },
  })
  const crossed = crossAnkle(legged, 'side', [0.03, -0.03], 150)
  return pose(crossed, arms([12, 0]))
}
const wallFourEasy = wallFourPose(0)
const wallFourDeep = wallFourPose(0.05)

function singleLegHamPose(torso: number, spine: number, reach: number): PoseSpec {
  const base = pose(SEATED, { torso, spine, neck: 6 })
  const hipR = jointsOf(base, 'side').hipR
  const bent = legThrough(hipR, [0.22, 0.31], [0.36, 0.1], 1, 30)
  const seated = pose(base, {
    legL: { at: [0.8675, 0.07], angle: 92 },
    legR: bent.reach,
    scale: { thighR: bent.thigh, shinR: bent.shin, footR: 0.6 },
  })
  return pose(seated, arms(hand([reach, 0.2], -10)))
}
const singleHamTall = singleLegHamPose(8, 4, 0.5)
const singleHamFold = singleLegHamPose(34, 14, 0.72)

function chairHamPose(torso: number, spine: number, grip: number): PoseSpec {
  const seated = pose(STAND, {
    root: [-0.02, SEAT_HIP],
    torso,
    spine,
    neck: -6,
    legR: flat(0.32),
    legL: { at: [0.7, 0.09], angle: 92 },
  })
  const p = jointsOf(seated, 'side')
  return pose(seated, arms(hand(lerpVec(p.hipL, p.kneeL, grip), -20)))
}
const chairHamTall = chairHamPose(4, 2, 0.45)
const chairHamHinge = chairHamPose(32, 6, 0.8)

const QUAD_CHAIR_EDGE = 0.72
function supportedQuadPose(thigh: number, knee: number): PoseSpec {
  const legged = pose(STAND, { root: [0, HIP - 0.01], torso: 2, legL: [thigh, knee, 50] })
  const p = jointsOf(legged, 'side')
  const grip = add(lerpVec(p.ankleL, p.toeL, 0.3), [-0.02, -0.015])
  return pose(legged, { armL: hand(grip, 150), armR: hand([QUAD_CHAIR_EDGE - 0.4, 0.95], 0) })
}
const supportedQuadEasy = supportedQuadPose(-3, 150)
const supportedQuadDeep = supportedQuadPose(-8, 156)

const sideLyingJoints = jointsOf(SIDE_LYING_FRONT, 'front')
function sideLyingQuadPose(heelGap: number, lift: number): PoseSpec {
  const p = sideLyingJoints
  const ankle = add(lerpVec(p.hipL, p.kneeL, heelGap), [0, lift])
  const top = legThrough(p.hipL, p.kneeL, ankle, 1, 90)
  const legged = pose(SIDE_LYING_FRONT, {
    legL: top.reach,
    scale: { thighL: top.thigh, shinL: top.shin, footL: 0.7 },
  })
  return pose(legged, { armL: hand(add(ankle, [0, 0.03])) })
}
const sideQuadEasy = sideLyingQuadPose(0.26, 0.08)
const sideQuadDeep = sideLyingQuadPose(0.18, 0.09)

function standingHipPose(rootX: number, rootY: number): PoseSpec {
  const base = pose(STAND, { root: [rootX, rootY], torso: -2, legL: flat(0.44), legR: toes(-0.57, -40) })
  const p = jointsOf(base, 'side')
  return pose(base, arms(hand(add(p.hip, [0.03, 0.13]), 100)))
}
const standingHipEasy = standingHipPose(-0.02, 0.79)
const standingHipDeep = standingHipPose(0.03, 0.74)

const wiperBase = pose(SUPINE_FLAT, {
  neck: 4,
  legL: flat(0.58),
  legR: flat(0.58),
  ...arms([6, 0]),
  scale: { upperArmL: 0.75, forearmL: 0.75, upperArmR: 0.75, forearmR: 0.75 },
})
const wiperJoints = jointsOf(wiperBase, 'side')

function dropKnee(hip: Vec2, knee: Vec2, degrees: number): Vec2 {
  const rise = (knee[1] - hip[1]) * Math.cos((degrees * Math.PI) / 180)
  return [knee[0], hip[1] + rise]
}

function wiperPose(dropL: number, dropR: number): PoseSpec {
  const p = wiperJoints
  const left = legThrough(p.hipL, dropKnee(p.hipL, p.kneeL, dropL), p.ankleL, 1, 0)
  const right = legThrough(p.hipR, dropKnee(p.hipR, p.kneeR, dropR), p.ankleR, 1, 0)
  return pose(wiperBase, {
    legL: left.reach,
    legR: right.reach,
    scale: { ...wiperBase.scale, thighL: left.thigh, shinL: left.shin, thighR: right.thigh, shinR: right.shin },
  })
}
const wiperCenter = wiperPose(0, 0)
const wiperLeft = wiperPose(86, 62)
const wiperRight = wiperPose(62, 86)

const FROG_WRIST: Vec2 = [0.66, FLOOR_FOREARM]

function frogPose(thigh: number, torso: number, spine: number, neck: number): PoseSpec {
  return {
    torso,
    spine,
    neck,
    ...legs([thigh + torso, thigh + 90, 30]),
    anchor: { joint: 'kneeL', at: [0, FLOOR_SHIN] },
    ...arms({ at: FROG_WRIST, angle: 0 }),
    scale: { thighL: 0.8, thighR: 0.8, footL: 0.35, footR: 0.35 },
  }
}
const frogForward = frogPose(-10, 100, 0, -26)
const frogBack = frogPose(58, 84, 4, -24)

export const STRETCH_VARIATIONS: Exercise[] = [
  {
    id: 'chair-figure-four-stretch',
    name: 'Chair figure-four stretch',
    category: 'stretch',
    tags: [],
    muscles: ['glutes', 'abductors', 'lowerBack'],
    equipment: 'chair',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: hold(chairFourTall, chairFourHinge, 'side', [{ kind: 'chair', x: CHAIR_EDGE, facing: 1 }]),
    summary: 'A seated figure-four on a chair that eases the outer hip and glute without getting down on the floor.',
    steps: [
      'Sit tall near the front of a sturdy chair with both feet flat on the floor.',
      'Cross your left ankle over your right knee and let your left knee drop out to the side.',
      'Rest one hand on your left knee and the other on your left ankle.',
      'Keep your back long and hinge forward from your hips until you feel the stretch in your left hip.',
      'Hold and breathe, then switch sides.',
    ],
    tips: [
      'Flex your top foot to protect the knee.',
      'Only lean as far as you can keep your chest lifted.',
    ],
    family: 'figure-four',
    variant: 'Chair',
  },
  {
    id: 'seated-figure-four-stretch',
    name: 'Seated figure-four stretch',
    category: 'stretch',
    tags: [],
    muscles: ['glutes', 'abductors', 'lowerBack'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: hold(floorFourBack, floorFourLean, 'side', MAT(-0.55, 0.75)),
    summary: 'A floor figure-four propped on your hands that lets you control how deep the hip and glute stretch goes.',
    steps: [
      'Sit on the floor with your knees bent, your feet flat and your hands on the floor behind you.',
      'Cross your left ankle over your right knee.',
      'Press through your hands to sit up tall.',
      'Draw your chest gently toward your shins until you feel the stretch in your left hip.',
      'Hold and breathe, then switch sides.',
    ],
    tips: [
      'Walk your right foot closer to you to deepen the stretch.',
      'Keep your top foot flexed.',
    ],
    family: 'figure-four',
    variant: 'Seated',
  },
  {
    id: 'wall-figure-four-stretch',
    name: 'Wall figure-four stretch',
    category: 'stretch',
    tags: [],
    muscles: ['glutes', 'abductors', 'lowerBack'],
    equipment: 'wall',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: hold(wallFourEasy, wallFourDeep, 'side', [{ kind: 'wall', x: FOUR_WALL, side: 1 }, ...MAT(-1.0, FOUR_WALL)]),
    summary: 'A lying figure-four with your bottom foot resting on a wall, so the wall holds your leg and you can simply relax.',
    steps: [
      'Lie on your back with your hips close to a wall.',
      'Place your right foot flat on the wall with your knee bent about 90 degrees.',
      'Cross your left ankle over your right knee and let your left knee open out.',
      'Relax your arms on the floor and breathe into your left hip.',
      'Scoot closer to the wall to deepen the stretch, then switch sides.',
    ],
    tips: [
      'Keep your lower back and shoulders resting on the floor.',
      'Flex your top foot to protect the knee.',
    ],
    family: 'figure-four',
    variant: 'Wall',
  },
  {
    id: 'single-leg-hamstring-stretch',
    name: 'Single-leg hamstring stretch',
    category: 'stretch',
    tags: [],
    muscles: ['hamstrings', 'calves', 'lowerBack'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: hold(singleHamTall, singleHamFold, 'side', MAT(-0.4, 1.1)),
    summary: 'A seated hamstring stretch done one leg at a time with the other knee bent, gentler than folding over both legs.',
    steps: [
      'Sit tall with your left leg straight out in front of you.',
      'Bend your right knee and rest the sole of your right foot against your inner left thigh.',
      'Flex your left foot so your toes point up.',
      'Hinge forward from your hips and slide your hands down your left leg.',
      'Hold where you feel the stretch, then switch sides.',
    ],
    tips: [
      'Lead with your chest rather than rounding your back.',
      'Keep a small bend in your straight knee if the back of it feels tight.',
    ],
    family: 'hamstring-stretch',
    variant: 'Single-leg',
  },
  {
    id: 'chair-hamstring-stretch',
    name: 'Chair hamstring stretch',
    category: 'stretch',
    tags: [],
    muscles: ['hamstrings', 'calves'],
    equipment: 'chair',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: hold(chairHamTall, chairHamHinge, 'side', [{ kind: 'chair', x: 0.22, facing: 1 }]),
    summary: 'A seated hamstring stretch on the edge of a chair, an easy option when getting down to the floor is hard.',
    steps: [
      'Sit near the front edge of a sturdy chair.',
      'Straighten your left leg in front of you with your heel on the floor and your toes up.',
      'Keep your right foot flat with the knee bent.',
      'Rest your hands on your left thigh and hinge forward from your hips with a long back.',
      'Hold when you feel the stretch behind your left thigh, then switch sides.',
    ],
    tips: [
      'Do not press down on your straight knee.',
      'Point your belly button toward your toes rather than rounding forward.',
    ],
    family: 'hamstring-stretch',
    variant: 'Chair',
  },
  {
    id: 'supported-quad-stretch',
    name: 'Chair-supported quad stretch',
    category: 'stretch',
    tags: [],
    muscles: ['quads', 'hipFlexors'],
    equipment: 'chair',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: hold(supportedQuadEasy, supportedQuadDeep, 'side', [{ kind: 'chair', x: QUAD_CHAIR_EDGE, facing: 1 }]),
    summary: 'A standing quad stretch with one hand on a chair back, so you can relax into the stretch without wobbling.',
    steps: [
      'Stand tall beside a sturdy chair and rest your right hand on the backrest.',
      'Bend your left knee and hold your left foot or ankle with your left hand.',
      'Draw your heel toward your glutes with your knees side by side.',
      'Tuck your pelvis slightly until you feel the stretch along the front of your thigh.',
      'Hold, then turn around and switch sides.',
    ],
    tips: [
      'Keep your standing knee soft.',
      'Loop a towel around your foot if you cannot reach it.',
    ],
    family: 'quad-stretch',
    variant: 'Supported',
  },
  {
    id: 'side-lying-quad-stretch',
    name: 'Side-lying quad stretch',
    category: 'stretch',
    tags: [],
    muscles: ['quads', 'hipFlexors'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: hold(sideQuadEasy, sideQuadDeep, 'front', MAT(-1.15, 1.1)),
    summary: 'A quad stretch lying on your side with your head resting on your arm, so there is nothing to balance.',
    steps: [
      'Lie on your right side with your head resting on your right arm.',
      'Bend your left knee and hold your left foot or ankle with your left hand.',
      'Draw your heel toward your glutes, keeping your knees in line.',
      'Press your left hip forward to feel the stretch along the front of your thigh.',
      'Hold, then roll over and switch sides.',
    ],
    tips: [
      'Keep your hips stacked rather than rolling back.',
      'Loop a towel around your foot if you cannot reach it.',
    ],
    family: 'quad-stretch',
    variant: 'Side-lying',
  },
  {
    id: 'standing-hip-flexor-stretch',
    name: 'Standing hip flexor stretch',
    category: 'stretch',
    tags: [],
    muscles: ['hipFlexors', 'quads'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: hold(standingHipEasy, standingHipDeep, 'side'),
    summary: 'A split-stance hip flexor stretch done standing, a knee-friendly option when kneeling is uncomfortable.',
    steps: [
      'Stand in a long split stance with your left foot forward and your right heel lifted.',
      'Rest your hands on your hips and stand tall.',
      'Tuck your tailbone under and squeeze your right glute.',
      'Bend your front knee and shift your hips forward until you feel a stretch at the front of your right hip.',
      'Hold, breathing slowly, then switch sides.',
    ],
    tips: [
      'Keep your back leg long and your ribs down.',
      'Hold a wall or chair for balance if you need to.',
    ],
    family: 'hip-flexor',
    variant: 'Standing',
  },
  {
    id: 'rocking-frog-stretch',
    name: 'Rocking frog stretch',
    category: 'mobility',
    tags: ['stretch'],
    muscles: ['adductors', 'hipFlexors', 'glutes'],
    equipment: 'mat',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim('side', [key(frogForward, 1800, 300), key(frogBack, 1800, 1000)], {
      props: MAT(-0.7, 0.95),
      thumb: 1,
    }),
    summary: "A wide-knee rocking stretch, like child's pose with the knees apart, that opens the groin and inner thighs.",
    steps: [
      'Start on your forearms and knees, then slide your knees out wide to the sides.',
      'Turn your toes and feet outward so the inner edges of your feet rest on the floor.',
      'Slowly rock your hips back toward your heels until you feel the stretch in your groin.',
      'Rock your hips forward over your knees to release, then rock back again.',
    ],
    tips: [
      'Move slowly and only widen your knees as far as feels comfortable.',
      'Pad your knees with a folded mat or towel.',
    ],
    family: 'hip-opener',
    variant: 'Rocking frog',
  },
  {
    id: 'windshield-wipers',
    name: 'Windshield wipers',
    category: 'mobility',
    tags: ['stretch'],
    muscles: ['obliques', 'abductors', 'lowerBack', 'glutes'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim('side', [key(wiperCenter, 1100, 100), key(wiperLeft, 1300, 400), key(wiperCenter, 1100, 100), key(wiperRight, 1300, 400)], {
      props: MAT(-0.9, 0.9),
      thumb: 1,
    }),
    summary: 'A lying hip mobility drill that drops both bent knees to one side and then the other to loosen the hips and lower back.',
    steps: [
      'Lie on your back with your knees bent at 90 degrees and your feet planted wide on the floor.',
      'Stretch your arms out to the sides and keep your shoulders down.',
      'Let both knees drop together to the left, aiming them toward the floor.',
      'Bring them back to the middle and drop them to the right.',
      'Keep your hips on the floor and move slowly from side to side.',
    ],
    tips: [
      'Keep your knees apart rather than stacking one on top of the other.',
      'Only lower as far as your shoulders stay on the floor.',
    ],
    family: 'hip-opener',
    variant: 'Windshield wipers',
  },
]

