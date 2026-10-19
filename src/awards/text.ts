import { useMemo } from 'react'
import { useFormat, useT, type MessageKey, type TFunction } from '@/i18n'
import { FUN_TARGET, MONTH_REGULAR_DAYS } from './catalog'
import type { AwardDef } from './types'

export interface AwardText {
  name: string
  description: string
}

type MonthName = (year: number, month: number) => string

export function awardText(award: AwardDef, t: TFunction, monthName: MonthName): AwardText {
  const year = award.year ?? 0
  const month = award.month ? monthName(year, award.month) : ''
  switch (award.kind) {
    case 'streak':
      return {
        name: t(`awards.names.streak.d${award.value}` as MessageKey),
        description: t('awards.descriptions.streak', { count: award.value ?? 0 }),
      }
    case 'milestone':
      return {
        name: award.value === 1 ? t('awards.names.firstWorkout') : t('awards.names.milestone', { count: award.value ?? 0 }),
        description: t('awards.descriptions.milestone', { count: award.value ?? 0 }),
      }
    case 'month':
      return {
        name: t('awards.names.month', { month, year }),
        description: t('awards.descriptions.month', { month, year, count: MONTH_REGULAR_DAYS }),
      }
    case 'perfectMonth':
      return {
        name: t('awards.names.perfectMonth', { month, year }),
        description: t('awards.descriptions.perfectMonth', { month, year }),
      }
    case 'holiday': {
      const name = t(`awards.names.holiday.${award.holiday}` as MessageKey, { year })
      return { name, description: t('awards.descriptions.holiday', { name }) }
    }
    case 'fun':
      return award.fun === 'earlyBird'
        ? { name: t('awards.names.earlyBird'), description: t('awards.descriptions.earlyBird', { count: FUN_TARGET }) }
        : { name: t('awards.names.nightOwl'), description: t('awards.descriptions.nightOwl', { count: FUN_TARGET }) }
  }
}

export function useAwardText(): (award: AwardDef) => AwardText {
  const t = useT()
  const fmt = useFormat()
  return useMemo(() => {
    const monthName: MonthName = (year, month) => fmt.date(new Date(year, month - 1, 1).toISOString(), { month: 'long' })
    return (award: AwardDef) => awardText(award, t, monthName)
  }, [t, fmt])
}
