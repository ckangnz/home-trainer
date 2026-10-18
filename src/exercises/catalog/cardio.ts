import type { Vec2 } from '@/figure/math'
import { RIG } from '@/figure/rig'
import { isReach } from '@/figure/solve'
import type { Keyframe, LimbSpec, PoseSpec, Reach, SegmentId, Triple } from '@/figure/types'
import type { Exercise } from '../types'
import { HIP, STAND, STAND_FRONT, anim, arms, flat, foot, key, legs, palm, pose, toes } from '../kit'

function swapSides(spec: PoseSpec): PoseSpec {
  return { ...spec, armL: spec.armR, armR: spec.armL, legL: spec.legR, legR: spec.legL }
}

function mirrorReach(spec: LimbSpec | undefined): LimbSpec | undefined {
  return spec !== undefined && isReach(spec) ? { ...spec, at: [-spec.at[0], spec.at[1]] } : spec
}

function otherSide(segment: string): SegmentId {
  if (segment.endsWith('L')) {
    return `${segment.slice(0, -1)}R` as SegmentId
  }
  if (segment.endsWith('R')) {
    return `${segment.slice(0, -1)}L` as SegmentId
  }
  return segment as SegmentId
}

function mirrorFront(spec: PoseSpec): PoseSpec {
  const scale: Partial<Record<SegmentId, number>> = {}
  for (const [segment, value] of Object.entries(spec.scale ?? {})) {
    scale[otherSide(segment)] = value
  }
  const root = spec.root ?? [0, HIP]
  return {
    ...spec,
    root: [-root[0], root[1]],
    torso: -(spec.torso ?? 0),
    spine: -(spec.spine ?? 0),
    neck: -(spec.neck ?? 0),
    armL: mirrorReach(spec.armR),
    armR: mirrorReach(spec.armL),
    legL: mirrorReach(spec.legR),
    legR: mirrorReach(spec.legL),
    scale,
  }
}

function toeAt(x: number, y: number, angle: number): Reach {
  return { at: [x, y], angle, point: 'tip' }
}

const FLAT_TOE = toes(RIG.footToe, 0)

interface Stride {
  torso: number
  stanceHip: number
  flightHip: number
  stance: Reach
  lift: Triple
  land: Reach
  push: Reach
  armForward: Triple
  armBack: Triple
  armPass: Triple
  ms: number
}

function strideCycle(stride: Stride): Keyframe[] {
  const leftUp: PoseSpec = {
    root: [0, stride.stanceHip],
    torso: stride.torso,
    legL: stride.lift,
    legR: stride.stance,
    armL: stride.armBack,
    armR: stride.armForward,
  }
  const leftDown: PoseSpec = {
    root: [0, stride.flightHip],
    torso: stride.torso,
    legL: stride.land,
    legR: stride.push,
    ...arms(stride.armPass),
  }
  return [
    key(leftUp, stride.ms, 0, 'out'),
    key(leftDown, stride.ms, 0, 'in'),
    key(swapSides(leftUp), stride.ms, 0, 'out'),
    key(swapSides(leftDown), stride.ms, 0, 'in'),
  ]
}

const SOFT_LEGS = { thighL: 0.97, thighR: 0.97, shinL: 0.98, shinR: 0.98 }

const jackClosed = pose(STAND_FRONT, { anchor: 'ground', scale: SOFT_LEGS }, arms([6, 6]), legs([3, 0, 0]))
const jackAirOut = pose(STAND_FRONT, { root: [0, HIP + 0.06] }, arms([90, 12]), legs([11, 0, 0]))
const jackOpen = pose(STAND_FRONT, { anchor: 'ground', scale: SOFT_LEGS }, arms([166, 8]), legs([17, 0, 0]))
const jackAirIn = pose(STAND_FRONT, { root: [0, HIP + 0.05] }, arms([84, 12]), legs([9, 0, 0]))

const highKnees = strideCycle({
  torso: 0,
  stanceHip: 0.985,
  flightHip: 1.04,
  stance: toes(0.05, -15),
  lift: [94, 100, 25],
  land: toeAt(0.07, 0.075, -30),
  push: toeAt(-0.03, 0.12, -55),
  armForward: [70, 90],
  armBack: [-55, 70],
  armPass: [8, 85],
  ms: 160,
})

const buttKicks = strideCycle({
  torso: 5,
  stanceHip: 0.985,
  flightHip: 1.03,
  stance: toes(0.05, -15),
  lift: [5, 148, 45],
  land: toeAt(0.07, 0.07, -30),
  push: toeAt(-0.06, 0.12, -70),
  armForward: [45, 95],
  armBack: [-45, 70],
  armPass: [2, 85],
  ms: 170,
})

const jog = strideCycle({
  torso: 4,
  stanceHip: 0.98,
  flightHip: 1.01,
  stance: toes(0.05, -12),
  lift: [48, 95, 25],
  land: toeAt(0.07, 0.05, -25),
  push: toeAt(-0.04, 0.1, -55),
  armForward: [40, 95],
  armBack: [-35, 75],
  armPass: [3, 85],
  ms: 190,
})

const CLIMB_NECK: Vec2 = [0.62, 0.615]

function climber(torso: number, legL: Triple, legR: Triple): PoseSpec {
  return { torso, neck: -12, legL, legR, ...arms(palm(0.58)), anchor: { joint: 'neck', at: CLIMB_NECK } }
}

const climbLeft = climber(76, [122, 135, 30], [5, 0, 8])
const climbSwitch = climber(89, [64, 92, 60], [64, 92, 60])

const BURPEE_HANDS = 0.36
const BURPEE_NECK: Vec2 = [0.43, 0.6]

const burpeeStand = pose(STAND, arms([8, 12]), legs(FLAT_TOE))
const burpeeSquat: PoseSpec = {
  root: [-0.12, 0.34],
  torso: 50,
  spine: 12,
  neck: -28,
  ...legs(FLAT_TOE),
  ...arms(palm(BURPEE_HANDS)),
}
const burpeeKick: PoseSpec = {
  torso: 100,
  neck: -18,
  anchor: { joint: 'neck', at: BURPEE_NECK },
  ...legs(toeAt(-0.82, 0.14, -110)),
  ...arms(palm(BURPEE_HANDS)),
}
const burpeePlank: PoseSpec = {
  torso: 73.5,
  neck: -10,
  anchor: { joint: 'neck', at: BURPEE_NECK },
  ...legs(toes(-0.946, -84)),
  ...arms(palm(BURPEE_HANDS)),
}
const burpeeTuck: PoseSpec = {
  torso: 96,
  neck: -20,
  anchor: { joint: 'neck', at: BURPEE_NECK },
  ...legs(toeAt(-0.45, 0.2, -125)),
  ...arms(palm(BURPEE_HANDS)),
}
const burpeeTakeoff = pose(STAND, { root: [0.03, 1.0], torso: 6, neck: -4, ...arms([140, 10]), ...legs(toes(RIG.footToe, -45)) })
const burpeeJump = pose(STAND, { root: [0.02, HIP + 0.2], torso: -3, neck: -6, armL: [170, 6], armR: [158, 12], ...legs([4, 14, 40]) })

const squatLoad = pose(STAND, { root: [-0.2, 0.52], torso: 40, neck: -18 }, arms([-25, 12]), legs(FLAT_TOE))
const squatTakeoff = pose(STAND, { root: [0.03, 1.0], torso: 6, neck: -4, ...arms([125, 10]), ...legs(toes(RIG.footToe, -45)) })
const squatAir = pose(STAND, { root: [0.02, HIP + 0.2], torso: 0, neck: -4, armL: [166, 8], armR: [154, 12], ...legs([2, 6, 30]) })
const squatLand = pose(STAND, { root: [-0.1, 0.8], torso: 18, neck: -8 }, arms([55, 20]), legs(FLAT_TOE))

const SKATE_X = 0.4

const skateLeft: PoseSpec = {
  root: [SKATE_X - RIG.hipHalfWidth, 0.78],
  torso: 5,
  scale: { lowerSpine: 0.82, upperSpine: 0.85, thighL: 0.62, thighR: 0.85, shinR: 0.7, upperArmL: 0.85 },
  legL: flat(SKATE_X),
  legR: foot([SKATE_X + 0.2, 0.27]),
  armL: [62, 18],
  armR: [-52, 22],
}
const skateGlide: PoseSpec = {
  root: [0, 0.95],
  torso: -4,
  scale: { lowerSpine: 0.86, upperSpine: 0.88, shinL: 0.88, shinR: 0.88 },
  legL: [24, 0, 35],
  legR: [14, 0, 25],
  ...arms([14, 14]),
}

const STAR_FEET = RIG.hipHalfWidth + 0.03

const starStand = pose(STAND_FRONT, { legL: flat(STAR_FEET), legR: flat(-STAR_FEET) })
const starCrouch = pose(STAND_FRONT, {
  root: [0, 0.76],
  neck: 0,
  scale: {
    thighL: 0.64,
    thighR: 0.64,
    shinL: 0.94,
    shinR: 0.94,
    lowerSpine: 0.88,
    upperSpine: 0.9,
    upperArmL: 0.85,
    upperArmR: 0.85,
    forearmL: 0.8,
    forearmR: 0.8,
  },
  legL: flat(STAR_FEET),
  legR: flat(-STAR_FEET),
  ...arms([6, 4]),
})
const starX = pose(STAND_FRONT, { root: [0, HIP + 0.26], ...arms([138, 4]), ...legs([28, 0, 40]) })
const starLand = pose(STAND_FRONT, {
  root: [0, 0.84],
  scale: { thighL: 0.8, thighR: 0.8, shinL: 0.95, shinR: 0.95, lowerSpine: 0.95, upperSpine: 0.96 },
  legL: flat(STAR_FEET),
  legR: flat(-STAR_FEET),
  ...arms([30, 12]),
})

const LUNGE_TOE = 0.33 + RIG.footToe
const LUNGE_BACK = -0.55

function split(hip: number, front: Reach, back: Reach): PoseSpec {
  return { root: [-0.05, hip], torso: 2, legL: front, legR: back, armL: [-30, 70], armR: [45, 80] }
}

const lungeLeft = split(0.52, toes(LUNGE_TOE, 0), toes(LUNGE_BACK, -55))
const lungeLiftLeft = split(0.92, toeAt(LUNGE_TOE - 0.05, 0.11, -45), toeAt(LUNGE_BACK + 0.04, 0.14, -80))
const lungeTouchLeft = split(0.82, toes(LUNGE_TOE, -20), toes(LUNGE_BACK, -62))
const lungeSwitch: PoseSpec = { root: [-0.05, 1.0], torso: 0, legL: [-12, 90, 35], legR: [48, 85, 25], ...arms([10, 75]) }

export const CARDIO: Exercise[] = [
  {
    id: 'jumping-jacks',
    name: 'Jumping jacks',
    category: 'cardio',
    tags: ['warmup', 'fullBody'],
    muscles: ['fullBody', 'calves', 'shoulders', 'glutes', 'adductors'],
    equipment: 'none',
    level: 1,
    impact: 'high',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim(
      'front',
      [key(jackClosed, 190, 0, 'out'), key(jackAirOut, 170, 0, 'in'), key(jackOpen, 190, 0, 'out'), key(jackAirIn, 170, 0, 'in')],
      { thumb: 2 },
    ),
    summary: 'A rhythmic full-body jump that raises your heart rate and warms up your shoulders, hips and calves.',
    steps: [
      'Stand tall with your feet together and your arms by your sides.',
      'Jump your feet out wider than your hips as you sweep your arms overhead.',
      'Jump your feet back together as your arms return to your sides.',
      'Keep a steady rhythm, landing softly on the balls of your feet.',
    ],
    tips: ['Keep a slight bend in your knees on every landing.', 'For a low-impact version, step one foot out at a time instead of jumping.'],
  },
  {
    id: 'high-knees',
    name: 'High knees',
    category: 'cardio',
    tags: [],
    muscles: ['hipFlexors', 'quads', 'calves', 'abs'],
    equipment: 'none',
    level: 1,
    impact: 'high',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim('side', highKnees, { thumb: 0 }),
    summary: 'Fast running in place that drives each knee up to hip height to raise your heart rate and work your hip flexors and core.',
    steps: [
      'Stand tall with your feet hip-width apart and your elbows bent.',
      'Run in place, driving one knee up to hip height.',
      'Land softly on the ball of that foot as the other knee drives up.',
      'Pump your arms, bringing the opposite hand forward with each knee.',
    ],
    tips: [
      'Stay tall and avoid leaning back as your knees rise.',
      'Aim for quick, light steps rather than stomping.',
      'March in place with high knees for a lower-impact version.',
    ],
  },
  {
    id: 'butt-kicks',
    name: 'Butt kicks',
    category: 'cardio',
    tags: ['warmup'],
    muscles: ['hamstrings', 'calves', 'quads', 'glutes'],
    equipment: 'none',
    level: 1,
    impact: 'high',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim('side', buttKicks, { thumb: 0 }),
    summary: 'Quick running in place that flicks each heel up toward your glutes to warm the hamstrings and raise your heart rate.',
    steps: [
      'Stand tall with your feet hip-width apart and your arms bent.',
      'Jog in place, bending one knee to kick that heel up toward your glutes.',
      'Land lightly on the ball of the foot as the other heel kicks up.',
      'Keep your knees pointing down and your arms swinging in rhythm.',
    ],
    tips: [
      'Keep your thighs close to vertical so the bend comes from the knee.',
      'Stay on the balls of your feet for a quick, light rhythm.',
    ],
  },
  {
    id: 'mountain-climbers',
    name: 'Mountain climbers',
    category: 'cardio',
    tags: ['core', 'fullBody'],
    muscles: ['abs', 'shoulders', 'hipFlexors', 'quads'],
    equipment: 'none',
    level: 2,
    impact: 'high',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim(
      'side',
      [
        key(climbLeft, 160, 0, 'out'),
        key(climbSwitch, 160, 0, 'in'),
        key(swapSides(climbLeft), 160, 0, 'out'),
        key(climbSwitch, 160, 0, 'in'),
      ],
      { thumb: 0 },
    ),
    summary: 'A fast plank-based drill that drives your knees toward your chest in turn, working your core and shoulders as your heart rate climbs.',
    steps: [
      'Start in a high plank with your hands under your shoulders and your body in a straight line.',
      'Drive one knee in toward your chest.',
      'Switch legs in one quick motion, sending that foot back as the other knee drives in.',
      'Keep alternating at a steady pace while your hands stay planted.',
    ],
    tips: [
      'Keep your hips in line with your shoulders and heels instead of piking them up.',
      'Brace your core so your lower back does not sag.',
      'Step each foot in slowly for a lower-impact version.',
    ],
  },
  {
    id: 'burpees',
    name: 'Burpees',
    category: 'cardio',
    tags: ['fullBody'],
    muscles: ['fullBody', 'quads', 'chest', 'shoulders', 'abs'],
    equipment: 'none',
    level: 3,
    impact: 'high',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim(
      'side',
      [
        key(burpeeStand, 420, 200, 'in'),
        key(burpeeSquat, 600),
        key(burpeeKick, 220, 0, 'in'),
        key(burpeePlank, 220, 200, 'out'),
        key(burpeeTuck, 220, 0, 'in'),
        key(burpeeSquat, 240, 0, 'out'),
        key(burpeeTakeoff, 260, 0, 'in'),
        key(burpeeJump, 260, 0, 'out'),
      ],
      { thumb: 7 },
    ),
    summary: 'A demanding full-body sequence of squat, plank and jump that builds strength and conditioning in a single move.',
    steps: [
      'Stand with your feet hip-width apart.',
      'Squat down and place your hands on the floor in front of your feet.',
      'Jump your feet back into a high plank with your body in a straight line.',
      'Jump your feet back in toward your hands.',
      'Explode up into a jump with your arms overhead, then land softly.',
    ],
    tips: [
      'Brace your core in the plank so your hips do not sag.',
      'Step your feet back and in one at a time for a lower-impact version.',
    ],
  },
  {
    id: 'squat-jumps',
    name: 'Squat jumps',
    category: 'cardio',
    tags: ['lowerBody'],
    muscles: ['quads', 'glutes', 'hamstrings', 'calves'],
    equipment: 'none',
    level: 2,
    impact: 'high',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim(
      'side',
      [key(squatLoad, 520, 150), key(squatTakeoff, 200, 0, 'in'), key(squatAir, 240, 0, 'out'), key(squatLand, 320, 0, 'in')],
      { thumb: 0 },
    ),
    summary: 'An explosive squat that launches into a vertical jump to build leg power and get your heart pumping.',
    steps: [
      'Stand with your feet about shoulder-width apart.',
      'Sit your hips back into a squat as you swing your arms behind you.',
      'Drive through your feet and swing your arms up to jump straight up.',
      'Land softly with bent knees and flow into the next squat.',
    ],
    tips: [
      'Land through the balls of your feet, then let your heels settle.',
      'Keep your knees in line with your toes as you land.',
      'Swap the jump for a quick rise onto your toes for a lower-impact version.',
    ],
  },
  {
    id: 'skaters',
    name: 'Skater hops',
    category: 'cardio',
    tags: ['lowerBody'],
    muscles: ['glutes', 'quads', 'adductors', 'calves'],
    equipment: 'none',
    level: 2,
    impact: 'high',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim(
      'front',
      [
        key(skateLeft, 240, 120, 'out'),
        key(skateGlide, 240, 0, 'in'),
        key(mirrorFront(skateLeft), 240, 120, 'out'),
        key(mirrorFront(skateGlide), 240, 0, 'in'),
      ],
      { thumb: 0 },
    ),
    summary: 'Side-to-side bounds that land on one leg to build balance, lateral power and cardio fitness.',
    steps: [
      'Balance on one leg with a soft bend in the knee.',
      'Bound sideways off that leg and land softly on the other foot.',
      'Sweep the trailing leg behind your landing leg without letting it take weight.',
      'Swing your arms across your body, then bound back the other way.',
    ],
    tips: [
      'Hinge slightly forward at the hips and keep your chest up.',
      'Hold each landing for a moment before you bound back.',
      'Shorten the bound or tap the back foot down for an easier version.',
    ],
  },
  {
    id: 'star-jumps',
    name: 'Star jumps',
    category: 'cardio',
    tags: ['fullBody'],
    muscles: ['fullBody', 'quads', 'glutes', 'calves', 'shoulders'],
    equipment: 'none',
    level: 2,
    impact: 'high',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim(
      'front',
      [key(starStand, 450, 150), key(starCrouch, 500), key(starX, 320, 60, 'out'), key(starLand, 320, 0, 'in')],
      { thumb: 2 },
    ),
    summary: 'An explosive jump from a crouch into a wide X shape that builds power and lifts your heart rate fast.',
    steps: [
      'Stand with your feet hip-width apart and your arms by your sides.',
      'Drop into a quarter squat and reach your hands toward your knees.',
      'Explode upward, spreading your arms and legs wide into an X shape.',
      'Bring your legs back together and land softly in a quarter squat.',
    ],
    tips: ['Absorb each landing through bent knees and hips.', 'Reset your balance between reps rather than rushing.'],
  },
  {
    id: 'jog-in-place',
    name: 'Jog in place',
    category: 'cardio',
    tags: ['warmup'],
    muscles: ['calves', 'quads', 'hamstrings', 'hipFlexors'],
    equipment: 'none',
    level: 1,
    impact: 'high',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 45 },
    animation: anim('side', jog, { thumb: 0 }),
    summary: 'An easy, steady jog in place that gently raises your heart rate and loosens up your legs.',
    steps: [
      'Stand tall with your elbows bent to about 90 degrees.',
      'Jog in place with a small, relaxed knee lift.',
      'Land lightly on the balls of your feet.',
      'Swing your arms in rhythm with your legs and breathe steadily.',
    ],
    tips: ['Keep your shoulders relaxed and down.', 'Speed up or lift your knees higher to make it harder.'],
  },
  {
    id: 'jumping-lunges',
    name: 'Jumping lunges',
    category: 'cardio',
    tags: ['lowerBody'],
    muscles: ['quads', 'glutes', 'hamstrings', 'calves'],
    equipment: 'none',
    level: 3,
    impact: 'high',
    sided: 'alternating',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim(
      'side',
      [
        key(lungeLeft, 160, 100, 'out'),
        key(lungeLiftLeft, 160, 0, 'in'),
        key(lungeSwitch, 180, 0, 'out'),
        key(swapSides(lungeTouchLeft), 200, 0, 'in'),
        key(swapSides(lungeLeft), 160, 100, 'out'),
        key(swapSides(lungeLiftLeft), 160, 0, 'in'),
        key(swapSides(lungeSwitch), 180, 0, 'out'),
        key(lungeTouchLeft, 200, 0, 'in'),
      ],
      { thumb: 0 },
    ),
    summary: 'A plyometric lunge that switches legs in mid-air to build leg power, coordination and conditioning.',
    steps: [
      'Start in a lunge with one foot forward and both knees bent.',
      'Jump straight up, driving with your arms.',
      'Switch your legs in the air.',
      'Land softly in a lunge with the other foot forward, then repeat.',
    ],
    tips: [
      'Keep your torso upright and your front knee over your ankle.',
      'Land quietly by bending both knees as you touch down.',
      'Alternate reverse lunges without the jump for a lower-impact version.',
    ],
  },
]
