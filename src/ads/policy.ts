import type { PlaybackStep } from '@/workouts/types'

// Rest screens always request a fresh ad. The old 30-second spacing, 10-second
// minimum rest, and tap-only trigger were app-side choices (removed at Chris's
// request, 2026-11-21), not AdSense requirements. Side-switch pauses are short
// transitions, not rests, so they stay ad-free.
export function shouldRequestPauseAd(step: PlaybackStep | undefined): boolean {
  return step?.kind === 'pause' && step.reason !== 'switch'
}
