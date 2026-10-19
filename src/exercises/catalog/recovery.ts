import { add, distance, type Vec2 } from '@/figure/math'
import { solveSpec } from '@/figure/solve'
import type { JointId, PoseSpec, View } from '@/figure/types'
import type { Exercise } from '../types'
import {
  BALL_RADIUS,
  FLOOR_FOREARM,
  FLOOR_SHIN,
  LYING_HIP,
  ROLLER_RADIUS,
  SEATED,
  STAND,
  STAND_FRONT,
  SUPINE_FLAT,
  PRONE,
  anim,
  arms,
  breathe,
  flat,
  foot,
  hand,
  key,
  legs,
  palm,
  pose,
} from '../kit'

const SHIN_HALF = 0.05
const THIGH_HALF = 0.0675
const TORSO_HALF = 0.115

function jointsOf(spec: PoseSpec, view: View = 'side'): Record<JointId, Vec2> {
  return solveSpec(spec, view).points
}

function onRoller(spec: PoseSpec, rollerX: number, from: JointId, to: JointId, half: number): PoseSpec {
  const points = jointsOf(spec)
  const a = points[from]
  const b = points[to]
  const lineY = a[1] + ((b[1] - a[1]) * (rollerX - a[0])) / (b[0] - a[0])
  const cos = Math.abs(b[0] - a[0]) / distance(a, b)
  const root = spec.root ?? [0, 0]
  return pose(spec, { root: [root[0], root[1] + ROLLER_RADIUS + (ROLLER_RADIUS + half) / cos - lineY] })
}

function rolled(spec: PoseSpec, x: number, rollerX: number, from: JointId, to: JointId, half: number): PoseSpec {
  return onRoller(pose(spec, { root: [x, spec.root?.[1] ?? 0] }), rollerX, from, to, half)
}

const CALF_PALMS = -0.36
const CALF_ROLLER = 0.64
const calfSit: PoseSpec = { root: [0, 0.23], torso: -48, neck: 24, ...legs([39, 0, 0]), ...arms(palm(CALF_PALMS)) }

const HAM_PALMS = -0.31
const HAM_ROLLER = 0.3
const hamSit: PoseSpec = { root: [0, 0.225], torso: -50, neck: 24, ...legs([40, 0, 20]), ...arms(palm(HAM_PALMS)) }

const QUAD_WRIST = 0.78
const QUAD_ROLLER = 0.25
const quadProne: PoseSpec = {
  root: [0, 0.225],
  torso: 74,
  neck: -12,
  ...legs([-16, 0, 30]),
  ...arms(hand([QUAD_WRIST, FLOOR_FOREARM], 0)),
}

const GLUTE_PALMS = -0.36
const GLUTE_ROLLER = -0.03
function gluteSit(x: number): PoseSpec {
  const base: PoseSpec = { root: [x, ROLLER_RADIUS * 2 + 0.105], torso: -40, neck: 10, legR: flat(0.42), ...arms(palm(GLUTE_PALMS)) }
  const knee = jointsOf(base).kneeR
  return pose(base, { legL: foot(add(knee, [0.02, 0.075]), 10), scale: { thighL: 0.72 } })
}

const BACK_FEET = 0.42
const BACK_ROLLER = -0.36
const backBridge: PoseSpec = { root: [0, 0.26], torso: -92, neck: 14, ...legs(flat(BACK_FEET)), ...arms([35, 150]) }

const EXT_ROLLER = -0.36
function handsBehindHead(spec: PoseSpec): PoseSpec {
  const points = jointsOf(spec)
  const tilt = (((spec.torso ?? 0) + (spec.spine ?? 0)) * Math.PI) / 180
  const back: Vec2 = [-Math.cos(tilt), Math.sin(tilt)]
  return pose(spec, arms(hand(add(points.head, [back[0] * 0.1, back[1] * 0.1]))))
}
const extBase = handsBehindHead({ root: [0, LYING_HIP], torso: -68, neck: 8, ...legs(flat(0.42)) })
const extArch = handsBehindHead({ root: [0, LYING_HIP], torso: -58, spine: -30, neck: -6, ...legs(flat(0.42)) })

const HIP_WRIST = 0.8
const HIP_ROLLER = -0.05
const hipProne: PoseSpec = {
  root: [0, 0.265],
  torso: 80,
  neck: -12,
  legL: [4, 0, 75],
  legR: [2, 0, 75],
  ...arms(hand([HIP_WRIST, FLOOR_FOREARM], 0)),
}

const SHIN_PALMS = 0.45
const SHIN_ROLLER = -0.3
const shinKneel: PoseSpec = { root: [0, 0.6], torso: 100, neck: -26, ...legs([100, 90, 85]), ...arms(palm(SHIN_PALMS)) }

const FOOT_BALL = 0.26
const footStand = (ankle: number): PoseSpec =>
  pose(STAND, { root: [0.02, 0.96], legL: flat(ankle, BALL_RADIUS * 2 - 0.004), legR: flat(-0.08), ...arms([8, 12]) })

const GBALL_PALMS = -0.38
function gluteBall(x: number): PoseSpec {
  return { root: [x, 0.1 + BALL_RADIUS * 2], torso: -32, neck: 8, ...legs(flat(0.45)), ...arms(palm(GBALL_PALMS)) }
}

const WALL = -0.32
const WALL_BALL_Y = 1.26
const WALL_FEET = 0.12
const WALL_BACK_HALF = 0.085
function wallBack(rootY: number): PoseSpec {
  const base = pose(STAND, { root: [0, rootY], torso: -6, ...legs(flat(WALL_FEET)), ...arms([10, 20]) })
  const points = jointsOf(base)
  const t = (WALL_BALL_Y - points.waist[1]) / (points.neck[1] - points.waist[1])
  const spineX = points.waist[0] + (points.neck[0] - points.waist[0]) * t
  return pose(base, { root: [WALL + BALL_RADIUS * 2 + WALL_BACK_HALF - spineX, rootY] })
}

const strapHam = pose(SUPINE_FLAT, { legL: [80, 0, -12], ...arms([62, 28]) })

const strapQuad = pose(PRONE, { neck: -14, legL: [-6, 125, 30], armL: hand([0.3, 0.36], 170), armR: [178, 10] })

const strapCalf = pose(SEATED, {
  torso: 8,
  legL: [93, 0, -18],
  legR: flat(0.42),
  ...arms([38, 50]),
})

function hipKneel(thigh: number): PoseSpec {
  const base: PoseSpec = {
    torso: 0,
    legL: [thigh, thigh + 90, 90],
    anchor: { joint: 'kneeL', at: [-0.18, FLOOR_SHIN] },
    legR: flat(0.36),
    armR: [10, 20],
  }
  const hip = jointsOf(base).hip
  return pose(base, { armL: hand(add(hip, [0.1, 0.0]), -80) })
}

const LAT_WALL = 1.45
const latHinge = (rootX: number, torso: number): PoseSpec =>
  pose(STAND, { root: [rootX, 0.9], torso, neck: -6, ...legs(flat(0)), ...arms([175, 0]) })

export const RECOVERY: Exercise[] = [
  {
    id: 'foam-roller-calves',
    name: 'Foam roller calves',
    category: 'recovery',
    tags: ['lowerBody', 'mobility'],
    muscles: ['calves'],
    equipment: 'foamRoller',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 45 },
    animation: anim(
      'side',
      [
        key(rolled(calfSit, 0.12, CALF_ROLLER, 'kneeL', 'ankleL', SHIN_HALF), 1600),
        key(rolled(calfSit, -0.12, CALF_ROLLER, 'kneeL', 'ankleL', SHIN_HALF), 1600),
      ],
      { props: [{ kind: 'foamRoller', under: 'wristL', dx: CALF_ROLLER - CALF_PALMS }] },
    ),
    summary: 'Roll your calves over a foam roller to ease tightness after runs, jumps, and long days on your feet.',
    steps: [
      'Sit with your calves on the roller and your hands planted behind you.',
      'Lift your hips off the floor.',
      'Push with your hands to roll from your ankles to just below your knees.',
      'Pause and breathe on any tender spots.',
    ],
    tips: ['Cross one leg over the other to add pressure.', 'Move slowly, about an inch per second.'],
  },
  {
    id: 'foam-roller-hamstrings',
    name: 'Foam roller hamstrings',
    category: 'recovery',
    tags: ['lowerBody', 'mobility'],
    muscles: ['hamstrings', 'glutes'],
    equipment: 'foamRoller',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 45 },
    animation: anim(
      'side',
      [
        key(rolled(hamSit, HAM_ROLLER - 0.12, HAM_ROLLER, 'hipL', 'kneeL', THIGH_HALF), 1700),
        key(rolled(hamSit, HAM_ROLLER - 0.36, HAM_ROLLER, 'hipL', 'kneeL', THIGH_HALF), 1700),
      ],
      { props: [{ kind: 'foamRoller', under: 'wristL', dx: HAM_ROLLER - HAM_PALMS }] },
    ),
    summary: 'Roll the backs of your thighs over a foam roller to loosen hamstrings that feel tight from sitting or running.',
    steps: [
      'Sit with the roller under your thighs and your hands behind you.',
      'Lift your hips so your legs rest on the roller.',
      'Roll from just above your knees up to your sit bones.',
      'Keep your legs relaxed and breathe slowly.',
    ],
    tips: ['Turn your toes in or out to reach different lines of the muscle.', 'Avoid rolling directly behind the knee.'],
  },
  {
    id: 'foam-roller-quads',
    name: 'Foam roller quads',
    category: 'recovery',
    tags: ['lowerBody', 'mobility'],
    muscles: ['quads', 'hipFlexors'],
    equipment: 'foamRoller',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 45 },
    animation: anim(
      'side',
      [
        key(rolled(quadProne, QUAD_ROLLER - 0.32, QUAD_ROLLER, 'hipL', 'kneeL', THIGH_HALF), 1700),
        key(rolled(quadProne, QUAD_ROLLER - 0.12, QUAD_ROLLER, 'hipL', 'kneeL', THIGH_HALF), 1700),
      ],
      { props: [{ kind: 'foamRoller', under: 'wristL', dx: QUAD_ROLLER - QUAD_WRIST }] },
    ),
    summary: 'Lie face down with your thighs on a foam roller and roll the fronts of your legs to relieve tight quads.',
    steps: [
      'Lie face down on your forearms with the roller under your thighs.',
      'Brace your core so your hips stay level.',
      'Pull with your forearms to roll from above your knees to your hips.',
      'Pause and breathe on tender spots.',
    ],
    tips: ['Keep your lower back neutral, not sagging.', 'Shift your weight onto one leg for more pressure.'],
  },
  {
    id: 'foam-roller-glutes',
    name: 'Foam roller glutes',
    category: 'recovery',
    tags: ['lowerBody', 'mobility'],
    muscles: ['glutes', 'abductors'],
    equipment: 'foamRoller',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 40 },
    animation: anim('side', [key(gluteSit(0.04), 1500), key(gluteSit(-0.06), 1500)], {
      props: [{ kind: 'foamRoller', under: 'wristL', dx: GLUTE_ROLLER - GLUTE_PALMS }],
    }),
    summary: 'Sit on a foam roller in a figure-four to work deep into the glute and outer hip of the crossed leg.',
    steps: [
      'Sit on the roller with your hands planted behind you.',
      'Cross one ankle over the opposite knee.',
      'Lean toward the crossed leg so it takes your weight.',
      'Roll slowly back and forth across the glute.',
    ],
    tips: ['Keep the planted foot flat to control the pressure.', 'Breathe out as you settle onto tender spots.'],
  },
  {
    id: 'foam-roller-upper-back',
    name: 'Foam roller upper back',
    category: 'recovery',
    tags: ['upperBody', 'mobility'],
    muscles: ['upperBack', 'traps'],
    equipment: 'foamRoller',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 45 },
    animation: anim(
      'side',
      [
        key(rolled(backBridge, BACK_ROLLER + 0.22, BACK_ROLLER, 'waist', 'neck', TORSO_HALF), 1700),
        key(rolled(backBridge, BACK_ROLLER + 0.38, BACK_ROLLER, 'waist', 'neck', TORSO_HALF), 1700),
      ],
      { props: [{ kind: 'foamRoller', under: 'ankleL', dx: BACK_ROLLER - BACK_FEET }] },
    ),
    summary: 'Roll your upper back over a foam roller to loosen stiff muscles between your shoulder blades.',
    steps: [
      'Lie with the roller under your shoulder blades and your feet flat.',
      'Cross your arms over your chest and lift your hips.',
      'Push through your feet to roll from mid-back to the tops of your shoulders.',
      'Keep your chin gently tucked.',
    ],
    tips: ['Stay above your lower ribs.', 'Hug yourself tighter to spread your shoulder blades.'],
  },
  {
    id: 'foam-roller-thoracic-extension',
    name: 'Thoracic extension on roller',
    category: 'recovery',
    tags: ['upperBody', 'mobility'],
    muscles: ['upperBack', 'chest', 'abs'],
    equipment: 'foamRoller',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 45 },
    animation: anim(
      'side',
      [key(extBase, 1600, 300), key(extArch, 1800, 500)],
      { props: [{ kind: 'foamRoller', under: 'hip', dx: EXT_ROLLER }] },
    ),
    summary: 'Arch your upper back over a foam roller to open a stiff, rounded spine after long hours at a desk.',
    steps: [
      'Sit with the roller across your mid-back and your feet flat.',
      'Support your head with your hands, elbows pointing forward.',
      'Breathe out and let your upper back arch over the roller.',
      'Return slowly and repeat.',
    ],
    tips: ['Keep your hips on the floor.', 'Move the roller up an inch after a few reps.'],
  },
  {
    id: 'foam-roller-hip-flexors',
    name: 'Foam roller hip flexors',
    category: 'recovery',
    tags: ['lowerBody', 'mobility'],
    muscles: ['hipFlexors', 'quads'],
    equipment: 'foamRoller',
    level: 2,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 40 },
    animation: anim('side', [
        key(rolled(hipProne, 0, HIP_ROLLER, 'hipL', 'kneeL', THIGH_HALF), 1500),
        key(rolled(hipProne, 0.08, HIP_ROLLER, 'hipL', 'kneeL', THIGH_HALF), 1500),
      ], {
      props: [{ kind: 'foamRoller', under: 'wristL', dx: HIP_ROLLER - HIP_WRIST }],
    }),
    summary: 'Lie face down with the front of one hip on a foam roller to release hip flexors tightened by sitting.',
    steps: [
      'Lie face down on your forearms with the roller just below one hip bone.',
      'Bend the other knee out to the side.',
      'Roll a few inches up and down the front of the hip.',
      'Breathe slowly and let the hip sink.',
    ],
    tips: ['Keep the movement small.', 'Squeeze the glute of the leg on the roller.'],
  },
  {
    id: 'foam-roller-shins',
    name: 'Foam roller shins',
    category: 'recovery',
    tags: ['lowerBody', 'mobility'],
    muscles: ['calves'],
    equipment: 'foamRoller',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 40 },
    animation: anim(
      'side',
      [
        key(rolled(shinKneel, -0.2, SHIN_ROLLER, 'kneeL', 'ankleL', SHIN_HALF), 1500),
        key(rolled(shinKneel, 0, SHIN_ROLLER, 'kneeL', 'ankleL', SHIN_HALF), 1500),
      ],
      { props: [{ kind: 'foamRoller', under: 'wristL', dx: SHIN_ROLLER - SHIN_PALMS }] },
    ),
    summary: 'Kneel on all fours with your shins on a foam roller to soothe the muscles on the front of your lower legs.',
    steps: [
      'Start on all fours with the roller under your shins.',
      'Point your toes and lift your knees off the floor.',
      'Shift your weight forward and back to roll from ankles to knees.',
      'Keep your hands under your shoulders.',
    ],
    tips: ['Lean more onto your hands to lighten the pressure.', 'Turn your legs slightly inward to reach the outer shin.'],
  },
  {
    id: 'massage-ball-foot-roll',
    name: 'Massage ball foot roll',
    category: 'recovery',
    tags: ['lowerBody', 'mobility'],
    muscles: ['calves'],
    equipment: 'massageBall',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 45 },
    animation: anim('side', [key(footStand(FOOT_BALL - 0.15), 1300), key(footStand(FOOT_BALL - 0.02), 1300)], {
      props: [{ kind: 'massageBall', under: 'ankleR', dx: FOOT_BALL + 0.08 }],
      thumb: 1,
    }),
    summary: 'Roll the sole of your foot over a massage ball to ease tired arches and wake up your feet.',
    steps: [
      'Stand tall with a ball under the arch of one foot.',
      'Press down gently and roll from heel to toes.',
      'Pause on tight spots and breathe.',
      'Keep most of your weight on the standing leg.',
    ],
    tips: ['Hold a wall or chair if you need balance.', 'Try it seated for a lighter touch.'],
  },
  {
    id: 'massage-ball-glute-release',
    name: 'Massage ball glute release',
    category: 'recovery',
    tags: ['lowerBody', 'mobility'],
    muscles: ['glutes', 'abductors'],
    equipment: 'massageBall',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 40 },
    animation: anim('side', [key(gluteBall(0.03), 1500), key(gluteBall(-0.04), 1500)], {
      props: [{ kind: 'massageBall', under: 'wristL', dx: -0.02 - GBALL_PALMS }],
    }),
    summary: 'Sit on a massage ball to target knots in your glutes that a foam roller cannot quite reach.',
    steps: [
      'Sit with a ball under one glute and your hands behind you.',
      'Bend your knees and plant your feet.',
      'Shift your weight onto the ball.',
      'Make small circles and pause on tender spots.',
    ],
    tips: ['Cross the ankle over the knee for more pressure.', 'Keep breathing slowly.'],
  },
  {
    id: 'massage-ball-upper-back-wall',
    name: 'Wall ball upper back',
    category: 'recovery',
    tags: ['upperBody', 'mobility'],
    muscles: ['upperBack', 'traps'],
    equipment: 'massageBall',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 40 },
    animation: anim('side', [key(wallBack(0.94), 1500), key(wallBack(0.8), 1500)], {
      props: [
        { kind: 'wall', x: WALL, side: -1 },
        { kind: 'massageBall', under: 'ankleL', dx: WALL + BALL_RADIUS - WALL_FEET, y: WALL_BALL_Y },
      ],
    }),
    summary: 'Pin a massage ball between your upper back and a wall to release tight spots around the shoulder blade.',
    steps: [
      'Stand with your back to a wall and a ball beside one shoulder blade.',
      'Walk your feet out and lean back into the ball.',
      'Bend and straighten your knees to roll the ball.',
      'Keep your arms relaxed at your sides.',
    ],
    tips: ['Keep the ball off your spine.', 'Hug across your chest to reach deeper.', 'Lean in less if it feels too intense.'],
  },
  {
    id: 'strap-hamstring-stretch',
    name: 'Strap hamstring stretch',
    category: 'recovery',
    tags: ['stretch', 'lowerBody'],
    muscles: ['hamstrings', 'calves'],
    equipment: 'strap',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: breathe(strapHam, 'side', 3600, [{ kind: 'strap', foot: 'L', hand: 'both' }]),
    summary: 'Lie on your back and use a strap to ease one straight leg up for a relaxed, supported hamstring stretch.',
    steps: [
      'Lie on your back and loop a strap around one foot.',
      'Straighten that leg toward the ceiling.',
      'Walk your hands up the strap until you feel a stretch.',
      'Keep the other leg long on the floor and breathe.',
    ],
    tips: ['Keep a soft bend in the knee if needed.', 'Relax your shoulders on the floor.'],
  },
  {
    id: 'strap-quad-stretch',
    name: 'Strap quad stretch',
    category: 'recovery',
    tags: ['stretch', 'lowerBody'],
    muscles: ['quads', 'hipFlexors'],
    equipment: 'strap',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: breathe(strapQuad, 'side', 3600, [{ kind: 'strap', foot: 'L', hand: 'L' }]),
    summary: 'Lie face down and use a strap to draw one heel toward your glute for a gentle front-of-thigh stretch.',
    steps: [
      'Lie face down and loop a strap around one foot.',
      'Bend that knee and hold the strap over your shoulder.',
      'Gently pull the heel toward your glute.',
      'Keep your hips pressed into the floor and breathe.',
    ],
    tips: ['Squeeze your glute to deepen the stretch.', 'Ease off if you feel it in the knee.'],
  },
  {
    id: 'strap-calf-stretch',
    name: 'Seated strap calf stretch',
    category: 'recovery',
    tags: ['stretch', 'lowerBody'],
    muscles: ['calves', 'hamstrings'],
    equipment: 'strap',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: breathe(strapCalf, 'side', 3600, [{ kind: 'strap', foot: 'L', hand: 'both' }]),
    summary: 'Sit tall and pull a strap looped around one foot to stretch your calf without needing a wall.',
    steps: [
      'Sit with one leg straight and the other knee bent.',
      'Loop a strap around the ball of the straight leg foot.',
      'Pull the strap so your toes draw back toward you.',
      'Sit tall and breathe.',
    ],
    tips: ['Keep the back of the knee long.', 'Lean forward slightly to add hamstrings.'],
  },
  {
    id: 'band-pass-through',
    name: 'Band pass-through',
    category: 'recovery',
    tags: ['mobility', 'upperBody'],
    muscles: ['shoulders', 'chest', 'upperBack'],
    equipment: 'band',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('front', [key(pose(STAND_FRONT, arms([38, 0])), 1600, 200), key(pose(STAND_FRONT, arms([158, 0])), 1600, 200)], {
      props: [{ kind: 'band', from: 'wristR', hand: 'L' }],
    }),
    summary: 'Sweep a band from your hips over your head with straight arms to loosen tight shoulders and chest.',
    steps: [
      'Hold a band with a wide grip in front of your hips.',
      'Keep your arms straight and raise the band overhead.',
      'Continue behind you as far as is comfortable.',
      'Reverse the path slowly.',
    ],
    tips: ['Widen your grip if your shoulders feel pinched.', 'Keep your ribs down as your arms go overhead.'],
  },
  {
    id: 'banded-hip-flexor-stretch',
    name: 'Banded hip flexor stretch',
    category: 'recovery',
    tags: ['stretch', 'lowerBody'],
    muscles: ['hipFlexors', 'quads'],
    equipment: 'band',
    level: 2,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim('side', [key(hipKneel(-4), 1700, 300), key(hipKneel(-16), 1700, 600)], {
      props: [
        { kind: 'wall', x: -0.95, side: -1 },
        { kind: 'band', from: [-0.95, 0.62], hand: 'L' },
      ],
    }),
    summary: 'Half kneel with a band pulling the front of your back hip forward to deepen a classic hip flexor stretch.',
    steps: [
      'Anchor a band low behind you and loop it around the front of one hip.',
      'Kneel on that leg with the other foot forward.',
      'Squeeze the glute of the back leg.',
      'Shift your hips forward and hold.',
    ],
    tips: ['Keep your torso tall.', 'Tuck your tailbone slightly under.'],
  },
  {
    id: 'banded-lat-stretch',
    name: 'Banded lat stretch',
    category: 'recovery',
    tags: ['stretch', 'upperBody'],
    muscles: ['lats', 'shoulders'],
    equipment: 'band',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim('side', [key(latHinge(0, 70), 1700, 300), key(latHinge(-0.06, 78), 1700, 600)], {
      props: [
        { kind: 'wall', x: LAT_WALL, side: 1 },
        { kind: 'band', from: [LAT_WALL, 1.12], hand: 'both' },
      ],
    }),
    summary: 'Hold a band anchored in front of you and sink your hips back to stretch your lats and shoulders.',
    steps: [
      'Anchor a band at chest height and hold it with both hands.',
      'Step back until your arms are straight.',
      'Hinge at your hips and let your chest sink toward the floor.',
      'Hold and breathe into your sides.',
    ],
    tips: ['Keep a soft bend in your knees.', 'Let the band pull your arms long.'],
  },
]
