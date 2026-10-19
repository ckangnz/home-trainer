import { describe, expect, it } from 'vitest'
import { awardFromId, holidayDate } from './catalog'
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
    expect(holidayDate('lunarNewYear', 2027)).toEqual([2, 6])
  })

  it('awards early bird and night owl after five sessions', () => {
    const early = evaluateAwards(days('2026-05-01', 5, 6), EMPTY_PROGRESS, new Date('2026-05-06'))
    expect(ids(early)).toContain('early-bird')
    const late = evaluateAwards(days('2026-05-01', 4, 22), EMPTY_PROGRESS, new Date('2026-05-06'))
    expect(ids(late)).not.toContain('night-owl')
  })

  it('carries long streaks and totals past the history window', () => {
    const stored = { totalWorkouts: 340, lastCompletedAt: new Date('2026-06-10T12:30:00').toISOString(), longestStreak: 300, streakStart: '2025-08-15', streakEnd: '2026-06-10' }
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
