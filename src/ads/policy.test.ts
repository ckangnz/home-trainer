import { describe, expect, it } from 'vitest'
import type { PlaybackStep } from '@/workouts/types'
import { AD_MIN_INTERVAL_MS, shouldRequestPauseAd } from './policy'

const rest: PlaybackStep = { kind: 'pause', reason: 'item', durationMs: 30000, nextWork: 2 }
const work: PlaybackStep = { kind: 'work', exerciseId: 'squat', target: { kind: 'time', ms: 30000 }, set: 1, sets: 1, round: 1, rounds: 1, item: 1, items: 1 }

describe('rest ad policy', () => {
  it('requests an ad when the user tapped into a long enough rest', () => {
    expect(shouldRequestPauseAd(rest, { enteredBy: 'user', lastRequestAt: null, now: 0 })).toBe(true)
  })

  it('never requests ads for countdown-started rests by default', () => {
    expect(shouldRequestPauseAd(rest, { enteredBy: 'timer', lastRequestAt: null, now: 0 })).toBe(false)
    expect(shouldRequestPauseAd(rest, { enteredBy: 'timer', lastRequestAt: null, now: 0, trigger: 'every-rest' })).toBe(true)
  })

  it('never shows ads during exercise, side switches, or short rests', () => {
    expect(shouldRequestPauseAd(work, { enteredBy: 'user', lastRequestAt: null, now: 0 })).toBe(false)
    expect(shouldRequestPauseAd({ ...rest, reason: 'switch' }, { enteredBy: 'user', lastRequestAt: null, now: 0 })).toBe(false)
    expect(shouldRequestPauseAd({ ...rest, durationMs: 5000 }, { enteredBy: 'user', lastRequestAt: null, now: 0 })).toBe(false)
  })

  it('spaces ad requests out', () => {
    expect(shouldRequestPauseAd(rest, { enteredBy: 'user', lastRequestAt: 0, now: AD_MIN_INTERVAL_MS - 1 })).toBe(false)
    expect(shouldRequestPauseAd(rest, { enteredBy: 'user', lastRequestAt: 0, now: AD_MIN_INTERVAL_MS })).toBe(true)
  })
})
