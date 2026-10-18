import type { Vec2 } from '@/figure/math'
import { CHAIR_SEAT_HEIGHT } from '@/figure/parts'
import { ANKLE_REST_HEIGHT, RIG, WIDTH } from '@/figure/rig'
import { solveSpec } from '@/figure/solve'
import type { PoseSpec, Reach } from '@/figure/types'
import type { Exercise } from '../types'
import {
  FLOOR_FOREARM,
  FLOOR_SHIN,
  HIGH_PLANK,
  PRONE,
  STAND,
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

type Side = 'L' | 'R'

const ARM_REACH = RIG.upperArm + RIG.forearm

const pushTop = pose(HIGH_PLANK, { torso: 72.5 })
const pushBottom = pose(pushTop, { torso: 86, neck: -12, scale: { upperArmL: 0.85, upperArmR: 0.85 } })

const KNEE_X = -0.3
const kneeTop: PoseSpec = {
  torso: 53,
  neck: -10,
  legL: [0, 97, 70],
  legR: [0, 103, 70],
  anchor: { joint: 'kneeL', at: [KNEE_X, FLOOR_SHIN] },
  ...arms(palm(KNEE_X + 0.8)),
}
const kneeBottom = pose(kneeTop, {
  torso: 78,
  neck: -12,
  legL: [0, 72, 70],
  legR: [0, 78, 70],
  scale: { upperArmL: 0.85, upperArmR: 0.85 },
})

const WALL_X = 0.92
const wallTop: PoseSpec = {
  torso: 14,
  ...legs([0, 0, -14]),
  anchor: { joint: 'ankleL', at: [0, ANKLE_REST_HEIGHT] },
  ...arms(hand([WALL_X - WIDTH.hand / 2, 1.27], 90)),
}
const wallBottom = pose(wallTop, { torso: 27, ...legs([0, 0, -27]) })

const INCLINE_EDGE = 0.55
const inclineTop: PoseSpec = {
  torso: 52,
  neck: -8,
  ...legs([0, 0, 10]),
  anchor: { joint: 'toeL', at: [INCLINE_EDGE - 1.16, RIG.soleRadius] },
  ...arms(palm(INCLINE_EDGE + 0.03, CHAIR_SEAT_HEIGHT)),
}
const inclineBottom = pose(inclineTop, { torso: 65, neck: -10 })

const dipTop: PoseSpec = {
  root: [0.13, 0.55],
  torso: 4,
  neck: -4,
  ...legs(flat(0.6)),
  ...arms(palm(-0.04, CHAIR_SEAT_HEIGHT, -30)),
}
const dipBottom = pose(dipTop, { root: [0.14, 0.28], torso: 8, neck: -8 })

const PIKE_TOE = -0.188
const pikeTop: PoseSpec = {
  root: [0.088, 0.973],
  torso: 140,
  neck: 20,
  ...legs(toes(PIKE_TOE, -38)),
  ...arms(palm(0.5)),
}
const pikeBottom = pose(pikeTop, { root: [0.415, 0.82], torso: 155, neck: 0, ...legs(toes(PIKE_TOE, -65)) })

const PLANK_SHOULDER = solveSpec(pushTop, 'side').points.shoulderL

function freeArm(side: Side, at: Vec2, angle: number, upper: number, fore = upper, palmSize = fore): PoseSpec {
  const arm = hand(at, angle)
  return side === 'L'
    ? pose(pushTop, { armL: arm, scale: { upperArmL: upper, forearmL: fore, handL: palmSize } })
    : pose(pushTop, { armR: arm, scale: { upperArmR: upper, forearmR: fore, handR: palmSize } })
}

const TUCK = 0.06
const TUCK_SCALE = TUCK / (ARM_REACH * 0.98)

function rotateToCeiling(side: Side) {
  const [x, y] = PLANK_SHOULDER
  return [
    key(freeArm(side, [x, y - TUCK], -90, TUCK_SCALE), 250, 0, 'in'),
    key(freeArm(side, [x, y + TUCK], 90, TUCK_SCALE), 60, 0, 'linear'),
    key(freeArm(side, [x, y + ARM_REACH - 0.001], 90, 1), 350, 250, 'out'),
    key(freeArm(side, [x, y + TUCK], 90, TUCK_SCALE), 300, 0, 'in'),
    key(freeArm(side, [x, y - TUCK], -90, TUCK_SCALE), 60, 0, 'linear'),
  ]
}

function pushThenRotate(side: Side) {
  return [key(pushTop, 250, 80, 'out'), key(pushBottom, 850, 60), key(pushTop, 750, 60), ...rotateToCeiling(side)]
}

function shoulderTap(side: Side) {
  const [x, y] = PLANK_SHOULDER
  const [upper, fore] = side === 'L' ? [0.5, 0.55] : [0.72, 0.62]
  return freeArm(side, [x + 0.05, y - 0.05], 100, upper, fore, 0.9)
}

const UP_TOE: Vec2 = [-0.8, RIG.soleRadius]
const FOREARM_DOWN = hand([UP_TOE[0] + 1.61, FLOOR_FOREARM], 0)
const PALM_DOWN = palm(UP_TOE[0] + 1.34)
const HAND_LIFTED = hand([UP_TOE[0] + 1.475, 0.16], -20)

function upDown(torso: number, armL: Reach, armR: Reach): PoseSpec {
  return { torso, neck: -10, ...legs([0, 0, 10]), anchor: { joint: 'toeL', at: UP_TOE }, armL, armR }
}

function upDownRep(lead: Side) {
  const plank = (torso: number, leading: Reach, trailing: Reach) =>
    lead === 'L' ? upDown(torso, leading, trailing) : upDown(torso, trailing, leading)
  return [
    key(plank(84, FOREARM_DOWN, FOREARM_DOWN), 300, 150),
    key(plank(83, HAND_LIFTED, FOREARM_DOWN), 250),
    key(plank(79, PALM_DOWN, FOREARM_DOWN), 300),
    key(plank(76, PALM_DOWN, HAND_LIFTED), 250),
    key(plank(72.5, PALM_DOWN, PALM_DOWN), 300, 150),
    key(plank(74, HAND_LIFTED, PALM_DOWN), 250),
    key(plank(78, FOREARM_DOWN, PALM_DOWN), 300),
    key(plank(82, FOREARM_DOWN, HAND_LIFTED), 250),
  ]
}

const supermanDown = pose(PRONE, arms([172, 0, 8]))
const supermanUp = pose(PRONE, { torso: 87, spine: -9, neck: -4 }, arms([179, 0, 0]), legs([-13, 0, 90]))

const ARM_CIRCLE = [
  [180, 1],
  [135, 1],
  [90, 1],
  [45, 1],
  [0, 1],
  [-45, 0.9],
  [-90, 0.75],
  [-135, 0.85],
] as const

function armCircle(shoulder: number, reach: number) {
  return pose(STAND, arms([shoulder, 4, 0]), {
    scale: { upperArmL: reach, forearmL: reach, upperArmR: reach, forearmR: reach },
  })
}

export const UPPER_BODY: Exercise[] = [
  {
    id: 'push-up',
    name: 'Push-up',
    category: 'upperBody',
    tags: ['fullBody'],
    muscles: ['chest', 'triceps', 'shoulders', 'abs'],
    equipment: 'none',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(pushTop, 900, 150), key(pushBottom, 1100, 100)]),
    summary: 'A classic bodyweight press that builds strength in your chest, shoulders and arms while your core holds a straight plank.',
    steps: [
      'Start in a high plank with your hands under your shoulders and your body in one straight line.',
      'Bend your elbows back at about 45 degrees to lower your chest toward the floor.',
      'Stop when your chest is a few centimeters above the floor.',
      'Press the floor away to straighten your arms and return to the plank.',
    ],
    tips: [
      'Squeeze your glutes and brace your abs so your hips neither sag nor pike.',
      'Keep your neck long and look at the floor just ahead of your hands.',
      'Drop to your knees if you cannot keep a straight line for every rep.',
    ],
  },
  {
    id: 'knee-push-up',
    name: 'Knee push-up',
    category: 'upperBody',
    tags: [],
    muscles: ['chest', 'triceps', 'shoulders'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(kneeTop, 900, 150), key(kneeBottom, 1000, 100)]),
    summary: 'A push-up from the knees that trains the same chest, shoulder and arm muscles with less load while you build up to full push-ups.',
    steps: [
      'Kneel and place your hands on the floor slightly wider than your shoulders.',
      'Walk your hands forward and lift your feet until your body is straight from knees to head.',
      'Bend your elbows to lower your chest toward the floor.',
      'Press back up until your arms are straight.',
    ],
    tips: [
      'Keep your hips in line with your shoulders rather than bending at the waist.',
      'Put a folded towel or mat under your knees for comfort.',
    ],
  },
  {
    id: 'wall-push-up',
    name: 'Wall push-up',
    category: 'upperBody',
    tags: [],
    muscles: ['chest', 'shoulders', 'triceps'],
    equipment: 'wall',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(wallTop, 900, 150), key(wallBottom, 1000, 100)], {
      props: [{ kind: 'wall', x: WALL_X, side: 1 }],
    }),
    summary: 'A standing push-up against a wall that eases you into pressing strength for the chest, shoulders and arms.',
    steps: [
      'Stand facing a wall with your feet hip-width apart, a little more than arm length away.',
      'Place your palms flat on the wall at shoulder height and shoulder-width apart.',
      'Bend your elbows to bring your chest toward the wall, keeping your body straight.',
      'Push the wall away until your arms are straight again.',
    ],
    tips: [
      'Keep your heels down and move as one piece from head to heels.',
      'Keep your elbows angled down and back rather than flaring out to the sides.',
      'Step your feet further from the wall to make it harder.',
    ],
  },
  {
    id: 'incline-push-up',
    name: 'Incline push-up',
    category: 'upperBody',
    tags: [],
    muscles: ['chest', 'triceps', 'shoulders', 'abs'],
    equipment: 'chair',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(inclineTop, 900, 150), key(inclineBottom, 1000, 100)], {
      props: [{ kind: 'chair', x: INCLINE_EDGE, facing: -1 }],
    }),
    summary: 'A push-up with your hands raised on a sturdy chair, a step between wall and floor push-ups for the chest, shoulders and arms.',
    steps: [
      'Set a sturdy chair with its back against a wall so it cannot slide.',
      'Place your hands on the front edge of the seat and walk your feet back until your body is straight.',
      'Bend your elbows to lower your chest toward the edge of the seat.',
      'Press back up until your arms are straight.',
    ],
    tips: [
      'Keep your heels, hips and shoulders in one line throughout.',
      'The lower the surface, the harder the push-up.',
    ],
  },
  {
    id: 'triceps-dips',
    name: 'Triceps dip on chair',
    category: 'upperBody',
    tags: [],
    muscles: ['triceps', 'shoulders', 'chest'],
    equipment: 'chair',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(dipTop, 900, 150), key(dipBottom, 1000, 100)], {
      props: [{ kind: 'chair', x: 0, facing: 1 }],
    }),
    summary: 'A bodyweight dip off the edge of a chair that targets the triceps at the back of your arms, along with the shoulders and chest.',
    steps: [
      'Sit on the edge of a sturdy chair and grip the seat beside your hips, fingers forward.',
      'Walk your feet out, knees bent at about 90 degrees, and slide your hips off the seat.',
      'Bend your elbows straight back to lower your hips toward the floor.',
      'Stop when your upper arms are about parallel to the floor, then press back up.',
    ],
    tips: [
      'Keep your back close to the chair and your shoulders down away from your ears.',
      'Use a chair that cannot tip or slide, ideally braced against a wall.',
      'Straighten your legs further out to make it harder.',
    ],
  },
  {
    id: 'pike-push-up',
    name: 'Pike push-up',
    category: 'upperBody',
    tags: [],
    muscles: ['shoulders', 'triceps', 'upperBack'],
    equipment: 'none',
    level: 3,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 8 },
    animation: anim('side', [key(pikeTop, 900, 150), key(pikeBottom, 1100, 100)]),
    summary: 'A push-up from an inverted V position that shifts the work onto your shoulders and builds toward overhead pressing strength.',
    steps: [
      'From a high plank, walk your feet toward your hands and lift your hips into an upside-down V.',
      'Keep your arms straight with your head between them.',
      'Bend your elbows to lower the top of your head toward the floor, just in front of your hands.',
      'Press back up to straight arms, keeping your hips high.',
    ],
    tips: [
      'Let your elbows bend back toward your feet rather than flaring out to the sides.',
      'Bend your knees slightly if your hamstrings feel tight.',
      'Walk your feet closer to your hands to put more of your weight over your shoulders.',
    ],
  },
  {
    id: 'push-up-rotation',
    name: 'Push-up and rotation',
    category: 'upperBody',
    tags: ['fullBody', 'core'],
    muscles: ['chest', 'shoulders', 'triceps', 'obliques', 'abs'],
    equipment: 'none',
    level: 3,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [...pushThenRotate('L'), ...pushThenRotate('R')], { thumb: 5 }),
    summary: 'A push-up followed by a rotation into a side plank, combining upper-body pressing with core and shoulder stability.',
    steps: [
      'Start in a high plank with your hands under your shoulders.',
      'Lower your chest toward the floor and press back up.',
      'At the top, shift onto one hand and turn sideways, reaching your free arm to the ceiling.',
      'Return to the plank, do another push-up, and rotate to the other side.',
    ],
    tips: [
      'Keep your hips lifted and stacked in the side plank.',
      'Pivot onto the edges of your feet as you rotate.',
      'Follow your top hand with your eyes.',
    ],
  },
  {
    id: 'plank-shoulder-taps',
    name: 'Plank shoulder taps',
    category: 'upperBody',
    tags: ['core'],
    muscles: ['shoulders', 'abs', 'obliques', 'triceps'],
    equipment: 'none',
    level: 2,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim(
      'side',
      [key(pushTop, 350, 200), key(shoulderTap('L'), 350, 100), key(pushTop, 350, 200), key(shoulderTap('R'), 350, 100)],
      { thumb: 1 },
    ),
    summary: 'A high plank where you tap each shoulder in turn, challenging your core to keep your hips steady while one hand is lifted.',
    steps: [
      'Start in a high plank with your hands under your shoulders and feet hip-width apart.',
      'Lift one hand and tap the opposite shoulder.',
      'Place the hand back down and repeat with the other hand.',
      'Keep alternating at a steady, controlled pace.',
    ],
    tips: [
      'Keep your hips level and avoid rocking from side to side.',
      'Widen your feet to make the balance easier.',
      'Slow down if your hips start to twist.',
    ],
  },
  {
    id: 'plank-up-downs',
    name: 'Plank up-downs',
    category: 'upperBody',
    tags: ['core'],
    muscles: ['triceps', 'shoulders', 'abs', 'chest'],
    equipment: 'none',
    level: 2,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [...upDownRep('L'), ...upDownRep('R')], { thumb: 6 }),
    summary: 'Move between a forearm plank and a high plank one arm at a time to work your shoulders, arms and core together.',
    steps: [
      'Start in a forearm plank with your elbows under your shoulders.',
      'Place one hand on the floor, then the other, and press up into a high plank.',
      'Lower back down onto one forearm, then the other.',
      'Lead with the other arm on the next rep.',
    ],
    tips: [
      'Keep your hips steady and avoid rocking from side to side.',
      'Widen your feet for more stability.',
      'Drop to your knees to make it easier.',
    ],
  },
  {
    id: 'superman',
    name: 'Superman',
    category: 'upperBody',
    tags: [],
    muscles: ['lowerBack', 'glutes', 'upperBack'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(supermanDown, 1000, 400), key(supermanUp, 1000, 1200)], {
      props: [{ kind: 'mat', x0: -1.2, x1: 1.3 }],
    }),
    summary: 'A face-down lift of the arms and legs that strengthens the muscles along the back of your body.',
    steps: [
      'Lie face down with your arms stretched out in front of you and your legs straight.',
      'Squeeze your glutes and lift your arms, chest and legs a few centimeters off the floor.',
      'Hold briefly at the top, reaching long through your fingers and toes.',
      'Lower back down with control.',
    ],
    tips: [
      'Keep your gaze on the floor so your neck stays in line with your spine.',
      'Think about reaching long rather than lifting high.',
    ],
  },
  {
    id: 'arm-circles',
    name: 'Arm circles',
    category: 'upperBody',
    tags: ['warmup'],
    muscles: ['shoulders', 'upperBack'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim(
      'side',
      ARM_CIRCLE.map(([shoulder, reach]) => key(armCircle(shoulder, reach), 175, 0, 'linear')),
      { thumb: 1 },
    ),
    summary: 'Big, controlled arm circles that warm up your shoulders and upper back before a workout.',
    steps: [
      'Stand tall with your feet hip-width apart and your arms by your sides.',
      'Keeping your arms straight, swing them forward and up overhead.',
      'Continue the circle back and down past your hips.',
      'Make smooth, full circles and switch direction halfway if you like.',
    ],
    tips: [
      'Keep your core braced so your lower back does not arch.',
      'Start with smaller circles and make them bigger as your shoulders loosen up.',
    ],
  },
]
