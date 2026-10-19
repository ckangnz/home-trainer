import { add, clamp, dir, scale, wrap180, type Vec2 } from './math'
import { RIG } from './rig'
import type { TrainerBuild } from './look'
import { ellipseOutline, limbOutline, localShape, localStroke, localToWorld, smoothClosed, smoothOpen, type Outline } from './shapes'
import type { Secondary } from './secondary'
import type { Part, Skeleton, Tone } from './types'

const LINE = 0.006

type Local = readonly Vec2[]

export function shape(id: string, outline: Outline, tone: Tone | null, outlineTone?: Tone, width = LINE): Part {
  return { kind: 'path', id, d: outline.d, points: outline.points, tone, outline: outlineTone, outlineWidth: outlineTone ? width : undefined }
}

function line(id: string, outline: Outline, tone: Tone, width: number): Part {
  return shape(id, outline, null, tone, width)
}

const HAIR_FLOOR = 0.008

function rebuilt(points: Vec2[], open: boolean): Outline {
  return { d: open ? smoothOpen(points) : smoothClosed(points), points }
}

export function restingOnFloor(outline: Outline, open = false): Outline {
  if (outline.points.every((point) => point[1] >= HAIR_FLOOR)) {
    return outline
  }
  return rebuilt(
    outline.points.map((point): Vec2 => (point[1] < HAIR_FLOOR ? [point[0], HAIR_FLOOR] : point)),
    open,
  )
}

function swung(outline: Outline, pivot: Vec2, degrees: number, open = false): Outline {
  if (degrees === 0) {
    return outline
  }
  const turn = dir(degrees)
  return rebuilt(
    outline.points.map((point): Vec2 => {
      const dx = point[0] - pivot[0]
      const dy = point[1] - pivot[1]
      return [pivot[0] + dx * turn[0] - dy * turn[1], pivot[1] + dx * turn[1] + dy * turn[0]]
    }),
    open,
  )
}

function shifted(outline: Outline, offset: Vec2, open = false): Outline {
  if (offset[0] === 0 && offset[1] === 0) {
    return outline
  }
  return rebuilt(
    outline.points.map((point) => add(point, offset)),
    open,
  )
}

function symmetric(half: Local): Vec2[] {
  const mirrored = half
    .slice()
    .reverse()
    .filter((point) => Math.abs(point[0]) > 1e-9)
    .map((point): Vec2 => [-point[0], point[1]])
  return [...half, ...mirrored]
}

function mirrored(points: Local): Vec2[] {
  return points.map((point): Vec2 => [-point[0], point[1]])
}

function curly(rx: number, ry: number, bumps: number, depth: number, cx = 0, cy = 0): Vec2[] {
  return Array.from({ length: bumps * 2 }, (_, index) => {
    const angle = (Math.PI * index) / bumps
    const k = index % 2 === 0 ? 1 : 1 - depth
    return [cx + Math.cos(angle) * rx * k, cy + Math.sin(angle) * ry * k] as Vec2
  })
}

function sideHead(build: TrainerBuild): Vec2[] {
  const { rx, ry, jaw } = build.head
  const chin = 0.62 + jaw * 0.2
  return [
    [0.004, ry],
    [rx * 0.6, ry * 0.86],
    [rx * 0.9, ry * 0.5],
    [rx * 0.99, ry * 0.12],
    [rx * 0.98, -ry * 0.22],
    [rx * 0.93, -ry * 0.56],
    [rx * chin, -ry * 0.88],
    [rx * (chin - 0.3), -ry * 1.01],
    [rx * 0.06, -ry * 0.9],
    [-rx * 0.42, -ry * 0.62],
    [-rx * 0.9, -ry * 0.2],
    [-rx * 1.0, ry * 0.26],
    [-rx * 0.7, ry * 0.82],
  ]
}

function frontHead(build: TrainerBuild): Vec2[] {
  const { rx, ry, jaw } = build.head
  return symmetric([
    [0, ry],
    [rx * 0.72, ry * 0.8],
    [rx, ry * 0.2],
    [rx * 0.97, -ry * 0.26],
    [rx * (0.36 + jaw * 0.5), -ry * 0.72],
    [rx * 0.3, -ry * 0.97],
    [0, -ry],
  ])
}

interface HairSide {
  cap: Local
  shine: Local
  ear: boolean
}

interface HairFront {
  cap: Local
  shine: Local
}

const SIDE_HAIR: Record<TrainerBuild['hair'], HairSide> = {
  ponytail: {
    cap: [
      [0.074, 0.066],
      [0.04, 0.104],
      [-0.016, 0.121],
      [-0.07, 0.1],
      [-0.1, 0.046],
      [-0.1, -0.02],
      [-0.086, -0.06],
      [-0.058, -0.05],
      [-0.046, 0],
      [-0.022, 0.044],
      [0.018, 0.068],
      [0.054, 0.074],
    ],
    shine: [
      [0.04, 0.095],
      [-0.01, 0.11],
      [-0.06, 0.092],
    ],
    ear: true,
  },
  short: {
    cap: [
      [0.08, 0.056],
      [0.094, 0.092],
      [0.078, 0.128],
      [0.03, 0.142],
      [-0.03, 0.134],
      [-0.08, 0.106],
      [-0.102, 0.055],
      [-0.104, 0],
      [-0.09, -0.04],
      [-0.07, -0.022],
      [-0.052, 0.028],
      [-0.01, 0.062],
      [0.04, 0.066],
    ],
    shine: [
      [0.068, 0.118],
      [0.028, 0.13],
      [-0.03, 0.122],
    ],
    ear: true,
  },
  fade: {
    cap: [
      [0.08, 0.07],
      [0.058, 0.114],
      [0.0, 0.13],
      [-0.06, 0.12],
      [-0.096, 0.078],
      [-0.07, 0.074],
      [-0.01, 0.086],
      [0.05, 0.08],
    ],
    shine: [
      [0.045, 0.112],
      [0.0, 0.122],
      [-0.045, 0.114],
    ],
    ear: true,
  },
  bun: {
    cap: [
      [0.079, 0.06],
      [0.062, 0.1],
      [0.01, 0.124],
      [-0.05, 0.118],
      [-0.094, 0.075],
      [-0.104, 0.01],
      [-0.09, -0.035],
      [-0.07, -0.02],
      [-0.052, 0.03],
      [-0.01, 0.06],
      [0.045, 0.066],
    ],
    shine: [
      [0.058, 0.094],
      [0.0, 0.114],
      [-0.06, 0.1],
    ],
    ear: true,
  },
  puff: {
    cap: [
      [0.078, 0.058],
      [0.058, 0.1],
      [0.005, 0.122],
      [-0.055, 0.114],
      [-0.094, 0.068],
      [-0.1, 0.005],
      [-0.088, -0.035],
      [-0.068, -0.02],
      [-0.05, 0.025],
      [-0.01, 0.055],
      [0.045, 0.064],
    ],
    shine: [],
    ear: true,
  },
  wavy: {
    cap: [
      [0.082, 0.066],
      [0.052, 0.108],
      [-0.005, 0.127],
      [-0.066, 0.113],
      [-0.104, 0.062],
      [-0.114, -0.02],
      [-0.11, -0.1],
      [-0.09, -0.16],
      [-0.062, -0.13],
      [-0.052, -0.06],
      [-0.034, 0],
      [-0.008, 0.046],
      [0.036, 0.072],
    ],
    shine: [
      [0.05, 0.098],
      [-0.01, 0.114],
      [-0.07, 0.096],
      [-0.096, 0.03],
    ],
    ear: true,
  },
  bob: {
    cap: [
      [0.086, 0.054],
      [0.062, 0.106],
      [-0.004, 0.13],
      [-0.07, 0.114],
      [-0.112, 0.05],
      [-0.12, -0.03],
      [-0.11, -0.082],
      [-0.08, -0.1],
      [-0.03, -0.092],
      [0.014, -0.08],
      [0.002, -0.04],
      [-0.016, 0],
      [-0.004, 0.044],
      [0.044, 0.06],
    ],
    shine: [
      [0.05, 0.104],
      [-0.02, 0.118],
      [-0.08, 0.09],
      [-0.104, 0.03],
    ],
    ear: false,
  },
}

const FRONT_HAIR: Record<TrainerBuild['hair'], HairFront> = {
  ponytail: {
    cap: [
      [-0.093, 0.016],
      [-0.095, 0.06],
      [-0.07, 0.1],
      [-0.025, 0.12],
      [0.03, 0.119],
      [0.075, 0.1],
      [0.095, 0.06],
      [0.093, 0.016],
      [0.076, 0.048],
      [0.04, 0.071],
      [0.004, 0.079],
      [-0.044, 0.072],
      [-0.076, 0.046],
    ],
    shine: [
      [-0.05, 0.1],
      [-0.01, 0.112],
      [0.03, 0.11],
    ],
  },
  short: {
    cap: [
      [-0.095, 0.022],
      [-0.098, 0.074],
      [-0.07, 0.118],
      [-0.02, 0.136],
      [0.04, 0.142],
      [0.086, 0.12],
      [0.099, 0.074],
      [0.095, 0.022],
      [0.08, 0.058],
      [0.045, 0.078],
      [0.0, 0.082],
      [-0.045, 0.076],
      [-0.08, 0.056],
    ],
    shine: [
      [0.062, 0.124],
      [0.02, 0.13],
      [-0.03, 0.122],
    ],
  },
  fade: {
    cap: [
      [-0.076, 0.072],
      [-0.06, 0.115],
      [0, 0.132],
      [0.06, 0.115],
      [0.076, 0.072],
      [0.04, 0.084],
      [0, 0.088],
      [-0.04, 0.084],
    ],
    shine: [
      [-0.03, 0.118],
      [0.0, 0.124],
      [0.03, 0.118],
    ],
  },
  bun: {
    cap: [
      [-0.094, 0.02],
      [-0.096, 0.07],
      [-0.065, 0.112],
      [0, 0.126],
      [0.065, 0.112],
      [0.096, 0.07],
      [0.094, 0.02],
      [0.08, 0.06],
      [0.04, 0.08],
      [0, 0.084],
      [-0.04, 0.08],
      [-0.08, 0.06],
    ],
    shine: [
      [-0.04, 0.108],
      [0.0, 0.116],
      [0.04, 0.108],
    ],
  },
  puff: {
    cap: [
      [-0.093, 0.016],
      [-0.096, 0.066],
      [-0.066, 0.108],
      [0, 0.122],
      [0.066, 0.108],
      [0.096, 0.066],
      [0.093, 0.016],
      [0.078, 0.054],
      [0.04, 0.074],
      [0, 0.078],
      [-0.04, 0.074],
      [-0.078, 0.054],
    ],
    shine: [],
  },
  wavy: {
    cap: [
      [-0.096, -0.01],
      [-0.1, 0.06],
      [-0.072, 0.108],
      [-0.01, 0.13],
      [0.06, 0.12],
      [0.1, 0.07],
      [0.102, -0.01],
      [0.086, 0.03],
      [0.062, 0.062],
      [0.02, 0.078],
      [-0.03, 0.086],
      [-0.07, 0.06],
      [-0.088, 0.02],
    ],
    shine: [
      [-0.06, 0.104],
      [-0.02, 0.118],
      [0.03, 0.116],
    ],
  },
  bob: {
    cap: [
      [-0.118, -0.098],
      [-0.124, -0.01],
      [-0.108, 0.075],
      [-0.06, 0.122],
      [0, 0.132],
      [0.06, 0.122],
      [0.108, 0.075],
      [0.124, -0.01],
      [0.118, -0.098],
      [0.092, -0.102],
      [0.083, -0.03],
      [0.078, 0.03],
      [0.05, 0.046],
      [0.015, 0.04],
      [-0.02, 0.047],
      [-0.055, 0.042],
      [-0.078, 0.03],
      [-0.083, -0.03],
      [-0.092, -0.102],
    ],
    shine: [
      [0.03, 0.118],
      [0.075, 0.1],
      [0.1, 0.05],
    ],
  },
}

const PONYTAIL: Local = [
  [-0.07, 0.086],
  [-0.116, 0.1],
  [-0.166, 0.076],
  [-0.2, 0.012],
  [-0.206, -0.07],
  [-0.182, -0.13],
  [-0.157, -0.1],
  [-0.152, -0.032],
  [-0.127, 0.03],
  [-0.092, 0.056],
]

const PONYTAIL_SHINE: Local = [
  [-0.13, 0.078],
  [-0.172, 0.036],
  [-0.184, -0.04],
]

const TIE: Vec2 = [-0.1, 0.074]

const WAVES_SIDE: Local = [
  [0.0, 0.12],
  [-0.07, 0.116],
  [-0.12, 0.07],
  [-0.138, -0.02],
  [-0.128, -0.1],
  [-0.148, -0.18],
  [-0.13, -0.26],
  [-0.152, -0.33],
  [-0.1, -0.355],
  [-0.068, -0.3],
  [-0.078, -0.22],
  [-0.05, -0.15],
  [-0.02, -0.08],
  [0.0, 0.0],
]

const WAVES_SHINE: Local = [
  [-0.112, 0.04],
  [-0.12, -0.06],
  [-0.112, -0.14],
  [-0.124, -0.22],
]

const NAPE: Vec2 = [-0.06, -0.02]

const WAVES_FRONT: Local = symmetric([
  [0, 0.134],
  [0.078, 0.12],
  [0.124, 0.066],
  [0.138, -0.02],
  [0.132, -0.1],
  [0.15, -0.18],
  [0.136, -0.26],
  [0.12, -0.3],
  [0.07, -0.28],
  [0, -0.2],
])

const LOCK: Local = [
  [0.07, 0.07],
  [0.102, 0.03],
  [0.112, -0.04],
  [0.104, -0.12],
  [0.122, -0.2],
  [0.106, -0.27],
  [0.084, -0.23],
  [0.084, -0.15],
  [0.08, -0.07],
  [0.078, 0.0],
]

const BOB_BACK: Local = symmetric([
  [0, 0.134],
  [0.09, 0.112],
  [0.126, 0.04],
  [0.13, -0.05],
  [0.12, -0.1],
  [0.07, -0.104],
  [0, -0.06],
])

const FADE_SIDE: Local = [
  [0.079, 0.058],
  [0.052, 0.102],
  [0, 0.122],
  [-0.06, 0.112],
  [-0.097, 0.062],
  [-0.1, 0],
  [-0.088, -0.04],
  [-0.068, -0.025],
  [-0.05, 0.02],
  [-0.02, 0.045],
  [0.03, 0.054],
  [0.06, 0.054],
]

const FADE_FRONT: Local = [
  [-0.094, 0.0],
  [-0.096, 0.06],
  [-0.062, 0.11],
  [0, 0.122],
  [0.062, 0.11],
  [0.096, 0.06],
  [0.094, 0.0],
  [0.08, 0.042],
  [0.05, 0.07],
  [0, 0.076],
  [-0.05, 0.07],
  [-0.08, 0.042],
]

function sideBeard(build: TrainerBuild): Local {
  const { rx, ry, jaw } = build.head
  const chin = 0.62 + jaw * 0.2
  return [
    [0.012, 0.0],
    [0.03, -0.034],
    [0.056, -0.06],
    [rx * 0.86, -ry * 0.64],
    [rx * (chin + 0.04), -ry * 0.9],
    [rx * (chin - 0.3), -ry * 1.05],
    [rx * 0.04, -ry * 0.94],
    [-rx * 0.28, -ry * 0.56],
    [-0.018, 0.012],
  ]
}

function frontBeard(build: TrainerBuild): Local {
  const { rx, ry, jaw } = build.head
  return symmetric([
    [0, -ry * 0.31],
    [0.032, -ry * 0.36],
    [rx * 0.6, -ry * 0.38],
    [rx * 0.8, -ry * 0.02],
    [rx * 0.99, -ry * 0.02],
    [rx * 0.98, -ry * 0.3],
    [rx * (0.38 + jaw * 0.5), -ry * 0.76],
    [rx * 0.32, -ry * 1.02],
    [0, -ry * 1.05],
  ])
}

const BLINK_CLOSE = 0.88

const DRAPE_GAIN = 0.5

const DRAPE_LIMIT = 60

export interface HeadParts {
  back: Part[]
  behind: Part[]
  front: Part[]
}

function drapeAngle(skeleton: Skeleton): number {
  const hanging = skeleton.phi.head + 180
  return clamp(wrap180(-90 - hanging) * DRAPE_GAIN, -DRAPE_LIMIT, DRAPE_LIMIT)
}

export function headParts(skeleton: Skeleton, build: TrainerBuild, motion: Secondary): HeadParts {
  const p = skeleton.points
  const phiHead = skeleton.phi.head
  const rotation = phiHead - 90
  const center = p.head
  const female = build.gender === 'female'
  const neckTop = add(p.neck, scale(dir(phiHead), RIG.neck + 0.045))
  const neck = shape('neck', limbOutline(p.neck, neckTop, { r0: build.neck * 1.12, r1: build.neck }), 'skin')
  const eyeOpen = 1 - BLINK_CLOSE * motion.blink
  const hairLift = scale(dir(phiHead), motion.hair)
  const spot = (local: Vec2) => localToWorld(center, rotation, local)
  const outline = (local: Local) => localShape(center, rotation, local)
  const stroke = (local: Local) => localStroke(center, rotation, local)
  const browWidth = female ? 0.0075 : 0.0105
  const back: Part[] = []
  const behind: Part[] = []
  if (skeleton.view === 'side') {
    const { rx, ry } = build.head
    const style = SIDE_HAIR[build.hair] ?? SIDE_HAIR.short
    const front: Part[] = [
      neck,
      shape('nose', ellipseOutline(spot([rx * 0.95, -0.012]), 0.016, 0.02, rotation, 8), 'skin'),
      shape('head', outline(sideHead(build)), 'skin'),
    ]
    if (female) {
      front.push(shape('blush', ellipseOutline(spot([rx * 0.45, -0.034]), 0.017, 0.011, rotation, 8), 'blush'))
    }
    if (build.beard) {
      front.push(shape('beard', outline(sideBeard(build)), build.beard === 'full' ? 'hair' : 'hairFade'))
    }
    if (build.hair === 'ponytail') {
      const tie = spot(TIE)
      const swing = motion.ponytail
      behind.push(
        shape('ponytail', restingOnFloor(swung(outline(PONYTAIL), tie, swing)), 'hair'),
        line('ponytailShine', restingOnFloor(swung(stroke(PONYTAIL_SHINE), tie, swing, true), true), 'hairLight', 0.008),
        shape('hairTie', ellipseOutline(tie, 0.018, 0.022, rotation + 20, 8), 'accent'),
      )
    } else if (build.hair === 'wavy') {
      const nape = spot(NAPE)
      const swing = drapeAngle(skeleton) + motion.ponytail * 0.4
      behind.push(
        shape('hairBack', restingOnFloor(swung(outline(WAVES_SIDE), nape, swing)), 'hair'),
        line('hairBackShine', restingOnFloor(swung(stroke(WAVES_SHINE), nape, swing, true), true), 'hairLight', 0.009),
      )
    } else if (build.hair === 'bun') {
      const bunAt = add(spot([-0.056, 0.124]), scale(hairLift, 1.5))
      behind.push(
        shape('bun', restingOnFloor(ellipseOutline(bunAt, 0.044, 0.04, rotation + 30, 10)), 'hair'),
        line('bunShine', stroke([[-0.07, 0.15], [-0.05, 0.158], [-0.03, 0.15]]), 'hairLight', 0.007),
      )
    } else if (build.hair === 'puff') {
      const puff = shifted(localShape(center, rotation, curly(0.086, 0.07, 9, 0.12, -0.048, 0.142)), scale(hairLift, 2))
      behind.push(shape('puff', restingOnFloor(puff), 'hair'))
    } else if (build.hair === 'fade') {
      front.push(shape('hairFade', restingOnFloor(outline(FADE_SIDE)), 'hairFade'))
    }
    front.push(shape('hair', restingOnFloor(shifted(outline(style.cap), hairLift)), 'hair'))
    if (style.shine.length > 0) {
      front.push(line('hairShine', shifted(stroke(style.shine), hairLift, true), 'hairLight', 0.007))
    }
    if (build.hair === 'puff') {
      front.push(line('headband', stroke([[0.074, 0.074], [0.03, 0.104], [-0.03, 0.11], [-0.084, 0.08]]), 'accent', 0.02))
    }
    if (style.ear) {
      front.push(shape('ear', ellipseOutline(spot([-0.008, -0.004]), 0.014, 0.022, rotation, 8), 'skinFar'))
    }
    front.push(shape('eye', ellipseOutline(spot([rx * 0.57, 0.012]), female ? 0.009 : 0.0085, (female ? 0.0128 : 0.0118) * eyeOpen, rotation, 8), 'eye'))
    if (female) {
      front.push(line('lash', stroke([[rx * 0.6, 0.022], [rx * 0.68, 0.03]]), 'eye', 0.005))
    }
    front.push(
      line('brow', stroke(female ? [[0.036, 0.042], [0.051, 0.048], [0.068, 0.046]] : [[0.034, 0.043], [0.051, 0.046], [0.07, 0.044]]), 'hair', browWidth),
      line('mouth', stroke([[rx * 0.7, -ry * 0.52], [rx * 0.8, -ry * 0.56], [rx * 0.9, -ry * 0.51]]), 'lip', female ? 0.008 : 0.007),
    )
    return { back, behind: [...back, ...behind], front }
  }
  behind.push(
    neck,
    shape('earL', ellipseOutline(spot([build.head.rx - 0.002, -0.006]), 0.014, 0.023, rotation, 8), 'skinShade'),
    shape('earR', ellipseOutline(spot([-build.head.rx + 0.002, -0.006]), 0.014, 0.023, rotation, 8), 'skinShade'),
  )
  if (build.hair === 'ponytail') {
    behind.push(shape('ponytail', ellipseOutline(spot([0, 0.122]), 0.044, 0.032, rotation, 10), 'hair'))
  } else if (build.hair === 'bun') {
    behind.push(shape('bun', ellipseOutline(add(spot([0, 0.142]), scale(hairLift, 1.5)), 0.042, 0.036, rotation, 10), 'hair'))
  } else if (build.hair === 'puff') {
    behind.push(shape('puff', shifted(outline(curly(0.104, 0.074, 10, 0.12, 0, 0.162)), scale(hairLift, 2)), 'hair'))
  } else if (build.hair === 'wavy') {
    back.push(shape('hairBack', restingOnFloor(shifted(outline(WAVES_FRONT), hairLift)), 'hair'))
  } else if (build.hair === 'bob') {
    back.push(shape('hairBack', restingOnFloor(shifted(outline(BOB_BACK), hairLift)), 'hair'))
  }
  const style = FRONT_HAIR[build.hair] ?? FRONT_HAIR.short
  const front: Part[] = [shape('head', outline(frontHead(build)), 'skin')]
  if (female) {
    front.push(
      shape('blushL', ellipseOutline(spot([0.05, -0.03]), 0.016, 0.01, rotation, 8), 'blush'),
      shape('blushR', ellipseOutline(spot([-0.05, -0.03]), 0.016, 0.01, rotation, 8), 'blush'),
    )
  }
  if (build.beard) {
    front.push(shape('beard', outline(frontBeard(build)), build.beard === 'full' ? 'hair' : 'hairFade'))
  }
  if (build.hair === 'fade') {
    front.push(shape('hairFade', outline(FADE_FRONT), 'hairFade'))
  }
  front.push(shape('hair', shifted(outline(style.cap), hairLift), 'hair'))
  if (build.hair === 'wavy') {
    front.push(
      shape('lockL', shifted(outline(LOCK), hairLift), 'hair'),
      shape('lockR', shifted(outline(mirrored(LOCK)), hairLift), 'hair'),
    )
  }
  if (style.shine.length > 0) {
    front.push(line('hairShine', shifted(stroke(style.shine), hairLift, true), 'hairLight', 0.007))
  }
  if (build.hair === 'puff') {
    front.push(line('headband', stroke([[-0.096, 0.05], [-0.05, 0.092], [0, 0.104], [0.05, 0.092], [0.096, 0.05]]), 'accent', 0.02))
  }
  const eyeRx = female ? 0.009 : 0.0085
  const eyeRy = (female ? 0.0122 : 0.0112) * eyeOpen
  front.push(
    shape('eyeL', ellipseOutline(spot([0.033, 0.006]), eyeRx, eyeRy, rotation, 8), 'eye'),
    shape('eyeR', ellipseOutline(spot([-0.033, 0.006]), eyeRx, eyeRy, rotation, 8), 'eye'),
  )
  if (female) {
    front.push(
      line('lashL', stroke([[0.041, 0.014], [0.049, 0.02]]), 'eye', 0.0045),
      line('lashR', stroke([[-0.041, 0.014], [-0.049, 0.02]]), 'eye', 0.0045),
    )
  }
  const brow: Local = female
    ? [
        [0.018, 0.037],
        [0.033, 0.043],
        [0.05, 0.037],
      ]
    : [
        [0.017, 0.038],
        [0.033, 0.041],
        [0.05, 0.036],
      ]
  front.push(
    line('browL', stroke(brow), 'hair', browWidth),
    line('browR', stroke(mirrored(brow)), 'hair', browWidth),
    line('nose', stroke([[0.002, -0.004], [0.008, -0.022], [0, -0.028]]), 'skinShade', 0.006),
    line('mouth', stroke([[-0.022, -0.05], [0, -0.059], [0.022, -0.05]]), 'lip', female ? 0.008 : 0.007),
  )
  return { back, behind, front }
}
