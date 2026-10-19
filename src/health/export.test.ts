import { describe, expect, it } from 'vitest'
import { detectPlatform } from '@/app/platform'
import { buildTcx, exportFileName, healthPayload, shortcutUrl, type HealthWorkout } from './export'

const workout: HealthWorkout = {
  title: 'Leg day & core',
  startedAt: '2026-10-19T07:00:00.000Z',
  endedAt: '2026-10-19T07:21:30.000Z',
  activeMs: 20 * 60_000,
  calories: 143,
  category: 'weights',
  exercises: 9,
}

describe('health export', () => {
  it('builds a TCX lap with start, duration, and calories', () => {
    const tcx = buildTcx(workout)
    expect(tcx).toContain('<Lap StartTime="2026-10-19T07:00:00.000Z">')
    expect(tcx).toContain('<TotalTimeSeconds>1200</TotalTimeSeconds>')
    expect(tcx).toContain('<Calories>143</Calories>')
    expect(tcx).toContain('Leg day &amp; core')
    expect(exportFileName(workout)).toMatch(/^hometrainer-2026-10-19-leg-day-core\.tcx$/)
  })

  it('passes a JSON payload to the Apple Shortcut', () => {
    const payload = healthPayload(workout)
    expect(payload).toMatchObject({ type: 'Traditional Strength Training', durationMinutes: 20, activeCalories: 143 })
    const url = new URL(shortcutUrl(workout))
    expect(url.protocol).toBe('shortcuts:')
    expect(JSON.parse(url.searchParams.get('text') ?? '{}')).toMatchObject({ activeCalories: 143 })
    expect(shortcutUrl(workout)).not.toContain('+')
  })

  it('detects the platform', () => {
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('ios')
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe('ios')
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 15; Pixel 9)')).toBe('android')
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0)')).toBe('other')
  })
})
