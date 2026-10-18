import { RIG } from '@/figure/rig'
import type { Anchor, PoseSpec, Prop } from '@/figure/types'
import type { Exercise } from '../types'
import {
  FLOOR_SHIN,
  FOREARM_PLANK,
  LYING_HIP,
  SUPINE_FLAT,
  SUPINE_KNEES,
  anim,
  arms,
  breathe,
  foot,
  hand,
  key,
  legs,
  palm,
  pose,
} from '../kit'

function mat(x0: number, x1: number): Prop[] {
  return [{ kind: 'mat', x0, x1 }]
}

const crunchDown = pose(SUPINE_KNEES, arms([-7, 0]))
const crunchUp = pose(SUPINE_KNEES, { spine: 30, neck: 14 }, arms([36, 0]))

const crossedArms: PoseSpec = {
  ...arms([25, 155]),
  scale: { upperArmL: 0.85, upperArmR: 0.85, forearmL: 0.6, forearmR: 0.6, handL: 0.7, handR: 0.7 },
}
const sitDown = pose(SUPINE_KNEES, { neck: 4 }, crossedArms)
const sitCurl = pose(SUPINE_KNEES, { torso: -84, spine: 34, neck: 16 }, crossedArms)
const sitTop = pose(SUPINE_KNEES, { root: [0, 0.1], torso: 0, spine: 10, neck: 6 }, crossedArms)
const sitLower = pose(SUPINE_KNEES, { root: [0, 0.105], torso: -55, spine: 28, neck: 12 }, crossedArms)

const sidePlank: PoseSpec = {
  torso: 72,
  legL: [-2, 0, 80],
  legR: [-4, 0, 80],
  armL: [72, 90],
  armR: [108, 0],
  scale: { forearmL: 0.3, handL: 0.6 },
  anchor: { joint: 'elbowL', at: [0.6, 0.045] },
}

const bikeBase: PoseSpec = { root: [0, LYING_HIP], torso: -90, spine: 32, neck: 12 }
const bikeLeftKnee = pose(bikeBase, {
  legL: [115, 110, 20],
  legR: [18, 4, 30],
  armL: [145, 115],
  armR: [120, 140],
  scale: { upperArmL: 0.7, forearmL: 0.75, handL: 0.6, upperArmR: 0.8, forearmR: 0.8, handR: 0.6 },
})
const bikeRightKnee = pose(bikeBase, {
  legL: [18, 4, 30],
  legR: [115, 110, 20],
  armL: [120, 140],
  armR: [145, 115],
  scale: { upperArmL: 0.8, forearmL: 0.8, handL: 0.6, upperArmR: 0.7, forearmR: 0.75, handR: 0.6 },
})

const raiseArms = arms(palm(0.087))
const raiseDown = pose(SUPINE_FLAT, raiseArms, legs([6, 0, 10]))
const raiseUp = pose(SUPINE_FLAT, raiseArms, legs([90, 0, 10]))

const flutterBase = pose(SUPINE_FLAT, { spine: 14, neck: 10 }, arms(palm(0.083)))
const flutterLeftUp = pose(flutterBase, { legL: [18, 2, 40], legR: [6, 2, 40] })
const flutterRightUp = pose(flutterBase, { legL: [6, 2, 40], legR: [18, 2, 40] })

const twistBase: PoseSpec = {
  root: [0, 0.1],
  torso: -48,
  spine: 10,
  neck: 12,
  ...legs([97, 80, 25]),
}
const twistNear = pose(twistBase, {
  neck: 18,
  armL: hand([-0.1, 0.13], -100),
  armR: hand([-0.1, 0.13], -100, -1),
  scale: { upperArmL: 0.72, forearmL: 0.72, handL: 0.85, upperArmR: 0.9, forearmR: 0.85, handR: 0.8 },
})
const twistCenter = pose(twistBase, arms([55, 14, 0]))
const twistFar = pose(twistBase, {
  neck: 18,
  armL: hand([-0.1, 0.13], -100, -1),
  armR: hand([-0.1, 0.13], -100),
  scale: { upperArmL: 0.9, forearmL: 0.85, handL: 0.8, upperArmR: 0.72, forearmR: 0.72, handR: 0.85 },
})

const bugStart = pose(SUPINE_FLAT, { neck: 4 }, arms([90, 0]), legs([90, 90, 10]))
const bugLeftArm = pose(bugStart, { armL: [176, 0], legR: [10, 0, 10] })
const bugRightArm = pose(bugStart, { armR: [176, 0], legL: [10, 0, 10] })

const dogHipHeight = FLOOR_SHIN + RIG.thigh
const dogBase: PoseSpec = {
  root: [-0.1, dogHipHeight],
  torso: 77,
  neck: -14,
  ...legs(foot([-0.1 - RIG.shin, FLOOR_SHIN], 180)),
  ...arms(palm(0.36)),
}
const dogLeftLeg = pose(dogBase, { legL: foot([-0.968, dogHipHeight], -115), armR: hand([0.95, 0.6], 0) })
const dogRightLeg = pose(dogBase, { legR: foot([-0.968, dogHipHeight], -115), armL: hand([0.95, 0.6], 0) })

const neckDown: Anchor = { joint: 'neck', at: [-(RIG.lowerSpine + RIG.upperSpine), LYING_HIP] }
const reverseDown = pose(SUPINE_FLAT, { anchor: neckDown }, arms([-7, 0]), legs([90, 100, 10]))
const reverseUp = pose(reverseDown, { torso: -112, spine: 22 }, legs([118, 105, 10]))

const vDown = pose(SUPINE_FLAT, arms([187, 0]), legs([-2, 0, 20]))
const vUp = pose(SUPINE_FLAT, { root: [0, 0.1], torso: -40, spine: 20, neck: 10 }, arms([95, 0]), legs([108, 0, 30]))

const hollow = pose(SUPINE_FLAT, { spine: 15, neck: 8 }, arms([182, 0]), legs([13, 0, 35]))

export const CORE: Exercise[] = [
  {
    id: 'crunch',
    name: 'Abdominal crunch',
    category: 'core',
    tags: [],
    muscles: ['abs'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 15 },
    animation: anim('side', [key(crunchDown, 900, 100), key(crunchUp, 900, 150)], { props: mat(-1, 0.75), thumb: 1 }),
    summary: 'A short, controlled curl of your head and shoulders off the floor that strengthens the muscles at the front of your core.',
    steps: [
      'Lie on your back with your knees bent and your feet flat on the floor, hip-width apart.',
      'Rest your arms by your sides.',
      'Breathe out and curl your head and shoulder blades off the floor, reaching your hands toward your knees.',
      'Pause for a moment, then lower back down with control.',
    ],
    tips: [
      'Keep your lower back in contact with the floor.',
      'Leave a fist-sized gap between your chin and chest.',
      'Lift from your abs rather than jerking your head forward.',
    ],
  },
  {
    id: 'sit-up',
    name: 'Sit-up',
    category: 'core',
    tags: [],
    muscles: ['abs', 'hipFlexors'],
    equipment: 'mat',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim(
      'side',
      [key(sitDown, 1000, 150), key(sitCurl, 500), key(sitTop, 800, 150), key(sitLower, 700)],
      { props: mat(-1, 0.75), thumb: 3 },
    ),
    summary: 'A full curl from lying flat to sitting upright that builds strength through your abs and hip flexors.',
    steps: [
      'Lie on your back with your knees bent, feet flat and arms crossed over your chest.',
      'Tuck your chin slightly and curl your head and shoulders off the floor.',
      'Keep curling up until you are sitting tall, with your feet still flat on the floor.',
      'Roll back down slowly, one section of your spine at a time.',
    ],
    tips: [
      'Tuck your feet under a sturdy sofa if they lift off the floor.',
      'Rise smoothly instead of swinging up with momentum.',
      'Breathe out on the way up and in on the way down.',
    ],
  },
  {
    id: 'plank',
    name: 'Forearm plank',
    category: 'core',
    tags: ['fullBody'],
    muscles: ['abs', 'obliques', 'shoulders', 'glutes'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: breathe(FOREARM_PLANK, 'side', 3600, mat(-1, 0.95)),
    summary: 'A forearm hold that trains your whole core to keep your body in one long, straight line.',
    steps: [
      'Place your elbows on the floor directly under your shoulders, forearms pointing forward.',
      'Step your feet back and rise onto your toes so your body forms a straight line from head to heels.',
      'Brace your abs and squeeze your glutes.',
      'Hold the position while breathing steadily.',
    ],
    tips: [
      'Keep your hips level, neither sagging nor piking up.',
      'Look at the floor just ahead of your hands to keep your neck long.',
      'Drop to your knees if you need to hold good form.',
    ],
  },
  {
    id: 'side-plank',
    name: 'Side plank',
    category: 'core',
    tags: [],
    muscles: ['obliques', 'abs', 'shoulders', 'glutes'],
    equipment: 'mat',
    level: 2,
    impact: 'low',
    sided: 'perSide',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: breathe(sidePlank, 'front', 3200, mat(-0.95, 0.85)),
    summary: 'A side-lying hold on one forearm that strengthens your obliques and the muscles along the side of your hips.',
    steps: [
      'Lie on your side with your bottom elbow directly under your shoulder and your legs stacked.',
      'Lift your hips until your body forms a straight line from head to feet.',
      'Reach your top arm toward the ceiling or rest your hand on your hip.',
      'Hold while breathing steadily, then switch sides.',
    ],
    tips: [
      'Push the floor away with your forearm so your shoulder does not sink.',
      'Keep your hips stacked and lifted.',
      'Bend your bottom knee to the floor for an easier version.',
    ],
  },
  {
    id: 'bicycle-crunch',
    name: 'Bicycle crunches',
    category: 'core',
    tags: [],
    muscles: ['obliques', 'abs'],
    equipment: 'mat',
    level: 2,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim('side', [key(bikeLeftKnee, 650, 80), key(bikeRightKnee, 650, 80)], { props: mat(-1, 0.95), thumb: 0 }),
    summary: 'A pedaling crunch that brings each elbow toward the opposite knee to work your obliques and abs.',
    steps: [
      'Lie on your back with your fingertips lightly behind your head.',
      'Lift your shoulders off the floor and raise your knees over your hips.',
      'Drive one knee toward your chest as you straighten the other leg and turn your opposite elbow toward the bent knee.',
      'Switch sides in a smooth pedaling motion.',
    ],
    tips: [
      'Rotate from your rib cage rather than pulling on your head.',
      'Keep your lower back pressed into the floor.',
      'Slow down to make each twist count.',
    ],
  },
  {
    id: 'leg-raises',
    name: 'Leg raises',
    category: 'core',
    tags: [],
    muscles: ['abs', 'hipFlexors'],
    equipment: 'mat',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(raiseDown, 1600, 250), key(raiseUp, 1300, 200)], { props: mat(-1, 1.05), thumb: 1 }),
    summary: 'A lying lift of both straight legs that builds strength in your lower abs and hip flexors.',
    steps: [
      'Lie on your back with your legs straight and your arms by your sides, palms down.',
      'Press your lower back into the floor and brace your abs.',
      'Keeping your legs straight, lift them until they point at the ceiling.',
      'Lower them slowly until your heels hover just above the floor, then lift again.',
    ],
    tips: [
      'Stop lowering at the point where your lower back starts to arch.',
      'Soften your knees slightly if your hamstrings feel tight.',
      'Breathe out as you lift.',
    ],
  },
  {
    id: 'flutter-kicks',
    name: 'Flutter kicks',
    category: 'core',
    tags: [],
    muscles: ['abs', 'hipFlexors'],
    equipment: 'mat',
    level: 2,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim('side', [key(flutterLeftUp, 420), key(flutterRightUp, 420)], { props: mat(-1, 1.05), thumb: 0 }),
    summary: 'Small, quick alternating kicks with your legs held low that build endurance in your abs and hip flexors.',
    steps: [
      'Lie on your back with your legs straight and your arms by your sides.',
      'Lift your head and shoulders slightly and raise both legs a few inches off the floor.',
      'Kick your legs up and down in small, quick alternating movements.',
      'Keep kicking for the set time while breathing steadily.',
    ],
    tips: [
      'Keep your lower back pressed into the floor.',
      'Raise your legs a little higher if your back starts to arch.',
      'Kick from your hips with long legs and pointed toes.',
    ],
  },
  {
    id: 'russian-twists',
    name: 'Russian twists',
    category: 'core',
    tags: [],
    muscles: ['obliques', 'abs'],
    equipment: 'mat',
    level: 2,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'time', seconds: 30 },
    animation: anim(
      'side',
      [key(twistNear, 400, 100), key(twistCenter, 400), key(twistFar, 400, 100), key(twistCenter, 400)],
      { props: mat(-0.6, 0.95), thumb: 2 },
    ),
    summary: 'A seated twist that sweeps your hands from side to side while you balance in a V shape to work your obliques.',
    steps: [
      'Sit with your knees bent and lean back until you feel your abs working.',
      'Lift your feet off the floor and bring your hands together in front of your chest.',
      'Rotate your torso to one side and bring your hands down beside your hip.',
      'Twist back through the center to the other side and keep alternating.',
    ],
    tips: [
      'Turn your shoulders, not just your arms.',
      'Keep your chest lifted and your back long.',
      'Keep your heels on the floor for an easier version.',
    ],
  },
  {
    id: 'dead-bug',
    name: 'Dead bug',
    category: 'core',
    tags: ['warmup'],
    muscles: ['abs', 'obliques'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim(
      'side',
      [key(bugStart, 1100, 250), key(bugLeftArm, 1200, 300), key(bugStart, 1100, 250), key(bugRightArm, 1200, 300)],
      { props: mat(-1.25, 1.05), thumb: 1 },
    ),
    summary: 'A slow, controlled move that extends opposite limbs while you lie on your back to train core stability.',
    steps: [
      'Lie on your back with your arms pointing at the ceiling and your knees bent at 90 degrees over your hips.',
      'Gently press your lower back into the floor.',
      'Slowly lower one arm overhead and straighten the opposite leg until both hover just above the floor.',
      'Return to the start and repeat with the other arm and leg.',
    ],
    tips: [
      'Breathe out as you extend.',
      'Keep your lower back on the floor the whole time.',
      'Shorten the reach if your back starts to arch.',
    ],
  },
  {
    id: 'bird-dog',
    name: 'Bird dog',
    category: 'core',
    tags: ['warmup'],
    muscles: ['lowerBack', 'glutes', 'abs'],
    equipment: 'mat',
    level: 1,
    impact: 'low',
    sided: 'alternating',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim(
      'side',
      [key(dogBase, 1000, 200), key(dogLeftLeg, 1100, 600), key(dogBase, 1000, 200), key(dogRightLeg, 1100, 600)],
      { props: mat(-0.75, 0.75), thumb: 1 },
    ),
    summary: 'An all-fours balance move that extends the opposite arm and leg to train your back, glutes and core together.',
    steps: [
      'Kneel on all fours with your hands under your shoulders and your knees under your hips.',
      'Brace your core so your back stays flat.',
      'Reach one arm forward and the opposite leg back until both are level with your body.',
      'Pause, return to the start and switch sides.',
    ],
    tips: [
      'Keep your hips square to the floor.',
      'Reach long rather than lifting high.',
      'Move slowly to stay balanced.',
    ],
  },
  {
    id: 'reverse-crunch',
    name: 'Reverse crunch',
    category: 'core',
    tags: [],
    muscles: ['abs', 'hipFlexors'],
    equipment: 'mat',
    level: 2,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 12 },
    animation: anim('side', [key(reverseDown, 1200, 150), key(reverseUp, 1000, 200)], { props: mat(-1, 0.75), thumb: 1 }),
    summary: 'A curl that lifts your hips off the floor and draws your knees toward your chest to work your abs.',
    steps: [
      'Lie on your back with your arms by your sides and lift your legs so your knees are bent over your hips.',
      'Use your abs to curl your hips off the floor and draw your knees toward your chest.',
      'Pause, then slowly lower your hips back to the floor.',
      'Repeat without letting your legs swing.',
    ],
    tips: [
      'Press your palms into the floor for stability.',
      'Lift with your abs, not momentum.',
      'Keep your upper back and head relaxed on the floor.',
    ],
  },
  {
    id: 'v-ups',
    name: 'V-ups',
    category: 'core',
    tags: [],
    muscles: ['abs', 'hipFlexors'],
    equipment: 'mat',
    level: 3,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'reps', reps: 10 },
    animation: anim('side', [key(vDown, 1100, 250), key(vUp, 900, 200)], { props: mat(-1.3, 1.05), thumb: 1 }),
    summary: 'An advanced move that lifts your straight legs and torso at the same time so your body folds into a V.',
    steps: [
      'Lie flat on your back with your legs straight and your arms extended overhead.',
      'Brace your abs and lift your legs and upper body at the same time.',
      'Reach your hands toward your feet as you balance on your hips.',
      'Lower back down with control until you are lying flat again.',
    ],
    tips: [
      'Breathe out as you fold up.',
      'Keep your legs straight and together.',
      'Bend your knees slightly to make it easier.',
    ],
  },
  {
    id: 'hollow-hold',
    name: 'Hollow body hold',
    category: 'core',
    tags: [],
    muscles: ['abs', 'obliques', 'hipFlexors'],
    equipment: 'mat',
    level: 3,
    impact: 'low',
    sided: 'symmetric',
    defaultTarget: { kind: 'time', seconds: 20 },
    animation: breathe(hollow, 'side', 3600, mat(-1.25, 1.05)),
    summary: 'A gymnastics-style hold where you hover your shoulders and legs off the floor to build total core tension.',
    steps: [
      'Lie on your back with your arms extended overhead and your legs straight.',
      'Press your lower back firmly into the floor.',
      'Lift your shoulders, arms and legs a few inches off the floor so your body forms a shallow curve.',
      'Hold the position while breathing steadily.',
    ],
    tips: [
      'If your lower back lifts, raise your legs higher or bend your knees.',
      'Keep your arms close to your ears.',
      'Point your toes and squeeze your legs together.',
    ],
  },
]
