import type { ReactNode } from 'react'
import { Dialog } from '@/components/Dialog'
import { useFormat, useT } from '@/i18n'
import { MealStatus } from './MealCard'
import { dayScore, intakeOf, mealScore } from './models'
import { MEAL_SLOTS, type FoodLog } from './types'

interface FoodDayLogProps {
  day: string
  log: FoodLog | undefined
  action?: ReactNode
  inDialog?: boolean
}

function formatDay(fmt: ReturnType<typeof useFormat>, day: string): string {
  return fmt.date(`${day}T12:00:00`, { weekday: 'long', month: 'short', day: 'numeric' })
}

export function FoodDayDialog({ viewing, action, onClose }: { viewing: { day: string; log: FoodLog | undefined } | null; action?: ReactNode; onClose: () => void }) {
  const t = useT()
  const fmt = useFormat()
  return (
    <Dialog open={viewing !== null} title={viewing ? t('food.history.dayTitle', { date: formatDay(fmt, viewing.day) }) : ''} onClose={onClose}>
      {viewing ? <FoodDayLog day={viewing.day} log={viewing.log} action={action} inDialog /> : null}
    </Dialog>
  )
}

export function FoodDayLog({ day, log, action, inDialog = false }: FoodDayLogProps) {
  const t = useT()
  const fmt = useFormat()
  const entries = log?.entries ?? []
  const score = dayScore(log)
  const intake = intakeOf(entries)
  const empty = entries.length === 0 && !log?.cheat
  const summary = [
    log?.cheat ? t('food.cheat.toggle') : score.logged > 0 ? t('food.day.score', { onPlan: score.onPlan, total: score.total }) : null,
    intake.kcal > 0 ? t('food.intake.kcal', { n: fmt.number(intake.kcal) }) : null,
    intake.protein > 0 ? t('food.intake.protein', { n: fmt.number(intake.protein) }) : null,
  ].filter(Boolean)

  return (
    <section className={inDialog ? 'food-log-day food-log-day--dialog' : 'card food-log-day'} aria-label={inDialog ? undefined : t('food.history.dayTitle', { date: formatDay(fmt, day) })}>
      {inDialog ? (
        summary.length > 0 ? <p className="faint food-log-day__summary">{summary.join(' · ')}</p> : null
      ) : (
        <header className="food-log-day__head">
          <h3>{formatDay(fmt, day)}</h3>
          {summary.length > 0 ? <span className="faint">{summary.join(' · ')}</span> : null}
        </header>
      )}
      {empty ? (
        <p className="muted">{t('food.history.nothing')}</p>
      ) : (
        <ul className="food-log-day__meals">
          {MEAL_SLOTS.filter((meal) => meal !== 'snacks' || entries.some((entry) => entry.meal === meal)).map((meal) => {
            const items = entries.filter((entry) => entry.meal === meal && entry.status !== 'skipped')
            return (
              <li key={meal}>
                <span className="food-log-day__meal">{t(`food.meals.${meal}`)}</span>
                <MealStatus score={mealScore(entries, meal)} />
                {items.length > 0 ? (
                  <ul className="food-log-day__items">
                    {items.map((entry) => (
                      <li key={entry.id}>
                        <span>{[entry.name, entry.portion].filter(Boolean).join(' · ')}</span>
                        {entry.kcal !== undefined || entry.protein !== undefined ? (
                          <span className="faint">
                            {' '}
                            {[entry.kcal !== undefined ? t('food.intake.kcal', { n: fmt.number(entry.kcal) }) : null, entry.protein !== undefined ? t('food.intake.protein', { n: fmt.number(entry.protein) }) : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        ) : null}
                        {entry.note ? <span className="faint food-log-day__note">{entry.note}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
      {action}
    </section>
  )
}
