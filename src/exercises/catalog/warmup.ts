import { along, type Vec2 } from '@/figure/math'
import type { PoseSpec } from '@/figure/types'
import type { Exercise } from '../types'
import { HIP, STAND, STAND_FRONT, anim, arms, flat, hand, key, pose } from '../kit'

const marchStand = pose(STAND, arms([6, 28]))
const marchLeft = pose(STAND, { legL: [84, 96, 18], armL: [-26, 40], armR: [46, 70] })
const marchRight = pose(STAND, { legR: [84, 96, 18], armL: [46, 70], armR: [-26, 40] })

const twistBase = pose(STAND_FRONT, { root: [0, HIP - 0.006], legL: flat(0.16), legR: flat(-0.16) })
const twistOpen = { upper: 0.9, fore: 0.9 }
const twistAcross = { upper: 0.62, fore: 0.85 }
const twistLeft = pose(twistBase, {
  armL: [90, 6],
  armR: [-78, -30],
  scale: { upperArmL: twistOpen.upper, forearmL: twistOpen.fore, upperArmR: twistAcross.upper, forearmR: twistAcross.fore },
})
const twistRight = pose(twistBase, {
  armL: [-78, -30],
  armR: [90, 6],
  scale: { upperArmL: twistAcross.upper, forearmL: twistAcross.fore, upperArmR: twistOpen.upper, forearmR: twistOpen.fore },
})
const twistForward = { upperArmL: 0.1, forearmL: 0.1, handL: 0.3, upperArmR: 0.1, forearmR: 0.1, handR: 0.3 }
const twistPassRight = pose(twistBase, { armL: [90, 0], armR: [-90, 0], scale: twistForward })
const twistPassLeft = pose(twistBase, { armL: [-90, 0], armR: [90, 0], scale: twistForward })

function hipCircle(step: number): PoseSpec {
  const angle = (step * Math.PI) / 4
  const tilt = -8 * Math.cos(angle)
  const root: Vec2 = [0.07 * Math.cos(angle), HIP - 0.015 + 0.008 * Math.sin(angle)]
  const belt = along(root, 90 - tilt, 0.13)
  return pose(STAND_FRONT, {
    root,
    torso: tilt,
    spine: -tilt * 0.7,
    neck: -tilt * 0.3,
    legL: flat(0.15),
    legR: flat(-0.15),
    armL: hand(along(belt, -tilt, 0.155), -115),
    armR: hand(along(belt, 180 - tilt, 0.155), -115),
  })
}

const swingHands = { armL: hand([0.04, 1.09], -20), armR: hand([0.04, 1.09], -20), scale: { upperArmL: 0.85, upperArmR: 0.85 } }
const swingFront = pose(STAND, swingHands, { torso: -4, legL: [62, 8, -8] })
const swingMid = pose(STAND, swingHands, { torso: 1, legL: [4, 18, -16] })
const swingBack = pose(STAND, swingHands, { torso: 6, legL: [-28, 16, 18] })

const neckCenter = pose(STAND_FRONT, arms([6, 6]))
const neckLeft = pose(neckCenter, { neck: 34 })
const neckRight = pose(neckCenter, { neck: -34 })

const toeStand = pose(STAND, arms([4, 10]))
const toeFold = pose(STAND, { root: [-0.16, 0.945], torso: 105, spine: 28, neck: 30, ...arms([133, 4]) })
const toeRoll = pose(STAND, { root: [-0.1, 0.958], torso: 52, spine: 40, neck: 34, ...arms([92, 6]) })

const millStand = pose(STAND_FRONT, { root: [0, 0.85], legL: flat(0.52), legR: flat(-0.52), ...arms([90, 4]) })
const millHalfLeft = pose(millStand, { root: [-0.04, 0.845], torso: 14, spine: 26, neck: 10, armL: [175, 4], armR: [5, 4] })
const millLeft = pose(millStand, {
  root: [-0.08, 0.815],
  torso: 40,
  spine: 50,
  neck: 40,
  ...arms([-90, 4]),
  scale: { lowerSpine: 0.8, upperSpine: 0.85 },
})
const millHalfRight = pose(millStand, { root: [0.04, 0.845], torso: -14, spine: -26, neck: -10, armL: [5, 4], armR: [175, 4] })
const millRight = pose(millStand, {
  root: [0.08, 0.815],
  torso: -40,
  spine: -50,
  neck: -40,
  ...arms([-90, 4]),
  scale: { lowerSpine: 0.8, upperSpine: 0.85 },
})

export const WARM_UP: Exercise[] = [
  {
    id: 'march-in-place',
    name: 'March in place',
    category: 'warmup',
    tags: [],
    muscles: ['hipFlexors', 'quads', 'glutes', 'calves'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim('side', [key(marchStand, 280), key(marchLeft, 300), key(marchStand, 280), key(marchRight, 300)], { thumb: 1 }),
    summary: 'A low-impact way to raise your heart rate and warm up your legs by lifting your knees on the spot.',
    steps: [
      'Stand tall with your feet hip-width apart and your arms relaxed at your sides.',
      'Lift your left knee to about hip height as your right arm swings forward.',
      'Lower your left foot and lift your right knee as your left arm swings forward.',
      'Keep alternating at a steady, comfortable pace.',
    ],
    tips: [
      'Set each foot down softly to keep the movement quiet and easy on your joints.',
      'Stand up straight rather than leaning back as your knees lift.',
    ],
  },
  {
    id: 'torso-twists',
    name: 'Standing torso twists',
    category: 'warmup',
    tags: [],
    muscles: ['obliques', 'abs', 'upperBack'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim(
      'front',
      [
        key(twistLeft, 450, 120, 'out'),
        key(twistPassRight, 450, 0, 'in'),
        key(twistPassLeft, 0),
        key(twistRight, 450, 120, 'out'),
        key(twistPassLeft, 450, 0, 'in'),
        key(twistPassRight, 0),
      ],
      { thumb: 0 },
    ),
    summary: 'A gentle standing rotation that loosens your spine and warms up your waist, back and shoulders.',
    steps: [
      'Stand with your feet a little wider than hip-width apart and your knees soft.',
      'Lift your arms to shoulder height.',
      'Turn your upper body to the left, letting your left arm open out and your right arm fold across your chest.',
      'Rotate back through the center and turn to the right in the same way.',
      'Keep your hips facing forward and twist in a smooth, steady rhythm.',
    ],
    tips: [
      'Let the turn come from your waist and upper back, not by twisting your knees.',
      'Start with small turns and gradually increase the range as you loosen up.',
    ],
  },
  {
    id: 'hip-circles',
    name: 'Hip circles',
    category: 'warmup',
    tags: [],
    muscles: ['hipFlexors', 'glutes', 'lowerBack', 'obliques'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim('front', Array.from({ length: 8 }, (_, step) => key(hipCircle(step), 340, 0, 'linear')), { thumb: 0 }),
    summary: 'A simple mobility drill that loosens your hips and lower back by moving your pelvis in slow, smooth circles.',
    steps: [
      'Stand with your feet slightly wider than hip-width apart and your hands on your hips.',
      'Soften your knees and shift your hips out to one side.',
      'Circle your hips forward, across to the other side and back again in one smooth loop.',
      'Keep your shoulders fairly still and your feet planted.',
      'Halfway through, reverse the direction of the circles.',
    ],
    tips: [
      'Make the circles as large as feels comfortable without forcing the range.',
      'Breathe steadily and keep the movement slow and controlled.',
    ],
  },
  {
    id: 'leg-swings',
    name: 'Leg swings',
    category: 'warmup',
    tags: [],
    muscles: ['hipFlexors', 'hamstrings', 'glutes'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: anim(
      'side',
      [key(swingBack, 325, 0, 'out'), key(swingMid, 325, 0, 'in'), key(swingFront, 325, 0, 'out'), key(swingMid, 325, 0, 'in')],
      { thumb: 2 },
    ),
    summary: 'A dynamic warm-up that loosens your hips and hamstrings by swinging one leg forward and back like a pendulum.',
    steps: [
      'Stand tall on your right leg with your hands on your hips, or hold a wall for balance.',
      'Swing your straight left leg forward in front of you.',
      'Let it swing back behind you in a smooth, controlled arc.',
      'Gradually increase the height of the swing as your hips loosen.',
      'Switch legs and repeat on the other side.',
    ],
    tips: [
      'Keep your torso upright and avoid rounding your back as the leg swings forward.',
      'Stay relaxed and let momentum do the work instead of kicking hard.',
    ],
  },
  {
    id: 'neck-tilts',
    name: 'Neck side tilts',
    category: 'warmup',
    tags: [],
    muscles: ['upperBack', 'shoulders'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: anim(
      'front',
      [key(neckCenter, 1000, 300), key(neckLeft, 1200, 900), key(neckCenter, 1000, 300), key(neckRight, 1200, 900)],
      { thumb: 1 },
    ),
    summary: 'A gentle mobility exercise that eases tension in your neck and the tops of your shoulders.',
    steps: [
      'Stand or sit tall with your shoulders relaxed and your arms by your sides.',
      'Slowly tilt your head to bring your left ear toward your left shoulder.',
      'Pause for a breath, then lift your head back to the center.',
      'Tilt your head to the right in the same way and return to the center.',
    ],
    tips: [
      'Keep your shoulders down rather than lifting them to meet your ears.',
      'Move slowly and stay in a comfortable range; never force the stretch.',
    ],
  },
  {
    id: 'toe-touches',
    name: 'Standing toe touches',
    category: 'warmup',
    tags: [],
    muscles: ['hamstrings', 'lowerBack', 'glutes'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(toeStand, 800, 200, 'out'), key(toeFold, 1300, 300), key(toeRoll, 800, 0, 'in')], { thumb: 1 }),
    summary: 'A dynamic forward fold that warms up your hamstrings and lower back as you reach for your toes and roll back up.',
    steps: [
      'Stand tall with your feet hip-width apart and your knees soft.',
      'Hinge at your hips and reach your hands down toward your toes.',
      'Let your head and arms hang for a moment at the bottom.',
      'Roll back up slowly, stacking your spine until you are standing tall.',
    ],
    tips: [
      'Bend your knees as much as you need; reaching your shins is fine.',
      'Move slowly and avoid bouncing at the bottom.',
    ],
  },
  {
    id: 'windmills',
    name: 'Windmills',
    category: 'warmup',
    tags: [],
    muscles: ['obliques', 'hamstrings', 'lowerBack', 'shoulders'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim(
      'front',
      [
        key(millStand, 400, 150, 'out'),
        key(millHalfLeft, 400, 0, 'in'),
        key(millLeft, 400, 200, 'out'),
        key(millHalfLeft, 400, 0, 'in'),
        key(millStand, 400, 150, 'out'),
        key(millHalfRight, 400, 0, 'in'),
        key(millRight, 400, 200, 'out'),
        key(millHalfRight, 400, 0, 'in'),
      ],
      { thumb: 2 },
    ),
    summary: 'A dynamic full-body warm-up that combines a hip hinge and a twist to loosen your hamstrings, back and shoulders.',
    steps: [
      'Stand with your feet wide apart and your arms stretched out to the sides at shoulder height.',
      'Hinge forward and twist to reach your right hand toward your left foot.',
      'Let your left arm reach up toward the ceiling as you turn.',
      'Rise back up to standing with your arms out wide.',
      'Repeat to the other side, reaching your left hand toward your right foot.',
    ],
    tips: [
      'Keep a slight bend in your knees to take pressure off your lower back.',
      'Move with control rather than swinging quickly.',
    ],
  },
]
