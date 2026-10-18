export interface Dated {
  completedAt: string
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}

function dateKeys(entries: Dated[]): Set<string> {
  return new Set(entries.map((entry) => toDateKey(new Date(entry.completedAt))))
}

export interface StreakSummary {
  current: number
  longest: number
  activeDays: number
}

export function summarizeStreak(entries: Dated[], today: Date): StreakSummary {
  const keys = dateKeys(entries)
  if (keys.size === 0) {
    return { current: 0, longest: 0, activeDays: 0 }
  }
  const sorted = [...keys].sort()
  let longest = 1
  let run = 1
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = new Date(`${sorted[index - 1]}T00:00:00`)
    run = toDateKey(addDays(previous, 1)) === sorted[index] ? run + 1 : 1
    longest = Math.max(longest, run)
  }
  let cursor = keys.has(toDateKey(today)) ? today : keys.has(toDateKey(addDays(today, -1))) ? addDays(today, -1) : null
  let current = 0
  while (cursor && keys.has(toDateKey(cursor))) {
    current += 1
    cursor = addDays(cursor, -1)
  }
  return { current, longest, activeDays: keys.size }
}

export interface DayCell {
  key: string
  label: string
  active: boolean
  today: boolean
}

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function lastDays(entries: Dated[], today: Date, count = 7): DayCell[] {
  const keys = dateKeys(entries)
  const todayKey = toDateKey(today)
  return Array.from({ length: count }, (_, index) => {
    const date = addDays(today, index - count + 1)
    const key = toDateKey(date)
    return { key, label: WEEKDAY[date.getDay()], active: keys.has(key), today: key === todayKey }
  })
}

export function groupByDay<T extends Dated>(entries: T[]): { key: string; entries: T[] }[] {
  const groups = new Map<string, T[]>()
  for (const entry of entries) {
    const key = toDateKey(new Date(entry.completedAt))
    groups.set(key, [...(groups.get(key) ?? []), entry])
  }
  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, list]) => ({ key, entries: list.sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1)) }))
}
