import type { PlaybackStep } from '@/workouts/types'
import type { EntryTrigger } from '@/player/machine'

export type RestAdTrigger = 'user-action' | 'every-rest'

// AdSense forbids refreshing ad units "without the user requesting a refresh". Requesting a new rest
// ad only when the user's own tap led to the screen keeps the player compliant. The one-off workout
// summary is a results page rather than a periodic refresh, so it only needs the spacing rule.
// Switching this to 'every-rest' also loads ads on countdown-started rests; confirm with AdSense first.
export const REST_AD_TRIGGER: RestAdTrigger = 'user-action'

export const AD_MIN_INTERVAL_MS = 30_000

export const AD_MIN_PAUSE_MS = 10_000

interface AdContext {
  enteredBy: EntryTrigger
  lastRequestAt: number | null
  now: number
  trigger?: RestAdTrigger
}

function spacedOut(lastRequestAt: number | null, now: number): boolean {
  return lastRequestAt === null || now - lastRequestAt >= AD_MIN_INTERVAL_MS
}

function triggerAllows(enteredBy: EntryTrigger, trigger: RestAdTrigger): boolean {
  return trigger === 'every-rest' || enteredBy === 'user'
}

export function shouldRequestPauseAd(step: PlaybackStep | undefined, context: AdContext): boolean {
  if (step?.kind !== 'pause' || step.reason === 'switch' || step.durationMs < AD_MIN_PAUSE_MS) {
    return false
  }
  return triggerAllows(context.enteredBy, context.trigger ?? REST_AD_TRIGGER) && spacedOut(context.lastRequestAt, context.now)
}

export function shouldRequestSummaryAd(context: Pick<AdContext, 'lastRequestAt' | 'now'>): boolean {
  return spacedOut(context.lastRequestAt, context.now)
}
