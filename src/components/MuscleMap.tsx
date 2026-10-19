import { muscleLevel, topMuscles, type MapMuscle, type MuscleLevel, type MuscleLoad } from '@/exercises/muscles'
import { useLabels, useT, type Labels, type TFunction } from '@/i18n'
import './muscle-map.css'

interface MuscleMapProps {
  load: MuscleLoad
  size?: 'sm' | 'md' | 'lg'
  label?: string
  legend?: boolean
  className?: string
}

type RegionPaths = Partial<Record<MapMuscle, string[]>>

const MIRROR = 'matrix(-1 0 0 1 200 0)'

const BODY_HALF =
  'M101 57L90.5 57C90.5 63 89.5 67.5 86 70C78 73 66 74 58 77C48 80 43 90 43 102C42 118 38 136 36 152C34 162 31 176 29 192C27 206 25 218 24 230C22 240 21 252 25 258C29 262 34 258 35 250C37 242 38 236 39 230C42 214 47 196 51 180C54 166 56 152 58 138C59 128 62 120 66 116C68 134 70 150 70 166C70 180 68 192 67 204C64 220 62 236 62 252C62 280 64 310 68 334C69 344 68 354 68 364C67 380 68 398 71 416C72 424 70 432 66 438C64 442 70 445 80 444C88 444 90 440 89 432C88 422 89 410 90 396C92 380 92 366 91 356C91 346 92 336 93 326C96 300 98 272 99 248L101 246Z'

const DELTOID = 'M60 78.5C50.5 80.5 45.5 90 45.5 103C46 110 48.5 115.5 51.5 119.5C56 112 60 101 63.5 92C64.5 86 63 81.5 60 78.5Z'

const FOREARM = 'M44 170C48.5 170 50 175.5 49 183C47.5 197 43.5 211 39.5 223.5C36 224.5 31.5 224 28.5 222C28.5 208 30 192 33 180C35 173.5 39 170 44 170Z'

const FRONT: RegionPaths = {
  neck: ['M91.5 57L99 57L99 71C95.5 70 92.5 68.5 89.5 66.5C91 63.5 91.5 60.5 91.5 57Z'],
  traps: ['M88 68.5C84.5 71.5 76 74 64 76.5C71 78.5 81 78.5 92.5 76.5C91 74 89.5 71.5 88 68.5Z'],
  shoulders: [DELTOID],
  chest: ['M99.3 80C90 78.5 78 78.5 66.5 82C63 90 63 101 66.5 111.5C74 119.5 87 123.5 99.3 122Z'],
  biceps: ['M48.5 121C53 120 56.5 125 56.5 131C55.5 143 52.5 155 48 165C43.5 163 40 157 39.5 149C39.5 137 43 125 48.5 121Z'],
  forearms: [FOREARM],
  abs: [
    'M88.5 127C92 125.5 96 125.5 99.3 126L99.3 145L89 146C88 140 88 133 88.5 127Z',
    'M89 149L99.3 148.5L99.3 167L89 168C88.5 162 88.5 155 89 149Z',
    'M89 171L99.3 170.5L99.3 189.5L89.5 190.5C89 184 89 177 89 171Z',
    'M89.5 193.5L99.3 193L99.3 232C94.5 226 91 214 89.5 193.5Z',
  ],
  obliques: ['M70.5 122C76.5 122.5 82 126 85.5 132C86 154 86 178 87 199C82 204.5 76 207.5 70.5 205.5C72.5 190 73 172 72.5 158C72 145 71 133 70.5 122Z'],
  hipFlexors: ['M80 210.5C84 212.5 88.5 221 92 231.5C94 237.5 96 241.5 98 244C92 244 86 240 82 234C79 226 78 218 80 210.5Z'],
  abductors: ['M68.5 208C72.5 210.5 76 216.5 77 226C76 236 72 245 66 251.5C64.5 240 65 224 68.5 208Z'],
  quads: [
    'M69.5 252C73.5 266 76 290 76 312C76 320 75.5 327 74 332C70 331 67.5 327 66.5 321C64 301 63.5 279 64.5 260C65.5 255.5 67.5 253 69.5 252Z',
    'M80.5 238.5C85.5 250 88 268 88 290C88 304 85.5 317 82 327.5C79.5 323 78.5 313 78.5 301C78 281 76.5 264 73 249.5C75 244 77.5 240.5 80.5 238.5Z',
    'M90.5 285C94.5 295 95.5 314 93 330C90.5 334.5 86.5 334.5 84.5 331.5C86.5 322 88.5 304 90.5 285Z',
  ],
  adductors: ['M93 247C96 247 98 248 99 250C98 264 96.5 274 94.5 282C92 272 90.5 263 90 254C90.5 250.5 91.5 248 93 247Z'],
  calves: [
    'M73.5 359C78 357 83.5 359.5 85.5 365C86 384 84 402 81 421C78 422.5 75 422 73.5 419.5C70 400 69.5 378 73.5 359Z',
    'M88.5 360C91.5 371 91.5 388 89 402C87.5 392 87 374 88.5 360Z',
  ],
}

const BACK: RegionPaths = {
  neck: ['M91.5 57L99.3 57L99.3 66C95.5 65.5 93 64.5 90.5 63C91 61 91.5 59 91.5 57Z'],
  traps: ['M89.5 65C87.5 69.5 78 73 63.5 76.5C72 82 80 90 86 104C90 120 94.5 136 99.3 150L99.3 68.5C95 68 92 67 89.5 65Z'],
  shoulders: [DELTOID],
  upperBack: ['M65.5 82C72 87 78.5 94 83.5 106C86 116 87.5 124 88 131C84 134.5 78 135.5 72.5 132.5C68.5 128 66.5 121 66 114C65 104 65 92 65.5 82Z'],
  lats: ['M67.5 121C69.5 128.5 72.5 134 76.5 137C81.5 139.5 86.5 138 90 135C92 146 91.5 160 88.5 174C85.5 188 80.5 197 73 203C72 186 72.5 170 72 156C71 142 69.5 131 67.5 121Z'],
  lowerBack: ['M94.5 156C96.5 154.5 99.3 153 99.3 152.5L99.3 228C95 226 91.5 222 90 214C89.5 196 91 174 94.5 156Z'],
  triceps: ['M48.5 117C53.5 117.5 56.5 124 56.5 131C55.5 143 52.5 155 48 165C43.5 163 40 157 39.5 149C39.5 136 42.5 122 48.5 117Z'],
  forearms: [FOREARM],
  abductors: ['M70.5 205.5C75 206 80.5 208 85 211.5C77 213 71 216.5 66.5 222C67 215.5 68.5 210 70.5 205.5Z'],
  glutes: ['M99.3 231C96 224 88 216.5 76 215C68.5 216.5 64.5 226 64.5 240C65.5 252 72 259.5 84 260.5C90 260.5 95 259 99.3 256Z'],
  hamstrings: [
    'M67.5 266C72 262.5 77.5 263 81 266C81 290 80.5 312 80 333C77 333.5 74 332 71.5 328C68.5 310 66.5 288 67.5 266Z',
    'M83.5 266C88 266 94 268 96.5 272C95.5 292 93 314 89 333C87 335 85 335 83 334C83 312 83 288 83.5 266Z',
  ],
  calves: [
    'M71.5 350C75.5 347.5 80 349.5 81 356C81.5 374 80.5 392 78 406C73.5 404 70.5 395 69.5 382C69 368 69.5 356 71.5 350Z',
    'M84 351C88.5 349 91.5 353.5 92 362C92.5 378 90.5 395 86 408C84 398 83 382 83 366C83 359 83 354 84 351Z',
  ],
}

const VIEWS = [
  { id: 'front', regions: FRONT, x: 0 },
  { id: 'back', regions: BACK, x: 170 },
] as const

const LEVEL_KEY = ['none', 'light', 'moderate', 'strong'] as const

function Half({ d }: { d: string }) {
  return (
    <>
      <path d={d} />
      <path d={d} transform={MIRROR} />
    </>
  )
}

function regionTitle(t: TFunction, labels: Labels, muscle: MapMuscle, level: MuscleLevel): string {
  return t('app.components.muscleMap.region', { muscle: labels.muscle[muscle], level: t(`app.components.muscleMap.levelsLower.${LEVEL_KEY[level]}`) })
}

export function MuscleMap({ load, size = 'md', label: labelProp, legend = false, className }: MuscleMapProps) {
  const t = useT()
  const labels = useLabels()
  const label = labelProp ?? t('app.components.muscleMap.label')
  const worked = topMuscles(load)
  const summary = worked.length
    ? t('app.components.muscleMap.summary', { label, muscles: worked.map((share) => labels.muscle[share.muscle]).join(', ') })
    : t('app.components.muscleMap.none', { label })
  return (
    <figure className={['muscle-map', `muscle-map--${size}`, className].filter(Boolean).join(' ')}>
      <svg className="muscle-map__chart" viewBox="16 0 338 476" role="img" aria-label={summary}>
        {VIEWS.map((view) => (
          <g key={view.id} className={`muscle-map__view muscle-map__view--${view.id}`} transform={`translate(${view.x} 4)`}>
            <g className="muscle-map__body">
              <ellipse cx="100" cy="32" rx="18.5" ry="23" />
              <Half d={BODY_HALF} />
            </g>
            {(Object.entries(view.regions) as [MapMuscle, string[]][]).map(([muscle, paths]) => {
              const level = muscleLevel(load[muscle])
              return (
                <g key={muscle} className="muscle-map__region" data-muscle={muscle} data-level={level}>
                  <title>{regionTitle(t, labels, muscle, level)}</title>
                  {paths.map((d) => (
                    <Half key={d} d={d} />
                  ))}
                </g>
              )
            })}
            <text className="muscle-map__caption" x="100" y="466" textAnchor="middle">
              {t(`app.components.muscleMap.${view.id}`)}
            </text>
          </g>
        ))}
      </svg>
      {legend ? (
        <figcaption className="muscle-map__legend">
          {([1, 2, 3] as const).map((level) => (
            <span key={level} className="muscle-map__legend-item">
              <span className="muscle-map__swatch" data-level={level} aria-hidden="true" />
              {t(`app.components.muscleMap.levels.${LEVEL_KEY[level]}`)}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  )
}
