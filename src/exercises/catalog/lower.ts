import { along, type Vec2 } from '@/figure/math'
import { CHAIR_SEAT_HEIGHT } from '@/figure/parts'
import { RIG } from '@/figure/rig'
import { solveSpec } from '@/figure/solve'
import type { Keyframe, PoseSpec, Prop, Reach, Triple } from '@/figure/types'
import type { Exercise } from '../types'
import {
  ALL_FOURS,
  FLOOR_SHIN,
  LYING_HIP,
  SIDE_LYING_FRONT,
  STAND,
  STAND_FRONT,
  SUPINE_KNEES,
  anim,
  arms,
  breathe,
  flat,
  foot,
  hand,
  key,
  legs,
  pose,
  toes,
} from '../kit'

type Side = 'L' | 'R'

const TOE = RIG.footToe
const SEAT = CHAIR_SEAT_HEIGHT
const HIP_STANCE = RIG.hipHalfWidth + 0.02

function lead(side: Side, working: Reach, support: Reach): PoseSpec {
  return side === 'L' ? { legL: working, legR: support } : { legL: support, legR: working }
}

function swing(side: Side, forward: Triple, back: Triple): PoseSpec {
  return side === 'L' ? { armL: back, armR: forward } : { armL: forward, armR: back }
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

const squatUp = pose(STAND, arms([6, 10]))
const squatDown = pose(STAND, { root: [-0.2, 0.5], torso: 38, neck: -18 }, arms([128, 4]))

const SUMO_STANCE = 0.36
const sumoUp = clasped(
  pose(STAND_FRONT, {
    root: [0, 0.915],
    legL: flat(SUMO_STANCE),
    legR: flat(-SUMO_STANCE),
    scale: { footL: 1.35, footR: 1.35 },
  }),
)
const sumoDown = clasped(
  pose(sumoUp, {
    root: [0, 0.56],
    scale: { footL: 1.35, footR: 1.35, thighL: 0.8, thighR: 0.8 },
  }),
)

const LUNGE_FRONT = 0.96 + TOE
const planted = toes(TOE, 0)
const standTall = pose(STAND, legs(planted), arms([6, 10]))

function forwardLunge(side: Side): Keyframe[] {
  const lift = pose(standTall, { root: [0.1, 0.945], torso: 3 }, lead(side, toes(0.65, 5, 0.1), planted))
  const land = pose(standTall, { root: [0.45, 0.76], torso: 4 }, lead(side, toes(LUNGE_FRONT, 0), toes(TOE, -25)))
  const bottom = pose(standTall, { root: [0.52, 0.545], torso: 5 }, lead(side, toes(LUNGE_FRONT, 0), toes(TOE, -50)))
  return [
    key(standTall, 380, 120),
    key(lift, 300),
    key(land, 300),
    key(bottom, 600, 80),
    key(land, 550),
    key(lift, 300),
  ]
}

function reverseLunge(side: Side): Keyframe[] {
  const lift = pose(standTall, { root: [-0.02, 0.945], torso: 3 }, lead(side, toes(-0.25, -30, 0.11), planted))
  const land = pose(standTall, { root: [-0.27, 0.78], torso: 6 }, lead(side, toes(-0.8, -45), planted))
  const bottom = pose(standTall, { root: [-0.44, 0.545], torso: 8 }, lead(side, toes(-0.8, -50), planted))
  return [
    key(standTall, 380, 120),
    key(lift, 300),
    key(land, 300),
    key(bottom, 600, 80),
    key(land, 550),
    key(lift, 300),
  ]
}

const SIDE_STEP = 0.95

function sideLunge(side: Side): Keyframe[] {
  const s = side === 'L' ? 1 : -1
  const support = flat(-HIP_STANCE * s)
  const stepped = lead(side, flat(SIDE_STEP * s), support)
  const thigh = (scale: number) => (side === 'L' ? { thighL: scale } : { thighR: scale })
  const stand = clasped(STAND_FRONT)
  const lift = clasped(pose(STAND_FRONT, { root: [-0.02 * s, 0.955] }, lead(side, foot([0.45 * s, 0.25], 0), support)))
  const land = clasped(pose(STAND_FRONT, { root: [((SIDE_STEP - HIP_STANCE) / 2) * s, 0.848] }, stepped))
  const sink = clasped(
    pose(STAND_FRONT, stepped, {
      root: [0.542 * s, 0.764],
      torso: -3 * s,
      scale: { lowerSpine: 0.94, upperSpine: 0.94, ...thigh(0.8) },
    }),
  )
  const bottom = clasped(
    pose(STAND_FRONT, stepped, {
      root: [0.65 * s, 0.66],
      torso: -6 * s,
      scale: { lowerSpine: 0.88, upperSpine: 0.88, ...thigh(0.6) },
    }),
  )
  return [
    key(stand, 380, 120),
    key(lift, 300),
    key(land, 300),
    key(sink, 300, 0, 'in'),
    key(bottom, 300, 100, 'out'),
    key(sink, 280, 0, 'in'),
    key(land, 280, 0, 'out'),
    key(lift, 300),
  ]
}

const wallSit = pose(STAND, { root: [0, 0.527] }, legs(flat(0.44)), arms([-6, 6]))

const NECK_DOWN: Vec2 = [-(RIG.lowerSpine + RIG.upperSpine), LYING_HIP]
const bridgeDown = pose(SUPINE_KNEES, { anchor: { joint: 'neck', at: NECK_DOWN } }, arms([-3, 0]))
const bridgeUp = pose(bridgeDown, { torso: -115, neck: 25 }, arms([-28, 0]))
const singleBridgeDown = pose(bridgeDown, { legR: [55, 0, 20] })
const singleBridgeUp = pose(bridgeUp, { legR: [0, 0, 20] })
const SUPINE_MAT: Prop = { kind: 'mat', x0: -0.95, x1: 0.78 }

const kneeling = pose(ALL_FOURS, { anchor: { joint: 'kneeR', at: [-0.1, FLOOR_SHIN] } })
const kickDown = pose(kneeling, { legL: [74, 90, 70] })
const kickUp = pose(kneeling, { legL: [-18, 90, 5] })
const KNEELING_MAT: Prop = { kind: 'mat', x0: -0.85, x1: 0.75 }

const calfDown = pose(STAND, legs(planted), arms([6, 10]))
const calfUp = pose(calfDown, { root: [0.07, 1.05] }, legs(toes(TOE, -36)))

const STEP_CHAIR: Prop = { kind: 'chair', x: 0.4, facing: -1 }
const ON_SEAT = toes(0.745, 0, SEAT)

function stepUp(side: Side): Keyframe[] {
  const lift = pose(
    standTall,
    { root: [0.04, 0.955], torso: 6 },
    lead(side, toes(0.45, -5, 0.6), planted),
    swing(side, [26, 28], [-16, 14]),
  )
  const plant = pose(
    standTall,
    { root: [0.2, 0.93], torso: 14 },
    lead(side, ON_SEAT, planted),
    swing(side, [30, 32], [-18, 14]),
  )
  const push = pose(
    standTall,
    { root: [0.3, 1.02], torso: 16 },
    lead(side, ON_SEAT, toes(TOE, -45)),
    swing(side, [24, 30], [-12, 14]),
  )
  const rise = pose(
    standTall,
    { root: [0.47, 1.28], torso: 10 },
    lead(side, ON_SEAT, toes(0.38, -20, 0.53)),
    swing(side, [12, 20], [-2, 12]),
  )
  const top = pose(standTall, { root: [0.58, 1.42], torso: 2 }, lead(side, ON_SEAT, ON_SEAT))
  const stepBack = pose(standTall, { root: [0.47, 1.35], torso: 5 }, lead(side, toes(0.36, -30, 0.59), ON_SEAT))
  const touch = pose(standTall, { root: [0.24, 0.975], torso: 8 }, lead(side, toes(TOE, -20), ON_SEAT))
  const follow = pose(standTall, { root: [0.08, 0.955], torso: 4 }, lead(side, planted, toes(0.36, -20, 0.58)))
  return [
    key(standTall, 280, 60),
    key(lift, 260),
    key(plant, 240),
    key(push, 220),
    key(rise, 240),
    key(top, 240, 100),
    key(stepBack, 260),
    key(touch, 260),
    key(follow, 260),
  ]
}

const sideLegDown = pose(SIDE_LYING_FRONT, { legL: [-1, 0, 90] })
const sideLegUp = pose(SIDE_LYING_FRONT, { legL: [40, 0, 90] })
const SIDE_LYING_MAT: Prop = { kind: 'mat', x0: -1.15, x1: 1.1 }

const SPLIT_CHAIR: Prop = { kind: 'chair', x: -0.53, facing: 1 }
const splitRear = foot([-0.5, 0.5], 201.5)
const splitUp = pose(STAND, { root: [0, 0.87], torso: 6, legL: flat(0.38), legR: splitRear }, arms([6, 10]))
const splitDown = pose(STAND, { root: [-0.05, 0.56], torso: 14, legL: flat(0.38), legR: splitRear }, arms([14, 10]))

export const LOWER_BODY: Exercise[] = [
  {
    id: 'squat',
    name: 'Squat',
    category: 'lowerBody',
    tags: ['fullBody'],
    muscles: ['quads', 'glutes', 'hamstrings', 'adductors'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 15 },
    animation: anim('side', [key(squatUp, 1000, 150), key(squatDown, 1100, 120)]),
    summary: 'The foundational lower-body move that builds strength for everyday sitting, standing and lifting.',
    steps: [
      'Stand with your feet about shoulder-width apart and your toes turned out slightly.',
      'Push your hips back and bend your knees, reaching your arms forward for balance.',
      'Lower until your thighs are about parallel to the floor, or as deep as you can with your heels down.',
      'Press through your whole foot to stand tall and squeeze your glutes at the top.',
    ],
    tips: [
      'Keep your chest lifted and your back flat.',
      'Let your knees track in line with your toes instead of caving inward.',
      'Breathe in on the way down and out as you stand.',
    ],
  },
  {
    id: 'sumo-squat',
    name: 'Sumo squat',
    category: 'lowerBody',
    tags: [],
    muscles: ['glutes', 'adductors', 'quads'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 15 },
    animation: anim('front', [key(sumoUp, 1000, 150), key(sumoDown, 1100, 120)]),
    summary: 'A wide-stance squat with the toes turned out that puts extra focus on your inner thighs and glutes.',
    steps: [
      'Stand with your feet wider than your shoulders and your toes turned out about 45 degrees.',
      'Clasp your hands in front of your chest.',
      'Bend your knees and sink your hips straight down, pushing your knees out over your toes.',
      'Pause when your thighs are near parallel to the floor, then press through your heels to stand.',
    ],
    tips: ['Keep your torso tall rather than tipping forward.', 'Squeeze your glutes at the top of every rep.'],
  },
  {
    id: 'lunge',
    name: 'Forward lunge',
    category: 'lowerBody',
    tags: [],
    muscles: ['quads', 'glutes', 'hamstrings'],
    equipment: 'none',
    level: 2,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [...forwardLunge('L'), ...forwardLunge('R')], { thumb: 3 }),
    summary: 'A big step forward into a lunge that builds single-leg strength, balance and control.',
    steps: [
      'Stand tall with your feet hip-width apart and your arms relaxed.',
      'Take a long step forward and set the whole foot down.',
      'Lower straight down until both knees are bent to about 90 degrees, with the back knee just above the floor.',
      'Push off the front foot to step back to standing.',
      'Repeat with the other leg, alternating sides.',
    ],
    tips: [
      'Keep your front knee stacked over your ankle and your torso upright.',
      'Take a longer step if your front knee drifts past your toes.',
    ],
  },
  {
    id: 'reverse-lunge',
    name: 'Reverse lunge',
    category: 'lowerBody',
    tags: [],
    muscles: ['glutes', 'quads', 'hamstrings'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [...reverseLunge('L'), ...reverseLunge('R')], { thumb: 3 }),
    summary: 'A backward-stepping lunge that is easier to balance than the forward version and strengthens the thighs and glutes.',
    steps: [
      'Stand tall with your feet hip-width apart.',
      'Step one foot back and land softly on the ball of that foot.',
      'Bend both knees to lower until your front thigh is about parallel to the floor.',
      'Drive through your front heel to bring the back foot forward and stand up.',
      'Alternate legs with each rep.',
    ],
    tips: [
      'Keep most of your weight on the front leg.',
      'Drop straight down, as if your back knee is heading for the floor.',
    ],
  },
  {
    id: 'side-lunge',
    name: 'Side lunge',
    category: 'lowerBody',
    tags: [],
    muscles: ['adductors', 'glutes', 'quads'],
    equipment: 'none',
    level: 2,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('front', [...sideLunge('L'), ...sideLunge('R')], { thumb: 4 }),
    summary: 'A lateral lunge that strengthens the legs and glutes through side-to-side movement and works the inner thighs.',
    steps: [
      'Stand with your feet hip-width apart and your hands clasped at your chest.',
      'Take a wide step out to one side, keeping your toes pointing forward.',
      'Bend the stepping knee and sit your hips back while the other leg stays straight.',
      'Push off the bent leg to return to standing, then repeat on the other side.',
    ],
    tips: [
      'Keep both feet flat on the floor.',
      'Lead with your hips, not your knee.',
      'Expect a stretch along the inner thigh of the straight leg.',
    ],
  },
  {
    id: 'wall-sit',
    name: 'Wall sit',
    category: 'lowerBody',
    tags: [],
    muscles: ['quads', 'glutes'],
    equipment: 'wall',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: breathe(wallSit, 'side', 3600, [{ kind: 'wall', x: -0.12, side: -1 }]),
    summary: 'A static hold with your back against a wall that builds endurance in your thighs and glutes.',
    steps: [
      'Stand with your back against a wall, then walk your feet out about two foot-lengths, hip-width apart.',
      'Slide down the wall until your thighs are parallel to the floor.',
      'Adjust your feet so your knees sit directly over your ankles.',
      'Hold with your back flat against the wall, breathing steadily.',
    ],
    tips: [
      'Press your whole back and head lightly into the wall.',
      'Rest your arms at your sides instead of pushing on your thighs.',
      'If it is too hard, slide a little higher and hold there.',
    ],
  },
  {
    id: 'glute-bridge',
    name: 'Glute bridge',
    category: 'lowerBody',
    tags: [],
    muscles: ['glutes', 'hamstrings', 'lowerBack'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 15 },
    animation: anim('side', [key(bridgeDown, 900, 200), key(bridgeUp, 900, 400)], { props: [SUPINE_MAT] }),
    summary: 'A floor exercise that strengthens your glutes and hamstrings by driving your hips up toward the ceiling.',
    steps: [
      'Lie on your back with your knees bent, feet flat and hip-width apart, and arms by your sides.',
      'Press through your heels and squeeze your glutes to lift your hips.',
      'Rise until your body forms a straight line from shoulders to knees.',
      'Pause for a moment, then lower your hips with control.',
    ],
    tips: [
      'Keep your ribs down so the lift comes from your hips, not your lower back.',
      'Keep your head and shoulders relaxed on the floor.',
    ],
  },
  {
    id: 'single-leg-bridge',
    name: 'Single-leg glute bridge',
    category: 'lowerBody',
    tags: [],
    muscles: ['glutes', 'hamstrings', 'abs'],
    equipment: 'mat',
    level: 2,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(singleBridgeDown, 1000, 200), key(singleBridgeUp, 1000, 400)], { props: [SUPINE_MAT] }),
    summary: 'A one-legged bridge that makes each glute work on its own and challenges your hip stability.',
    steps: [
      'Lie on your back with your knees bent and feet flat on the floor.',
      'Straighten one leg so both thighs stay level.',
      'Push through the heel of the planted foot to lift your hips into a straight line.',
      'Lower slowly, then finish all reps before switching legs.',
    ],
    tips: ['Keep your hips level as they rise and fall.', 'Press your arms into the floor for extra stability.'],
  },
  {
    id: 'donkey-kicks',
    name: 'Donkey kicks',
    category: 'lowerBody',
    tags: [],
    muscles: ['glutes', 'hamstrings'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(kickDown, 700, 100), key(kickUp, 700, 300)], { props: [KNEELING_MAT] }),
    summary: 'A kneeling exercise that drives one bent leg up behind you to isolate and strengthen the glutes.',
    steps: [
      'Start on all fours with your hands under your shoulders and knees under your hips.',
      'Keeping the knee bent at 90 degrees, lift one leg back and up until the thigh is level with your body.',
      'Press the sole of your foot toward the ceiling and squeeze your glute at the top.',
      'Lower the knee back down with control, then finish all reps before switching sides.',
    ],
    tips: [
      'Keep your back flat instead of arching as the leg rises.',
      'Move slowly so your glute does the work, not momentum.',
    ],
  },
  {
    id: 'calf-raises',
    name: 'Calf raises',
    category: 'lowerBody',
    tags: [],
    muscles: ['calves'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 20 },
    animation: anim('side', [key(calfDown, 700, 100), key(calfUp, 600, 300)]),
    summary: 'A simple standing exercise that strengthens your calves and ankles by rising onto the balls of your feet.',
    steps: [
      'Stand tall with your feet hip-width apart, lightly holding a wall or chair for balance if needed.',
      'Press through the balls of your feet to lift your heels as high as you can.',
      'Pause briefly at the top.',
      'Lower your heels slowly back to the floor.',
    ],
    tips: ['Keep your body tall and your weight over your big toes.', 'Take longer to lower than to rise.'],
  },
  {
    id: 'step-ups',
    name: 'Step-up onto chair',
    category: 'lowerBody',
    tags: ['fullBody'],
    muscles: ['quads', 'glutes', 'hamstrings', 'calves'],
    equipment: 'chair',
    level: 2,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim('side', [...stepUp('L'), ...stepUp('R')], { props: [STEP_CHAIR], thumb: 3 }),
    summary: 'A classic 7-minute workout move that builds leg strength and raises your heart rate by stepping onto a sturdy chair.',
    steps: [
      'Stand facing a sturdy chair that is braced against a wall.',
      'Place one whole foot on the seat and press through that heel to stand up on the chair.',
      'Bring your other foot up to meet it.',
      'Step back down with the leading foot, then the other.',
      'Switch your leading leg each rep.',
    ],
    tips: [
      'Drive up with the leg on the chair rather than pushing off the floor.',
      'Stand fully upright at the top before stepping down.',
      'Use a stable chair that cannot roll or tip.',
    ],
  },
  {
    id: 'side-lying-leg-raise',
    name: 'Side-lying leg raise',
    category: 'lowerBody',
    tags: [],
    muscles: ['glutes'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('front', [key(sideLegDown, 900, 150), key(sideLegUp, 800, 250)], { props: [SIDE_LYING_MAT] }),
    summary: 'A floor exercise that strengthens the outer hips and glutes by lifting the top leg while lying on your side.',
    steps: [
      'Lie on your side with your legs straight and stacked, resting your head on your lower arm.',
      'Lift your top leg toward the ceiling, keeping the knee and toes facing forward.',
      'Raise it to about 45 degrees, or as high as you can without rolling back.',
      'Lower the leg slowly, then finish all reps before switching sides.',
    ],
    tips: [
      'Keep your hips stacked and your body in one straight line.',
      'Lead with your heel to keep the work in your outer hip.',
    ],
  },
  {
    id: 'bulgarian-split-squat',
    name: 'Bulgarian split squat',
    category: 'lowerBody',
    tags: [],
    muscles: ['quads', 'glutes', 'adductors'],
    equipment: 'chair',
    level: 3,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(splitUp, 1000, 200), key(splitDown, 1200, 150)], { props: [SPLIT_CHAIR] }),
    summary: 'A split squat with your back foot raised on a chair that builds serious single-leg strength in the thighs and glutes.',
    steps: [
      'Stand a long stride in front of a sturdy chair, facing away from it.',
      'Rest the top of your back foot on the seat behind you.',
      'Bend your front knee and lower your hips straight down until your front thigh is about parallel to the floor.',
      'Drive through your front heel to stand back up, then finish all reps before switching legs.',
    ],
    tips: [
      'Keep most of your weight on the front foot.',
      'If your front heel lifts, move your front foot farther forward.',
      'A slight forward lean of your torso is fine.',
    ],
  },
]
