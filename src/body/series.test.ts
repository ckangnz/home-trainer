import { describe, expect, it } from 'vitest'
import type { Completion } from '@/data/models'
import { changeOver, chartDomain, dayKey, dayNumber, entriesIn, linear, nearestIndex, niceTicks, rangeDomain, segments, timeTicks, weekStart, weeklyWorkouts } from './series'

const entry = (date: string, kg: number) => ({ date, kg, updatedAt: '' })

const completion = (completedAt: string, minutes: number): Completion => ({
  id: completedAt,
  ownerId: 'user-1',
  schemaVersion: 2,
  title: 'Workout',
  source: { kind: 'curated', id: 'classic-7-minute' },
  startedAt: completedAt,
  completedAt,
  durationMs: minutes * 60000,
  exercises: 12,
  totalExercises: 12,
})

describe('body series helpers', () => {
  it('round-trips day numbers and finds Monday week starts', () => {
    const day = dayNumber('2026-11-04')
    expect(dayKey(day)).toBe('2026-11-04')
    expect(dayKey(weekStart(day))).toBe('2026-11-02')
    expect(dayKey(weekStart(dayNumber('2026-11-02')))).toBe('2026-11-02')
    expect(dayKey(weekStart(dayNumber('2026-11-08')))).toBe('2026-11-02')
    expect(chartDomain([dayNumber('2026-10-07'), dayNumber('2026-11-04')]).map(dayKey)).toEqual(['2026-10-05', '2026-11-09'])
  })

  it('builds range domains ending today, with All starting at the first entry', () => {
    const today = '2026-11-02'
    const end = dayNumber(today)
    expect(rangeDomain('1m', today, [])).toEqual([end - 30, end])
    expect(rangeDomain('1y', today, [])).toEqual([end - 365, end])
    expect(rangeDomain('all', today, [entry('2025-01-10', 80)])).toEqual([dayNumber('2025-01-10'), end])
    expect(rangeDomain('all', today, [entry('2026-11-01', 80)])).toEqual([end - 7, end])
  })

  it('filters entries to the domain and measures change between the first and last', () => {
    const entries = [entry('2026-09-01', 82), entry('2026-10-05', 81.2), entry('2026-10-30', 80.4)]
    const visible = entriesIn(entries, [dayNumber('2026-10-01'), dayNumber('2026-11-02')])
    expect(visible.map((item) => item.date)).toEqual(['2026-10-05', '2026-10-30'])
    expect(changeOver(visible)).toEqual({ kg: -0.8, days: 25 })
    expect(changeOver(visible.slice(0, 1))).toBeNull()
  })

  it('splits lines at gaps longer than 30 days and snaps to the nearest point', () => {
    const points = [
      { day: 0, value: 1 },
      { day: 10, value: 2 },
      { day: 50, value: 3 },
      { day: 60, value: 4 },
    ]
    expect(segments(points).map((segment) => segment.length)).toEqual([2, 2])
    expect(nearestIndex(points, 33)).toBe(2)
    expect(nearestIndex([], 5)).toBe(-1)
  })

  it('maps linear scales and picks clean ticks', () => {
    const scale = linear([0, 10], [100, 0])
    expect(scale(0)).toBe(100)
    expect(scale(5)).toBe(50)
    expect(niceTicks(71.3, 74.8, 4)).toEqual({ domain: [71, 75], ticks: [71, 72, 73, 74, 75] })
    expect(niceTicks(80, 80, 4, 2).domain).toEqual([79, 81])
    expect(niceTicks(0, 7, 3, 1, true).ticks).toEqual([0, 3, 6, 9])
  })

  it('places month ticks for long ranges and weekly ticks for short ones', () => {
    const months = timeTicks([dayNumber('2026-05-02'), dayNumber('2026-11-02')], 6)
    expect(months.map(dayKey)).toEqual(['2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01', '2026-11-01'])
    const weeks = timeTicks([dayNumber('2026-10-05'), dayNumber('2026-11-09')], 5)
    expect(weeks.map(dayKey)).toEqual(['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'])
  })

  it('buckets workouts by local week', () => {
    const buckets = weeklyWorkouts(
      [completion(new Date(2026, 9, 27, 8).toISOString(), 7), completion(new Date(2026, 9, 29, 19).toISOString(), 14), completion(new Date(2026, 10, 2, 7).toISOString(), 10)],
      [dayNumber('2026-10-20'), dayNumber('2026-11-02')],
    )
    expect(buckets.map((bucket) => [dayKey(bucket.start), bucket.count, bucket.minutes])).toEqual([
      ['2026-10-19', 0, 0],
      ['2026-10-26', 2, 21],
      ['2026-11-02', 1, 10],
    ])
  })
})
