import { add, along, lerpVec, type Vec2 } from '@/figure/math'
import { RIG } from '@/figure/rig'
import { solveSpec } from '@/figure/solve'
import type { JointId, PoseSpec, Prop, Reach, View } from '@/figure/types'
import type { Exercise } from '../types'
import {
  ALL_FOURS,
  FLOOR_FOREARM,
  FLOOR_SHIN,
  HIP,
  PRONE,
  STAND,
  STAND_FRONT,
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

function neckStretchPose(tilt: number): PoseSpec {
  const tilted = pose(STAND_FRONT, { neck: tilt, armR: [14, 4] })
  const p = jointsOf(tilted, 'front')
  const phiHead = 90 - tilt
  const grip = along(p.head, phiHead + 70, 0.125)
  return pose(tilted, { armL: hand(grip, phiHead + 165) })
}
const neckEasy = neckStretchPose(28)
const neckDeep = neckStretchPose(36)

const hugBase = pose(STAND, { root: [0, HIP - 0.01], torso: 4 }, legs(flat(0.02)))
const hugEasy = pose(hugBase, {
  spine: 16,
  neck: 12,
  ...arms([84, 158]),
  scale: { upperArmL: 0.85, upperArmR: 0.85, forearmL: 0.62, forearmR: 0.62 },
})
const hugDeep = pose(hugBase, {
  spine: 26,
  neck: 20,
  ...arms([80, 162]),
  scale: { upperArmL: 0.8, upperArmR: 0.8, forearmL: 0.6, forearmR: 0.6 },
})

const CHEST_WALL = -0.585
const chestBase = pose(STAND, { armR: [10, 14] }, legs(flat(0.04)))
const chestEasy = pose(chestBase, { root: [0, HIP - 0.005], torso: 2, armL: hand([CHEST_WALL + 0.04, 1.4], 90) })
const chestDeep = pose(chestBase, { root: [0.02, HIP - 0.008], torso: 4, spine: -3, armL: hand([CHEST_WALL + 0.04, 1.4], 90) })

const openerBase = pose(STAND, legs(flat(0)))
const openerEasy = pose(openerBase, { torso: -1, spine: -5, neck: -6, ...arms([-28, 4, 10]) })
const openerLift = pose(openerBase, { torso: -2, spine: -10, neck: -10, ...arms([-46, 2, 10]) })

const SLIDE_WALL = -0.12
const slideBase = pose(STAND, { root: [0.01, HIP - 0.03], torso: 0 }, legs(flat(0.14)))
const slideLow = pose(slideBase, { ...arms([188, 8, 0]), scale: { upperArmL: 0.22, upperArmR: 0.22 } })
const slideHigh = pose(slideBase, { ...arms([186, 4, 0]) })

const LAT_WALL = 1.065
const latBase = pose(STAND, legs(flat(0.02)))
const latEasy = pose(latBase, { root: [0, HIP - 0.01], torso: 86, spine: -4, neck: -4, ...arms(hand([LAT_WALL - 0.04, 1.0], 90)) })
const latDeep = pose(latBase, { root: [-0.035, HIP - 0.01], torso: 88, spine: -12, neck: -2, ...arms(hand([LAT_WALL - 0.04, 1.0], 90)) })

function wristStretchPose(extension: number): PoseSpec {
  const reached = pose(STAND, { armL: [88, 0, -extension] })
  const p = jointsOf(reached, 'side')
  return pose(reached, { armR: hand(add(p.wristL, [-0.01, -0.07]), -30) })
}
const wristEasy = wristStretchPose(70)
const wristDeep = wristStretchPose(84)

const circleBase = pose(STAND, legs(flat(0)))
const circleUp = pose(circleBase, arms([34, 64, 45]))
const circleOut = pose(circleBase, arms([34, 64, 0]))
const circleDown = pose(circleBase, arms([34, 64, -50]))

function onAllFours(torso: number, extra: PoseSpec = {}): PoseSpec {
  return pose(ALL_FOURS, { torso, ...legs([torso, 90, 90]), armR: palm(0.38) }, extra)
}
const needleStart = onAllFours(77)
const needleOpen = onAllFours(75, { spine: -2, neck: -42, armL: [-112, 4] })
const needleThread = onAllFours(104, {
  spine: 18,
  neck: -38,
  armL: hand([0.24, 0.07], 175),
  scale: { upperArmL: 0.5, forearmL: 0.5 },
})

function rotationPose(torso: number, spine: number, neck: number, bend: 1 | -1): PoseSpec {
  const body = onAllFours(torso, { spine, neck })
  const p = jointsOf(body, 'side')
  const phiHead = 90 - torso - spine - neck
  return pose(body, { armL: hand(along(p.head, phiHead + 100, 0.1), phiHead - 160, bend) })
}
const rotationDown = rotationPose(80, 8, 4, -1)
const rotationUp = rotationPose(75, -4, -34, 1)

const DOG_HANDS = arms(palm(0.67))
const DOG_HEEL = flat(-0.416)
const DOG_TOES = toes(-0.251, -55)
const dogBase: PoseSpec = { root: [0, 0.86], torso: 140, spine: -3, neck: 4, ...DOG_HANDS }
const pedalLeft = pose(dogBase, { legL: DOG_TOES, legR: DOG_HEEL })
const pedalRight = pose(dogBase, { legL: DOG_HEEL, legR: DOG_TOES })

const GREAT_FRONT = flat(0.56)
const GREAT_BACK = toes(-0.62, -40)
const greatBase: PoseSpec = { root: [0.1, 0.46], legL: GREAT_FRONT, legR: GREAT_BACK }
const greatHands = pose(greatBase, { torso: 76, spine: 10, neck: -12, armL: palm(0.52), armR: palm(0.5) })
const greatElbow = pose(greatBase, { torso: 82, spine: 14, neck: -6, armL: [28, 150, 0], armR: palm(0.5) })
const greatReach = pose(greatBase, { torso: 70, spine: -2, neck: -38, armL: [-112, 2, 0], armR: palm(0.5) })

function lizardPose(torso: number, thigh: number, knee: number): PoseSpec {
  return {
    torso,
    spine: 8,
    neck: -14,
    legR: [torso - thigh, knee, 90],
    anchor: { joint: 'kneeR', at: [-0.3, FLOOR_SHIN] },
    legL: flat(0.62),
    ...arms(palm(0.5)),
  }
}
const lizardEasy = lizardPose(60, 44, 46)
const lizardDeep = lizardPose(64, 50, 40)

function pigeonPose(torso: number, spine: number): PoseSpec {
  return {
    root: [0, 0.22],
    torso,
    spine,
    neck: -10,
    legR: [torso - 80, 0, 90],
    legL: [torso + 75, 150, 20],
    ...arms(palm(0.42)),
    scale: { thighL: 0.85, shinL: 0.32, footL: 0.5 },
  }
}
const pigeonTall = pigeonPose(32, 10)
const pigeonFold = pigeonPose(40, 16)

function figureFourPose(hip: number): PoseSpec {
  const legged = pose(SUPINE_FLAT, { neck: 4, legR: [hip, 92, 10] })
  const p = jointsOf(legged, 'side')
  const crossed = pose(legged, {
    legL: { at: add(p.kneeR, [0.03, -0.03]), angle: 150 },
    scale: { thighL: 0.62, shinL: 0.72 },
  })
  return pose(crossed, arms({ at: lerpVec(p.hipR, p.kneeR, 0.62), bend: -1 }))
}
const fourEasy = figureFourPose(96)
const fourDeep = figureFourPose(106)

function lyingQuadPose(knee: number): PoseSpec {
  const legged = pose(PRONE, {
    torso: 72,
    spine: -20,
    neck: -4,
    legL: [-20, knee, 40],
    legR: [-16, 0, 90],
    armR: hand([0.69, FLOOR_FOREARM], 0),
  })
  const p = jointsOf(legged, 'side')
  return pose(legged, { armL: hand(add(lerpVec(p.ankleL, p.toeL, 0.25), [0.0, 0.05]), 150, 1) })
}
const lyingQuadEasy = lyingQuadPose(132)
const lyingQuadDeep = lyingQuadPose(140)

const COUCH_WALL = -0.28
function couchPose(thigh: number, torso: number): PoseSpec {
  const base: PoseSpec = {
    torso,
    legR: [thigh + 90 + torso, thigh + 270, 90],
    anchor: { joint: 'kneeR', at: [-0.17, FLOOR_SHIN] },
    legL: flat(0.56),
  }
  const hip = jointsOf(base, 'side').hip
  return pose(base, arms(hand(add(hip, [0.04, 0.13]), 100)))
}
const couchEasy = couchPose(-122, 4)
const couchDeep = couchPose(-127, 0)

function hamstringPose(torso: number, spine: number): PoseSpec {
  const legged = pose(STAND, {
    torso,
    spine,
    neck: -12,
    legL: [torso + 30, 0, -25],
    anchor: { joint: 'heelL', at: [0.4, RIG.soleRadius] },
    legR: flat(-0.06),
  })
  const p = jointsOf(legged, 'side')
  return pose(legged, arms({ at: add(lerpVec(p.hipL, p.kneeL, 0.72), [0, 0.06]), angle: -60 }))
}
const hamEasy = hamstringPose(40, 6)
const hamDeep = hamstringPose(50, 10)

const ankleBase = pose(STAND, { root: [0, HIP - 0.01], torso: 2 }, { legR: flat(-0.01) })
const ankleHands = (() => {
  const hip = jointsOf(ankleBase, 'side').hip
  return arms(hand(add(hip, [0.04, 0.13]), 100))
})()
const anklePoint = pose(ankleBase, ankleHands, { legL: [42, 44, 40] })
const ankleSide = pose(ankleBase, ankleHands, { legL: [42, 44, 10], scale: { footL: 0.8 } })
const ankleFlex = pose(ankleBase, ankleHands, { legL: [42, 44, -22] })

const itTall = pose(STAND_FRONT, { legL: flat(-0.08), legR: flat(0.0), armR: [10, 8] })
const itLean = pose(itTall, { root: [0.025, HIP - 0.035], torso: 5, spine: -26, neck: -8, armL: [168, 16], armR: [14, 10] })
const itDeep = pose(itTall, { root: [0.04, HIP - 0.04], torso: 7, spine: -32, neck: -10, armL: [172, 18], armR: [16, 10] })

function straddlePose(fold: number): PoseSpec {
  return {
    root: [0, 0.11],
    torso: 0,
    legL: { at: [0.78, 0.09], angle: 90 },
    legR: { at: [-0.78, 0.09], angle: 90 },
    armL: hand([0.3, 0.07], -20),
    armR: hand([-0.3, 0.07], -20),
    scale: { lowerSpine: 1 - fold * 0.5, upperSpine: 1 - fold, thighL: 0.8, shinL: 0.8, thighR: 0.8, shinR: 0.8, footL: 0.7, footR: 0.7 },
  }
}
const straddleEasy = straddlePose(0.18)
const straddleDeep = straddlePose(0.3)

function prayer(base: PoseSpec): PoseSpec {
  const p = jointsOf(base, 'front')
  const center = lerpVec(p.shoulderL, p.shoulderR, 0.5)
  const chest: Vec2 = [center[0], center[1] - 0.2]
  return pose(base, { armL: hand(add(chest, [0.03, 0]), 90), armR: hand(add(chest, [-0.03, 0]), 90) })
}
const COSSACK = 0.5
const cossackCenter = prayer(pose(STAND_FRONT, { root: [0, 0.86], legL: flat(COSSACK), legR: flat(-COSSACK) }))
function cossackSide(s: 1 | -1): PoseSpec {
  const bent = flat(COSSACK * s)
  const straight: Reach = { at: [-COSSACK * s, RIG.soleRadius], angle: 90, point: 'heel' }
  return prayer(
    pose(STAND_FRONT, {
      root: [0.3 * s, 0.6],
      torso: -4 * s,
      ...(s > 0 ? { legL: bent, legR: straight } : { legL: straight, legR: bent }),
      scale: { lowerSpine: 0.9, upperSpine: 0.9, ...(s > 0 ? { thighL: 0.55 } : { thighR: 0.55 }) },
    }),
  )
}
const cossackLeft = cossackSide(1)
const cossackRight = cossackSide(-1)

const INCH_TOE: Vec2 = [RIG.footToe, RIG.soleRadius]
function inchBody(f: number): PoseSpec {
  const torso = 128 + (73.5 - 128) * f
  const thigh = -90 + (-163.5 + 90) * f
  return {
    torso,
    spine: 28 * (1 - f),
    neck: 30 - 40 * f,
    ...legs([thigh + 90 + torso, 44 * (1 - f) ** 0.6, 10 * f]),
    anchor: { joint: 'toeL', at: INCH_TOE },
  }
}
function inchHandX(f: number): number {
  return jointsOf(inchBody(f), 'side').shoulderL[0] + 0.02 * (1 - f)
}
function inchPose(fL: number, fR: number, lift?: 'L' | 'R', from = 0): PoseSpec {
  const left = lift === 'L' ? (from + fL) / 2 : fL
  const right = lift === 'R' ? (from + fR) / 2 : fR
  const body = inchBody(0.7 * Math.max(left, right) + 0.3 * Math.min(left, right))
  const place = (f: number, lifted: boolean) =>
    lifted ? hand([(inchHandX(from) + inchHandX(f)) / 2, FLOOR_FOREARM + 0.09], -20) : palm(inchHandX(f))
  return pose(body, { armL: place(fL, lift === 'L'), armR: place(fR, lift === 'R') })
}
const inchStand = pose(inchBody(0), { torso: 0, spine: 0, neck: 0, ...legs([0, 0, 0]), ...arms([6, 10]) })
const inchSteps = [0.25, 0.5, 0.75, 1]
const inchOut = inchSteps.flatMap((f, index) => {
  const prev = index === 0 ? 0 : inchSteps[index - 1]
  return [
    key(inchPose(f, prev, 'L', prev), 220),
    key(inchPose(f, prev), 220),
    key(inchPose(f, f, 'R', prev), 220),
    key(inchPose(f, f), 220),
  ]
})
const inchBack = [...inchSteps].reverse().flatMap((f, index, list) => {
  const next = index === list.length - 1 ? 0 : list[index + 1]
  return [
    key(inchPose(f, next, 'R', f), 220),
    key(inchPose(f, next), 220),
    key(inchPose(next, next, 'L', f), 220),
    key(inchPose(next, next), 220),
  ]
})

const WALL = (x: number, side: 1 | -1): Prop[] => [{ kind: 'wall', x, side }]
const MAT = (x0: number, x1: number): Prop[] => [{ kind: 'mat', x0, x1 }]

export const MOBILITY: Exercise[] = [
  {
    id: 'neck-side-stretch',
    name: 'Neck side stretch',
    category: 'stretch',
    tags: [],
    muscles: ['neck', 'traps'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: hold(neckEasy, neckDeep, 'front'),
    summary: 'A gentle held stretch for the side of the neck and upper traps, great for desk tension.',
    steps: [
      'Stand or sit tall with your shoulders relaxed.',
      'Tilt your left ear toward your left shoulder.',
      'Rest your left hand on the right side of your head and let its weight add a light pull.',
      'Reach your right fingertips toward the floor to feel the stretch along the right side of your neck.',
      'Hold, breathing slowly, then switch sides.',
    ],
    tips: [
      'Let the weight of your hand do the work instead of pulling hard.',
      'Keep your chin level rather than letting it drop forward.',
    ],
  },
  {
    id: 'upper-back-hug-stretch',
    name: 'Upper back hug stretch',
    category: 'stretch',
    tags: [],
    muscles: ['upperBack', 'traps', 'shoulders'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: hold(hugEasy, hugDeep, 'side'),
    summary: 'A standing self-hug that spreads your shoulder blades apart to stretch the upper back and traps.',
    steps: [
      'Stand tall with your feet hip-width apart and your knees soft.',
      'Wrap your arms around yourself and reach your hands toward your opposite shoulder blades.',
      'Round your upper back and let your chin drop gently toward your chest.',
      'Breathe into your upper back, letting it widen as you inhale.',
    ],
    tips: [
      'Switch which arm is on top halfway through.',
      'Keep your shoulders down and away from your ears.',
    ],
  },
  {
    id: 'wall-chest-stretch',
    name: 'Wall chest stretch',
    category: 'stretch',
    tags: [],
    muscles: ['chest', 'shoulders', 'biceps'],
    equipment: 'wall',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: hold(chestEasy, chestDeep, 'side', WALL(CHEST_WALL, -1)),
    summary: 'A one-arm stretch against a wall that opens the chest and the front of the shoulder after pushing work.',
    steps: [
      'Stand with your back to a wall, about an arm length away.',
      'Reach your left arm back and place your palm flat on the wall at shoulder height.',
      'Keep the arm long and gently turn your chest away from the wall.',
      'Step forward slightly until you feel a stretch across your chest and shoulder.',
      'Hold, then switch arms.',
    ],
    tips: [
      'Move your hand a little higher or lower to find the spot that feels best.',
      'Keep your shoulder down and back rather than letting it roll forward.',
    ],
  },
  {
    id: 'chest-opener',
    name: 'Clasped-hands chest opener',
    category: 'stretch',
    tags: [],
    muscles: ['chest', 'shoulders', 'biceps'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: hold(openerEasy, openerLift, 'side'),
    summary: 'A standing stretch with your hands clasped behind you that opens a tight chest and rounded shoulders.',
    steps: [
      'Stand tall with your feet hip-width apart.',
      'Interlace your fingers behind your lower back.',
      'Straighten your arms and draw your shoulder blades together.',
      'Lift your hands slightly away from your back as you open your chest.',
      'Hold and breathe, keeping your chin level.',
    ],
    tips: [
      'Hold a towel between your hands if they do not reach each other.',
      'Lift your chest rather than arching your lower back.',
    ],
  },
  {
    id: 'wall-slides',
    name: 'Wall slides',
    category: 'mobility',
    tags: ['warmup'],
    muscles: ['shoulders', 'upperBack', 'traps'],
    equipment: 'wall',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(slideLow, 1300, 200), key(slideHigh, 1500, 200)], { props: WALL(SLIDE_WALL, -1), thumb: 1 }),
    summary: 'A posture drill that slides your arms up and down a wall to improve overhead shoulder mobility.',
    steps: [
      'Stand with your back, head and glutes against a wall and your feet a small step forward.',
      'Raise your arms into a goalpost shape with your elbows and the backs of your hands on the wall.',
      'Slowly slide your arms up the wall until they are nearly straight overhead.',
      'Slide them back down to the goalpost shape, keeping contact with the wall.',
    ],
    tips: [
      'Keep your lower back gently pressed toward the wall.',
      'Only slide as high as you can while your arms stay on the wall.',
    ],
  },
  {
    id: 'wall-lat-stretch',
    name: 'Wall lat stretch',
    category: 'stretch',
    tags: [],
    muscles: ['lats', 'shoulders', 'upperBack'],
    equipment: 'wall',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: hold(latEasy, latDeep, 'side', WALL(LAT_WALL, 1)),
    summary: 'A hinged stretch with your hands on a wall that lengthens the lats and opens up your shoulders.',
    steps: [
      'Stand facing a wall, about a leg length away.',
      'Place your hands on the wall at hip height, shoulder-width apart.',
      'Walk your feet back and hinge at your hips until your arms and back are in a straight line.',
      'Let your chest sink toward the floor and push your hips back.',
      'Hold and breathe slowly.',
    ],
    tips: [
      'Keep a slight bend in your knees if your hamstrings feel tight.',
      'Let your head rest between your arms.',
    ],
  },
  {
    id: 'wrist-flexor-stretch',
    name: 'Wrist flexor stretch',
    category: 'stretch',
    tags: [],
    muscles: ['forearms'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: hold(wristEasy, wristDeep, 'side'),
    summary: 'A simple stretch for the inside of the forearm, handy after push-ups, planks or a long day of typing.',
    steps: [
      'Stand tall and reach your left arm straight out in front of you at shoulder height.',
      'Turn your palm up and let your fingers point toward the floor.',
      'Use your right hand to gently draw your left fingers back toward you.',
      'Hold when you feel a stretch along the inside of your forearm, then switch arms.',
    ],
    tips: [
      'Keep your elbow straight but not locked.',
      'Use light pressure; this stretch should never feel sharp.',
    ],
  },
  {
    id: 'wrist-circles',
    name: 'Wrist circles',
    category: 'mobility',
    tags: ['warmup'],
    muscles: ['forearms'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: anim('side', [key(circleUp, 400), key(circleOut, 400), key(circleDown, 400), key(circleOut, 400)], { thumb: 0 }),
    summary: 'A quick warm-up that rolls your wrists through their full range before planks, push-ups or desk work.',
    steps: [
      'Stand tall and bend your elbows to bring your hands in front of you.',
      'Make loose fists or relax your fingers.',
      'Slowly circle your wrists in one direction, moving through the biggest range you can.',
      'Halfway through, reverse the direction of the circles.',
    ],
    tips: [
      'Keep your forearms still so the movement comes from your wrists.',
      'Move smoothly rather than quickly.',
    ],
  },
  {
    id: 'thread-the-needle',
    name: 'Thread the needle',
    category: 'mobility',
    tags: ['stretch', 'yoga'],
    muscles: ['upperBack', 'traps', 'shoulders'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 8 },
    animation: anim(
      'side',
      [key(needleStart, 1000, 150), key(needleOpen, 1300, 300), key(needleStart, 1200, 150), key(needleThread, 1500, 500)],
      {
        props: MAT(-0.75, 0.85),
        thumb: 3,
      },
    ),
    summary: 'A hands-and-knees rotation that opens the upper back, then threads one arm under to stretch the shoulder.',
    steps: [
      'Start on your hands and knees with your wrists under your shoulders.',
      'Reach your left arm up toward the ceiling, turning your chest to follow it.',
      'Sweep the arm down and slide it under your body toward the right, palm up.',
      'Lower your left shoulder and the side of your head to the mat and pause.',
      'Unwind and repeat, then switch sides.',
    ],
    tips: [
      'Keep your hips stacked over your knees as you turn.',
      'Press your right hand into the floor to deepen the twist.',
    ],
  },
  {
    id: 'quadruped-thoracic-rotation',
    name: 'Thoracic rotation on all fours',
    category: 'mobility',
    tags: ['warmup'],
    muscles: ['upperBack', 'obliques', 'shoulders'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 8 },
    animation: anim('side', [key(rotationDown, 1200, 200), key(rotationUp, 1400, 400)], { props: MAT(-0.75, 0.85), thumb: 1 }),
    summary: 'A controlled upper-back rotation on hands and knees that frees up a stiff mid-back from sitting.',
    steps: [
      'Start on your hands and knees and place your left hand behind your head.',
      'Rotate your left elbow down toward your right wrist.',
      'Turn the other way and sweep your elbow up toward the ceiling, following it with your eyes.',
      'Return slowly and repeat, then switch sides.',
    ],
    tips: [
      'Move from your upper back and keep your hips still.',
      'Breathe out as you open toward the ceiling.',
    ],
  },
  {
    id: 'downward-dog-pedal',
    name: 'Downward dog pedal',
    category: 'mobility',
    tags: ['yoga', 'warmup'],
    muscles: ['calves', 'hamstrings', 'shoulders'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim('side', [key(pedalLeft, 700, 250), key(pedalRight, 700, 250)], { props: MAT(-0.72, 1.0), thumb: 0 }),
    summary: 'A downward dog where you bend one knee at a time to warm up and stretch each calf in turn.',
    steps: [
      'Start in downward dog with your hands and feet about hip-width apart.',
      'Bend your left knee and lift the left heel as you press your right heel toward the floor.',
      'Switch, bending your right knee and pressing your left heel down.',
      'Keep pedaling slowly from side to side.',
    ],
    tips: [
      'Keep your hips high and your hands pressing the floor away.',
      'Pause for a breath on each side if your calves feel tight.',
    ],
  },
  {
    id: 'worlds-greatest-stretch',
    name: "World's greatest stretch",
    category: 'mobility',
    tags: ['warmup', 'stretch'],
    muscles: ['hipFlexors', 'glutes', 'upperBack', 'hamstrings'],
    equipment: 'none',
    level: 2,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 5 },
    animation: anim('side', [key(greatHands, 1100, 200), key(greatElbow, 1300, 400), key(greatReach, 1500, 600)], {
      thumb: 2,
    }),
    summary: 'A lunge, elbow drop and upper-back twist in one flowing move that opens the hips, hamstrings and spine.',
    steps: [
      'Step your left foot forward into a long lunge and place both hands on the floor inside it.',
      'Drop your left elbow toward the inside of your left foot.',
      'Rotate your chest to the left and reach your left arm up toward the ceiling.',
      'Bring the hand back to the floor and repeat, then switch legs.',
    ],
    tips: [
      'Keep your back leg long and strong.',
      'Follow your top hand with your eyes to finish the twist.',
    ],
  },
  {
    id: 'lizard-pose',
    name: 'Lizard pose',
    category: 'stretch',
    tags: ['yoga'],
    muscles: ['hipFlexors', 'adductors', 'glutes'],
    equipment: 'mat',
    level: 2,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: hold(lizardEasy, lizardDeep, 'side', MAT(-0.85, 0.9)),
    summary: 'A deep low lunge with both hands inside the front foot that opens the hips, groin and hip flexors.',
    steps: [
      'From a lunge, lower your right knee to the mat.',
      'Step your left foot out toward the edge of the mat.',
      'Place both hands on the floor inside your left foot.',
      'Let your hips sink forward and down, holding as you breathe.',
      'Step back and switch sides.',
    ],
    tips: [
      'Lower onto your forearms only if your hips feel open enough.',
      'Keep your front knee tracking over your toes.',
    ],
  },
  {
    id: 'pigeon-pose',
    name: 'Pigeon pose',
    category: 'stretch',
    tags: ['yoga'],
    muscles: ['glutes', 'hipFlexors', 'abductors'],
    equipment: 'mat',
    level: 2,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: hold(pigeonTall, pigeonFold, 'side', MAT(-1.0, 0.75)),
    summary: 'A classic yoga hip opener that stretches the outer hip and glute of the front leg and the hip flexor of the back leg.',
    steps: [
      'Start on your hands and knees.',
      'Bring your left knee forward behind your left wrist and angle your left shin across the mat.',
      'Slide your right leg straight back with the top of the foot on the mat.',
      'Square your hips, walk your hands forward and lean over your front leg.',
      'Hold and breathe, then switch sides.',
    ],
    tips: [
      'Place a cushion under your front hip if it does not reach the mat.',
      'Keep your front foot flexed to protect the knee.',
    ],
  },
  {
    id: 'figure-four-stretch',
    name: 'Lying figure-four stretch',
    category: 'stretch',
    tags: [],
    muscles: ['glutes', 'abductors', 'lowerBack'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: hold(fourEasy, fourDeep, 'side', MAT(-0.95, 0.55)),
    summary: 'A lying stretch for the deep glute and outer hip that is gentler on the knees than pigeon pose.',
    steps: [
      'Lie on your back with your knees bent and your feet flat.',
      'Cross your left ankle over your right thigh, just below the knee.',
      'Lift your right foot and hold the back of your right thigh with both hands.',
      'Draw your right thigh toward your chest until you feel the stretch in your left hip.',
      'Hold and breathe, then switch sides.',
    ],
    tips: [
      'Keep your left foot flexed to protect the knee.',
      'Gently press your left knee away from you to deepen the stretch.',
    ],
  },
  {
    id: 'lying-quad-stretch',
    name: 'Lying quad stretch',
    category: 'stretch',
    tags: [],
    muscles: ['quads', 'hipFlexors'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: hold(lyingQuadEasy, lyingQuadDeep, 'side', MAT(-1.0, 0.85)),
    summary: 'A face-down quad stretch that needs no balance, making it an easy cool-down after legs or a run.',
    steps: [
      'Lie face down and prop yourself up on your right forearm.',
      'Bend your left knee and reach back with your left hand to hold your foot or ankle.',
      'Gently draw your heel toward your glutes.',
      'Press your left hip into the mat to feel the stretch along the front of your thigh.',
      'Hold, then switch sides.',
    ],
    tips: [
      'Loop a towel around your foot if you cannot reach it.',
      'Keep your knees close together.',
    ],
  },
  {
    id: 'couch-stretch',
    name: 'Couch stretch',
    category: 'stretch',
    tags: [],
    muscles: ['quads', 'hipFlexors'],
    equipment: 'wall',
    level: 2,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: hold(couchEasy, couchDeep, 'side', [...WALL(COUCH_WALL, -1), ...MAT(COUCH_WALL, 0.75)]),
    summary: 'A deep kneeling stretch with your back foot up a wall that opens tight quads and hip flexors.',
    steps: [
      'Kneel facing away from a wall with a cushion under your right knee.',
      'Slide your right knee back into the corner and rest your right shin and foot up the wall.',
      'Step your left foot forward into a lunge with your foot flat.',
      'Lift your chest, squeeze your right glute and ease your hips forward.',
      'Hold and breathe, then switch sides.',
    ],
    tips: [
      'Start with your knee farther from the wall and creep closer over time.',
      'Keep your ribs down so your lower back does not arch.',
    ],
  },
  {
    id: 'standing-hamstring-stretch',
    name: 'Standing hamstring stretch',
    category: 'stretch',
    tags: [],
    muscles: ['hamstrings', 'calves'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: hold(hamEasy, hamDeep, 'side'),
    summary: 'A standing hinge over one straight leg that stretches the hamstring and calf with no mat needed.',
    steps: [
      'Stand tall and place your left heel on the floor a small step in front of you, toes up.',
      'Bend your right knee slightly and rest your hands on your left thigh.',
      'Hinge forward from your hips with a long, flat back.',
      'Stop when you feel a stretch behind your left thigh and hold.',
      'Stand up and switch legs.',
    ],
    tips: [
      'Lead with your chest instead of rounding your back.',
      'Do not press on your knee; keep your hands on your thigh.',
    ],
  },
  {
    id: 'ankle-circles',
    name: 'Ankle circles',
    category: 'mobility',
    tags: ['warmup'],
    muscles: ['calves'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim(
      'side',
      [
        key(anklePoint, 450, 0, 'linear'),
        key(ankleSide, 450, 0, 'linear'),
        key(ankleFlex, 450, 0, 'linear'),
        key(ankleSide, 450, 0, 'linear'),
      ],
      { thumb: 0 },
    ),
    summary: 'A simple drill that rolls your ankle through its full range to warm it up and ease stiffness.',
    steps: [
      'Stand tall on your right leg, holding a wall or chair if you need to.',
      'Lift your left foot slightly off the floor in front of you.',
      'Draw slow, big circles with your toes, moving only at the ankle.',
      'Reverse the direction halfway through, then switch feet.',
    ],
    tips: [
      'Keep your shin still so the movement comes from your ankle.',
      'Sit on a chair instead if balancing is tricky.',
    ],
  },
  {
    id: 'standing-it-band-stretch',
    name: 'Standing outer hip stretch',
    category: 'stretch',
    tags: [],
    muscles: ['abductors', 'obliques', 'glutes'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: hold(itLean, itDeep, 'front'),
    summary: 'A standing cross-legged side lean that stretches the outer hip and the side of your waist.',
    steps: [
      'Stand tall and cross your left leg behind your right.',
      'Reach your left arm up and over your head.',
      'Push your left hip out to the side as you lean your upper body to the right.',
      'Hold when you feel a stretch along your outer left hip, then switch sides.',
    ],
    tips: [
      'Keep both feet flat on the floor.',
      'Lean straight to the side rather than forward.',
    ],
  },
  {
    id: 'seated-straddle-stretch',
    name: 'Seated straddle stretch',
    category: 'stretch',
    tags: [],
    muscles: ['adductors', 'hamstrings', 'lowerBack'],
    equipment: 'mat',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: hold(straddleEasy, straddleDeep, 'front', MAT(-1.0, 1.0)),
    summary: 'A wide-legged seated fold that lengthens the inner thighs and hamstrings.',
    steps: [
      'Sit tall on the floor and open your straight legs as wide as is comfortable.',
      'Point your knees and toes up toward the ceiling.',
      'Place your hands on the floor in front of you.',
      'Hinge forward from your hips, walking your hands out as you breathe.',
    ],
    tips: [
      'Sit on a folded towel if your lower back rounds.',
      'Bring your legs a little closer together if your knees roll in.',
    ],
  },
  {
    id: 'cossack-squat',
    name: 'Cossack squat',
    category: 'mobility',
    tags: ['warmup'],
    muscles: ['adductors', 'glutes', 'quads'],
    equipment: 'none',
    level: 2,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim(
      'front',
      [key(cossackCenter, 900, 150), key(cossackLeft, 1100, 300), key(cossackCenter, 900, 150), key(cossackRight, 1100, 300)],
      { thumb: 1 },
    ),
    summary: 'A deep side-to-side squat that opens the inner thighs and hips while building leg control.',
    steps: [
      'Stand with your feet about twice shoulder-width apart, toes turned slightly out.',
      'Bend your left knee and sit your hips down toward your left heel.',
      'Keep your right leg straight and let its toes lift toward the ceiling.',
      'Push back up through the middle and repeat on the right side.',
    ],
    tips: [
      'Go only as low as you can with your bent-leg heel flat.',
      'Hold your hands together in front of your chest for balance.',
    ],
  },
  {
    id: 'inchworm',
    name: 'Inchworm',
    category: 'mobility',
    tags: ['warmup'],
    muscles: ['hamstrings', 'shoulders', 'abs', 'calves'],
    equipment: 'none',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 6 },
    animation: anim(
      'side',
      [
        key(inchStand, 900, 200),
        key(inchPose(0, 0), 1000, 150),
        ...inchOut.slice(0, -1),
        key(inchPose(1, 1), 260, 400),
        ...inchBack,
      ],
      { thumb: 9 },
    ),
    summary: 'A walk-out from a forward fold to a plank and back that warms up the hamstrings, shoulders and core.',
    steps: [
      'Stand tall, then hinge forward and place your hands on the floor, bending your knees as needed.',
      'Walk your hands forward one at a time until you reach a high plank.',
      'Pause with your body in a straight line.',
      'Walk your hands back toward your feet and roll up to standing.',
    ],
    tips: [
      'Keep your legs as straight as is comfortable to feel the hamstring stretch.',
      'Brace your core so your hips do not sag in the plank.',
    ],
  },
]
