import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { useToast } from '@/app/Toast'
import { toDateKey } from '@/history/streaks'
import { useFormat, useT } from '@/i18n'
import { daysAgo, useFood } from './FoodProvider'
import { FoodCalendar } from './FoodCalendar'
import { MealCard } from './MealCard'
import { addOther, clockTime, removeEntry, summarize, togglePlanned, toggleSkipped, updateEntry } from './log'
import { dayScore, intakeOf } from './models'
import { MEAL_SLOTS, type FoodLogEntry } from './types'
import './food.css'

function shiftDay(key: string, delta: number): string {
  const [year, month, day] = key.split('-').map(Number)
  return toDateKey(new Date(year, month - 1, day + delta))
}

export function FoodPage() {
  const t = useT()
  const fmt = useFormat()
  const { notify } = useToast()
  usePageMeta(t('food.metaTitle'))
  const { user } = useAuth()
  const { ready, plans, prefs, activePlan, logs, liveFrom, saveLog, setActivePlan, setShareWithFriends } = useFood()
  const today = useMemo(() => toDateKey(new Date()), [])
  const [day, setDay] = useState(today)
  const entries = logs.get(day)?.entries ?? []
  const cheat = logs.get(day)?.cheat === true
  const score = dayScore(logs.get(day))
  const intake = intakeOf(entries)
  const targets = activePlan?.targets
  const week = useMemo(() => summarize(logs, Array.from({ length: 7 }, (_, index) => daysAgo(index))), [logs])

  const dayLabel =
    day === today ? t('food.day.today') : day === shiftDay(today, -1) ? t('food.day.yesterday') : fmt.date(`${day}T12:00:00`, { weekday: 'long', month: 'short', day: 'numeric' })

  const commit = (next: FoodLogEntry[], nextCheat = cheat) => {
    saveLog(day, next, nextCheat).catch(() => notify(t('food.log.failed')))
  }
  const time = day === today ? clockTime() : undefined

  const toggleShare = (share: boolean) => {
    setShareWithFriends(share).then(
      () => notify(share ? t('food.share.on') : t('food.share.off')),
      () => notify(t('food.log.failed')),
    )
  }

  if (!ready) {
    return (
      <div className="center" role="status" aria-label={t('food.loading')}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="page page--narrow food-page">
      <header className="page__header">
        <h1 className="page__title">{t('food.title')}</h1>
        <p className="page__lead">{t('food.lead')}</p>
      </header>

      {!activePlan ? (
        <section className="card food-empty">
          <Icon name="food" />
          <h2 className="section__title">{t('food.plan.emptyTitle')}</h2>
          <p className="muted">{t('food.plan.emptyBody')}</p>
          <Link to="/app/food/plans/new" className="btn btn--primary">
            <Icon name="plus" />
            {t('food.plan.emptyAction')}
          </Link>
        </section>
      ) : (
        <>
          <div className="food-day">
            <button type="button" className="btn btn--ghost btn--icon" aria-label={t('food.day.previous')} disabled={day <= liveFrom} onClick={() => setDay(shiftDay(day, -1))}>
              <Icon name="back" />
            </button>
            <div className="food-day__label" aria-live="polite">
              <strong>{dayLabel}</strong>
              <span className="faint">
                {cheat ? t('food.cheat.on') : score.logged > 0 ? t('food.day.score', { onPlan: score.onPlan, total: score.total }) : t('food.day.scoreNone')}
              </span>
            </div>
            <button type="button" className="btn btn--ghost btn--icon" aria-label={t('food.day.next')} disabled={day >= today} onClick={() => setDay(shiftDay(day, 1))}>
              <Icon name="forward" />
            </button>
          </div>

          <div className="food-today-bar">
            <div className="food-intake" aria-label={t('food.intake.title')}>
              <span className="food-intake__item">
                <strong>{fmt.number(intake.kcal)}</strong>
                <span className="faint">{targets?.kcal ? t('food.intake.ofKcal', { n: fmt.number(targets.kcal) }) : 'kcal'}</span>
                {targets?.kcal ? <span className="food-intake__bar" style={{ '--fill': `${Math.min(100, (intake.kcal / targets.kcal) * 100)}%` } as CSSProperties} /> : null}
              </span>
              <span className="food-intake__item">
                <strong>{fmt.number(intake.protein)} g</strong>
                <span className="faint">{targets?.protein ? t('food.intake.ofProtein', { n: fmt.number(targets.protein) }) : t('food.intake.proteinLabel')}</span>
                {targets?.protein ? <span className="food-intake__bar" style={{ '--fill': `${Math.min(100, (intake.protein / targets.protein) * 100)}%` } as CSSProperties} /> : null}
              </span>
            </div>
            <button type="button" className={`btn btn--small food-cheat${cheat ? ' is-on' : ''}`} aria-pressed={cheat} onClick={() => commit(entries, !cheat)}>
              <Icon name="heart" />
              {t('food.cheat.toggle')}
            </button>
          </div>
          {cheat ? <p className="notice food-cheat-note">{t('food.cheat.hint')}</p> : null}

          <div className={`food-meals${cheat ? ' is-cheat' : ''}`}>
            {MEAL_SLOTS.map((meal) => (
              <MealCard
                key={`${day}-${meal}`}
                meal={meal}
                options={activePlan.meals[meal]}
                entries={entries}
                onTogglePlanned={(option) => commit(togglePlanned(entries, meal, option, time))}
                onAddOther={(food) => commit(addOther(entries, meal, food, time))}
                onToggleSkipped={() => commit(toggleSkipped(entries, meal, time))}
                onRemove={(entry) => commit(removeEntry(entries, entry.id))}
                onUpdate={(entry, food) => commit(updateEntry(entries, entry.id, food))}
              />
            ))}
          </div>

          <section className="section">
            <h2 className="section__title">{t('food.week.title')}</h2>
            {week.percent === null && week.averageKcal === null ? (
              <p className="muted">{t('food.week.none')}</p>
            ) : (
              <dl className="food-summary">
                <div className="card food-tile">
                  <dt>{t('food.week.onPlanLabel')}</dt>
                  <dd className="food-tile__value">{week.percent === null ? '—' : fmt.number(week.percent / 100, { style: 'percent' })}</dd>
                  <dd className="faint">
                    {t('food.week.onPlanMeta', { onPlan: week.onPlan, logged: week.logged })}
                    {week.cheatDays > 0 ? ` · ${t('food.cheat.days', { count: week.cheatDays })}` : ''}
                  </dd>
                </div>
                <div className="card food-tile">
                  <dt>{t('food.week.loggedLabel')}</dt>
                  <dd className="food-tile__value">
                    {week.logged}
                    <span className="food-tile__of"> / {week.total}</span>
                  </dd>
                  <dd className="faint">{t('food.week.loggedMeta')}</dd>
                </div>
                <div className="card food-tile food-tile--wide">
                  <dt>{t('food.intake.averageLabel')}</dt>
                  <dd className="food-tile__value">{week.averageKcal === null ? '—' : t('food.intake.kcal', { n: fmt.number(week.averageKcal) })}</dd>
                  <dd className="faint">{week.averageProtein === null ? t('food.intake.none') : t('food.intake.averageMeta', { protein: fmt.number(week.averageProtein) })}</dd>
                </div>
              </dl>
            )}
          </section>

          <FoodCalendar ownerUid={user?.uid ?? null} logs={logs} liveFrom={liveFrom} selected={day} onSelect={setDay} />

          <section className="section">
            <div className="section__head">
              <h2 className="section__title">{t('food.plan.section')}</h2>
              <Link to="/app/food/plans/new" className="btn btn--small">
                <Icon name="plus" />
                {t('food.plan.new')}
              </Link>
            </div>
            <ul className="food-plans card card--flush">
              {plans.map((plan) => {
                const active = plan.id === activePlan.id
                const count = MEAL_SLOTS.reduce((sum, meal) => sum + plan.meals[meal].length, 0)
                return (
                  <li key={plan.id} className={`food-plan${active ? ' is-active' : ''}`}>
                    <span className="food-plan__main">
                      <strong>{plan.name}</strong>
                      <span className="faint">
                        {active ? `${t('food.plan.active')} · ` : ''}
                        {t('food.plan.options', { count })}
                        {plan.source?.ownerName ? ` · ${t('food.plan.fromFriend', { name: plan.source.ownerName })}` : ''}
                      </span>
                    </span>
                    {!active ? (
                      <button type="button" className="btn btn--small btn--ghost" onClick={() => void setActivePlan(plan.id)}>
                        {t('food.plan.switch')}
                      </button>
                    ) : null}
                    <Link to={`/app/food/plans/${plan.id}`} className="btn btn--ghost btn--icon" aria-label={`${t('food.plan.edit')}: ${plan.name}`}>
                      <Icon name="edit" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}

      <section className="section">
        <label className="switch card food-share">
          <span>
            <strong>{t('food.share.label')}</strong>
            <span className="faint food-share__hint">{t('food.share.hint')}</span>
          </span>
          <input type="checkbox" checked={prefs.shareWithFriends} onChange={(event) => toggleShare(event.target.checked)} />
        </label>
      </section>
    </div>
  )
}
