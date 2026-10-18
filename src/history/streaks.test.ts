import { describe, expect, it } from 'vitest'
import { groupByDay, lastDays, summarizeStreak, toDateKey } from './streaks'

function at(day: string, time = '12:00:00') {
  return { completedAt: new Date(`${day}T${time}`).toISOString() }
}

const today = new Date('2026-10-18T09:00:00')

describe('streaks', () => {
  it('is empty without history', () => {
    expect(summarizeStreak([], today)).toEqual({ current: 0, longest: 0, activeDays: 0 })
  })

  it('counts a streak that includes today or ended yesterday', () => {
    expect(summarizeStreak([at('2026-10-16'), at('2026-10-17'), at('2026-10-18')], today).current).toBe(3)
    expect(summarizeStreak([at('2026-10-16'), at('2026-10-17')], today).current).toBe(2)
    expect(summarizeStreak([at('2026-10-15'), at('2026-10-16')], today).current).toBe(0)
  })

  it('tracks the longest run and distinct active days', () => {
    const summary = summarizeStreak(
      [at('2026-10-01'), at('2026-10-02'), at('2026-10-03'), at('2026-10-03', '18:00:00'), at('2026-10-10')],
      today,
    )
    expect(summary.longest).toBe(3)
    expect(summary.activeDays).toBe(4)
  })

  it('lays out the last week ending today', () => {
    const days = lastDays([at('2026-10-18'), at('2026-10-14')], today)
    expect(days).toHaveLength(7)
    expect(days[6]).toMatchObject({ key: '2026-10-18', active: true, today: true })
    expect(days[2]).toMatchObject({ key: '2026-10-14', active: true })
    expect(days[0].key).toBe(toDateKey(new Date('2026-10-12T12:00:00')))
  })

  it('groups entries by day, newest first', () => {
    const groups = groupByDay([at('2026-10-17', '08:00:00'), at('2026-10-18', '07:00:00'), at('2026-10-17', '20:00:00')])
    expect(groups.map((group) => group.key)).toEqual(['2026-10-18', '2026-10-17'])
    expect(groups[1].entries[0].completedAt > groups[1].entries[1].completedAt).toBe(true)
  })
})
