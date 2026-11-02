import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/app/Icons'
import { useToast } from '@/app/Toast'
import { useFormat, useT } from '@/i18n'
import { daysAgo, LIVE_DAYS, loadFood, useFood } from './FoodProvider'
import { FoodCalendar } from './FoodCalendar'
import { MealStatus } from './MealCard'
import { summarize } from './log'
import { dayScore, intakeOf, mealScore } from './models'
import { MEAL_SLOTS, type FoodLog, type FoodPrefs, type MealPlan } from './types'
import './food.css'

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; prefs: FoodPrefs; plans: MealPlan[]; logs: FoodLog[] | null }

const RECENT_DAYS = 7

export function FriendFood({ uid, name }: { uid: string; name: string }) {
  const t = useT()
  const fmt = useFormat()
  const { notify } = useToast()
  const navigate = useNavigate()
  const { importPlan } = useFood()
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const liveFrom = useMemo(() => daysAgo(LIVE_DAYS), [])

  useEffect(() => {
    let cancelled = false
    setLoad({ status: 'loading' })
    loadFood()
      .then(async (module) => {
        const [prefs, plans] = await Promise.all([module.fetchFoodPrefs(uid), module.fetchMealPlans(uid)])
        const logs = prefs.shareWithFriends ? await module.fetchFoodLogs(uid, liveFrom, daysAgo(0)) : null
        if (!cancelled) {
          setLoad({ status: 'ready', prefs, plans, logs })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoad({ status: 'error' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [uid, liveFrom])

  if (load.status === 'loading') {
    return (
      <div className="center" role="status" aria-label={t('food.loading')}>
        <div className="spinner" />
      </div>
    )
  }
  if (load.status === 'error') {
    return (
      <p className="notice notice--error" role="alert">
        {t('food.friend.loadFailed', { name })}
      </p>
    )
  }

  const { prefs, plans, logs } = load
  const active = plans.find((plan) => plan.id === prefs.activePlanId) ?? plans[0] ?? null
  const logMap = new Map((logs ?? []).map((log) => [log.date, log]))
  const recentDays = Array.from({ length: RECENT_DAYS }, (_, index) => daysAgo(index))
  const week = summarize(logMap, recentDays)
  const loggedDays = recentDays.filter((day) => (logMap.get(day)?.entries.length ?? 0) > 0 || logMap.get(day)?.cheat)

  const copy = (plan: MealPlan) => {
    importPlan(plan, name).then(
      () => {
        notify(t('food.friend.copied', { name: plan.name }))
        navigate('/app/food')
      },
      () => notify(t('food.editor.failed')),
    )
  }

  return (
    <div className="stack friend-food">
      {logs === null ? (
        <p className="notice">{t('food.friend.private', { name })}</p>
      ) : (
        <>
          <section className="stack stack--tight">
            <h2 className="section__title">{t('food.friend.recent')}</h2>
            {week.percent !== null ? (
              <dl className="food-summary">
                <div className="card food-tile">
                  <dt>{t('food.week.onPlanLabel')}</dt>
                  <dd className="food-tile__value">{fmt.number(week.percent / 100, { style: 'percent' })}</dd>
                  <dd className="faint">{t('food.week.onPlanMeta', { onPlan: week.onPlan, logged: week.logged })}</dd>
                </div>
                <div className="card food-tile">
                  <dt>{t('food.week.loggedLabel')}</dt>
                  <dd className="food-tile__value">
                    {week.logged}
                    <span className="food-tile__of"> / {week.total}</span>
                  </dd>
                  <dd className="faint">{t('food.week.loggedMeta')}</dd>
                </div>
              </dl>
            ) : (
              <p className="muted">{t('food.friend.nothing')}</p>
            )}
          </section>
          {loggedDays.map((day) => {
            const entries = logMap.get(day)?.entries ?? []
            const log = logMap.get(day)
            const score = dayScore(log)
            const intake = intakeOf(entries)
            return (
              <section key={day} className="card food-log-day">
                <header className="food-log-day__head">
                  <h3>{fmt.date(`${day}T12:00:00`, { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
                  <span className="faint">
                    {[log?.cheat ? t('food.cheat.toggle') : t('food.day.score', { onPlan: score.onPlan, total: score.total }), intake.kcal > 0 ? t('food.intake.kcal', { n: fmt.number(intake.kcal) }) : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </header>
                <ul className="food-log-day__meals">
                  {MEAL_SLOTS.filter((meal) => meal !== 'snacks' || entries.some((entry) => entry.meal === meal)).map((meal) => {
                    const items = entries.filter((entry) => entry.meal === meal && entry.status !== 'skipped')
                    return (
                      <li key={meal}>
                        <span className="food-log-day__meal">{t(`food.meals.${meal}`)}</span>
                        <MealStatus score={mealScore(entries, meal)} />
                        <span className="food-log-day__items">
                          {items.map((entry) => [entry.name, entry.portion].filter(Boolean).join(' · ')).join(', ')}
                          {items.some((entry) => entry.note) ? <span className="faint"> — {items.map((entry) => entry.note).filter(Boolean).join(', ')}</span> : null}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
          <FoodCalendar ownerUid={uid} logs={logMap} liveFrom={liveFrom} />
        </>
      )}

      <section className="stack stack--tight">
        <h2 className="section__title">{t('food.friend.plans')}</h2>
        {plans.length === 0 ? (
          <p className="muted">{t('food.friend.noPlans', { name })}</p>
        ) : (
          <ul className="food-plans card card--flush">
            {plans.map((plan) => (
              <li key={plan.id} className="food-plan">
                <span className="food-plan__main">
                  <strong>{plan.name}</strong>
                  <span className="faint">
                    {plan.id === active?.id ? `${t('food.plan.active')} · ` : ''}
                    {t('food.plan.options', { count: MEAL_SLOTS.reduce((sum, meal) => sum + plan.meals[meal].length, 0) })}
                  </span>
                  {plan.description ? <span className="muted food-plan__notes">{plan.description}</span> : null}
                </span>
                <button type="button" className="btn btn--small" onClick={() => copy(plan)}>
                  <Icon name="copy" />
                  {t('food.friend.copy')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
