import type { Target } from '@/exercises/types'
import { DEFAULT_ROUTINE_DEFAULTS } from './routine'
import type { CuratedWorkout, RoutineDefaults, RoutineItem } from './types'

type Entry = string | [string, Target] | [string, Target, Partial<Omit<RoutineItem, 'id' | 'exerciseId' | 'target'>>]

function items(workoutId: string, entries: Entry[]): RoutineItem[] {
  return entries.map((entry, index) => {
    const [exerciseId, target, extra] = typeof entry === 'string' ? [entry, undefined, undefined] : entry
    const item: RoutineItem = { id: `${workoutId}-${index + 1}`, exerciseId, ...extra }
    if (target) {
      item.target = target
    }
    return item
  })
}

function defaults(overrides: Partial<RoutineDefaults>): RoutineDefaults {
  return { ...DEFAULT_ROUTINE_DEFAULTS, ...overrides }
}

const secs = (seconds: number): Target => ({ kind: 'time', seconds })
const reps = (count: number): Target => ({ kind: 'reps', reps: count })

export const CURATED_WORKOUTS: CuratedWorkout[] = [
  {
    id: 'classic-7-minute',
    name: 'Classic 7-Minute Workout',
    summary: 'The original 12-move circuit: 30 seconds of work, 10 seconds to switch.',
    description:
      'Based on the bodyweight circuit published by Klika and Jordan in ACSM’s Health & Fitness Journal (2013). Alternate muscle groups so one recovers while the next works, and repeat the circuit two or three times when you want a longer session.',
    level: 2,
    focus: ['fullBody', 'cardio'],
    defaults: defaults({ workSec: 30, restSec: 10, rounds: 1, roundRestSec: 60, getReadySec: 10, switchSec: 3 }),
    items: items('classic-7-minute', [
      'jumping-jacks',
      'wall-sit',
      'push-up',
      'crunch',
      'step-ups',
      'squat',
      'triceps-dips',
      'plank',
      'high-knees',
      'lunge',
      'push-up-rotation',
      ['side-plank', secs(15)],
    ]),
  },
  {
    id: 'hiit-cardio',
    name: 'HIIT Cardio Blast',
    summary: 'Eight fast-paced cardio moves to get your heart rate up, twice through.',
    description:
      'A sweaty interval session built from jumping and running drills. Go hard during each 30-second interval and use the 15-second breaks to breathe. Swap any jump for a march in place if you need a low-impact option.',
    level: 2,
    focus: ['cardio', 'fullBody'],
    defaults: defaults({ workSec: 30, restSec: 15, rounds: 2, roundRestSec: 60 }),
    items: items('hiit-cardio', ['jumping-jacks', 'high-knees', 'burpees', 'mountain-climbers', 'squat-jumps', 'skaters', 'butt-kicks', 'star-jumps']),
  },
  {
    id: 'abs-7-minute',
    name: '7-Minute Abs',
    summary: 'A focused core circuit hitting the front, sides, and deep stabilizers.',
    description:
      'Ten core exercises in a row with short breaks. Keep your lower back gently pressed toward the floor during the lying moves and breathe out as you curl or lift.',
    level: 2,
    focus: ['core'],
    defaults: defaults({ workSec: 30, restSec: 10, rounds: 1, switchSec: 3 }),
    items: items('abs-7-minute', [
      'crunch',
      'bicycle-crunch',
      'plank',
      'leg-raises',
      'russian-twists',
      'flutter-kicks',
      ['side-plank', secs(15)],
      'dead-bug',
      'reverse-crunch',
      'hollow-hold',
    ]),
  },
  {
    id: 'legs-and-glutes',
    name: 'Legs & Glutes',
    summary: 'Squats, lunges, and bridges to build strong legs and glutes.',
    description:
      'A lower-body strength circuit you can do anywhere. Move with control, keep your knees tracking over your toes, and repeat the circuit twice.',
    level: 2,
    focus: ['lowerBody'],
    defaults: defaults({ workSec: 40, restSec: 15, rounds: 2, roundRestSec: 60 }),
    items: items('legs-and-glutes', [
      ['squat', reps(15)],
      ['lunge', reps(12)],
      ['glute-bridge', reps(15)],
      ['sumo-squat', reps(15)],
      ['donkey-kicks', reps(12)],
      ['side-lunge', reps(12)],
      ['calf-raises', reps(20)],
      'wall-sit',
    ]),
  },
  {
    id: 'upper-body',
    name: 'Upper Body Burn',
    summary: 'Push-up variations, dips, and plank work for arms, chest, and back.',
    description:
      'No weights needed: your bodyweight and a sturdy chair are enough. Choose the knee or incline version of a push-up whenever form starts to slip.',
    level: 2,
    focus: ['upperBody'],
    defaults: defaults({ workSec: 30, restSec: 15, rounds: 2, roundRestSec: 60 }),
    items: items('upper-body', [
      'arm-circles',
      ['push-up', reps(10)],
      ['triceps-dips', reps(12)],
      'plank-shoulder-taps',
      ['incline-push-up', reps(10)],
      ['superman', reps(12)],
      ['plank-up-downs', reps(10)],
    ]),
  },
  {
    id: 'beginner-full-body',
    name: 'Beginner Full Body',
    summary: 'A gentle, low-impact circuit for getting started or coming back.',
    description:
      'Every move here keeps at least one foot on the floor. Work at a comfortable pace, rest longer if you need it, and add a second round once it feels easy.',
    level: 1,
    focus: ['fullBody'],
    defaults: defaults({ workSec: 30, restSec: 20, rounds: 1 }),
    items: items('beginner-full-body', [
      'march-in-place',
      'squat',
      'wall-push-up',
      'glute-bridge',
      'bird-dog',
      'reverse-lunge',
      'knee-push-up',
      'dead-bug',
      'calf-raises',
    ]),
  },
  {
    id: 'morning-stretch',
    name: 'Morning Stretch',
    summary: 'Wake up stiff joints with an easy flow from standing to the floor.',
    description:
      'Move slowly and breathe deeply. Stretch only to a comfortable tension, never to pain, and hold each position without bouncing.',
    level: 1,
    focus: ['stretch'],
    defaults: defaults({ workSec: 30, restSec: 5, rounds: 1, getReadySec: 5, switchSec: 3 }),
    items: items('morning-stretch', [
      'neck-tilts',
      'side-bend',
      'standing-forward-fold',
      ['quad-stretch', secs(20)],
      'cat-cow',
      'cobra',
      'childs-pose',
    ]),
  },
  {
    id: 'gentle-yoga',
    name: 'Gentle Yoga Flow',
    summary: 'Classic standing and floor poses for balance and flexibility.',
    description:
      'Hold each pose for several slow breaths. Use a wall nearby for the balance poses, and come out of any pose that feels uncomfortable.',
    level: 1,
    focus: ['yoga', 'stretch'],
    defaults: defaults({ workSec: 30, restSec: 5, rounds: 1, getReadySec: 5, switchSec: 3 }),
    items: items('gentle-yoga', ['chair-pose', 'warrior-two', 'triangle-pose', 'tree-pose', 'downward-dog', 'cobra', 'childs-pose']),
  },
  {
    id: 'five-minute-warm-up',
    name: '5-Minute Warm-up',
    summary: 'Loosen up and raise your temperature before any workout.',
    description:
      'Start slowly and build up the range of motion with each move. Finish with jumping jacks to get your heart rate up for the main session.',
    level: 1,
    focus: ['warmup'],
    defaults: defaults({ workSec: 30, restSec: 5, rounds: 1, getReadySec: 5, switchSec: 3 }),
    items: items('five-minute-warm-up', [
      'march-in-place',
      'arm-circles',
      'torso-twists',
      'hip-circles',
      ['leg-swings', secs(20)],
      ['toe-touches', reps(10)],
      'jumping-jacks',
    ]),
  },
  {
    id: 'cool-down',
    name: 'Cool-down Stretch',
    summary: 'Ease out of a hard session with long, calm stretches.',
    description:
      'Use this after any workout. Hold each stretch, breathe out slowly, and let your heart rate settle.',
    level: 1,
    focus: ['stretch'],
    defaults: defaults({ workSec: 30, restSec: 5, rounds: 1, getReadySec: 5, switchSec: 3 }),
    items: items('cool-down', [
      'standing-forward-fold',
      ['quad-stretch', secs(20)],
      ['hip-flexor-stretch', secs(20)],
      ['calf-stretch', secs(20)],
      'seated-hamstring-stretch',
      'butterfly-stretch',
      ['knee-to-chest', secs(20)],
      'childs-pose',
    ]),
  },
  {
    id: 'desk-break',
    name: 'Desk Break',
    summary: 'Five minutes beside your desk to undo hours of sitting.',
    description:
      'All you need is a sturdy chair. Do it between meetings to loosen your neck and shoulders and get your legs moving again.',
    level: 1,
    focus: ['stretch', 'warmup'],
    defaults: defaults({ workSec: 30, restSec: 10, rounds: 1, getReadySec: 5, switchSec: 3 }),
    items: items('desk-break', [
      'neck-tilts',
      ['shoulder-stretch', secs(20)],
      ['triceps-stretch', secs(20)],
      'side-bend',
      'torso-twists',
      ['squat', reps(12)],
      ['incline-push-up', reps(10)],
      ['calf-raises', reps(15)],
    ]),
  },
  {
    id: 'dumbbell-full-body',
    name: 'Dumbbell Full Body',
    summary: 'A classic strength session with a pair of dumbbells.',
    description:
      'Pick a weight you can lift for every rep with good form, with two or three reps left in the tank. Rest longer if you need it and keep your back flat on every hinge.',
    level: 2,
    focus: ['weights', 'fullBody'],
    defaults: defaults({ workSec: 40, restSec: 30, rounds: 3, roundRestSec: 90, getReadySec: 10 }),
    items: items('dumbbell-full-body', [
      ['kettlebell-goblet-squat', reps(10)],
      ['dumbbell-bench-press', reps(10)],
      ['bent-over-dumbbell-row', reps(10)],
      ['dumbbell-romanian-deadlift', reps(10)],
      ['dumbbell-shoulder-press', reps(10)],
      ['dumbbell-reverse-lunge', reps(12)],
    ]),
  },
  {
    id: 'barbell-strength',
    name: 'Barbell Strength',
    summary: 'The big barbell lifts in one focused session.',
    description:
      'Warm up with lighter sets first. Each exercise runs as three working sets, so take the full rest between sets and stop a set early if your form breaks down.',
    level: 3,
    focus: ['weights', 'lowerBody'],
    defaults: defaults({ workSec: 40, restSec: 60, rounds: 1, getReadySec: 10 }),
    items: items('barbell-strength', [
      ['barbell-back-squat', reps(6), { sets: 3, setRestSec: 90 }],
      ['barbell-bench-press', reps(6), { sets: 3, setRestSec: 90 }],
      ['barbell-row', reps(8), { sets: 3, setRestSec: 75 }],
      ['barbell-deadlift', reps(5), { sets: 2, setRestSec: 120 }],
    ]),
  },
  {
    id: 'full-body-stretch',
    name: 'Full-Body Stretch',
    summary: 'Ten minutes of head-to-toe stretching to unwind.',
    description:
      'Great after any workout or before bed. Breathe slowly, ease into each position, and never stretch into pain.',
    level: 1,
    focus: ['stretch', 'mobility'],
    defaults: defaults({ workSec: 30, restSec: 5, rounds: 1, getReadySec: 5, switchSec: 4 }),
    items: items('full-body-stretch', [
      'neck-side-stretch',
      'upper-back-hug-stretch',
      'wall-chest-stretch',
      'thread-the-needle',
      'worlds-greatest-stretch',
      'pigeon-pose',
      'lying-quad-stretch',
      'standing-hamstring-stretch',
      'figure-four-stretch',
      'childs-pose',
    ]),
  },
  {
    id: 'foam-roll-recovery',
    name: 'Foam Roll Recovery',
    summary: 'Roll out tight legs and back the day after a hard session.',
    description:
      'Roll slowly, pause on tender spots for a few breaths, and keep the pressure at a level you can relax into. Skip bony areas and the lower back.',
    level: 1,
    focus: ['recovery'],
    defaults: defaults({ workSec: 45, restSec: 10, rounds: 1, getReadySec: 5, switchSec: 5 }),
    items: items('foam-roll-recovery', [
      'foam-roller-calves',
      'foam-roller-hamstrings',
      'foam-roller-quads',
      'foam-roller-glutes',
      'foam-roller-hip-flexors',
      'foam-roller-upper-back',
      'foam-roller-thoracic-extension',
      'massage-ball-foot-roll',
    ]),
  },
  {
    id: 'mobility-flow',
    name: 'Daily Mobility Flow',
    summary: 'Loosen hips, spine, and shoulders in eight minutes.',
    description:
      'Move with control through a comfortable range. A good warm-up before training or a reset on rest days.',
    level: 1,
    focus: ['mobility', 'warmup'],
    defaults: defaults({ workSec: 40, restSec: 10, rounds: 1, getReadySec: 5, switchSec: 4 }),
    items: items('mobility-flow', [
      'wrist-circles',
      'wall-slides',
      'quadruped-thoracic-rotation',
      'downward-dog-pedal',
      'cossack-squat',
      'lizard-pose',
      'inchworm',
      'ankle-circles',
    ]),
  },
]

const byId = new Map(CURATED_WORKOUTS.map((workout) => [workout.id, workout]))

export function getCuratedWorkout(id: string): CuratedWorkout | undefined {
  return byId.get(id)
}
