import { describe, expect, it } from 'vitest'
import type { PlaybackStep } from '@/workouts/types'
import { shouldRequestPauseAd } from './policy'

const rest: PlaybackStep = { kind: 'pause', reason: 'item', durationMs: 20000, nextWork: 2 }
const work: PlaybackStep = { kind: 'work', exerciseId: 'squat', target: { kind: 'time', ms: 30000 }, set: 1, sets: 1, round: 1, rounds: 1, item: 1, items: 1 }

describe('rest ad policy', () => {
  it('requests an ad on every rest, whatever its length or reason', () => {
    expect(shouldRequestPauseAd(rest)).toBe(true)
    expect(shouldRequestPauseAd({ ...rest, reason: 'set' })).toBe(true)
    expect(shouldRequestPauseAd({ ...rest, reason: 'round' })).toBe(true)
    expect(shouldRequestPauseAd({ ...rest, reason: 'getReady', durationMs: 5000 })).toBe(true)
    expect(shouldRequestPauseAd({ ...rest, durationMs: 3000 })).toBe(true)
  })

  it('never shows ads during exercise or side switches', () => {
    expect(shouldRequestPauseAd(work)).toBe(false)
    expect(shouldRequestPauseAd({ ...rest, reason: 'switch' })).toBe(false)
    expect(shouldRequestPauseAd(undefined)).toBe(false)
  })
})
