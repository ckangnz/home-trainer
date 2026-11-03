import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/app/Icons'
import { toDateKey } from '@/history/streaks'
import { useFormat, useT } from '@/i18n'
import { dayStatus, type DayStatus } from './log'
import type { FoodLog } from './types'
import { loadFood } from './FoodProvider'
import '@/history/calendar.css'

interface FoodCalendarProps {
  ownerUid: string | null
  logs: Map<string, FoodLog>
  liveFrom: string
  selected?: string
  onSelect?: (day: string, log: FoodLog | undefined) => void
}

const STATUS_KEY: Record<Exclude<DayStatus, 'none'>, 'food.calendar.allOnPlan' | 'food.calendar.someOnPlan' | 'food.calendar.offPlan' | 'food.calendar.cheat'> = {
  all: 'food.calendar.allOnPlan',
  some: 'food.calendar.someOnPlan',
  off: 'food.calendar.offPlan',
  cheat: 'food.calendar.cheat',
}

export function FoodCalendar({ ownerUid, logs, liveFrom, selected, onSelect }: FoodCalendarProps) {
  const t = useT()
  const fmt = useFormat()
  const today = useMemo(() => new Date(), [])
  const todayKey = toDateKey(today)
  const [cursor, setCursor] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }))
  const [older, setOlder] = useState<Map<string, FoodLog>>(new Map())
  const [loading, setLoading] = useState(false)
  const first = toDateKey(new Date(cursor.year, cursor.month, 1))
  const last = toDateKey(new Date(cursor.year, cursor.month + 1, 0))

  useEffect(() => {
    if (ownerUid === null || first >= liveFrom) {
      return
    }
    let cancelled = false
    setLoading(true)
    loadFood()
      .then((module) => module.fetchFoodLogs(ownerUid, first, last))
      .then((fetched) => {
        if (!cancelled) {
          setOlder((current) => new Map([...current, ...fetched.map((log) => [log.date, log] as const)]))
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [ownerUid, first, last, liveFrom])

  const logFor = (key: string) => (key >= liveFrom ? logs.get(key) : (logs.get(key) ?? older.get(key)))
  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay()
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const cells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => {
    if (index < firstWeekday) {
      return null
    }
    const day = index - firstWeekday + 1
    const key = toDateKey(new Date(cursor.year, cursor.month, day))
    return { day, key, status: dayStatus(logFor(key)) }
  })
  const weekdays = Array.from({ length: 7 }, (_, index) => fmt.date(new Date(2026, 1, 1 + index).toISOString(), { weekday: 'narrow' }))
  const perfect = cells.filter((cell) => cell?.status === 'all').length
  const isCurrent = cursor.year === today.getFullYear() && cursor.month === today.getMonth()
  const monthLabel = fmt.date(new Date(cursor.year, cursor.month, 1).toISOString(), { month: 'long', year: 'numeric' })
  const move = (delta: number) =>
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })

  return (
    <section className="card month-calendar food-calendar" aria-busy={loading}>
      <header className="month-calendar__head">
        <button type="button" className="btn btn--ghost btn--icon" aria-label={t('food.calendar.previous')} onClick={() => move(-1)}>
          <Icon name="back" />
        </button>
        <div className="month-calendar__title">
          <span className="faint">{t('food.calendar.title')}</span>
          <strong>{monthLabel}</strong>
        </div>
        <button type="button" className="btn btn--ghost btn--icon" aria-label={t('food.calendar.next')} disabled={isCurrent} onClick={() => move(1)}>
          <Icon name="forward" />
        </button>
      </header>
      <div className="month-calendar__grid" role="grid" aria-label={monthLabel}>
        {weekdays.map((weekday, index) => (
          <span key={`w${index}`} className="month-calendar__weekday" aria-hidden="true">
            {weekday}
          </span>
        ))}
        {cells.map((cell, index) => {
          if (!cell) {
            return <span key={`e${index}`} aria-hidden="true" />
          }
          const label = t('food.calendar.dayLabel', {
            date: fmt.date(`${cell.key}T12:00:00`, { month: 'long', day: 'numeric' }),
            status: cell.status === 'none' ? t('food.status.missing') : t(STATUS_KEY[cell.status]),
          })
          const className = `month-calendar__day food-cal-day is-${cell.status}${cell.key === todayKey ? ' is-today' : ''}${cell.key === selected ? ' is-selected' : ''}${cell.key > todayKey ? ' is-future' : ''}`
          const selectable = onSelect && cell.key <= todayKey
          return selectable ? (
            <button key={cell.key} type="button" role="gridcell" className={className} aria-label={label} aria-selected={cell.key === selected} onClick={() => onSelect(cell.key, logFor(cell.key))}>
              <span className="month-calendar__number">{cell.day}</span>
            </button>
          ) : (
            <span key={cell.key} role="gridcell" className={className} aria-label={label}>
              <span className="month-calendar__number">{cell.day}</span>
            </span>
          )
        })}
      </div>
      <footer className="month-calendar__foot food-calendar__foot">
        <span className="month-calendar__legend">
          <span className="food-swatch is-all" aria-hidden="true" />
          {t('food.calendar.allOnPlan')}
        </span>
        <span className="month-calendar__legend">
          <span className="food-swatch is-some" aria-hidden="true" />
          {t('food.calendar.someOnPlan')}
        </span>
        <span className="month-calendar__legend">
          <span className="food-swatch is-off" aria-hidden="true" />
          {t('food.calendar.offPlan')}
        </span>
        <span className="month-calendar__legend">
          <span className="food-swatch is-cheat" aria-hidden="true" />
          {t('food.calendar.cheat')}
        </span>
        <span className="faint">{t('food.calendar.onPlanDays', { count: perfect })}</span>
        {loading ? <span className="spinner spinner--small" role="status" aria-label={t('food.loading')} /> : null}
      </footer>
      {onSelect && !selected ? <p className="faint food-calendar__hint">{t('food.calendar.hint')}</p> : null}
    </section>
  )
}
