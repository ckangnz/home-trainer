import { useMemo, useState } from 'react'
import type { Completion } from '@/data/models'
import { useFormat, useT } from '@/i18n'
import { Icon } from '@/app/Icons'
import { toDateKey } from './streaks'
import { useCompletionRange } from './useCompletionRange'
import './calendar.css'

interface MonthCalendarProps {
  ownerUid: string | null
  live: Completion[]
  title?: string
}

function monthBounds(year: number, month: number): { start: Date; end: Date } {
  return { start: new Date(year, month, 1), end: new Date(year, month + 1, 1) }
}

export function MonthCalendar({ ownerUid, live, title }: MonthCalendarProps) {
  const t = useT()
  const fmt = useFormat()
  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }))
  const { start, end } = monthBounds(cursor.year, cursor.month)
  const range = useCompletionRange(ownerUid, start.toISOString(), end.toISOString(), live)
  const earliest = useMemo(() => {
    const dates = [...live, ...range.completions].map((entry) => entry.completedAt).sort()
    return dates.length > 0 ? toDateKey(new Date(dates[0])) : null
  }, [live, range.completions])

  const counts = new Map<string, number>()
  for (const entry of range.completions) {
    const key = toDateKey(new Date(entry.completedAt))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const todayKey = toDateKey(today)
  const firstWeekday = start.getDay()
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const cells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => {
    if (index < firstWeekday) {
      return null
    }
    const day = index - firstWeekday + 1
    const key = toDateKey(new Date(cursor.year, cursor.month, day))
    const count = counts.get(key) ?? 0
    const past = key < todayKey
    const status = count > 0 ? 'worked' : key === todayKey ? 'today' : past && earliest !== null && key >= earliest ? 'missed' : past ? 'before' : 'future'
    return { day, key, count, status }
  })
  const weekdays = Array.from({ length: 7 }, (_, index) => fmt.date(new Date(2026, 1, 1 + index).toISOString(), { weekday: 'narrow' }))
  const worked = [...counts.keys()].length
  const missed = cells.filter((cell) => cell?.status === 'missed').length
  const isCurrent = cursor.year === today.getFullYear() && cursor.month === today.getMonth()
  const move = (delta: number) =>
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })

  return (
    <section className="card month-calendar" aria-busy={range.loading}>
      <header className="month-calendar__head">
        <button type="button" className="btn btn--ghost btn--icon" aria-label={t('app.calendar.previous')} onClick={() => move(-1)}>
          <Icon name="back" />
        </button>
        <div className="month-calendar__title">
          {title ? <span className="faint">{title}</span> : null}
          <strong>{fmt.date(start.toISOString(), { month: 'long', year: 'numeric' })}</strong>
        </div>
        <button type="button" className="btn btn--ghost btn--icon" aria-label={t('app.calendar.next')} disabled={isCurrent} onClick={() => move(1)}>
          <Icon name="forward" />
        </button>
      </header>
      <div className="month-calendar__grid" role="grid" aria-label={fmt.date(start.toISOString(), { month: 'long', year: 'numeric' })}>
        {weekdays.map((weekday, index) => (
          <span key={`w${index}`} className="month-calendar__weekday" aria-hidden="true">
            {weekday}
          </span>
        ))}
        {cells.map((cell, index) =>
          cell ? (
            <span
              key={cell.key}
              role="gridcell"
              className={`month-calendar__day is-${cell.status}`}
              aria-label={`${fmt.date(new Date(cursor.year, cursor.month, cell.day).toISOString(), { month: 'long', day: 'numeric' })}: ${
                cell.status === 'worked' ? t('app.calendar.workouts', { count: cell.count }) : cell.status === 'missed' ? t('app.calendar.missed') : ''
              }`}
            >
              <span className="month-calendar__number">{cell.day}</span>
              {cell.count > 1 ? <span className="month-calendar__count">{cell.count}</span> : null}
            </span>
          ) : (
            <span key={`e${index}`} aria-hidden="true" />
          ),
        )}
      </div>
      <footer className="month-calendar__foot">
        <span className="month-calendar__legend">
          <span className="month-calendar__swatch is-worked" aria-hidden="true" />
          {t('app.calendar.workedDays', { count: worked })}
        </span>
        <span className="month-calendar__legend">
          <span className="month-calendar__swatch is-missed" aria-hidden="true" />
          {t('app.calendar.missedDays', { count: missed })}
        </span>
        {range.loading ? <span className="spinner spinner--small" role="status" aria-label={t('app.calendar.loading')} /> : null}
      </footer>
    </section>
  )
}
