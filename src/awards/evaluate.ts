import { toDateKey } from '@/history/streaks'
import {
  FUN_TARGET,
  HOLIDAY_ORDER,
  MILESTONE_WORKOUTS,
  MONTH_REGULAR_DAYS,
  STREAK_DAYS,
  funAward,
  holidayAward,
  holidayDate,
  milestoneAward,
  monthAward,
  perfectMonthAward,
  streakAward,
} from './catalog'
import type { AwardDef, AwardProgress } from './types'

export interface StoredProgress {
  totalWorkouts: number
  lastCompletedAt: string | null
  longestStreak: number
  streakStart: string | null
  streakEnd: string | null
}

export const EMPTY_PROGRESS: StoredProgress = { totalWorkouts: 0, lastCompletedAt: null, longestStreak: 0, streakStart: null, streakEnd: null }

export interface Completed {
  completedAt: string
  startedAt?: string
}

export interface Evaluation {
  progress: StoredProgress
  earned: AwardDef[]
  currentStreak: number
  next: {
    streak: { award: AwardDef; progress: AwardProgress } | null
    milestone: { award: AwardDef; progress: AwardProgress } | null
  }
}

function dayOf(iso: string): Date {
  const date = new Date(iso)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}

function parseKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

function runs(keys: string[]): { start: string; end: string; length: number }[] {
  const sorted = [...new Set(keys)].sort()
  const result: { start: string; end: string; length: number }[] = []
  for (const key of sorted) {
    const last = result.at(-1)
    if (last && toDateKey(addDays(parseKey(last.end), 1)) === key) {
      last.end = key
      last.length += 1
    } else {
      result.push({ start: key, end: key, length: 1 })
    }
  }
  return result
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function evaluateAwards(completions: Completed[], stored: StoredProgress, now: Date): Evaluation {
  const sorted = [...completions].sort((a, b) => (a.completedAt < b.completedAt ? -1 : 1))
  const keys = sorted.map((entry) => toDateKey(dayOf(entry.completedAt)))
  const keySet = new Set(keys)
  const fresh = stored.lastCompletedAt ? sorted.filter((entry) => entry.completedAt > (stored.lastCompletedAt as string)) : sorted
  const totalWorkouts = Math.max(stored.totalWorkouts + fresh.length, sorted.length)
  const lastCompletedAt = sorted.at(-1)?.completedAt ?? stored.lastCompletedAt

  const merged = runs(keys)
  if (stored.streakStart && stored.streakEnd) {
    const first = merged[0]
    const touches = first && daysBetween(parseKey(stored.streakEnd), parseKey(first.start)) <= 1 && stored.streakStart < first.start
    if (touches) {
      first.length += daysBetween(parseKey(stored.streakStart), parseKey(first.start))
      first.start = stored.streakStart
    } else if (!first || stored.streakEnd < first.start) {
      merged.unshift({ start: stored.streakStart, end: stored.streakEnd, length: daysBetween(parseKey(stored.streakStart), parseKey(stored.streakEnd)) + 1 })
    }
  }
  const latest = merged.at(-1) ?? null
  const today = toDateKey(now)
  const yesterday = toDateKey(addDays(now, -1))
  const currentStreak = latest && (latest.end === today || latest.end === yesterday) ? latest.length : 0
  const longestStreak = Math.max(stored.longestStreak, ...merged.map((run) => run.length), 0)

  const earned: AwardDef[] = []
  for (const days of STREAK_DAYS) {
    if (longestStreak >= days) {
      earned.push(streakAward(days))
    }
  }
  for (const count of MILESTONE_WORKOUTS) {
    if (totalWorkouts >= count) {
      earned.push(milestoneAward(count))
    }
  }

  const monthDays = new Map<string, Set<number>>()
  for (const key of keySet) {
    const month = key.slice(0, 7)
    monthDays.set(month, (monthDays.get(month) ?? new Set()).add(Number(key.slice(8))))
  }
  for (const [month, days] of monthDays) {
    const [year, number] = month.split('-').map(Number)
    if (days.size >= MONTH_REGULAR_DAYS) {
      earned.push(monthAward(year, number))
    }
    if (days.size >= daysInMonth(year, number)) {
      earned.push(perfectMonthAward(year, number))
    }
  }

  const years = new Set([...keySet].map((key) => Number(key.slice(0, 4))))
  for (const year of years) {
    for (const holiday of HOLIDAY_ORDER) {
      const date = holidayDate(holiday, year)
      if (date && keySet.has(`${year}-${String(date[0]).padStart(2, '0')}-${String(date[1]).padStart(2, '0')}`)) {
        earned.push(holidayAward(holiday, year))
      }
    }
  }

  const hours = sorted.map((entry) => new Date(entry.startedAt ?? entry.completedAt).getHours())
  if (hours.filter((hour) => hour >= 4 && hour < 7).length >= FUN_TARGET) {
    earned.push(funAward('earlyBird'))
  }
  if (hours.filter((hour) => hour >= 21 || hour < 2).length >= FUN_TARGET) {
    earned.push(funAward('nightOwl'))
  }

  const nextStreak = STREAK_DAYS.find((days) => days > currentStreak && days > 0)
  const nextMilestone = MILESTONE_WORKOUTS.find((count) => count > totalWorkouts)
  return {
    progress: {
      totalWorkouts,
      lastCompletedAt,
      longestStreak,
      streakStart: latest?.start ?? stored.streakStart,
      streakEnd: latest?.end ?? stored.streakEnd,
    },
    earned,
    currentStreak,
    next: {
      streak: nextStreak ? { award: streakAward(nextStreak), progress: { current: currentStreak, target: nextStreak } } : null,
      milestone: nextMilestone ? { award: milestoneAward(nextMilestone), progress: { current: totalWorkouts, target: nextMilestone } } : null,
    },
  }
}

export function monthProgress(completions: Completed[], year: number, month: number): { days: number; total: number } {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const days = new Set(completions.map((entry) => toDateKey(dayOf(entry.completedAt))).filter((key) => key.startsWith(prefix)))
  return { days: days.size, total: daysInMonth(year, month) }
}
