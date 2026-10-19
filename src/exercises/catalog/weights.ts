import { along } from '@/figure/math'
import { RIG } from '@/figure/rig'
import { solveSpec } from '@/figure/solve'
import type { Keyframe, PoseSpec, Prop, Reach } from '@/figure/types'
import type { Exercise } from '../types'
import {
  STAND,
  STAND_FRONT,
  STAND_HOLD,
  STAND_HOLD_PROPS,
  SUPINE_ON_BENCH,
  SUPINE_ON_BENCH_PROPS,
  BENCH_HEIGHT,
  HIGH_PLANK,
  HIP,
  anim,
  arms,
  flat,
  foot,
  grips,
  hand,
  key,
  legs,
  palm,
  pose,
  toes,
} from '../kit'

type Side = 'L' | 'R'

function lead(side: Side, working: Reach, support: Reach): PoseSpec {
  return side === 'L' ? { legL: working, legR: support } : { legL: support, legR: working }
}

const DUMBBELLS: Prop[] = STAND_HOLD_PROPS
const ONE_BY_END: Prop = { kind: 'dumbbell', hand: 'both', hold: 'end' }

const curlDown = STAND_HOLD
const curlUp = pose(STAND, arms([12, 138]))

const NEUTRAL = grips(90)
const HOLD_NEUTRAL = pose(STAND_HOLD, NEUTRAL)

const hammerLeft = pose(HOLD_NEUTRAL, { armL: [12, 132] })
const hammerRight = pose(HOLD_NEUTRAL, { armR: [12, 132] })

const pressDown = pose(STAND_FRONT, arms([82, 100]))
const pressUp = pose(STAND_FRONT, arms([168, 10]))

const lateralDown = pose(STAND_FRONT, arms([10, 14]), grips(0))
const lateralUp = pose(STAND_FRONT, arms([86, 16]), grips(0))

const frontRaiseUp = pose(STAND_HOLD, arms([90, 6]))

const HINGE: PoseSpec = { root: [-0.21, 0.89], torso: 64, neck: -16, legL: flat(0), legR: flat(0) }
const rowDown = pose(STAND, HINGE, arms([64, 4]), NEUTRAL)
const rowUp = pose(STAND, HINGE, arms([4, 72]), NEUTRAL)

const BENCH_ROW: Prop = { kind: 'bench', x0: -0.6, x1: 0.72 }
const benchRowBase: PoseSpec = {
  root: [0, 0.94],
  torso: 78,
  neck: -10,
  legR: [78, 90, 60],
  legL: flat(0.05),
  armR: palm(0.52, BENCH_HEIGHT),
}
const benchRowDown = pose(benchRowBase, { armL: [76, 10], gripL: 90 })
const benchRowUp = pose(benchRowBase, { torso: 76, armL: [-14, 92], gripL: 90 })

const benchPressDown = pose(SUPINE_ON_BENCH, arms([-25, 115]), { scale: { upperArmL: 0.65, upperArmR: 0.65 } })
const benchPressUp = pose(SUPINE_ON_BENCH, arms([88, 2]))

const pulloverUp = pose(SUPINE_ON_BENCH, arms([95, 14, -70]))
const pulloverBack = pose(SUPINE_ON_BENCH, arms([168, 22, -70]))

const skullUp = pose(SUPINE_ON_BENCH, arms([104, 4]), NEUTRAL)
const skullDown = pose(SUPINE_ON_BENCH, arms([116, 122]), NEUTRAL)

const overheadUp = pose(STAND, arms([176, 8, 70]))
const overheadDown = pose(STAND, arms([180, 142, 70]))

const KICK_HINGE: PoseSpec = { root: [-0.2, 0.9], torso: 68, neck: -16, legL: flat(0), legR: flat(0) }
const kickBent = pose(STAND, KICK_HINGE, arms([-20, 96]), NEUTRAL)
const kickBack = pose(STAND, KICK_HINGE, arms([-22, 4]), NEUTRAL)

const rdlTop = pose(STAND_HOLD, arms([6, 4]))
const rdlBottom = pose(STAND, { root: [-0.2, 0.9], torso: 74, neck: -16 }, arms([74, 2]))

const PLANTED = toes(RIG.footToe, 0)
const lungeTall = pose(STAND, legs(PLANTED), arms([4, 6]), NEUTRAL)

function weightedLunge(side: Side): Keyframe[] {
  const lift = pose(lungeTall, { root: [-0.02, 0.945], torso: 3 }, lead(side, toes(-0.25, -30, 0.11), PLANTED))
  const land = pose(lungeTall, { root: [-0.27, 0.78], torso: 6 }, arms([8, 6]), lead(side, toes(-0.8, -45), PLANTED))
  const bottom = pose(lungeTall, { root: [-0.44, 0.545], torso: 8 }, arms([10, 6]), lead(side, toes(-0.8, -50), PLANTED))
  return [key(lungeTall, 400, 120), key(lift, 320), key(land, 320), key(bottom, 650, 100), key(land, 600), key(lift, 320)]
}

const BOX_TOP = 0.4
const STEP_BOX: Prop = { kind: 'box', x0: 0.1, x1: 0.58, height: BOX_TOP }
const FLOOR_FOOT = flat(-0.14)
const BOX_FOOT = flat(0.24, BOX_TOP)
const stepFloor = pose(HOLD_NEUTRAL, { root: [-0.14, HIP], legL: FLOOR_FOOT, legR: FLOOR_FOOT })
const stepLift = pose(stepFloor, { root: [-0.13, HIP - 0.01], legL: foot([0.2, 0.58], 10) })
const stepPlant = pose(stepFloor, { root: [-0.06, HIP - 0.07], torso: 14, legL: BOX_FOOT }, arms([14, 6]))
const stepDrive = pose(HOLD_NEUTRAL, { root: [0.2, HIP + BOX_TOP - 0.02], torso: 4, legL: BOX_FOOT, legR: foot([0.02, 0.62], 30) })
const stepTop = pose(HOLD_NEUTRAL, { root: [0.24, HIP + BOX_TOP], legL: BOX_FOOT, legR: BOX_FOOT })
const stepLower = pose(HOLD_NEUTRAL, { root: [0.1, 1.08], torso: 10, legL: BOX_FOOT, legR: foot([-0.1, 0.3], 20) })
const stepDown = pose(stepPlant, { legR: FLOOR_FOOT })

const farmerStand = pose(HOLD_NEUTRAL, arms([2, 4]))
const farmerLeft = pose(farmerStand, { legL: [68, 82, 14] })
const farmerRight = pose(farmerStand, { legR: [68, 82, 14] })

const RENEGADE_HAND = hand([0.58, 0.16], -90)
const renegadeBase = pose(HIGH_PLANK, { torso: 72, ...arms(RENEGADE_HAND) }, NEUTRAL)
const renegadeLeft = pose(renegadeBase, { torso: 71, armL: [-30, 100] })
const renegadeRight = pose(renegadeBase, { torso: 71, armR: [-30, 100] })

const thrusterRack = pose(STAND, arms([40, 150]), NEUTRAL)
const thrusterSquat = pose(STAND, { root: [-0.16, 0.56], torso: 30, neck: -10 }, arms([55, 150]), NEUTRAL)
const thrusterPress = pose(STAND, arms([176, 6]), NEUTRAL)

const BARBELL: Prop = { kind: 'barbell' }
const SQUAT_LOW: PoseSpec = { root: [-0.15, 0.57], torso: 34, neck: -10 }

const FOLDED_ARMS = { upperArmL: 0.7, upperArmR: 0.7, forearmL: 0.8, forearmR: 0.8 }

function barOn(base: PoseSpec, side: 'back' | 'front', drop: number, offset: number, at: 'neck' | 'waist' = 'neck'): PoseSpec {
  const skeleton = solveSpec(base, 'side')
  const up = skeleton.phi.upperSpine
  const across = side === 'back' ? up + 90 : up - 90
  const bar = along(along(skeleton.points[at], up + 180, drop), across, offset)
  if (at === 'waist') {
    return pose(base, arms(hand([bar[0], bar[1] + 0.04], -90)))
  }
  const wrist = along(bar, up + 180, 0.04)
  return pose(base, arms(hand(wrist, up)), { scale: { ...base.scale, ...FOLDED_ARMS } })
}

const backSquatUp = barOn(STAND, 'back', 0.03, 0.12)
const backSquatDown = barOn(pose(STAND, SQUAT_LOW), 'back', 0.03, 0.12)

const frontSquatUp = barOn(STAND, 'front', 0.06, 0.13)
const frontSquatDown = barOn(pose(STAND, { root: [-0.1, 0.55], torso: 20, neck: -6 }), 'front', 0.06, 0.13)

const deadliftFloor = pose(STAND, { root: [-0.34, 0.605], torso: 66, neck: -20 }, arms([66, 0]))
const deadliftKnee = pose(STAND, { root: [-0.22, 0.82], torso: 42, neck: -12 }, arms([42, 0]))
const deadliftTop = pose(STAND, { torso: -2 }, arms([2, 0]))

const SUMO_STANCE = 0.36
const SUMO_FEET: PoseSpec = { legL: flat(SUMO_STANCE), legR: flat(-SUMO_STANCE) }
const sumoTop = pose(STAND_FRONT, SUMO_FEET, { root: [0, 0.915], scale: { footL: 1.35, footR: 1.35 } }, arms([4, 0]))
const sumoFloor = pose(sumoTop, {
  root: [0, 0.5],
  scale: { footL: 1.35, footR: 1.35, thighL: 0.8, thighR: 0.8, lowerSpine: 0.72, upperSpine: 0.72 },
})

const ohpRack = barOn(pose(STAND, { neck: -6 }), 'front', 0.04, 0.17)
const ohpTop = pose(STAND, arms([178, 4]))

const BB_ROW_HINGE: PoseSpec = { root: [-0.24, 0.88], torso: 68, neck: -16, legL: flat(0), legR: flat(0) }
const barbellRowDown = pose(STAND, BB_ROW_HINGE, arms([68, 2]))
const barbellRowUp = barOn(pose(STAND, BB_ROW_HINGE), 'front', 0.02, 0.15, 'waist')

const barbellBenchDown = benchPressDown
const barbellBenchUp = benchPressUp

const THRUST_BENCH: Prop = { kind: 'bench', x0: -0.98, x1: -0.4 }
const THRUST_NECK = { joint: 'neck', at: [-0.52, 0.6] } as const
const thrustTop = pose(STAND, { torso: -88, neck: 10, anchor: THRUST_NECK, ...legs(flat(0.42)), ...arms(hand([-0.02, 0.72], 0)) })
const thrustBottom = pose(STAND, { torso: -50, neck: 22, anchor: THRUST_NECK, ...legs(flat(0.42)), ...arms(hand([-0.12, 0.4], -20)) })

const swingBottom = pose(STAND, { root: [-0.17, 0.84], torso: 58, neck: -18 }, arms([28, 0]))
const swingTop = pose(STAND, { torso: -3 }, arms([96, 0]))
const SWING_BELL: Prop = { kind: 'kettlebell', hand: 'both', hang: 'arm' }

const GOBLET = arms([14, 140])
const GOBLET_BELL: Prop = { kind: 'kettlebell', hand: 'both' }
const gobletUp = pose(STAND, GOBLET)
const gobletDown = pose(STAND, { root: [-0.13, 0.55], torso: 24, neck: -8 }, GOBLET)

function pullApart(degrees: number): PoseSpec {
  const sin = Math.sin((degrees * Math.PI) / 180)
  const reach = RIG.upperArm + RIG.forearm
  const x = RIG.shoulderHalfWidth + reach * sin * 0.98
  const short = Math.max(Math.abs(sin), 0.12)
  const angle = degrees < 0 ? 180 : 0
  return pose(STAND_FRONT, {
    armL: hand([x, 1.41], angle),
    armR: hand([-x, 1.41], angle),
    scale: { upperArmL: short, upperArmR: short, forearmL: short, forearmR: short },
  })
}
const PULL_APART_ANGLES = [0, 22, 44, 64, 84]
const pullApartKeys: Keyframe[] = [
  ...PULL_APART_ANGLES.map((degrees, index) => key(pullApart(degrees), index === 0 ? 300 : 220, index === 0 ? 120 : index === 4 ? 250 : 0, 'linear')),
  ...PULL_APART_ANGLES.slice(1, -1)
    .reverse()
    .map((degrees) => key(pullApart(degrees), 280, 0, 'linear')),
]
const PULL_APART_BAND: Prop = { kind: 'band', from: 'handR', hand: 'L' }

const FACE_WALL: Prop = { kind: 'wall', x: 1.05, side: 1 }
const FACE_ANCHOR = [1.05, 1.62] as const
const facePullReach = pose(STAND, { root: [-0.02, HIP], torso: -2 }, arms(hand([0.52, 1.5], 0)))
const facePullIn = pose(STAND, { torso: -4 }, arms(hand([0.06, 1.6], 90)), {
  scale: { upperArmL: 0.55, upperArmR: 0.55 },
})

const BAND_UNDERFOOT: Prop = { kind: 'band', from: 'ankleL', hand: 'both' }
const bandCurlDown = STAND_HOLD
const bandCurlUp = pose(STAND, arms([12, 138]))

export const WEIGHTS: Exercise[] = [
  {
    id: 'dumbbell-biceps-curl',
    name: 'Dumbbell biceps curl',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['biceps', 'forearms'],
    equipment: 'dumbbells',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(curlDown, 1300, 150), key(curlUp, 1000, 150)], { props: DUMBBELLS, thumb: 1 }),
    summary: 'The classic arm builder that curls a pair of dumbbells up to your shoulders to strengthen your biceps.',
    steps: [
      'Stand tall holding a dumbbell in each hand with your arms by your sides and palms facing forward.',
      'Keep your elbows pinned to your ribs and curl the weights up toward your shoulders.',
      'Squeeze your biceps at the top for a moment.',
      'Lower the dumbbells slowly until your arms are straight again.',
    ],
    tips: [
      'Avoid swinging your hips or leaning back to lift the weight.',
      'Take longer to lower than to lift.',
    ],
  },
  {
    id: 'hammer-curl',
    name: 'Hammer curl',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['biceps', 'forearms'],
    equipment: 'dumbbells',
    level: 1,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim(
      'side',
      [key(HOLD_NEUTRAL, 1200, 100), key(hammerLeft, 1000, 120), key(HOLD_NEUTRAL, 1200, 100), key(hammerRight, 1000, 120)],
      { props: DUMBBELLS, thumb: 1 },
    ),
    summary: 'An alternating curl with your palms facing each other that builds your biceps and grip-strong forearms.',
    steps: [
      'Stand tall with a dumbbell in each hand at your sides, palms facing your thighs.',
      'Keep your elbow tucked and curl one dumbbell up toward your shoulder like swinging a hammer.',
      'Lower it slowly back to your side.',
      'Repeat with the other arm and keep alternating.',
    ],
    tips: [
      'Keep your thumbs pointing up the whole time.',
      'Keep your upper arms still and your shoulders down.',
    ],
  },
  {
    id: 'dumbbell-shoulder-press',
    name: 'Dumbbell shoulder press',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['shoulders', 'triceps', 'traps'],
    equipment: 'dumbbells',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('front', [key(pressDown, 1300, 150), key(pressUp, 1000, 120)], { props: DUMBBELLS, thumb: 1 }),
    summary: 'A standing overhead press with two dumbbells that builds strong, stable shoulders and arms.',
    steps: [
      'Stand with your feet hip-width apart and hold the dumbbells at shoulder height, palms facing forward.',
      'Brace your core and press the weights straight up until your arms are nearly straight.',
      'Pause briefly with the dumbbells over your shoulders.',
      'Lower them with control back to shoulder height.',
    ],
    tips: [
      'Keep your ribs down and avoid arching your lower back.',
      'Breathe out as you press up.',
    ],
  },
  {
    id: 'lateral-raise',
    name: 'Lateral raise',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['shoulders', 'traps'],
    equipment: 'dumbbells',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('front', [key(lateralDown, 1300, 150), key(lateralUp, 1000, 150)], { props: DUMBBELLS, thumb: 1 }),
    summary: 'Raise light dumbbells out to your sides to shoulder height to sculpt and strengthen the sides of your shoulders.',
    steps: [
      'Stand tall with a light dumbbell in each hand by your sides.',
      'Keep a slight bend in your elbows and lift your arms out to the sides.',
      'Stop when your hands reach shoulder height.',
      'Lower the weights slowly back to your sides.',
    ],
    tips: [
      'Lead with your elbows, not your hands.',
      'Keep your shoulders away from your ears.',
      'Choose a lighter weight than you think.',
    ],
  },
  {
    id: 'front-raise',
    name: 'Front raise',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['shoulders', 'chest'],
    equipment: 'dumbbells',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(STAND_HOLD, 1300, 150), key(frontRaiseUp, 1000, 150)], { props: DUMBBELLS, thumb: 1 }),
    summary: 'Lift a pair of dumbbells straight in front of you to shoulder height to strengthen the front of your shoulders.',
    steps: [
      'Stand tall holding the dumbbells in front of your thighs.',
      'Keep your arms long and raise the weights forward to shoulder height.',
      'Pause for a moment at the top.',
      'Lower them slowly back to your thighs.',
    ],
    tips: [
      'Keep your torso still instead of rocking back.',
      'Keep a soft bend in your elbows.',
    ],
  },
  {
    id: 'bent-over-dumbbell-row',
    name: 'Bent-over dumbbell row',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['upperBack', 'lats', 'biceps', 'lowerBack'],
    equipment: 'dumbbells',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(rowDown, 1300, 150), key(rowUp, 1000, 150)], { props: DUMBBELLS, thumb: 1 }),
    summary: 'A hinged row that pulls two dumbbells up to your ribs to build a strong upper back and better posture.',
    steps: [
      'Hold a dumbbell in each hand and hinge at your hips with soft knees until your torso leans well forward.',
      'Let the weights hang below your shoulders with your back flat.',
      'Pull your elbows back and up until the dumbbells reach your ribs.',
      'Lower them slowly until your arms are straight.',
    ],
    tips: [
      'Squeeze your shoulder blades together at the top.',
      'Keep your neck in line with your back.',
    ],
  },
  {
    id: 'dumbbell-romanian-deadlift',
    name: 'Dumbbell Romanian deadlift',
    category: 'weights',
    tags: ['lowerBody'],
    muscles: ['hamstrings', 'glutes', 'lowerBack', 'forearms'],
    equipment: 'dumbbells',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(rdlTop, 1200, 150), key(rdlBottom, 1400, 120)], { props: DUMBBELLS, thumb: 1 }),
    summary: 'A hip hinge that lowers dumbbells along your legs to strengthen your hamstrings, glutes and back.',
    steps: [
      'Stand with your feet hip-width apart, holding the dumbbells in front of your thighs.',
      'Soften your knees and push your hips back as the weights slide down your legs.',
      'Lower until you feel a stretch in your hamstrings with your back flat.',
      'Drive your hips forward to stand tall and squeeze your glutes.',
    ],
    tips: [
      'Keep the dumbbells close to your legs the whole way.',
      'Think hips back, not chest down.',
    ],
  },
  {
    id: 'single-arm-dumbbell-row',
    name: 'Single-arm dumbbell row',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['lats', 'upperBack', 'biceps'],
    equipment: 'dumbbells',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(benchRowDown, 1300, 150), key(benchRowUp, 1000, 150)], {
      props: [BENCH_ROW, { kind: 'dumbbell', hand: 'L' }],
      thumb: 1,
    }),
    summary: 'A supported one-arm row with your knee and hand on a bench that builds a strong back and lats.',
    steps: [
      'Place one knee and the same-side hand on a bench, with your other foot on the floor.',
      'Hold a dumbbell in your free hand with your arm hanging straight below your shoulder.',
      'Pull the dumbbell up toward your hip, driving your elbow toward the ceiling.',
      'Lower it slowly until your arm is straight, then switch sides after your set.',
    ],
    tips: [
      'Keep your back flat and your hips square to the floor.',
      'Pull with your back, not just your arm.',
    ],
  },
  {
    id: 'dumbbell-bench-press',
    name: 'Dumbbell bench press',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['chest', 'triceps', 'shoulders'],
    equipment: 'dumbbells',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(benchPressDown, 1300, 150), key(benchPressUp, 1000, 120)], {
      props: [...SUPINE_ON_BENCH_PROPS, ...DUMBBELLS],
      thumb: 0,
    }),
    summary: 'Press two dumbbells up from your chest while lying on a bench to build a strong chest, shoulders and arms.',
    steps: [
      'Lie on a flat bench with your feet planted and a dumbbell in each hand at chest level.',
      'Press the weights straight up over your chest until your arms are straight.',
      'Lower them slowly until your elbows are just below the bench.',
      'Press back up, keeping your shoulder blades pulled together.',
    ],
    tips: [
      'Keep your elbows angled slightly in toward your sides.',
      'Keep your feet planted and your lower back neutral.',
    ],
  },
  {
    id: 'dumbbell-pullover',
    name: 'Dumbbell pullover',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['lats', 'chest', 'triceps'],
    equipment: 'dumbbells',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(pulloverUp, 1300, 150), key(pulloverBack, 1500, 150)], {
      props: [...SUPINE_ON_BENCH_PROPS, ONE_BY_END],
      thumb: 1,
    }),
    summary: 'Lying on a bench, sweep a dumbbell from over your chest to behind your head to work your lats and chest.',
    steps: [
      'Lie on a bench and hold one dumbbell with both hands above your chest.',
      'Keep a slight bend in your elbows and lower the weight in an arc behind your head.',
      'Stop when your arms are in line with your body and you feel a stretch.',
      'Pull the dumbbell back over your chest along the same arc.',
    ],
    tips: [
      'Keep your ribs down and your lower back on the bench.',
      'Move slowly and use a weight you can control.',
    ],
  },
  {
    id: 'skull-crusher',
    name: 'Skull crusher',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['triceps'],
    equipment: 'dumbbells',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(skullUp, 1300, 150), key(skullDown, 1000, 150)], {
      props: [...SUPINE_ON_BENCH_PROPS, ...DUMBBELLS],
      thumb: 1,
    }),
    summary: 'A lying triceps extension that bends at the elbows to lower the weights beside your head and press them back up.',
    steps: [
      'Lie on a bench holding the dumbbells with straight arms above your shoulders.',
      'Tilt your arms back slightly toward your head.',
      'Bend only your elbows to lower the weights beside your head.',
      'Straighten your arms to lift the weights back up.',
    ],
    tips: [
      'Keep your upper arms still and your elbows pointing up.',
      'Lower slowly and keep the weights clear of your face.',
    ],
  },
  {
    id: 'overhead-triceps-extension',
    name: 'Overhead triceps extension',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['triceps', 'shoulders'],
    equipment: 'dumbbells',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(overheadUp, 1300, 150), key(overheadDown, 1100, 120)], {
      props: [ONE_BY_END],
      thumb: 1,
    }),
    summary: 'Lower a dumbbell behind your head and press it back overhead to strengthen the backs of your arms.',
    steps: [
      'Stand tall and hold one dumbbell overhead with both hands.',
      'Keep your elbows close to your head and bend them to lower the weight behind you.',
      'Lower until you feel a stretch in your triceps.',
      'Straighten your arms to press the dumbbell back overhead.',
    ],
    tips: [
      'Brace your core so your lower back does not arch.',
      'Keep your elbows pointing forward, not out.',
    ],
  },
  {
    id: 'triceps-kickback',
    name: 'Triceps kickback',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['triceps', 'upperBack'],
    equipment: 'dumbbells',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(kickBent, 1200, 150), key(kickBack, 900, 200)], { props: DUMBBELLS, thumb: 1 }),
    summary: 'A hinged arm extension that kicks two dumbbells back behind you to tone and strengthen your triceps.',
    steps: [
      'Hold a dumbbell in each hand and hinge forward with soft knees and a flat back.',
      'Lift your elbows back so your upper arms are beside your torso.',
      'Straighten your arms to press the weights back behind you.',
      'Bend your elbows to bring the dumbbells back under them.',
    ],
    tips: [
      'Keep your upper arms still and only move at the elbows.',
      'Pause and squeeze at full extension.',
    ],
  },
  {
    id: 'dumbbell-reverse-lunge',
    name: 'Dumbbell reverse lunge',
    category: 'weights',
    tags: ['lowerBody'],
    muscles: ['quads', 'glutes', 'hamstrings', 'forearms'],
    equipment: 'dumbbells',
    level: 2,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [...weightedLunge('L'), ...weightedLunge('R')], { props: DUMBBELLS, thumb: 3 }),
    summary: 'Step back into a lunge while holding dumbbells at your sides to build strong, balanced legs and glutes.',
    steps: [
      'Stand tall with a dumbbell in each hand at your sides.',
      'Step one foot back and lower until both knees bend to about 90 degrees.',
      'Push through your front heel to bring your back foot forward and stand tall.',
      'Repeat on the other leg and keep alternating.',
    ],
    tips: [
      'Keep your torso upright and the weights hanging straight down.',
      'Let your back knee hover just above the floor.',
    ],
  },
  {
    id: 'dumbbell-step-up',
    name: 'Dumbbell step-up',
    category: 'weights',
    tags: ['lowerBody'],
    muscles: ['quads', 'glutes', 'hamstrings', 'calves'],
    equipment: 'dumbbells',
    level: 2,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim(
      'side',
      [
        key(stepFloor, 420, 120),
        key(stepLift, 380),
        key(stepPlant, 320),
        key(stepDrive, 650),
        key(stepTop, 320, 120),
        key(stepLower, 380),
        key(stepDown, 420),
      ],
      { props: [STEP_BOX, ...DUMBBELLS], thumb: 2 },
    ),
    summary: 'Step up onto a sturdy box or step with dumbbells in your hands to build powerful legs and glutes.',
    steps: [
      'Stand facing a sturdy box or step with a dumbbell in each hand.',
      'Place your whole working foot on top of the box.',
      'Drive through that heel to stand up tall on the box, then bring your other foot up.',
      'Step back down with the trailing foot first, then the working foot, and finish your set before switching legs.',
    ],
    tips: [
      'Let the top leg do the work instead of pushing off the floor.',
      'Keep your chest tall and the weights hanging by your sides.',
    ],
  },
  {
    id: 'farmer-march',
    name: 'Farmer march',
    category: 'weights',
    tags: ['fullBody', 'core'],
    muscles: ['forearms', 'traps', 'abs', 'hipFlexors'],
    equipment: 'dumbbells',
    level: 1,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 40 },
    animation: anim('side', [key(farmerStand, 380), key(farmerLeft, 420, 120), key(farmerStand, 380), key(farmerRight, 420, 120)], {
      props: DUMBBELLS,
      thumb: 1,
    }),
    summary: 'March in place while holding heavy dumbbells at your sides to build grip strength, posture and core control.',
    steps: [
      'Stand tall holding a heavy dumbbell in each hand at your sides.',
      'Brace your core and pull your shoulders back and down.',
      'Lift one knee to hip height, then lower it with control.',
      'Alternate legs at a steady pace without leaning.',
    ],
    tips: [
      'Grip the handles hard and keep your arms straight.',
      'Stay tall as if a string is pulling up the top of your head.',
    ],
  },
  {
    id: 'renegade-row',
    name: 'Renegade row',
    category: 'weights',
    tags: ['upperBody', 'core'],
    muscles: ['upperBack', 'lats', 'abs', 'shoulders'],
    equipment: 'dumbbells',
    level: 3,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim(
      'side',
      [key(renegadeBase, 900, 150), key(renegadeLeft, 800, 150), key(renegadeBase, 900, 150), key(renegadeRight, 800, 150)],
      { props: DUMBBELLS, thumb: 1 },
    ),
    summary: 'A plank on two dumbbells where you row one weight at a time to work your back, shoulders and core together.',
    steps: [
      'Set up in a high plank with your hands gripping two dumbbells under your shoulders and your feet wide.',
      'Brace your core and row one dumbbell up toward your hip.',
      'Lower it back to the floor with control.',
      'Row with the other arm and keep alternating.',
    ],
    tips: [
      'Keep your hips square to the floor instead of twisting.',
      'Widen your feet to make it more stable.',
    ],
  },
  {
    id: 'dumbbell-thruster',
    name: 'Dumbbell thruster',
    category: 'weights',
    tags: ['fullBody'],
    muscles: ['quads', 'shoulders', 'glutes', 'triceps'],
    equipment: 'dumbbells',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(thrusterRack, 800, 120), key(thrusterSquat, 1100, 100), key(thrusterPress, 900, 150)], {
      props: DUMBBELLS,
      thumb: 2,
    }),
    summary: 'A front squat that flows straight into an overhead press for a powerful full-body move that gets your heart rate up.',
    steps: [
      'Stand with your feet shoulder-width apart, holding the dumbbells at your shoulders.',
      'Sit your hips back and down into a squat with your chest up.',
      'Drive up out of the squat and use that momentum to press the weights overhead.',
      'Lower the dumbbells back to your shoulders as you begin the next squat.',
    ],
    tips: [
      'Keep your elbows high in the squat.',
      'Make it one smooth motion from the bottom of the squat to the press.',
    ],
  },
  {
    id: 'barbell-back-squat',
    name: 'Barbell back squat',
    category: 'weights',
    tags: ['lowerBody', 'fullBody'],
    muscles: ['quads', 'glutes', 'hamstrings', 'lowerBack'],
    equipment: 'barbell',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 8 },
    animation: anim('side', [key(backSquatUp, 1100, 150), key(backSquatDown, 1300, 120)], { props: [BARBELL], thumb: 1 }),
    summary: 'The king of leg exercises, squatting with a barbell across your upper back to build strength from head to toe.',
    steps: [
      'Rest the bar across your upper back and grip it just outside your shoulders.',
      'Stand with your feet shoulder-width apart and brace your core.',
      'Sit your hips back and down until your thighs are about parallel to the floor.',
      'Drive through your whole foot to stand back up tall.',
    ],
    tips: [
      'Keep your chest up and your knees tracking over your toes.',
      'Use a rack with safety bars when you lift heavy.',
    ],
  },
  {
    id: 'barbell-front-squat',
    name: 'Barbell front squat',
    category: 'weights',
    tags: ['lowerBody', 'core'],
    muscles: ['quads', 'glutes', 'abs', 'upperBack'],
    equipment: 'barbell',
    level: 3,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 8 },
    animation: anim('side', [key(frontSquatUp, 1100, 150), key(frontSquatDown, 1300, 120)], { props: [BARBELL], thumb: 1 }),
    summary: 'A squat with the bar resting on the front of your shoulders that keeps you upright and hammers your quads and core.',
    steps: [
      'Rest the bar on the front of your shoulders with your elbows pointing forward and high.',
      'Stand with your feet shoulder-width apart and brace your core.',
      'Squat straight down, keeping your torso as upright as you can.',
      'Drive up through your feet and keep your elbows lifted.',
    ],
    tips: [
      'Let the bar rest on your shoulders, with your fingertips only guiding it.',
      'If your elbows drop, the bar will roll forward.',
    ],
  },
  {
    id: 'barbell-deadlift',
    name: 'Barbell deadlift',
    category: 'weights',
    tags: ['fullBody', 'lowerBody'],
    muscles: ['glutes', 'hamstrings', 'lowerBack', 'traps', 'forearms'],
    equipment: 'barbell',
    level: 3,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 6 },
    animation: anim(
      'side',
      [key(deadliftFloor, 900, 300), key(deadliftKnee, 700), key(deadliftTop, 700, 250), key(deadliftKnee, 800)],
      { props: [BARBELL], thumb: 0 },
    ),
    summary: 'Lift a loaded barbell from the floor to standing with a flat back to build total-body pulling strength.',
    steps: [
      'Stand with the bar over the middle of your feet and grip it just outside your legs.',
      'Push your hips back, bend your knees until your shins touch the bar, and flatten your back.',
      'Drive through the floor and stand up, keeping the bar close to your legs.',
      'Lock out by squeezing your glutes, then lower the bar the same way.',
    ],
    tips: [
      'Push the floor away instead of yanking the bar.',
      'Keep your back flat and your chest proud from start to finish.',
      'Start light and master the hinge before adding weight.',
    ],
  },
  {
    id: 'sumo-deadlift',
    name: 'Sumo deadlift',
    category: 'weights',
    tags: ['lowerBody'],
    muscles: ['glutes', 'adductors', 'quads', 'hamstrings', 'lowerBack'],
    equipment: 'barbell',
    level: 3,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 6 },
    animation: anim('front', [key(sumoFloor, 1300, 300), key(sumoTop, 1100, 250)], { props: [BARBELL], thumb: 0 }),
    summary: 'A wide-stance deadlift with your hands inside your knees that loads your glutes and inner thighs.',
    steps: [
      'Stand with your feet wide and your toes turned out, the bar close to your shins.',
      'Push your knees out, sit your hips down, and grip the bar inside your legs.',
      'Keep your chest up and drive the floor apart to stand tall.',
      'Lower the bar with control along the same path.',
    ],
    tips: [
      'Keep your knees in line with your toes.',
      'Keep your arms long and let your legs do the lifting.',
    ],
  },
  {
    id: 'barbell-overhead-press',
    name: 'Barbell overhead press',
    category: 'weights',
    tags: ['upperBody', 'core'],
    muscles: ['shoulders', 'triceps', 'traps', 'abs'],
    equipment: 'barbell',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 8 },
    animation: anim('side', [key(ohpRack, 1300, 150), key(ohpTop, 1000, 150)], { props: [BARBELL], thumb: 1 }),
    summary: 'Press a barbell from your shoulders to straight overhead to build strong shoulders, arms and a stable core.',
    steps: [
      'Hold the bar at the front of your shoulders with your hands just outside shoulder width.',
      'Squeeze your glutes and brace your core.',
      'Press the bar straight up, moving your head back slightly to let it pass.',
      'Finish with the bar over the middle of your feet, then lower it to your shoulders.',
    ],
    tips: [
      'Keep your ribs down so your lower back does not arch.',
      'Push your head through once the bar passes your forehead.',
    ],
  },
  {
    id: 'barbell-row',
    name: 'Barbell row',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['upperBack', 'lats', 'biceps', 'lowerBack'],
    equipment: 'barbell',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 8 },
    animation: anim('side', [key(barbellRowDown, 1300, 150), key(barbellRowUp, 1000, 150)], { props: [BARBELL], thumb: 1 }),
    summary: 'A bent-over pull that rows a barbell to your stomach to build a thick, strong upper back.',
    steps: [
      'Hold the bar with an overhand grip and hinge forward with soft knees.',
      'Let the bar hang below your shoulders with your back flat.',
      'Pull the bar up to your lower ribs, driving your elbows back.',
      'Lower it with control until your arms are straight.',
    ],
    tips: [
      'Keep your torso still instead of jerking the weight up.',
      'Squeeze your shoulder blades together at the top.',
    ],
  },
  {
    id: 'barbell-bench-press',
    name: 'Barbell bench press',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['chest', 'triceps', 'shoulders'],
    equipment: 'barbell',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 8 },
    animation: anim('side', [key(barbellBenchUp, 1000, 150), key(barbellBenchDown, 1300, 120)], {
      props: [...SUPINE_ON_BENCH_PROPS, BARBELL],
      thumb: 0,
    }),
    summary: 'Lower a barbell to your chest and press it back up while lying on a bench to build upper-body pushing strength.',
    steps: [
      'Lie on the bench with your eyes under the bar and your feet planted.',
      'Grip the bar a little wider than your shoulders and lift it over your chest.',
      'Lower it slowly to your mid-chest with your elbows slightly tucked.',
      'Press the bar back up until your arms are straight.',
    ],
    tips: [
      'Pull your shoulder blades together and keep them pinned to the bench.',
      'Always use a spotter or safety bars for heavy sets.',
    ],
  },
  {
    id: 'barbell-hip-thrust',
    name: 'Barbell hip thrust',
    category: 'weights',
    tags: ['lowerBody'],
    muscles: ['glutes', 'hamstrings', 'quads'],
    equipment: 'barbell',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(thrustBottom, 1200, 120), key(thrustTop, 1000, 300)], {
      props: [THRUST_BENCH, BARBELL],
      thumb: 1,
    }),
    summary: 'Drive your hips up with a barbell across them and your upper back on a bench for the ultimate glute builder.',
    steps: [
      'Sit on the floor with your upper back against the edge of a bench and a padded bar over your hips.',
      'Plant your feet hip-width apart with your knees bent.',
      'Drive through your heels to lift your hips until your body is flat from shoulders to knees.',
      'Squeeze your glutes at the top, then lower your hips with control.',
    ],
    tips: [
      'Tuck your chin and keep your ribs down at the top.',
      'Use a bar pad or folded towel for comfort.',
    ],
  },
  {
    id: 'kettlebell-swing',
    name: 'Kettlebell swing',
    category: 'weights',
    tags: ['fullBody'],
    muscles: ['glutes', 'hamstrings', 'lowerBack', 'shoulders', 'forearms'],
    equipment: 'kettlebell',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 15 },
    animation: anim('side', [key(swingBottom, 750, 60, 'out'), key(swingTop, 650, 120, 'out')], {
      props: [SWING_BELL],
      thumb: 1,
    }),
    summary: 'A powerful hip hinge that swings a kettlebell to chest height to build explosive glutes, hamstrings and grip.',
    steps: [
      'Stand with your feet a little wider than your hips and hold the kettlebell with both hands.',
      'Hinge at your hips and hike the bell back between your legs.',
      'Snap your hips forward to swing the bell up to chest height with straight arms.',
      'Let it fall back between your legs as you hinge into the next rep.',
    ],
    tips: [
      'The power comes from your hips, not your arms.',
      'Stand tall and squeeze your glutes at the top.',
      'Keep your back flat as the bell swings between your legs.',
    ],
  },
  {
    id: 'kettlebell-goblet-squat',
    name: 'Kettlebell goblet squat',
    category: 'weights',
    tags: ['lowerBody'],
    muscles: ['quads', 'glutes', 'adductors', 'abs'],
    equipment: 'kettlebell',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(gobletUp, 1100, 150), key(gobletDown, 1300, 120)], { props: [GOBLET_BELL], thumb: 1 }),
    summary: 'Hug a kettlebell at your chest and squat deep to build strong legs while keeping your torso upright.',
    steps: [
      'Hold the kettlebell by its horns close to your chest with your elbows pointing down.',
      'Stand with your feet a little wider than shoulder-width and your toes turned out.',
      'Squat down between your knees, keeping your chest tall.',
      'Drive through your heels to stand back up.',
    ],
    tips: [
      'Let your elbows brush the insides of your knees at the bottom.',
      'Keep the bell tight to your chest the whole time.',
    ],
  },
  {
    id: 'band-pull-apart',
    name: 'Band pull-apart',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['upperBack', 'shoulders', 'traps'],
    equipment: 'band',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 15 },
    animation: anim('front', pullApartKeys, {
      props: [PULL_APART_BAND],
      thumb: 4,
    }),
    summary: 'Stretch a resistance band across your chest to strengthen your upper back and counter hours of sitting.',
    steps: [
      'Stand tall holding a band in front of your chest with straight arms and hands shoulder-width apart.',
      'Pull the band apart by moving your hands out to your sides.',
      'Squeeze your shoulder blades together when the band touches your chest.',
      'Return slowly to the start without letting the band snap back.',
    ],
    tips: [
      'Keep your shoulders down and your ribs in.',
      'Use a lighter band and focus on the squeeze.',
    ],
  },
  {
    id: 'band-face-pull',
    name: 'Band face pull',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['shoulders', 'upperBack', 'traps'],
    equipment: 'band',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 15 },
    animation: anim('side', [key(facePullReach, 1100, 120), key(facePullIn, 900, 250)], {
      props: [FACE_WALL, { kind: 'band', from: FACE_ANCHOR, hand: 'both' }],
      thumb: 1,
    }),
    summary: 'Pull a band anchored at head height toward your face to strengthen the backs of your shoulders and upper back.',
    steps: [
      'Anchor a band at head height and hold one end in each hand with your arms straight.',
      'Step back until the band is taut and stand tall.',
      'Pull the band toward your face, driving your elbows high and out.',
      'Pause with your hands beside your ears, then slowly straighten your arms.',
    ],
    tips: [
      'Keep your elbows at or above shoulder height.',
      'Think about pulling the band apart as you pull it in.',
    ],
  },
  {
    id: 'band-biceps-curl',
    name: 'Band biceps curl',
    category: 'weights',
    tags: ['upperBody'],
    muscles: ['biceps', 'forearms'],
    equipment: 'band',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 15 },
    animation: anim('side', [key(bandCurlDown, 1300, 120), key(bandCurlUp, 1000, 150)], {
      props: [BAND_UNDERFOOT],
      thumb: 1,
    }),
    summary: 'Stand on a resistance band and curl the handles up to your shoulders to build your biceps anywhere.',
    steps: [
      'Stand on the middle of a band with your feet hip-width apart.',
      'Hold one end in each hand with your arms by your sides and palms facing forward.',
      'Keep your elbows by your ribs and curl your hands up toward your shoulders.',
      'Lower slowly against the pull of the band.',
    ],
    tips: [
      'Step your feet wider to add tension.',
      'Keep your wrists straight and your shoulders still.',
    ],
  },
]
