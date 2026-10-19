export type AwardKind = 'streak' | 'milestone' | 'month' | 'perfectMonth' | 'holiday' | 'fun'

export type AwardTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

export type HolidayId = 'newYear' | 'lunarNewYear' | 'valentines' | 'chuseok' | 'halloween' | 'christmasEve' | 'christmas' | 'newYearsEve'

export type FunId = 'earlyBird' | 'nightOwl'

export type AwardIcon = 'flame' | 'trophy' | 'calendar' | 'crown' | HolidayId | FunId

export interface AwardDef {
  id: string
  kind: AwardKind
  tier: AwardTier
  icon: AwardIcon
  value?: number
  year?: number
  month?: number
  holiday?: HolidayId
  fun?: FunId
}

export interface EarnedAward {
  id: string
  earnedAt: string
}

export interface AwardProgress {
  current: number
  target: number
}
