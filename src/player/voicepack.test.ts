import { describe, expect, it } from 'vitest'
import type { PlaybackStep } from '@/workouts/types'
import type { Language } from '@/i18n/types'
import type { TrainerId } from '@/figure/look'
import {
  completeReps,
  createPlayer,
  startPlayer,
  tickPlayer,
} from './machine'
import { announcementAtoms, BANKS, cuesBetween, type CoachContext } from './cues'
import { BANKS_KO } from './cues.ko'
import { segBankFor, voicePackInventory } from './cueSegments'
import { hashAtom } from './voicehash'

// A two-round workout with sides, sets, timed and rep steps — exercises every
// announcement shape the coach can make.
const steps: PlaybackStep[] = [
  { kind: 'pause', reason: 'getReady', durationMs: 5000, nextWork: 1 },
  { kind: 'work', exerciseId: 'squat', target: { kind: 'time', ms: 60000 }, set: 1, sets: 2, round: 1, rounds: 2, item: 1, items: 2, side: 'left' },
  { kind: 'pause', reason: 'switch', durationMs: 5000, nextWork: 2 },
  { kind: 'work', exerciseId: 'squat', target: { kind: 'time', ms: 60000 }, set: 2, sets: 2, round: 1, rounds: 2, item: 1, items: 2, side: 'right' },
  { kind: 'pause', reason: 'round', durationMs: 20000, nextWork: 4 },
  { kind: 'work', exerciseId: 'push-up', target: { kind: 'reps', reps: 10 }, set: 1, sets: 1, round: 2, rounds: 2, item: 2, items: 2 },
]

const names = (id: string) => ({ squat: 'Squat', 'push-up': 'Push-up' })[id] ?? id
const namesKo = (id: string) => ({ squat: '스쿼트', 'push-up': '푸시업' })[id] ?? id

function collectAtoms(trainer: TrainerId, language: Language, nameOf: (id: string) => string): { sayAtoms: string[]; tipsWithoutAtoms: string[] } {
  const context: CoachContext = { nameOf, trainer, language }
  const sayAtoms: string[] = []
  const tipsWithoutAtoms: string[] = []
  const collect = (cues: ReturnType<typeof cuesBetween>) => {
    for (const cue of cues) {
      if (cue.kind !== 'say') {
        continue
      }
      if (cue.atoms) {
        sayAtoms.push(...cue.atoms)
      } else {
        tipsWithoutAtoms.push(cue.text)
      }
    }
  }
  const ready = createPlayer(steps)
  let state = startPlayer(ready, 0)
  collect(cuesBetween(ready, state, 0, 0, context))

  // Walk the whole workout, collecting every cue transition. Timed steps
  // advance on tick; rep steps need an explicit completion.
  let now = 0
  let guard = 0
  while (state.status !== 'finished' && guard < 2000) {
    guard++
    now += 1000
    const ticked = tickPlayer(state, now)
    collect(cuesBetween(state, ticked, now - 1000, now, context))
    state = ticked
    const step = state.steps[state.index]
    if (state.status === 'running' && step?.kind === 'work' && step.target.kind === 'reps') {
      const completed = completeReps(state, now)
      collect(cuesBetween(state, completed, now, now, context))
      state = completed
    }
  }
  return { sayAtoms, tipsWithoutAtoms }
}

describe('voice pack atom coverage', () => {
  it.each([
    ['female', 'en', names] as const,
    ['female', 'ko', namesKo] as const,
    ['marcus', 'en', names] as const,
    ['marcus', 'ko', namesKo] as const,
  ])('every atom spoken by %s/%s exists in the generation inventory', (trainer, language, nameOf) => {
    const bank = language === 'ko' ? BANKS_KO[trainer] : BANKS[trainer]
    const seg = segBankFor(trainer, language)
    expect(seg, `segment bank for ${trainer}/${language}`).toBeDefined()
    const fixed = [...bank.go, ...bank.halfway, ...bank.tenLeft, ...bank.switchSides, ...bank.finish]
    const inventory = voicePackInventory(seg!, language, fixed, Object.values({ squat: nameOf('squat'), 'push-up': nameOf('push-up') }))
    const { sayAtoms, tipsWithoutAtoms } = collectAtoms(trainer, language, nameOf)
    expect(sayAtoms.length).toBeGreaterThan(10)
    for (const atom of sayAtoms) {
      expect(inventory.has(atom), `atom missing from inventory: "${atom}"`).toBe(true)
    }
    // Tips stay dynamic and fall back to speechSynthesis by design.
    for (const tip of tipsWithoutAtoms) {
      expect(typeof tip).toBe('string')
    }
  })

  it('produces announcement atoms only for trainers with a segment bank', () => {
    const state = startPlayer(createPlayer(steps), 0)
    expect(announcementAtoms(state, { nameOf: names, trainer: 'female', language: 'en' })).not.toBeNull()
    expect(announcementAtoms(state, { nameOf: names, trainer: 'kai', language: 'en' })).toBeNull()
  })

  it('hashes atoms stably and normalization-insensitively', () => {
    expect(hashAtom('다음은')).toBe(hashAtom('다음은'))
    expect(hashAtom('  다음은   스쿼트 ')).toBe(hashAtom('다음은 스쿼트'))
    expect(hashAtom('Go!')).not.toBe(hashAtom('Go'))
  })
})
