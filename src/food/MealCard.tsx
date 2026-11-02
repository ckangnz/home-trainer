import { useId, useState } from 'react'
import { Icon, type IconName } from '@/app/Icons'
import { useFormat, useT } from '@/i18n'
import { FoodPicker } from './FoodPicker'
import { intakeOf, mealScore, type MealScore } from './models'
import type { OtherFood } from './log'
import type { FoodLogEntry, FoodOption, MealSlot } from './types'

const STATUS_ICON: Record<MealScore, IconName | null> = { planned: 'check', swapped: 'swap', skipped: 'minus', missing: null }

interface MealCardProps {
  meal: MealSlot
  options: FoodOption[]
  entries: FoodLogEntry[]
  onTogglePlanned: (option: FoodOption) => void
  onAddOther: (food: OtherFood) => void
  onToggleSkipped: () => void
  onRemove: (entry: FoodLogEntry) => void
  onUpdate: (entry: FoodLogEntry, food: OtherFood) => void
}

export function MealStatus({ score }: { score: MealScore }) {
  const t = useT()
  const icon = STATUS_ICON[score]
  return (
    <span className={`meal-status is-${score}`}>
      {icon ? <Icon name={icon} /> : null}
      {t(`food.status.${score}`)}
    </span>
  )
}

export function MealCard({ meal, options, entries, onTogglePlanned, onAddOther, onToggleSkipped, onRemove, onUpdate }: MealCardProps) {
  const t = useT()
  const fmt = useFormat()
  const titleId = useId()
  const [picking, setPicking] = useState(false)
  const [editing, setEditing] = useState<FoodLogEntry | null>(null)
  const forMeal = entries.filter((entry) => entry.meal === meal)
  const score = mealScore(entries, meal)
  const chosen = new Set(forMeal.filter((entry) => entry.status === 'planned').map((entry) => entry.optionId))
  const others = forMeal.filter((entry) => entry.status === 'swapped')
  const orphans = forMeal.filter((entry) => entry.status === 'planned' && !options.some((option) => option.id === entry.optionId))
  const skipped = forMeal.length > 0 && forMeal.every((entry) => entry.status === 'skipped')
  const intake = intakeOf(forMeal)
  const mealName = t(`food.meals.${meal}`)

  const facts = (item: { portion?: string; kcal?: number; protein?: number }) =>
    [item.portion, item.kcal !== undefined ? t('food.intake.kcal', { n: fmt.number(item.kcal) }) : null, item.protein ? t('food.intake.protein', { n: fmt.number(item.protein) }) : null]
      .filter(Boolean)
      .join(' · ')

  return (
    <section className={`card meal-card is-${score}`} aria-labelledby={titleId}>
      <header className="meal-card__head">
        <h2 className="meal-card__title" id={titleId}>
          {mealName}
        </h2>
        {intake.kcal > 0 ? <span className="faint meal-card__kcal">{t('food.intake.kcal', { n: fmt.number(intake.kcal) })}</span> : null}
        <MealStatus score={score} />
      </header>

      {options.length > 0 ? (
        <ul className="meal-options" aria-label={t('food.log.pickHint')}>
          {options.map((option) => {
            const on = chosen.has(option.id)
            const detail = facts(option)
            return (
              <li key={option.id}>
                <button type="button" className={`meal-option${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => onTogglePlanned(option)}>
                  <span className="meal-option__check" aria-hidden="true">
                    {on ? <Icon name="check" /> : null}
                  </span>
                  <span className="meal-option__text">
                    <span className="meal-option__name">{option.name}</span>
                    {detail ? <span className="meal-option__facts">{detail}</span> : null}
                    {option.notes ? <span className="meal-option__facts">{option.notes}</span> : null}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="faint meal-card__empty">{t('food.log.noOptions')}</p>
      )}

      {others.length > 0 || orphans.length > 0 ? (
        <ul className="meal-extras">
          {[...orphans, ...others].map((entry) => (
            <li key={entry.id} className={`meal-extra is-${entry.status}`}>
              <Icon name={entry.status === 'planned' ? 'check' : 'swap'} />
              <button type="button" className="meal-extra__text" aria-label={t('food.log.edit', { name: entry.name })} onClick={() => setEditing(entry)}>
                <span className="meal-option__name">{entry.name}</span>
                <span className="meal-option__facts">{[facts(entry), entry.note, entry.time].filter(Boolean).join(' · ')}</span>
              </button>
              <button type="button" className="btn btn--ghost btn--icon" aria-hidden="true" tabIndex={-1} onClick={() => setEditing(entry)}>
                <Icon name="edit" />
              </button>
              <button type="button" className="btn btn--ghost btn--icon" aria-label={t('food.log.remove', { name: entry.name })} onClick={() => onRemove(entry)}>
                <Icon name="close" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="meal-card__actions">
        <button type="button" className="btn btn--small" onClick={() => setPicking(true)}>
          <Icon name="search" />
          {t('food.log.somethingElse')}
        </button>
        <button type="button" className="btn btn--small btn--ghost" aria-pressed={skipped} onClick={onToggleSkipped}>
          <Icon name="minus" />
          {t('food.log.skip')}
        </button>
      </div>

      <FoodPicker
        open={picking || editing !== null}
        title={editing ? t('food.picker.editTitle', { name: editing.name }) : t('food.picker.logTitle', { meal: mealName })}
        withNote
        editing={editing}
        onClose={() => {
          setPicking(false)
          setEditing(null)
        }}
        onPick={(choice) => {
          if (editing) {
            onUpdate(editing, choice)
          } else {
            onAddOther(choice)
          }
          setPicking(false)
          setEditing(null)
        }}
      />
    </section>
  )
}
