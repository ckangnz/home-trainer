import type { PauseReason, PlaybackStep } from '@/workouts/types'

// AdSense forbids refreshing an element "without the user requesting a refresh"
// (https://support.google.com/adsense/answer/1346295), and most rest screens begin
// from the countdown, not a tap — so ad requests stay at least 30 seconds apart.
// The old 10-second minimum rest and tap-only trigger were app-side choices,
// removed at Chris's request (2026-11-21): every rest and get-ready screen may
// show an ad now, however short.
export const AD_MIN_INTERVAL_MS = 30_000

interface AdContext {
  lastRequestAt: number | null
  lastReason: PauseReason | null
  hasLaterDifferentPause: boolean
  now: number
}

// With regular short exercises the spacing rule alone locked every ad onto the
// same kind of rest (e.g. only set rests, never between exercises). When that
// happens, defer once so the next different kind of rest gets the ad instead.
export function shouldRequestPauseAd(step: PlaybackStep | undefined, context: AdContext): boolean {
  if (step?.kind !== 'pause' || step.reason === 'switch') {
    return false
  }
  if (context.lastRequestAt !== null && context.now - context.lastRequestAt < AD_MIN_INTERVAL_MS) {
    return false
  }
  if (context.lastReason === step.reason && context.hasLaterDifferentPause) {
    return false
  }
  return true
}
