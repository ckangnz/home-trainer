import { describe, expect, it } from 'vitest'
import type { PlaybackStep } from '@/workouts/types'
import { AD_MIN_INTERVAL_MS, shouldRequestPauseAd } from './policy'

const rest: PlaybackStep = { kind: 'pause', reason: 'item', durationMs: 20000, nextWork: 2 }
const work: PlaybackStep = { kind: 'work', exerciseId: 'squat', target: { kind: 'time', ms: 30000 }, set: 1, sets: 1, round: 1, rounds: 1, item: 1, items: 1 }
const ctx = (over: Partial<Parameters<typeof shouldRequestPauseAd>[1]> = {}) => ({
  lastRequestAt: null,
  lastReason: null,
  hasLaterDifferentPause: false,
  now: 0,
  ...over,
})

describe('rest ad policy', () => {
  it('requests an ad on every rest and get-ready screen, however short', () => {
    expect(shouldRequestPauseAd(rest, ctx())).toBe(true)
    expect(shouldRequestPauseAd({ ...rest, reason: 'set' }, ctx())).toBe(true)
    expect(shouldRequestPauseAd({ ...rest, reason: 'round' }, ctx())).toBe(true)
    expect(shouldRequestPauseAd({ ...rest, reason: 'getReady', durationMs: 5000 }, ctx())).toBe(true)
    expect(shouldRequestPauseAd({ ...rest, durationMs: 3000 }, ctx())).toBe(true)
  })

  it('never shows ads during exercise or side switches', () => {
    expect(shouldRequestPauseAd(work, ctx())).toBe(false)
    expect(shouldRequestPauseAd({ ...rest, reason: 'switch' }, ctx())).toBe(false)
    expect(shouldRequestPauseAd(undefined, ctx())).toBe(false)
  })

  it('keeps ad requests at least 30 seconds apart', () => {
    expect(shouldRequestPauseAd(rest, ctx({ lastRequestAt: 0, now: AD_MIN_INTERVAL_MS - 1 }))).toBe(false)
    expect(shouldRequestPauseAd(rest, ctx({ lastRequestAt: 0, now: AD_MIN_INTERVAL_MS }))).toBe(true)
  })

  it('defers a repeat of the same rest kind when a different rest is coming', () => {
    const laterSame = ctx({ lastReason: 'set', hasLaterDifferentPause: false })
    expect(shouldRequestPauseAd({ ...rest, reason: 'set' }, laterSame)).toBe(true)
    const laterDifferent = ctx({ lastReason: 'set', hasLaterDifferentPause: true })
    expect(shouldRequestPauseAd({ ...rest, reason: 'set' }, laterDifferent)).toBe(false)
    expect(shouldRequestPauseAd({ ...rest, reason: 'item' }, laterDifferent)).toBe(true)
  })
})
