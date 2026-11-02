import { Link } from 'react-router-dom'
import { Icon } from '@/app/Icons'
import { toDateKey } from '@/history/streaks'
import { useT } from '@/i18n'
import { useFood } from './FoodProvider'
import { MealStatus } from './MealCard'
import { mealScore } from './models'
import { MEAL_SLOTS } from './types'
import './food.css'

export function FoodToday() {
  const t = useT()
  const { ready, activePlan, logs } = useFood()
  if (!ready) {
    return null
  }
  const entries = logs.get(toDateKey(new Date()))?.entries ?? []
  return (
    <Link to="/app/food" className="card food-today">
      <span className="food-today__head">
        <Icon name="food" />
        <strong>{t('food.home.title')}</strong>
        <span className="btn btn--small food-today__cta">{activePlan ? t('food.home.cta') : t('food.home.setup')}</span>
      </span>
      {activePlan ? (
        <span className="food-today__meals">
          {MEAL_SLOTS.map((meal) => (
            <span key={meal} className="food-today__meal">
              <span className="faint">{t(`food.meals.${meal}`)}</span>
              <MealStatus score={mealScore(entries, meal)} />
            </span>
          ))}
        </span>
      ) : null}
    </Link>
  )
}
