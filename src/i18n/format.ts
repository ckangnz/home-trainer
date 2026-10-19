import { useMemo } from 'react'
import type { Sided, Target } from '@/exercises/types'
import { localeFor, useLanguage } from './language'
import { translator } from './translate'
import type { Language } from './types'

export interface Formatters {
  locale: string
  seconds: (seconds: number) => string
  target: (target: Target, sided?: Sided) => string
  reps: (reps: number) => string
  duration: (ms: number) => string
  date: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string
  number: (value: number, options?: Intl.NumberFormatOptions) => string
}

const dateFormats = new Map<string, Intl.DateTimeFormat>()
const numberFormats = new Map<string, Intl.NumberFormat>()

function dateFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  let format = dateFormats.get(key)
  if (!format) {
    format = new Intl.DateTimeFormat(locale, options)
    dateFormats.set(key, format)
  }
  return format
}

function numberFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  let format = numberFormats.get(key)
  if (!format) {
    format = new Intl.NumberFormat(locale, options)
    numberFormats.set(key, format)
  }
  return format
}

export function formatters(language: Language): Formatters {
  const t = translator(language)
  const locale = localeFor(language)
  const seconds = (value: number): string => {
    if (value >= 60 && value % 60 === 0) {
      return t('units.min', { n: value / 60 })
    }
    if (value > 60) {
      return t('units.minSec', { m: Math.floor(value / 60), s: value % 60, ss: String(value % 60).padStart(2, '0') })
    }
    return t('units.sec', { n: value })
  }
  const reps = (count: number) => t('units.reps', { count })
  return {
    locale,
    seconds,
    reps,
    target: (target, sided = 'symmetric') => {
      const base = target.kind === 'reps' ? reps(target.reps) : seconds(target.seconds)
      return sided === 'perSide' ? t('units.perSide', { base }) : base
    },
    duration: (ms) => {
      const totalSeconds = Math.max(0, Math.round(ms / 1000))
      if (totalSeconds < 60) {
        return t('units.sec', { n: totalSeconds })
      }
      const minutes = Math.round(totalSeconds / 60)
      if (minutes < 60) {
        return t('units.min', { n: minutes })
      }
      const hours = Math.floor(minutes / 60)
      const rest = minutes % 60
      return rest === 0 ? t('units.hours', { h: hours }) : t('units.hoursMin', { h: hours, m: rest })
    },
    date: (value, options = { dateStyle: 'medium' }) => dateFormat(locale, options).format(new Date(value)),
    number: (value, options = {}) => numberFormat(locale, options).format(value),
  }
}

const cache = new Map<Language, Formatters>()

export function formattersFor(language: Language): Formatters {
  let value = cache.get(language)
  if (!value) {
    value = formatters(language)
    cache.set(language, value)
  }
  return value
}

export function useFormat(): Formatters {
  const language = useLanguage()
  return useMemo(() => formattersFor(language), [language])
}
