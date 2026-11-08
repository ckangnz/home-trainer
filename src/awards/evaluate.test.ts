import { describe, expect, it } from 'vitest'
import { awardFromId, holidayDate, lunarDate } from './catalog'
import { EMPTY_PROGRESS, evaluateAwards } from './evaluate'

const at = (date: string, hour = 12) => ({ completedAt: new Date(`${date}T${String(hour).padStart(2, '0')}:30:00`).toISOString() })

function days(start: string, count: number, hour = 12) {
  const first = new Date(`${start}T00:00:00`)
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(first.getFullYear(), first.getMonth(), first.getDate() + index, hour, 30)
    return { completedAt: day.toISOString() }
  })
}

const ids = (result: ReturnType<typeof evaluateAwards>) => result.earned.map((award) => award.id)

describe('awards', () => {
  it('awards streaks, milestones, and the next targets', () => {
    const result = evaluateAwards(days('2026-03-01', 8), EMPTY_PROGRESS, new Date('2026-03-08T20:00:00'))
    expect(ids(result)).toEqual(expect.arrayContaining(['streak-3', 'streak-7', 'workouts-1']))
    expect(ids(result)).not.toContain('streak-14')
    expect(result.currentStreak).toBe(8)
    expect(result.next.streak?.progress).toEqual({ current: 8, target: 14 })
    expect(result.next.milestone?.progress).toEqual({ current: 8, target: 10 })
  })

  it('awards month regular and perfect month badges', () => {
    const regular = evaluateAwards(days('2026-04-01', 12), EMPTY_PROGRESS, new Date('2026-05-01T12:00:00'))
    expect(ids(regular)).toContain('month-2026-04')
    expect(ids(regular)).not.toContain('perfect-month-2026-04')
    const perfect = evaluateAwards(days('2026-02-01', 28), EMPTY_PROGRESS, new Date('2026-03-01T12:00:00'))
    expect(ids(perfect)).toEqual(expect.arrayContaining(['month-2026-02', 'perfect-month-2026-02', 'streak-14']))
  })

  it('awards holidays by local date, including lunar holidays', () => {
    const result = evaluateAwards([at('2026-01-01'), at('2027-01-01'), at('2026-12-25'), at('2026-02-17'), at('2026-09-25')], EMPTY_PROGRESS, new Date('2027-01-02'))
    expect(ids(result)).toEqual(expect.arrayContaining(['new-year-2026', 'new-year-2027', 'christmas-2026', 'lunar-new-year-2026', 'chuseok-2026']))
    expect(holidayDate('lunarNewYear', 2027)).toEqual([2, 7])
  })

  it('finds Korean lunar holidays for any year and matches the built-in table', () => {
    const table: Record<number, [[number, number], [number, number]]> = {
      2026: [[2, 17], [9, 25]],
      2027: [[2, 7], [9, 15]],
      2028: [[1, 27], [10, 3]],
      2029: [[2, 13], [9, 22]],
      2030: [[2, 3], [9, 12]],
      2031: [[1, 23], [10, 1]],
      2032: [[2, 11], [9, 19]],
    }
    for (const [year, [seollal, chuseok]] of Object.entries(table)) {
      expect(holidayDate('lunarNewYear', Number(year))).toEqual(seollal)
      expect(holidayDate('chuseok', Number(year))).toEqual(chuseok)
    }
    expect(holidayDate('lunarNewYear', 2040)).toEqual([2, 12])
    expect(holidayDate('chuseok', 2040)).toEqual([9, 21])
    expect(lunarDate('lunarNewYear', 2027, null)).toEqual([2, 7])
    expect(lunarDate('chuseok', 2040, null)).toBeNull()
  })

  it('awards early bird and night owl after five sessions', () => {
    const early = evaluateAwards(days('2026-05-01', 5, 6), EMPTY_PROGRESS, new Date('2026-05-06'))
    expect(ids(early)).toContain('early-bird')
    const late = evaluateAwards(days('2026-05-01', 4, 22), EMPTY_PROGRESS, new Date('2026-05-06'))
    expect(ids(late)).not.toContain('night-owl')
  })

  it('carries long streaks and totals past the history window', () => {
    const stored = { totalWorkouts: 340, totalMs: 0, lastCompletedAt: new Date('2026-06-10T12:30:00').toISOString(), longestStreak: 300, streakStart: '2025-08-15', streakEnd: '2026-06-10' }
    const recent = days('2026-01-01', 164)
    const result = evaluateAwards(recent, stored, new Date('2026-06-13T20:00:00'))
    expect(result.currentStreak).toBe(303)
    expect(result.progress.totalWorkouts).toBe(343)
    expect(ids(result)).toContain('streak-180')
    expect(ids(result)).toContain('workouts-250')
    expect(ids(result)).not.toContain('streak-365')
  })

  it('round-trips award ids', () => {
    for (const id of ['streak-30', 'workouts-100', 'month-2026-01', 'perfect-month-2026-12', 'new-year-2027', 'chuseok-2026', 'night-owl']) {
      expect(awardFromId(id)?.id).toBe(id)
    }
    expect(awardFromId('streak-5')).toBeNull()
    expect(awardFromId('month-2026-13')).toBeNull()
  })
})

describe('progress totals', () => {
  const now = new Date('2026-11-08T12:00:00')
  const stored = { ...EMPTY_PROGRESS, totalWorkouts: 76, totalMs: 40 * 3_600_000, lastCompletedAt: new Date('2026-11-07T12:30:00').toISOString() }

  it('uses the exact server totals instead of the running tally', () => {
    const entries = days('2026-11-01', 5).map((entry) => ({ ...entry, durationMs: 600_000 }))
    const tally = evaluateAwards(entries, { ...stored, lastCompletedAt: null }, now)
    expect(tally.progress.totalWorkouts).toBe(81)
    const exact = evaluateAwards(entries, { ...stored, lastCompletedAt: null }, now, { count: 77, ms: 41 * 3_600_000 })
    expect(exact.progress.totalWorkouts).toBe(77)
    expect(exact.progress.totalMs).toBe(41 * 3_600_000)
  })

  it('never moves the last completion date backwards', () => {
    const backdated = [{ completedAt: new Date('2026-10-20T10:00:00').toISOString(), durationMs: 1_800_000 }]
    const result = evaluateAwards(backdated, stored, now)
    expect(result.progress.lastCompletedAt).toBe(stored.lastCompletedAt)
  })
})
