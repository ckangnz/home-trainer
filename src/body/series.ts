import type { Completion } from '@/data/models'
import type { WeightEntry } from './types'

export type RangeKey = '1m' | '3m' | '6m' | '1y' | 'all'

export const RANGE_KEYS: RangeKey[] = ['1m', '3m', '6m', '1y', 'all']

export const GAP_DAYS = 30

const DAY_MS = 86400000

const RANGE_DAYS: Record<Exclude<RangeKey, 'all'>, number> = { '1m': 30, '3m': 91, '6m': 182, '1y': 365 }

export function dayNumber(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS)
}

export function dayKey(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10)
}

export function rangeDomain(range: RangeKey, today: string, entries: WeightEntry[]): [number, number] {
  const end = dayNumber(today)
  if (range !== 'all') {
    return [end - RANGE_DAYS[range], end]
  }
  const first = entries.length > 0 ? Math.min(dayNumber(entries[0].date), end) : end - RANGE_DAYS['1m']
  return [Math.min(first, end - 7), end]
}

export function entriesIn(entries: WeightEntry[], [start, end]: [number, number]): WeightEntry[] {
  return entries.filter((entry) => {
    const day = dayNumber(entry.date)
    return day >= start && day <= end
  })
}

export interface Change {
  kg: number
  days: number
}

export function changeOver(entries: WeightEntry[]): Change | null {
  if (entries.length < 2) {
    return null
  }
  const first = entries[0]
  const last = entries[entries.length - 1]
  return { kg: Math.round((last.kg - first.kg) * 10) / 10, days: dayNumber(last.date) - dayNumber(first.date) }
}

export interface Point {
  day: number
  value: number
}

export function segments(points: Point[], maxGap = GAP_DAYS): Point[][] {
  const result: Point[][] = []
  for (const point of points) {
    const current = result[result.length - 1]
    if (current && point.day - current[current.length - 1].day <= maxGap) {
      current.push(point)
    } else {
      result.push([point])
    }
  }
  return result
}

export function nearestIndex(points: Point[], day: number): number {
  let best = -1
  let bestDistance = Infinity
  points.forEach((point, index) => {
    const distance = Math.abs(point.day - day)
    if (distance < bestDistance) {
      best = index
      bestDistance = distance
    }
  })
  return best
}

export function linear(domain: [number, number], range: [number, number]): (value: number) => number {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0 || 1
  return (value) => r0 + ((value - d0) / span) * (r1 - r0)
}

function niceStep(rough: number): number {
  const power = 10 ** Math.floor(Math.log10(rough))
  const fraction = rough / power
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10
  return nice * power
}

export interface Ticks {
  domain: [number, number]
  ticks: number[]
}

export function niceTicks(min: number, max: number, count = 4, minSpan = 1, integer = false): Ticks {
  let low = min
  let high = max
  if (high - low < minSpan) {
    const middle = (low + high) / 2
    low = middle - minSpan / 2
    high = middle + minSpan / 2
  }
  const rough = niceStep((high - low) / Math.max(1, count))
  const step = integer ? Math.max(1, Math.ceil(rough)) : rough
  const start = Math.floor(low / step) * step
  const end = Math.ceil(high / step) * step
  const ticks: number[] = []
  for (let value = start; value <= end + step / 2; value += step) {
    ticks.push(Math.round(value * 1000) / 1000)
  }
  return { domain: [start, end], ticks }
}

export function timeTicks([start, end]: [number, number], maxTicks: number): number[] {
  const span = end - start
  const firstDate = new Date(start * DAY_MS)
  if (span <= 45) {
    const step = Math.max(7, Math.ceil(span / Math.max(1, maxTicks) / 7) * 7)
    const ticks: number[] = []
    for (let day = weekStart(end - 1); day >= start; day -= step) {
      ticks.unshift(day)
    }
    return ticks
  }
  const months: number[] = []
  const cursor = new Date(Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth() + 1, 1))
  while (cursor.getTime() / DAY_MS <= end) {
    months.push(Math.round(cursor.getTime() / DAY_MS))
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  const every = Math.max(1, Math.ceil(months.length / Math.max(1, maxTicks)))
  return months.filter((_, index) => index % every === 0)
}

export function weekStart(day: number): number {
  const weekday = (new Date(day * DAY_MS).getUTCDay() + 6) % 7
  return day - weekday
}

export function chartDomain([start, end]: [number, number]): [number, number] {
  return [weekStart(start), weekStart(end) + 7]
}

export interface WeekBucket {
  start: number
  count: number
  minutes: number
}

export function localDayKey(iso: string): string {
  const date = new Date(iso)
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`
}

export function weeklyWorkouts(completions: Completion[], [start, end]: [number, number]): WeekBucket[] {
  const buckets = new Map<number, WeekBucket>()
  for (let week = weekStart(start); week <= end; week += 7) {
    buckets.set(week, { start: week, count: 0, minutes: 0 })
  }
  for (const completion of completions) {
    const day = dayNumber(localDayKey(completion.completedAt))
    const bucket = buckets.get(weekStart(day))
    if (bucket && day <= end) {
      bucket.count += 1
      bucket.minutes += completion.durationMs / 60000
    }
  }
  return [...buckets.values()].map((bucket) => ({ ...bucket, minutes: Math.round(bucket.minutes) }))
}

export function rangeIso([start, end]: [number, number]): { startIso: string; endIso: string } {
  const [startYear, startMonth, startDay] = dayKey(weekStart(start)).split('-').map(Number)
  const [endYear, endMonth, endDay] = dayKey(end + 1).split('-').map(Number)
  return {
    startIso: new Date(startYear, startMonth - 1, startDay).toISOString(),
    endIso: new Date(endYear, endMonth - 1, endDay).toISOString(),
  }
}
