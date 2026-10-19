import { along, type Vec2 } from '@/figure/math'
import { RIG } from '@/figure/rig'
import { solveSpec } from '@/figure/solve'
import type { Keyframe, PoseSpec, Prop, Reach, Triple } from '@/figure/types'
import type { Exercise } from '../types'
import {
  HIP,
  LYING_HIP,
  STAND,
  STAND_FRONT,
  STAND_HOLD,
  STAND_HOLD_PROPS,
  SUPINE_KNEES,
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

const TOE = RIG.footToe
const PLANTED = toes(TOE, 0)
const HIP_STANCE = RIG.hipHalfWidth + 0.02
const DUMBBELLS: Prop[] = STAND_HOLD_PROPS
const ONE_DUMBBELL: Prop = { kind: 'dumbbell', hand: 'L' }
const GOBLET_DUMBBELL: Prop = { kind: 'dumbbell', hand: 'both', hold: 'end' }
const NEUTRAL = grips(90)
const BELL: Prop = { kind: 'kettlebell', hand: 'both' }
const MAT: Prop = { kind: 'mat', x0: -0.95, x1: 0.78 }

function lead(side: Side, working: Reach | Triple, support: Reach | Triple): PoseSpec {
  return side === 'L' ? { legL: working, legR: support } : { legL: support, legR: working }
}

function swing(side: Side, forward: Triple, back: Triple): PoseSpec {
  return side === 'L' ? { armL: back, armR: forward } : { armL: forward, armR: back }
}

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

function bellHang(base: PoseSpec, drop: number, gap = 0.04): PoseSpec {
  const skeleton = solveSpec(base, 'front')
  const { shoulderL, shoulderR } = skeleton.points
  const y = (shoulderL[1] + shoulderR[1]) / 2 - drop
  return pose(base, { armL: hand([gap, y], -90), armR: hand([-gap, y], -90) })
}

function onHips(base: PoseSpec, lift: number): PoseSpec {
  const skeleton = solveSpec(base, 'side')
  const normal = skeleton.phi.lowerSpine - 90
  return pose(base, arms(hand(along(skeleton.points.hip, normal, lift), normal + 180)))
}

const dbSquatUp = pose(STAND_HOLD, NEUTRAL)
const dbSquatDown = pose(STAND, { root: [-0.2, 0.52], torso: 36, neck: -16 }, arms([36, 4]), NEUTRAL)

const GOBLET = arms([30, 150, 50])
const gobletUp = pose(STAND, GOBLET)
const gobletDown = pose(STAND, { root: [-0.13, 0.55], torso: 24, neck: -8 }, arms([40, 164, 50]))

const SUMO_STANCE = 0.36
const SUMO_FEET: PoseSpec = { legL: flat(SUMO_STANCE), legR: flat(-SUMO_STANCE) }
const kbSumoUp = bellHang(pose(STAND_FRONT, SUMO_FEET, { root: [0, 0.915], scale: { footL: 1.35, footR: 1.35 } }), 0.55)
const kbSumoDown = bellHang(
  pose(STAND_FRONT, SUMO_FEET, { root: [0, 0.56], scale: { footL: 1.35, footR: 1.35, thighL: 0.8, thighR: 0.8 } }),
  0.55,
)

const pulseUp = pose(STAND, arms([6, 10]))
const pulseDown = pose(STAND, { root: [-0.2, 0.5], torso: 38, neck: -18 }, arms([128, 4]))
const pulseMid = pose(STAND, { root: [-0.18, 0.6], torso: 34, neck: -16 }, arms([124, 4]))

const SQUAT_CHAIR: Prop = { kind: 'chair', x: -0.14, facing: 1 }
const chairUp = pose(STAND, arms([6, 10]))
const chairDown = pose(STAND, { root: [-0.34, 0.57], torso: 30, neck: -14 }, arms([100, 4]))

const splitFront = toes(TOE, 0)
const splitBack = toes(-0.8, -48)
const splitUp = pose(STAND, { root: [-0.32, 0.84], torso: 4, legL: splitFront, legR: toes(-0.8, -42) }, arms([6, 10]))
const splitDown = pose(STAND, { root: [-0.42, 0.55], torso: 8, legL: splitFront, legR: splitBack }, arms([10, 10]))
const dbSplitUp = pose(splitUp, arms([4, 6]), NEUTRAL)
const dbSplitDown = pose(splitDown, arms([8, 6]), NEUTRAL)

const BULGARIAN_CHAIR: Prop = { kind: 'chair', x: -0.53, facing: 1 }
const bulgarianRear = foot([-0.5, 0.5], 201.5)
const bulgarianUp = pose(STAND, { root: [0, 0.87], torso: 6, legL: flat(0.38), legR: bulgarianRear }, arms([6, 6]), NEUTRAL)
const bulgarianDown = pose(STAND, { root: [-0.05, 0.56], torso: 14, legL: flat(0.38), legR: bulgarianRear }, arms([14, 6]), NEUTRAL)

const lungeTall = pose(STAND, legs(PLANTED), arms([6, 10]))

function reverseLunge(base: PoseSpec, side: Side, extra: PoseSpec = {}): Keyframe[] {
  const lift = pose(base, { root: [-0.02, 0.945], torso: 3 }, extra, lead(side, toes(-0.25, -30, 0.11), PLANTED))
  const land = pose(base, { root: [-0.27, 0.78], torso: 6 }, extra, lead(side, toes(-0.8, -45), PLANTED))
  const bottom = pose(base, { root: [-0.44, 0.545], torso: 8 }, extra, lead(side, toes(-0.8, -50), PLANTED))
  return [key(base, 400, 120), key(lift, 320), key(land, 320), key(bottom, 650, 100), key(land, 600), key(lift, 320)]
}

const gobletTall = pose(lungeTall, GOBLET)

function kneeDriveLunge(): Keyframe[] {
  const lift = pose(lungeTall, { root: [-0.02, 0.945], torso: 3 }, lead('L', toes(-0.25, -30, 0.11), PLANTED))
  const land = pose(lungeTall, { root: [-0.27, 0.78], torso: 6 }, lead('L', toes(-0.8, -45), PLANTED))
  const bottom = pose(lungeTall, { root: [-0.44, 0.545], torso: 8 }, lead('L', toes(-0.8, -50), PLANTED))
  const pass = pose(lungeTall, { root: [-0.06, 0.93], torso: 4 }, lead('L', [10, 75, 30], PLANTED), swing('L', [30, 70], [-20, 50]))
  const drive = pose(lungeTall, { root: [0.01, HIP - 0.005], torso: 2 }, lead('L', [92, 95, 25], PLANTED), swing('L', [60, 85], [-35, 60]))
  return [
    key(lungeTall, 300, 80),
    key(lift, 300),
    key(land, 300),
    key(bottom, 600, 80),
    key(land, 450),
    key(pass, 250),
    key(drive, 250, 220),
  ]
}

const SIDE_STEP = 0.95

function gobletHold(base: PoseSpec): PoseSpec {
  return clasped(base, 0.1)
}

function lateralLunge(side: Side): Keyframe[] {
  const s = side === 'L' ? 1 : -1
  const support = flat(-HIP_STANCE * s)
  const stepped = lead(side, flat(SIDE_STEP * s), support)
  const thigh = (scale: number) => (side === 'L' ? { thighL: scale } : { thighR: scale })
  const stand = gobletHold(STAND_FRONT)
  const lift = gobletHold(pose(STAND_FRONT, { root: [-0.02 * s, 0.955] }, lead(side, foot([0.45 * s, 0.25], 0), support)))
  const land = gobletHold(pose(STAND_FRONT, { root: [((SIDE_STEP - HIP_STANCE) / 2) * s, 0.848] }, stepped))
  const sink = gobletHold(
    pose(STAND_FRONT, stepped, {
      root: [0.542 * s, 0.764],
      torso: -3 * s,
      scale: { lowerSpine: 0.94, upperSpine: 0.94, ...thigh(0.8) },
    }),
  )
  const bottom = gobletHold(
    pose(STAND_FRONT, stepped, {
      root: [0.65 * s, 0.66],
      torso: -6 * s,
      scale: { lowerSpine: 0.88, upperSpine: 0.88, ...thigh(0.6) },
    }),
  )
  return [
    key(stand, 400, 120),
    key(lift, 320),
    key(land, 320),
    key(sink, 320, 0, 'in'),
    key(bottom, 320, 100, 'out'),
    key(sink, 300, 0, 'in'),
    key(land, 300, 0, 'out'),
    key(lift, 320),
  ]
}

const BURPEE_HANDS = 0.36
const BURPEE_NECK: Vec2 = [0.43, 0.6]
const PLANK_TOE = toes(-0.946, -84)
const burpeeStand = pose(STAND, arms([8, 12]), legs(PLANTED))
const burpeeSquat: PoseSpec = {
  root: [-0.12, 0.34],
  torso: 50,
  spine: 12,
  neck: -28,
  ...legs(PLANTED),
  ...arms(palm(BURPEE_HANDS)),
}

function burpeeBody(torso: number, legL: Reach, legR: Reach, neck: Vec2 = BURPEE_NECK): PoseSpec {
  return { torso, neck: -14, anchor: { joint: 'neck', at: neck }, legL, legR, ...arms(palm(BURPEE_HANDS)) }
}

const stepCrouch = burpeeBody(84, PLANTED, PLANTED)
const stepBackLift = burpeeBody(84, toeAt(-0.6, 0.2, -70), PLANTED)
const stepBackHalf = burpeeBody(78, PLANK_TOE, PLANTED)
const stepBackLiftR = burpeeBody(78, PLANK_TOE, toeAt(-0.6, 0.2, -70))
const stepBackPlank = burpeeBody(73.5, PLANK_TOE, PLANK_TOE)
const stepInLift = burpeeBody(80, toeAt(-0.45, 0.2, -70), PLANK_TOE)
const stepInHalf = burpeeBody(82, PLANTED, PLANK_TOE)
const stepInLiftR = burpeeBody(84, PLANTED, toeAt(-0.45, 0.2, -70))

const burpeeKick = burpeeBody(100, toeAt(-0.82, 0.14, -110), toeAt(-0.82, 0.14, -110))
const burpeePushDown = burpeeBody(86, PLANK_TOE, PLANK_TOE, [0.47, 0.33])
const burpeeTuck = burpeeBody(96, toeAt(-0.45, 0.2, -125), toeAt(-0.45, 0.2, -125))
const burpeeTakeoff = pose(STAND, { root: [0.03, 1.0], torso: 6, neck: -4, ...arms([140, 10]), ...legs(toes(TOE, -45)) })
const burpeeJump = pose(STAND, { root: [0.02, HIP + 0.2], torso: -3, neck: -6, armL: [170, 6], armR: [158, 12], ...legs([4, 14, 40]) })

const kbDeadTop = pose(STAND, { torso: -2 }, legs(PLANTED), arms([2, 0]))
const kbDeadFloor = pose(STAND, { root: [-0.4, 0.7], torso: 68, neck: -22 }, legs(PLANTED), arms([68, 0]))

const slRdlTop = pose(STAND, { root: [0, HIP - 0.01], legL: flat(0), legR: [14, 55, 20] }, arms([4, 6]))
const slRdlBottom = pose(STAND, {
  root: [-0.12, 0.9],
  torso: 82,
  neck: -14,
  legL: flat(0),
  legR: [-4, 4, 15],
  ...arms([82, 4]),
})

const NECK_DOWN: Vec2 = [-(RIG.lowerSpine + RIG.upperSpine), LYING_HIP]
const bridgeDown = pose(SUPINE_KNEES, { anchor: { joint: 'neck', at: NECK_DOWN } }, arms([-3, 0]))
const bridgeUp = pose(bridgeDown, { torso: -115, neck: 25 }, arms([-28, 0]))
const dbBridgeDown = onHips(bridgeDown, 0.17)
const dbBridgeUp = onHips(bridgeUp, 0.17)
const marchLeft = pose(bridgeUp, { legL: foot([0.36, 0.42], -10) })
const marchRight = pose(bridgeUp, { legR: foot([0.36, 0.42], -10) })

const calfDown = pose(STAND_HOLD, legs(PLANTED), NEUTRAL)
const calfUp = pose(calfDown, { root: [0.07, 1.05] }, legs(toes(TOE, -36)))

const CALF_WALL: Prop = { kind: 'wall', x: 0.55, side: 1 }
const WALL_HAND = hand([0.5, 1.28], 90)
const slCalfDown = pose(STAND, { legL: PLANTED, legR: [-6, 80, 25], armL: WALL_HAND, armR: [6, 10] })
const slCalfUp = pose(slCalfDown, { root: [0.07, 1.05], legL: toes(TOE, -36) })

const BOX_TOP = 0.4
const STEP_BOX: Prop = { kind: 'box', x0: 0.1, x1: 0.58, height: BOX_TOP }
const FLOOR_FOOT = flat(-0.14)
const BOX_FOOT = flat(0.24, BOX_TOP)
const kneeFloor = pose(STAND, { root: [-0.14, HIP], legL: FLOOR_FOOT, legR: FLOOR_FOOT })
const kneeLift = pose(kneeFloor, { root: [-0.13, HIP - 0.01], legL: foot([0.2, 0.58], 10) }, swing('L', [20, 30], [-12, 20]))
const kneePlant = pose(kneeFloor, { root: [-0.06, HIP - 0.07], torso: 14, legL: BOX_FOOT }, swing('L', [30, 40], [-20, 25]))
const kneeRise = pose(STAND, { root: [0.2, HIP + BOX_TOP - 0.02], torso: 4, legL: BOX_FOOT, legR: foot([0.02, 0.62], 30) })
const kneeTop = pose(STAND, { root: [0.24, HIP + BOX_TOP], torso: 0, legL: BOX_FOOT, legR: [95, 95, 20] }, swing('R', [60, 85], [-35, 55]))
const kneeLower = pose(STAND, { root: [0.1, 1.08], torso: 10, legL: BOX_FOOT, legR: foot([-0.1, 0.3], 20) })
const kneeDown = pose(kneePlant, { legR: FLOOR_FOOT }, arms([8, 12]))

export const VARIATIONS_LOWER: Exercise[] = [
  {
    id: 'dumbbell-squat',
    name: 'Dumbbell squat',
    category: 'weights',
    tags: ['lowerBody'],
    muscles: ['quads', 'glutes', 'hamstrings', 'forearms'],
    equipment: 'dumbbells',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(dbSquatUp, 1100, 150), key(dbSquatDown, 1300, 120)], { props: DUMBBELLS, thumb: 1 }),
    summary: 'A squat with a dumbbell hanging at each side that adds load to the classic move for stronger legs and glutes.',
    steps: [
      'Stand with your feet shoulder-width apart, holding a dumbbell at each side.',
      'Push your hips back and bend your knees, letting the weights hang straight down.',
      'Lower until your thighs are about parallel to the floor.',
      'Drive through your whole foot to stand tall.',
    ],
    tips: ['Keep your chest up and your shoulders pulled back.', 'Let your arms hang long instead of curling the weights.'],
    family: 'squat',
    variant: 'Dumbbells',
  },
  {
    id: 'dumbbell-goblet-squat',
    name: 'Dumbbell goblet squat',
    category: 'weights',
    tags: ['lowerBody'],
    muscles: ['quads', 'glutes', 'adductors', 'abs'],
    equipment: 'dumbbells',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(gobletUp, 1100, 150), key(gobletDown, 1300, 120)], { props: [GOBLET_DUMBBELL], thumb: 1 }),
    summary: 'Hold one dumbbell upright at your chest and squat deep to build your legs while keeping your torso tall.',
    steps: [
      'Cup one end of a dumbbell with both hands and hold it against your chest.',
      'Stand with your feet a little wider than shoulder-width and your toes turned out.',
      'Sit down between your knees, keeping your elbows tucked and chest tall.',
      'Press through your heels to stand back up.',
    ],
    tips: ['Keep the weight touching your chest the whole time.', 'Let your elbows brush the insides of your knees at the bottom.'],
    family: 'squat',
    variant: 'Dumbbell goblet',
  },
  {
    id: 'kettlebell-sumo-squat',
    name: 'Kettlebell sumo squat',
    category: 'weights',
    tags: ['lowerBody'],
    muscles: ['glutes', 'adductors', 'quads', 'forearms'],
    equipment: 'kettlebell',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('front', [key(kbSumoUp, 1100, 150), key(kbSumoDown, 1200, 120)], { props: [BELL], thumb: 1 }),
    summary: 'A wide-stance squat with a kettlebell hanging between your legs that targets your glutes and inner thighs.',
    steps: [
      'Stand with your feet wide and toes turned out, holding a kettlebell by the handle with both hands.',
      'Let the bell hang at full arm length between your legs.',
      'Sink your hips straight down, pushing your knees out over your toes.',
      'Press through your heels to stand and squeeze your glutes at the top.',
    ],
    tips: ['Keep your torso tall so the bell travels straight up and down.', 'Do not let the bell touch the floor between reps.'],
    family: 'squat',
    variant: 'Kettlebell sumo',
  },
  {
    id: 'squat-pulse',
    name: 'Squat with pulse',
    category: 'lowerBody',
    tags: [],
    muscles: ['quads', 'glutes', 'hamstrings'],
    equipment: 'none',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim(
      'side',
      [
        key(pulseUp, 900, 150),
        key(pulseDown, 1000, 80),
        key(pulseMid, 320),
        key(pulseDown, 320, 60),
        key(pulseMid, 320),
        key(pulseDown, 320, 60),
      ],
      { thumb: 1 },
    ),
    summary: 'A squat with two small pulses at the bottom that keeps your thighs and glutes working for longer.',
    steps: [
      'Stand with your feet shoulder-width apart and your arms forward.',
      'Lower into a squat until your thighs are about parallel to the floor.',
      'Rise a few inches and sink back down twice, staying low.',
      'Stand all the way up to finish the rep.',
    ],
    tips: ['Keep the pulses small and controlled.', 'Keep your heels down and your chest lifted.'],
    family: 'squat',
    variant: 'Pulse',
  },
  {
    id: 'chair-squat',
    name: 'Chair squat',
    category: 'lowerBody',
    tags: [],
    muscles: ['quads', 'glutes', 'hamstrings'],
    equipment: 'chair',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(chairUp, 1000, 150), key(chairDown, 1300, 200)], { props: [SQUAT_CHAIR], thumb: 1 }),
    summary: 'A beginner squat that lowers you to a chair behind you, so you learn the movement with a safe target.',
    steps: [
      'Stand a short step in front of a sturdy chair, facing away from it.',
      'Reach your arms forward and push your hips back toward the seat.',
      'Lightly tap the chair with your hips without sitting all the way down.',
      'Press through your heels to stand back up.',
    ],
    tips: ['Lower slowly instead of dropping onto the seat.', 'Use a chair that is braced against a wall.'],
    family: 'squat',
    variant: 'Beginner',
  },
  {
    id: 'split-squat',
    name: 'Split squat',
    category: 'lowerBody',
    tags: [],
    muscles: ['quads', 'glutes', 'hamstrings'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(splitUp, 1000, 150), key(splitDown, 1200, 120)], { thumb: 1 }),
    summary: 'A stationary lunge with your feet staggered that builds single-leg strength without any stepping.',
    steps: [
      'Take a long stride so one foot is in front and the back heel is lifted.',
      'Bend both knees to lower straight down until the back knee nearly touches the floor.',
      'Press through your front foot to rise back up.',
      'Finish all reps before switching legs.',
    ],
    tips: ['Keep your torso upright and your weight over the front foot.', 'Move straight up and down, not forward.'],
    family: 'lunge',
    variant: 'Split',
  },
  {
    id: 'dumbbell-split-squat',
    name: 'Dumbbell split squat',
    category: 'weights',
    tags: ['lowerBody'],
    muscles: ['quads', 'glutes', 'hamstrings', 'forearms'],
    equipment: 'dumbbells',
    level: 2,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(dbSplitUp, 1100, 150), key(dbSplitDown, 1300, 120)], { props: DUMBBELLS, thumb: 1 }),
    summary: 'A staggered-stance squat holding dumbbells at your sides that loads each leg for strength and balance.',
    steps: [
      'Hold a dumbbell at each side and take a long stride with one foot forward.',
      'Lift your back heel and keep your torso tall.',
      'Lower straight down until your back knee hovers just above the floor.',
      'Drive through your front foot to rise, then finish all reps before switching legs.',
    ],
    tips: ['Let the weights hang straight down by your hips.', 'Keep your front knee in line with your toes.'],
    family: 'lunge',
    variant: 'Dumbbell split',
  },
  {
    id: 'dumbbell-bulgarian-split-squat',
    name: 'Dumbbell Bulgarian split squat',
    category: 'weights',
    tags: ['lowerBody'],
    muscles: ['quads', 'glutes', 'adductors', 'forearms'],
    equipment: 'dumbbells',
    level: 3,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 8 },
    animation: anim('side', [key(bulgarianUp, 1100, 200), key(bulgarianDown, 1300, 150)], {
      props: [BULGARIAN_CHAIR, ...DUMBBELLS],
      thumb: 1,
    }),
    summary: 'A rear-foot-elevated split squat with dumbbells at your sides for serious single-leg strength.',
    steps: [
      'Stand a long stride in front of a sturdy chair, holding a dumbbell at each side.',
      'Rest the top of your back foot on the seat behind you.',
      'Lower your hips straight down until your front thigh is about parallel to the floor.',
      'Drive through your front heel to stand back up, then finish all reps before switching legs.',
    ],
    tips: ['Start with light weights until your balance feels steady.', 'A slight forward lean of your torso is fine.'],
    family: 'lunge',
    variant: 'Dumbbell Bulgarian',
  },
  {
    id: 'goblet-reverse-lunge',
    name: 'Goblet reverse lunge',
    category: 'weights',
    tags: ['lowerBody'],
    muscles: ['quads', 'glutes', 'hamstrings', 'abs'],
    equipment: 'dumbbells',
    level: 2,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [...reverseLunge(gobletTall, 'L', GOBLET), ...reverseLunge(gobletTall, 'R', GOBLET)], {
      props: [GOBLET_DUMBBELL],
      thumb: 3,
    }),
    summary: 'A reverse lunge holding one dumbbell at your chest that strengthens your legs and keeps your core braced.',
    steps: [
      'Stand tall holding one dumbbell upright against your chest with both hands.',
      'Step one foot back and land on the ball of that foot.',
      'Lower until your front thigh is about parallel to the floor.',
      'Drive through your front heel to step back in, then alternate legs.',
    ],
    tips: ['Keep the weight close to your chest and your elbows tucked.', 'Drop straight down rather than leaning forward.'],
    family: 'lunge',
    variant: 'Goblet',
  },
  {
    id: 'dumbbell-lateral-lunge',
    name: 'Dumbbell lateral lunge',
    category: 'weights',
    tags: ['lowerBody'],
    muscles: ['adductors', 'glutes', 'quads'],
    equipment: 'dumbbells',
    level: 2,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('front', [...lateralLunge('L'), ...lateralLunge('R')], { props: [GOBLET_DUMBBELL], thumb: 4 }),
    summary: 'A side lunge holding a dumbbell at your chest that strengthens your legs and inner thighs side to side.',
    steps: [
      'Stand with your feet hip-width apart, holding a dumbbell at your chest with both hands.',
      'Take a wide step out to one side, keeping your toes pointing forward.',
      'Bend the stepping knee and sit your hips back while the other leg stays straight.',
      'Push off the bent leg to return to standing, then repeat on the other side.',
    ],
    tips: ['Keep both feet flat on the floor.', 'Keep the weight close to your chest as you sink.'],
    family: 'lunge',
    variant: 'Lateral',
  },
  {
    id: 'reverse-lunge-knee-drive',
    name: 'Reverse lunge with knee drive',
    category: 'lowerBody',
    tags: ['cardio'],
    muscles: ['glutes', 'quads', 'hipFlexors', 'abs'],
    equipment: 'none',
    level: 2,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', kneeDriveLunge(), { thumb: 6 }),
    summary: 'A reverse lunge that finishes by driving the back knee up to hip height for balance and power.',
    steps: [
      'Stand tall with your feet hip-width apart.',
      'Step one foot back and lower into a lunge.',
      'Push through your front foot and swing the back knee forward and up to hip height.',
      'Pause on one leg, then step straight back into the next lunge and finish your set before switching legs.',
    ],
    tips: ['Swing the opposite arm forward as the knee drives up.', 'Stand tall on the support leg at the top.'],
    family: 'lunge',
    variant: 'Knee drive',
  },
  {
    id: 'step-back-burpee',
    name: 'Step-back burpee',
    category: 'fullBody',
    tags: ['cardio'],
    muscles: ['fullBody', 'quads', 'shoulders', 'abs'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 8 },
    animation: anim(
      'side',
      [
        key(burpeeStand, 650, 150),
        key(burpeeSquat, 700, 60),
        key(stepCrouch, 250),
        key(stepBackLift, 280),
        key(stepBackHalf, 300),
        key(stepBackLiftR, 300),
        key(stepBackPlank, 300, 250),
        key(stepInLift, 300),
        key(stepInHalf, 300),
        key(stepInLiftR, 300),
        key(stepCrouch, 280),
        key(burpeeSquat, 280, 60),
      ],
      { thumb: 4 },
    ),
    summary: 'A no-jump burpee that steps one foot at a time into a plank and back, for a joint-friendly full-body move.',
    steps: [
      'Stand tall, then squat down and place your hands on the floor in front of your feet.',
      'Step one foot back, then the other, into a high plank.',
      'Step the first foot back in toward your hands, then the other.',
      'Stand up tall without jumping.',
    ],
    tips: ['Keep your hips level as each foot steps back.', 'Speed up the steps once the pattern feels smooth.'],
    family: 'burpee',
    variant: 'Beginner',
  },
  {
    id: 'burpee-push-up',
    name: 'Burpee with push-up',
    category: 'cardio',
    tags: ['fullBody', 'upperBody'],
    muscles: ['fullBody', 'chest', 'quads', 'triceps', 'abs'],
    equipment: 'none',
    level: 3,
    impact: 'high',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 8 },
    animation: anim(
      'side',
      [
        key(burpeeStand, 420, 200, 'in'),
        key(burpeeSquat, 600),
        key(burpeeKick, 220, 0, 'in'),
        key(stepBackPlank, 220, 80, 'out'),
        key(burpeePushDown, 500, 60),
        key(stepBackPlank, 450),
        key(burpeeTuck, 220, 0, 'in'),
        key(burpeeSquat, 240, 0, 'out'),
        key(burpeeTakeoff, 260, 0, 'in'),
        key(burpeeJump, 260, 0, 'out'),
      ],
      { thumb: 4 },
    ),
    summary: 'The full burpee with a chest-to-floor push-up added in the plank for maximum strength and conditioning.',
    steps: [
      'Squat down and place your hands on the floor in front of your feet.',
      'Jump your feet back into a high plank.',
      'Lower your chest toward the floor and press back up.',
      'Jump your feet in toward your hands.',
      'Explode up into a jump with your arms overhead, then land softly.',
    ],
    tips: ['Keep your body in one straight line during the push-up.', 'Drop to your knees for the push-up if you need to.'],
    family: 'burpee',
    variant: 'Push-up',
  },
  {
    id: 'kettlebell-deadlift',
    name: 'Kettlebell deadlift',
    category: 'weights',
    tags: ['lowerBody'],
    muscles: ['glutes', 'hamstrings', 'lowerBack', 'forearms'],
    equipment: 'kettlebell',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(kbDeadFloor, 1100, 200), key(kbDeadTop, 1100, 200)], { props: [BELL], thumb: 0 }),
    summary: 'Lift a kettlebell from between your feet to standing to learn the hip hinge and strengthen your back side.',
    steps: [
      'Stand with your feet hip-width apart and a kettlebell on the floor between your feet.',
      'Push your hips back, bend your knees and grip the handle with both hands.',
      'Brace your core and stand up tall, squeezing your glutes at the top.',
      'Hinge back down with a flat back to set the bell down softly.',
    ],
    tips: ['Keep your back flat and your arms long the whole time.', 'Push the floor away rather than pulling with your arms.'],
    family: 'deadlift',
    variant: 'Kettlebell',
  },
  {
    id: 'dumbbell-single-leg-deadlift',
    name: 'Dumbbell single-leg deadlift',
    category: 'weights',
    tags: ['lowerBody'],
    muscles: ['hamstrings', 'glutes', 'lowerBack', 'abs'],
    equipment: 'dumbbells',
    level: 3,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 8 },
    animation: anim('side', [key(slRdlTop, 1100, 200), key(slRdlBottom, 1400, 250)], { props: DUMBBELLS, thumb: 1 }),
    summary: 'A one-legged Romanian deadlift with dumbbells that builds strong hamstrings and glutes and sharpens balance.',
    steps: [
      'Stand on one leg with a soft bend in the knee, holding a dumbbell in each hand.',
      'Hinge forward at the hips as your free leg reaches straight back.',
      'Lower the weights toward the floor until your body and back leg are nearly level.',
      'Squeeze your glute to stand back up, then finish all reps before switching legs.',
    ],
    tips: ['Keep your hips square to the floor.', 'Start light and tap the back toes down if you lose balance.'],
    family: 'deadlift',
    variant: 'Single-leg dumbbells',
  },
  {
    id: 'dumbbell-glute-bridge',
    name: 'Dumbbell glute bridge',
    category: 'weights',
    tags: ['lowerBody'],
    muscles: ['glutes', 'hamstrings', 'lowerBack'],
    equipment: 'dumbbells',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(dbBridgeDown, 900, 200), key(dbBridgeUp, 900, 400)], { props: [MAT, ONE_DUMBBELL], thumb: 1 }),
    summary: 'A glute bridge with a dumbbell resting on your hips that adds load to build stronger glutes and hamstrings.',
    steps: [
      'Lie on your back with your knees bent and feet flat, hip-width apart.',
      'Rest a dumbbell across your hip bones and hold it steady with both hands.',
      'Press through your heels to lift your hips until your body forms a line from shoulders to knees.',
      'Pause and squeeze, then lower your hips with control.',
    ],
    tips: ['Keep your ribs down so the lift comes from your hips.', 'Hold the weight still so it does not roll.'],
    family: 'bridge',
    variant: 'Dumbbell',
  },
  {
    id: 'glute-bridge-march',
    name: 'Glute bridge march',
    category: 'lowerBody',
    tags: ['core'],
    muscles: ['glutes', 'hamstrings', 'abs', 'hipFlexors'],
    equipment: 'mat',
    level: 2,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim(
      'side',
      [key(bridgeUp, 500, 100), key(marchLeft, 500, 200), key(bridgeUp, 500, 100), key(marchRight, 500, 200)],
      { props: [MAT], thumb: 1 },
    ),
    summary: 'Hold a glute bridge and lift one knee at a time to challenge your glutes and core to keep your hips level.',
    steps: [
      'Lie on your back with your knees bent and feet flat on the floor.',
      'Lift your hips into a bridge with your body in a line from shoulders to knees.',
      'Lift one foot a few inches off the floor while keeping your hips high.',
      'Set it down and lift the other foot, alternating sides.',
    ],
    tips: ['Keep your hips level as each foot lifts.', 'Press your arms into the floor for extra support.'],
    family: 'bridge',
    variant: 'March',
  },
  {
    id: 'dumbbell-calf-raise',
    name: 'Dumbbell calf raise',
    category: 'weights',
    tags: ['lowerBody'],
    muscles: ['calves', 'forearms'],
    equipment: 'dumbbells',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 15 },
    animation: anim('side', [key(calfDown, 800, 100), key(calfUp, 700, 300)], { props: DUMBBELLS, thumb: 1 }),
    summary: 'A standing calf raise with a dumbbell in each hand that adds load to build stronger calves and ankles.',
    steps: [
      'Stand tall with your feet hip-width apart and a dumbbell at each side.',
      'Press through the balls of your feet to lift your heels as high as you can.',
      'Pause briefly at the top.',
      'Lower your heels slowly back to the floor.',
    ],
    tips: ['Keep your body tall and your weight over your big toes.', 'Take longer to lower than to rise.'],
    family: 'calf-raise',
    variant: 'Dumbbells',
  },
  {
    id: 'single-leg-calf-raise',
    name: 'Single-leg calf raise',
    category: 'lowerBody',
    tags: [],
    muscles: ['calves'],
    equipment: 'wall',
    level: 2,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(slCalfDown, 800, 100), key(slCalfUp, 700, 300)], { props: [CALF_WALL], thumb: 1 }),
    summary: 'A one-legged calf raise with a hand on the wall that doubles the load on each calf without any weights.',
    steps: [
      'Stand facing a wall and rest one hand on it for balance.',
      'Lift one foot behind you so you balance on the other.',
      'Rise onto the ball of the standing foot as high as you can.',
      'Lower your heel slowly, then finish all reps before switching legs.',
    ],
    tips: ['Use the wall for balance only, not to push yourself up.', 'Keep your standing knee straight but not locked.'],
    family: 'calf-raise',
    variant: 'Single-leg',
  },
  {
    id: 'step-up-knee-drive',
    name: 'Step-up with knee drive',
    category: 'lowerBody',
    tags: ['cardio'],
    muscles: ['quads', 'glutes', 'hipFlexors', 'calves'],
    equipment: 'box',
    level: 2,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim(
      'side',
      [
        key(kneeFloor, 400, 100),
        key(kneeLift, 360),
        key(kneePlant, 300),
        key(kneeRise, 550),
        key(kneeTop, 320, 200),
        key(kneeLower, 400),
        key(kneeDown, 400),
      ],
      { props: [STEP_BOX], thumb: 4 },
    ),
    summary: 'Step up onto a box and drive the trailing knee to hip height to build leg power, balance and coordination.',
    steps: [
      'Stand facing a sturdy box or step.',
      'Place your whole working foot on top and press through that heel to stand up.',
      'Drive your other knee up to hip height instead of setting it on the box.',
      'Step back down with the free leg, then the working leg, and finish your set before switching legs.',
    ],
    tips: ['Stand fully tall on the box before driving the knee.', 'Swing the opposite arm forward as the knee comes up.'],
    family: 'step-up',
    variant: 'Knee drive',
  },
]
