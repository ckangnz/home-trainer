import { add, along, angleOf, distance, lerpVec, sub, wrap180, type Vec2 } from '@/figure/math'
import { RIG } from '@/figure/rig'
import { solveSpec } from '@/figure/solve'
import type { JointId, PoseSpec, Prop, Reach, View } from '@/figure/types'
import type { Exercise } from '../types'
import {
  ALL_FOURS,
  FLOOR_SHIN,
  HIP,
  SEATED,
  STAND,
  STAND_FRONT,
  SUPINE_FLAT,
  anim,
  arms,
  fingertips,
  flat,
  hand,
  key,
  legs,
  pose,
} from '../kit'

function jointsOf(spec: PoseSpec, view: View): Record<JointId, Vec2> {
  return solveSpec(spec, view).points
}

function mat(x0: number, x1: number): Prop[] {
  return [{ kind: 'mat', x0, x1 }]
}

const foldFeet = legs(flat(0))
const foldHands = arms(fingertips(0.26, 0, -90))
const foldLong = pose(STAND, { root: [-0.13, 0.95], torso: 114, spine: 15, neck: 22 }, foldFeet, foldHands)
const foldDeep = pose(STAND, { root: [-0.13, 0.947], torso: 111, spine: 21, neck: 28 }, foldFeet, foldHands)

const quadBase = pose(STAND, { root: [0, HIP - 0.01], torso: 2, armR: [72, 12] })
function quadPose(thigh: number, knee: number): PoseSpec {
  const legged = pose(quadBase, { legL: [thigh, knee, 50] })
  const p = jointsOf(legged, 'side')
  const grip = add(lerpVec(p.ankleL, p.toeL, 0.3), [-0.02, -0.015])
  return pose(legged, { armL: hand(grip, 150) })
}
const quadEasy = quadPose(-3, 155)
const quadDeep = quadPose(-7, 157)

const seatedLegs = legs({ at: [0.8675, 0.07], angle: 92 })
const hamLong = pose(SEATED, { torso: 32, spine: 6, neck: 2 }, seatedLegs, arms(hand([0.74, 0.17], -8)))
const hamReach = pose(SEATED, { torso: 44, spine: 16, neck: 10 }, seatedLegs, arms(hand([0.9, 0.2], 15)))

const KNEE_DOWN: Vec2 = [-0.18, FLOOR_SHIN]
function hipFlexorPose(thigh: number): PoseSpec {
  const base: PoseSpec = {
    torso: 0,
    legR: [thigh, thigh + 90, 90],
    anchor: { joint: 'kneeR', at: KNEE_DOWN },
    legL: flat(0.36),
  }
  const hip = jointsOf(base, 'side').hip
  return pose(base, arms(hand(add(hip, [0.03, 0.13]), 100)))
}
const lungeStart = hipFlexorPose(-6)
const lungeForward = hipFlexorPose(-18)

const CALF_WALL = 0.83
const calfFeet = { legL: flat(-0.385), legR: flat(0.3) }
const calfHands = arms(hand([CALF_WALL - 0.035, 1.3], 90))
const calfEasy = pose(STAND, { root: [0.02, 0.86], torso: 25, neck: -12 }, calfFeet, calfHands)
const calfLean = pose(STAND, { root: [0.055, 0.845], torso: 27, neck: -13 }, calfFeet, calfHands)

const cow = pose(ALL_FOURS, { torso: 96, spine: -28, neck: -38 }, legs([96, 90, 90]))
const cat = pose(ALL_FOURS, { torso: 58, spine: 38, neck: 38 }, legs([58, 90, 90]))

function legThrough(hip: Vec2, knee: Vec2, ankle: Vec2, sign: 1 | -1, angle: number) {
  const toAnkle = sub(ankle, hip)
  const toKnee = sub(knee, hip)
  const bend: 1 | -1 = sign * (toAnkle[0] * toKnee[1] - toAnkle[1] * toKnee[0]) > 0 ? 1 : -1
  const reach: Reach = { at: ankle, angle, bend }
  return { reach, thigh: distance(hip, knee) / RIG.thigh, shin: distance(knee, ankle) / RIG.shin }
}
function butterflyPose(kneeX: number, kneeY: number): PoseSpec {
  const rootY = 0.16
  const hipX = RIG.hipHalfWidth
  const left = legThrough([hipX, rootY], [kneeX, kneeY], [0.05, 0.075], 1, -90)
  const right = legThrough([-hipX, rootY], [-kneeX, kneeY], [-0.05, 0.075], -1, -90)
  return {
    root: [0, rootY],
    torso: 0,
    legL: left.reach,
    legR: right.reach,
    armL: hand([0.08, 0.13], -80),
    armR: hand([-0.08, 0.13], -80),
    scale: { thighL: left.thigh, shinL: left.shin, thighR: right.thigh, shinR: right.shin, footL: 0.4, footR: 0.4 },
  }
}
const butterflyUp = butterflyPose(0.44, 0.22)
const butterflyDown = butterflyPose(0.455, 0.18)

function crossBodyPose(reach: number, shoulder: number): PoseSpec {
  const posed = pose(STAND_FRONT, {
    armL: [shoulder, 0, 0],
    scale: { upperArmL: reach, forearmL: reach + 0.06 },
  })
  const p = jointsOf(posed, 'front')
  const grip = add(lerpVec(p.elbowL, p.shoulderL, 0.15), [0, 0.03])
  return pose(posed, { armR: hand(grip, 110) })
}
const crossEasy = crossBodyPose(0.76, -84)
const crossPull = crossBodyPose(0.82, -86)

function tricepsPose(shoulder: number): PoseSpec {
  const raised = pose(STAND_FRONT, { armL: [shoulder, 0, 0] })
  const p = jointsOf(raised, 'front')
  const elbowFlex = wrap180(angleOf(sub(p.head, p.elbowL)) - angleOf(sub(p.elbowL, p.shoulderL)))
  const posed = pose(raised, {
    armL: [shoulder, elbowFlex, 0],
    scale: { forearmL: 0.6, handL: 0.5 },
  })
  return pose(posed, { armR: { at: add(p.elbowL, [-0.005, 0.02]), angle: -10, bend: -1, point: 'tip' } })
}
const tricepsEasy = tricepsPose(182)
const tricepsPull = tricepsPose(187)

const bendFeet = { legL: flat(RIG.hipHalfWidth + 0.03), legR: flat(-RIG.hipHalfWidth - 0.03) }
const sideTall = pose(STAND_FRONT, bendFeet, arms([10, 8]))
const bendToLeft = pose(STAND_FRONT, { root: [-0.02, HIP - 0.002], torso: 1, spine: 30, neck: 8 }, bendFeet, {
  armR: [182, 14],
  armL: [14, 6],
})
const bendToRight = pose(STAND_FRONT, { root: [0.02, HIP - 0.002], torso: -1, spine: -30, neck: -8 }, bendFeet, {
  armL: [182, 14],
  armR: [14, 6],
})

function kneeHugPose(hip: number, knee: number): PoseSpec {
  const legged = pose(SUPINE_FLAT, { legL: [hip, knee, 30] })
  const p = jointsOf(legged, 'side')
  const shin = angleOf(sub(p.ankleL, p.kneeL))
  const grip = along(along(p.kneeL, shin, 0.08), shin + 90, 0.06)
  return pose(legged, arms({ at: grip, bend: -1 }))
}
const kneeHugEasy = kneeHugPose(138, 140)
const kneeHugClose = kneeHugPose(146, 146)

export const STRETCH: Exercise[] = [
  {
    id: 'standing-forward-fold',
    name: 'Standing forward fold',
    category: 'stretch',
    tags: [],
    muscles: ['hamstrings', 'lowerBack'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim('side', [key(foldLong, 1700, 200), key(foldDeep, 1800, 300)], { thumb: 1 }),
    summary: 'A relaxed standing fold that lengthens the backs of your legs and lets your spine hang and unwind.',
    steps: [
      'Stand tall with your feet hip-width apart and your knees soft.',
      'Hinge at your hips and fold your chest toward your thighs.',
      'Let your head and arms hang, reaching your hands toward your shins or the floor.',
      'Breathe slowly and sink a little deeper each time you exhale.',
      'To finish, bend your knees and roll up slowly.',
    ],
    tips: [
      'Bend your knees as much as you need to keep the stretch comfortable.',
      'Keep your weight over the middle of your feet rather than sinking into your heels.',
      'Let your neck relax completely.',
    ],
  },
  {
    id: 'quad-stretch',
    name: 'Standing quad stretch',
    category: 'stretch',
    tags: [],
    muscles: ['quads', 'hipFlexors'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: anim('side', [key(quadEasy, 1700, 200), key(quadDeep, 1700, 200)], { thumb: 1 }),
    summary: 'A one-legged stretch for the front of the thigh, a classic after runs, rides or a long day of sitting.',
    steps: [
      'Stand tall on your right leg, holding a wall or chair for balance if you need to.',
      'Bend your left knee and hold your left foot or ankle with your left hand.',
      'Draw your heel toward your glutes, keeping your knees side by side.',
      'Tuck your pelvis slightly until you feel a stretch along the front of your thigh.',
      'Hold, then repeat on the other side.',
    ],
    tips: [
      'Keep your standing knee soft rather than locked.',
      'Squeeze the glute of your bent leg to deepen the stretch without arching your back.',
      'Fix your gaze on a point ahead to help your balance.',
    ],
  },
  {
    id: 'seated-hamstring-stretch',
    name: 'Seated hamstring stretch',
    category: 'stretch',
    tags: [],
    muscles: ['hamstrings', 'calves', 'lowerBack'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim('side', [key(hamLong, 1700, 200), key(hamReach, 1800, 300)], { props: mat(-0.35, 1.15), thumb: 1 }),
    summary: 'A seated forward reach that lengthens the hamstrings and calves, with no balance needed.',
    steps: [
      'Sit tall on the floor with both legs straight out in front of you.',
      'Flex your feet so your toes point up.',
      'Hinge forward from your hips and reach your hands toward your toes.',
      'Rest your hands on your shins, ankles or feet, wherever you reach comfortably.',
      'Breathe slowly, lengthening your spine as you inhale and folding a little as you exhale.',
    ],
    tips: [
      'Lead with your chest instead of rounding your upper back.',
      'Bend your knees slightly if you cannot sit up tall.',
      'Sit on a folded towel to make it easier to tip your hips forward.',
    ],
  },
  {
    id: 'hip-flexor-stretch',
    name: 'Kneeling hip flexor stretch',
    category: 'stretch',
    tags: [],
    muscles: ['hipFlexors', 'quads'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: anim('side', [key(lungeStart, 1700, 200), key(lungeForward, 1800, 300)], {
      props: mat(-0.85, 0.75),
      thumb: 1,
    }),
    summary: 'A half-kneeling stretch that opens the front of the hip, a welcome reset after long hours of sitting.',
    steps: [
      'Kneel on your right knee with your left foot flat on the floor in front of you.',
      'Stack your shoulders over your hips and rest your hands on your hips.',
      'Tuck your tailbone under and gently squeeze your right glute.',
      'Shift your hips forward until you feel a stretch at the front of your right hip.',
      'Hold, breathing slowly, then switch sides.',
    ],
    tips: [
      'Keep your torso tall instead of arching your lower back.',
      'Pad your back knee with a folded mat or towel.',
      'Keep your front knee tracking over your toes rather than caving inward.',
    ],
  },
  {
    id: 'calf-stretch',
    name: 'Wall calf stretch',
    category: 'stretch',
    tags: [],
    muscles: ['calves'],
    equipment: 'wall',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: anim('side', [key(calfEasy, 1700, 200), key(calfLean, 1700, 300)], {
      props: [{ kind: 'wall', x: CALF_WALL, side: 1 }],
      thumb: 1,
    }),
    summary: 'A simple wall-supported stretch for the calves, great after walking, running or a day on your feet.',
    steps: [
      'Stand facing a wall and place both hands on it at shoulder height.',
      'Step your left foot back, keeping the leg straight and the heel on the floor.',
      'Bend your front knee and lean your hips toward the wall.',
      'Stop when you feel a stretch in your back calf, then hold.',
      'Switch legs and repeat.',
    ],
    tips: [
      'Point the toes of your back foot straight ahead.',
      'Keep your back heel pressed into the floor.',
      'Bend your back knee slightly to move the stretch lower down the calf.',
    ],
  },
  {
    id: 'cat-cow',
    name: 'Cat-cow',
    category: 'stretch',
    tags: ['yoga', 'warmup'],
    muscles: ['lowerBack', 'upperBack', 'abs'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim('side', [key(cow, 1900, 250), key(cat, 1900, 250)], { props: mat(-0.85, 0.7), thumb: 1 }),
    summary: 'A flowing hands-and-knees movement that rounds and arches your back in time with your breath to warm up your spine.',
    steps: [
      'Start on your hands and knees with your wrists under your shoulders and knees under your hips.',
      'Inhale as you let your belly drop, lift your chest and look slightly forward.',
      'Exhale as you round your back toward the ceiling and tuck your chin.',
      'Keep flowing between the two shapes, moving with your breath.',
    ],
    tips: [
      'Move through your whole spine, from tailbone to head.',
      'Press the floor away as you round your back.',
      'Keep the arch gentle rather than squeezing your lower back.',
    ],
  },
  {
    id: 'butterfly-stretch',
    name: 'Butterfly stretch',
    category: 'stretch',
    tags: [],
    muscles: ['adductors', 'hipFlexors'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim('front', [key(butterflyUp, 1600, 100), key(butterflyDown, 1600, 300)], {
      props: mat(-0.7, 0.7),
      thumb: 1,
    }),
    summary: 'A seated stretch for the inner thighs and hips, done with the soles of your feet pressed together.',
    steps: [
      'Sit tall on the floor and bring the soles of your feet together.',
      'Draw your heels in toward you as far as is comfortable.',
      'Hold your feet or ankles and let your knees fall out to the sides.',
      'Breathe slowly and let your knees relax toward the floor each time you exhale.',
    ],
    tips: [
      'Sit up tall instead of slumping forward.',
      'Let gravity lower your knees rather than pushing them down.',
      'Sit on a folded towel if your back rounds.',
    ],
  },
  {
    id: 'shoulder-stretch',
    name: 'Cross-body shoulder stretch',
    category: 'stretch',
    tags: [],
    muscles: ['shoulders', 'upperBack'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: anim('front', [key(crossEasy, 1700, 200), key(crossPull, 1700, 300)], { thumb: 1 }),
    summary: 'A quick standing stretch for the back of the shoulder and upper back that you can do anywhere.',
    steps: [
      'Stand tall with your shoulders relaxed and down.',
      'Bring your left arm straight across your chest at shoulder height.',
      'Press your right forearm against your left arm, just above the elbow.',
      'Gently draw the arm toward your chest until you feel a stretch in the back of the shoulder.',
      'Hold, then switch arms.',
    ],
    tips: [
      'Keep both shoulders level and away from your ears.',
      'Press on the upper arm rather than the elbow joint.',
      'Keep your chest facing forward instead of twisting.',
    ],
  },
  {
    id: 'triceps-stretch',
    name: 'Overhead triceps stretch',
    category: 'stretch',
    tags: [],
    muscles: ['triceps', 'shoulders'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: anim('front', [key(tricepsEasy, 1700, 200), key(tricepsPull, 1700, 300)], { thumb: 1 }),
    summary: 'A standing stretch for the back of the upper arm and shoulder, ideal after pushing or pressing work.',
    steps: [
      'Stand tall and raise your left arm overhead.',
      'Bend your left elbow so your hand drops behind your head toward your upper back.',
      'Hold your left elbow with your right hand.',
      'Gently ease the elbow toward the back of your head until you feel a stretch along the back of your arm.',
      'Hold, then switch arms.',
    ],
    tips: [
      'Keep your head up and your neck relaxed.',
      'Brace your core lightly so your lower back does not arch.',
      'Use light pressure and ease off if your shoulder pinches.',
    ],
  },
  {
    id: 'side-bend',
    name: 'Standing side bend',
    category: 'stretch',
    tags: ['warmup'],
    muscles: ['obliques'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim(
      'front',
      [key(sideTall, 1200, 200), key(bendToLeft, 1400, 500), key(sideTall, 1200, 200), key(bendToRight, 1400, 500)],
      { thumb: 1 },
    ),
    summary: 'A standing stretch that bends you gently side to side to lengthen your waist and loosen up your torso.',
    steps: [
      'Stand tall with your feet hip-width apart and your arms by your sides.',
      'Reach your right arm up and over your head as you bend to the left.',
      'Slide your left hand down your thigh and pause in the stretch.',
      'Return to standing tall, then repeat to the right with your left arm overhead.',
      'Keep alternating sides with slow, controlled movements.',
    ],
    tips: [
      'Bend directly sideways without leaning forward or back.',
      'Keep both feet planted and your hips steady.',
      'Breathe out as you bend and in as you return.',
    ],
  },
  {
    id: 'knee-to-chest',
    name: 'Knee to chest',
    category: 'stretch',
    tags: [],
    muscles: ['lowerBack', 'glutes'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: anim('side', [key(kneeHugEasy, 1700, 200), key(kneeHugClose, 1700, 300)], {
      props: mat(-0.95, 1.05),
      thumb: 1,
    }),
    summary: 'A gentle lying stretch that hugs one knee toward your chest, targeting your glutes and lower back.',
    steps: [
      'Lie on your back with both legs long.',
      'Bend your left knee and draw it toward your chest.',
      'Wrap both hands around your shin, just below the knee.',
      'Gently hug the knee closer while your right leg stays long on the floor.',
      'Hold, breathing slowly, then switch legs.',
    ],
    tips: [
      'Keep your head and shoulders resting on the floor.',
      'Hold behind your thigh instead if your knee feels uncomfortable.',
      'Let your lower back relax into the mat.',
    ],
  },
]
