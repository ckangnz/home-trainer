import type { AwardDef, AwardTier, FunId, HolidayId } from './types'

export const STREAK_DAYS = [3, 7, 14, 30, 60, 100, 180, 365] as const

export const MILESTONE_WORKOUTS = [1, 10, 25, 50, 100, 250, 500, 1000] as const

export const MONTH_REGULAR_DAYS = 12

export const FUN_TARGET = 5

export const HOLIDAY_ORDER: HolidayId[] = ['newYear', 'lunarNewYear', 'valentines', 'chuseok', 'halloween', 'christmasEve', 'christmas', 'newYearsEve']

const FIXED_HOLIDAYS: Partial<Record<HolidayId, [number, number]>> = {
  newYear: [1, 1],
  valentines: [2, 14],
  halloween: [10, 31],
  christmasEve: [12, 24],
  christmas: [12, 25],
  newYearsEve: [12, 31],
}

const LUNAR_DATES: Record<'lunarNewYear' | 'chuseok', Record<number, [number, number]>> = {
  lunarNewYear: {
    2026: [2, 17],
    2027: [2, 6],
    2028: [1, 26],
    2029: [2, 13],
    2030: [2, 3],
    2031: [1, 23],
    2032: [2, 11],
  },
  chuseok: {
    2026: [9, 25],
    2027: [9, 15],
    2028: [10, 3],
    2029: [9, 22],
    2030: [9, 12],
    2031: [10, 1],
    2032: [9, 19],
  },
}

const HOLIDAY_SLUG: Record<HolidayId, string> = {
  newYear: 'new-year',
  lunarNewYear: 'lunar-new-year',
  valentines: 'valentines',
  chuseok: 'chuseok',
  halloween: 'halloween',
  christmasEve: 'christmas-eve',
  christmas: 'christmas',
  newYearsEve: 'new-years-eve',
}

const FUN_SLUG: Record<FunId, string> = { earlyBird: 'early-bird', nightOwl: 'night-owl' }

function streakTier(days: number): AwardTier {
  return days >= 365 ? 'diamond' : days >= 180 ? 'platinum' : days >= 60 ? 'gold' : days >= 14 ? 'silver' : 'bronze'
}

function milestoneTier(count: number): AwardTier {
  return count >= 1000 ? 'diamond' : count >= 250 ? 'platinum' : count >= 50 ? 'gold' : count >= 10 ? 'silver' : 'bronze'
}

export function holidayDate(holiday: HolidayId, year: number): [number, number] | null {
  if (holiday === 'lunarNewYear' || holiday === 'chuseok') {
    return LUNAR_DATES[holiday][year] ?? null
  }
  return FIXED_HOLIDAYS[holiday] ?? null
}

export function streakAward(days: number): AwardDef {
  return { id: `streak-${days}`, kind: 'streak', tier: streakTier(days), icon: 'flame', value: days }
}

export function milestoneAward(count: number): AwardDef {
  return { id: `workouts-${count}`, kind: 'milestone', tier: milestoneTier(count), icon: 'trophy', value: count }
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function monthAward(year: number, month: number): AwardDef {
  return { id: `month-${monthKey(year, month)}`, kind: 'month', tier: 'silver', icon: 'calendar', year, month, value: MONTH_REGULAR_DAYS }
}

export function perfectMonthAward(year: number, month: number): AwardDef {
  return { id: `perfect-month-${monthKey(year, month)}`, kind: 'perfectMonth', tier: 'gold', icon: 'crown', year, month }
}

export function holidayAward(holiday: HolidayId, year: number): AwardDef {
  return { id: `${HOLIDAY_SLUG[holiday]}-${year}`, kind: 'holiday', tier: 'gold', icon: holiday, holiday, year }
}

export function funAward(fun: FunId): AwardDef {
  return { id: FUN_SLUG[fun], kind: 'fun', tier: 'silver', icon: fun, fun, value: FUN_TARGET }
}

export function awardFromId(id: string): AwardDef | null {
  let match = id.match(/^streak-(\d+)$/)
  if (match && (STREAK_DAYS as readonly number[]).includes(Number(match[1]))) {
    return streakAward(Number(match[1]))
  }
  match = id.match(/^workouts-(\d+)$/)
  if (match && (MILESTONE_WORKOUTS as readonly number[]).includes(Number(match[1]))) {
    return milestoneAward(Number(match[1]))
  }
  match = id.match(/^(perfect-)?month-(\d{4})-(\d{2})$/)
  if (match) {
    const year = Number(match[2])
    const month = Number(match[3])
    if (month >= 1 && month <= 12) {
      return match[1] ? perfectMonthAward(year, month) : monthAward(year, month)
    }
    return null
  }
  for (const holiday of HOLIDAY_ORDER) {
    match = id.match(new RegExp(`^${HOLIDAY_SLUG[holiday]}-(\\d{4})$`))
    if (match) {
      return holidayAward(holiday, Number(match[1]))
    }
  }
  for (const fun of Object.keys(FUN_SLUG) as FunId[]) {
    if (id === FUN_SLUG[fun]) {
      return funAward(fun)
    }
  }
  return null
}

export function awardSortKey(award: AwardDef): string {
  const kindRank = { streak: 0, milestone: 1, perfectMonth: 2, month: 3, holiday: 4, fun: 5 }[award.kind]
  return `${kindRank}-${String(award.year ?? 0).padStart(4, '0')}-${String(award.month ?? 0).padStart(2, '0')}-${String(award.value ?? 0).padStart(5, '0')}-${award.id}`
}
