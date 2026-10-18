import type { PoseSpec, Prop, View } from '@/figure/types'
import type { Exercise } from '../types'
import { FLOOR_SHIN, PRONE, anim, arms, flat, hand, key, legs, palm, pose } from '../kit'

function breathing(inhale: PoseSpec, exhale: PoseSpec, view: View, cycleMs = 3600, props?: Prop[]) {
  return anim(view, [key(inhale, cycleMs / 2), key(exhale, cycleMs / 2)], { props, thumb: 0 })
}

const dogInhale: PoseSpec = {
  root: [0, 0.86],
  torso: 140,
  spine: -3,
  neck: 4,
  ...arms(palm(0.67)),
  ...legs(flat(-0.416)),
}
const dogExhale = pose(dogInhale, { spine: -1, neck: 6 })

const cobraInhale = pose(PRONE, {
  torso: 70,
  spine: -36,
  neck: -30,
  ...legs([-16, 0, 90]),
  ...arms(palm(0.3)),
})
const cobraExhale = pose(cobraInhale, { spine: -31, neck: -28 })

const childExhale: PoseSpec = {
  torso: 98,
  spine: 14,
  neck: -19,
  ...legs([159, 151, 90]),
  anchor: { joint: 'kneeL', at: [0, FLOOR_SHIN] },
  ...arms(palm(0.649)),
}
const childInhale = pose(childExhale, { torso: 96, spine: 17, neck: -20, ...legs([157, 151, 90]) })

const warrior: PoseSpec = {
  root: [0, 0.677],
  torso: 0,
  legL: flat(0.508),
  legR: flat(-0.743),
  ...arms([90, 0]),
  scale: { footR: 0.5 },
}
const warriorExhale = pose(warrior, { root: [0.008, 0.668] })

const tree: PoseSpec = {
  root: [-0.04, 0.966],
  torso: 0,
  legR: flat(-0.11),
  legL: { at: [0.05, 0.72], angle: -90 },
  armL: hand([-0.015, 2.0], 90, -1),
  armR: hand([-0.065, 2.0], 90, -1),
  scale: { footL: 1.7, shinL: 0.9 },
}
const treeExhale = pose(tree, { armL: hand([-0.015, 1.988], 90, -1), armR: hand([-0.065, 1.988], 90, -1) })

const chair: PoseSpec = {
  root: [-0.2, 0.62],
  torso: 34,
  spine: -4,
  neck: -6,
  ...legs(flat(0)),
  ...arms([176, 0]),
}
const chairExhale = pose(chair, { root: [-0.2, 0.61] })

const triangle: PoseSpec = {
  root: [-0.13, 0.81],
  torso: 55,
  spine: 30,
  neck: -8,
  legL: flat(0.5175),
  legR: flat(-0.545),
  armL: hand([0.401, 0.222], -70),
  armR: [87, 0],
  scale: { footR: 0.5 },
}
const triangleExhale = pose(triangle, { neck: -12, armR: [89, 0] })

const DOG_MAT: Prop[] = [{ kind: 'mat', x0: -0.72, x1: 1.0 }]
const COBRA_MAT: Prop[] = [{ kind: 'mat', x0: -1.2, x1: 0.62 }]
const CHILD_MAT: Prop[] = [{ kind: 'mat', x0: -0.8, x1: 0.92 }]

export const YOGA: Exercise[] = [
  {
    id: 'downward-dog',
    name: 'Downward dog',
    category: 'yoga',
    tags: [],
    muscles: ['hamstrings', 'calves', 'shoulders', 'upperBack'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: breathing(dogInhale, dogExhale, 'side', 3600, DOG_MAT),
    summary: 'An upside-down V shape that stretches your hamstrings and calves while building strength in your shoulders and arms.',
    steps: [
      'Start on your hands and knees with your hands shoulder-width apart and your toes tucked under.',
      'Lift your knees off the floor and push your hips up and back into an upside-down V.',
      'Press the floor away through your whole hand and let your head relax between your upper arms.',
      'Straighten your legs as far as is comfortable and let your heels sink toward the floor.',
      'Breathe slowly while you hold, then lower your knees to the floor to come out.',
    ],
    tips: [
      'Bend your knees as much as you need to keep your back long rather than rounded.',
      'Your heels do not need to touch the floor; letting them sink toward it is enough.',
      'Spread your fingers wide and press through your thumbs and index fingers to ease pressure on your wrists.',
    ],
  },
  {
    id: 'cobra',
    name: 'Cobra pose',
    category: 'yoga',
    tags: ['stretch'],
    muscles: ['lowerBack', 'upperBack', 'chest', 'abs'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: breathing(cobraInhale, cobraExhale, 'side', 3600, COBRA_MAT),
    summary: 'A gentle backbend from lying face down that opens your chest and strengthens the muscles along your spine.',
    steps: [
      'Lie face down with your legs straight behind you and the tops of your feet on the mat.',
      'Place your palms flat under your shoulders and hug your elbows in toward your ribs.',
      'Press your hips and the tops of your feet into the mat as you lift your chest forward and up.',
      'Keep your elbows bent and close to your sides as your shoulders draw away from your ears.',
      'Hold for a few breaths, then lower your chest slowly back to the mat.',
    ],
    tips: [
      'Lift only as high as feels comfortable in your lower back; a low cobra still works.',
      'Lengthen through the crown of your head instead of tipping your head back.',
    ],
  },
  {
    id: 'childs-pose',
    name: "Child's pose",
    category: 'yoga',
    tags: ['stretch'],
    muscles: ['lowerBack', 'glutes', 'upperBack', 'shoulders'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: breathing(childInhale, childExhale, 'side', 4000, CHILD_MAT),
    summary: 'A restful kneeling fold that gently stretches your back, hips and shoulders and helps you slow your breathing.',
    steps: [
      'Kneel on the mat with your big toes touching and your knees about hip-width apart.',
      'Sit your hips back toward your heels.',
      'Walk your hands forward and fold your chest down over your thighs.',
      'Rest your forehead on the mat and reach your arms long with your palms down.',
      'Breathe slowly into your back and let your body soften with each exhale.',
    ],
    tips: [
      'Place a folded towel or cushion under your hips or forehead if they do not reach.',
      'Widen your knees to make more room for your belly and chest.',
    ],
  },
  {
    id: 'warrior-two',
    name: 'Warrior II',
    category: 'yoga',
    tags: [],
    muscles: ['quads', 'glutes', 'adductors', 'shoulders'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: breathing(warrior, warriorExhale, 'front', 3600),
    summary: 'A strong standing pose that builds leg strength and stamina while opening your hips and inner thighs.',
    steps: [
      'Step your feet wide apart and turn your left foot out so your toes point to the left.',
      'Turn your back foot in slightly and line up your front heel with the arch of your back foot.',
      'Bend your left knee until it is over your left ankle while your right leg stays straight.',
      'Reach your arms out at shoulder height with your palms down and look out over your left hand.',
      'Hold and breathe, then straighten your front leg and repeat on the other side.',
    ],
    tips: [
      'Keep your front knee pointing toward your middle toes rather than letting it drift inward.',
      'Stack your shoulders over your hips instead of leaning toward the front leg.',
      'Relax your shoulders away from your ears while your fingertips reach long.',
    ],
  },
  {
    id: 'tree-pose',
    name: 'Tree pose',
    category: 'yoga',
    tags: [],
    muscles: ['calves', 'abs', 'hipFlexors'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: breathing(tree, treeExhale, 'front', 3600),
    summary: 'A one-legged standing balance that improves steadiness and focus while strengthening your standing leg and core.',
    steps: [
      'Stand tall and shift your weight onto your right foot.',
      'Turn your left knee out and place the sole of your left foot on your inner right thigh or calf.',
      'Press your foot and leg gently into each other and keep your hips level.',
      'Bring your palms together at your chest or reach your arms overhead.',
      'Fix your gaze on one still point and breathe steadily, then switch legs.',
    ],
    tips: [
      'Place your foot above or below your knee, not against the knee joint itself.',
      'Rest your toes on the floor with your heel against your ankle if you need more support.',
      'A little wobbling is normal; keep coming back to your steady point.',
    ],
  },
  {
    id: 'chair-pose',
    name: 'Chair pose',
    category: 'yoga',
    tags: [],
    muscles: ['quads', 'glutes', 'shoulders', 'abs'],
    equipment: 'none',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: breathing(chair, chairExhale, 'side', 3600),
    summary: 'A standing squat hold that builds strength in your thighs, glutes and back while your arms reach overhead.',
    steps: [
      'Stand with your feet together or hip-width apart.',
      'Bend your knees and send your hips back as if you are sitting into a chair.',
      'Reach your arms up alongside your ears with your palms facing each other.',
      'Keep your weight toward your heels and your knees in line with your toes.',
      'Hold and breathe, then press through your feet to stand back up.',
    ],
    tips: [
      'Draw your lower belly in so your lower back does not over-arch.',
      'Sink only as low as you can while keeping your heels on the floor.',
    ],
  },
  {
    id: 'triangle-pose',
    name: 'Triangle pose',
    category: 'yoga',
    tags: [],
    muscles: ['hamstrings', 'obliques', 'adductors', 'quads'],
    equipment: 'none',
    level: 2,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: breathing(triangle, triangleExhale, 'front', 3600),
    summary: 'A wide-legged standing stretch that lengthens your hamstrings, hips and side body while building stable legs.',
    steps: [
      'Step your feet about a leg length apart and turn your left foot out to the left.',
      'Keep both legs straight without locking your knees and reach your arms out at shoulder height.',
      'Shift your hips back and reach your left hand out over your left leg as your torso tips sideways.',
      'Rest your left hand on your shin or ankle and stretch your right arm straight up.',
      'Hold and breathe, then press through your feet to rise and switch sides.',
    ],
    tips: [
      'Keep both sides of your waist long instead of collapsing over the front leg.',
      'Rest your hand higher on your leg if you need to, but avoid pressing on your knee.',
      'Look up at your top hand only if your neck feels comfortable.',
    ],
  },
]
