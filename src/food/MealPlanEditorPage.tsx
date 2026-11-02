import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { useToast } from '@/app/Toast'
import { BackButton } from '@/components/BackButton'
import { useFormat, useT } from '@/i18n'
import { newId } from '@/workouts/routine'
import { FoodPicker } from './FoodPicker'
import { useFood } from './FoodProvider'
import { FOOD_LIMITS, MEAL_SLOTS, type FoodOption, type MealPlan, type MealPlanBody, type MealSlot } from './types'
import './food.css'

interface Draft {
  name: string
  description: string
  targetKcal: string
  targetProtein: string
  meals: Record<MealSlot, FoodOption[]>
}

function toDraft(plan: MealPlan): Draft {
  return {
    name: plan.name,
    description: plan.description ?? '',
    targetKcal: plan.targets?.kcal ? String(plan.targets.kcal) : '',
    targetProtein: plan.targets?.protein ? String(plan.targets.protein) : '',
    meals: plan.meals,
  }
}

function target(value: string): number | undefined {
  const parsed = Number(value)
  return value.trim() !== '' && Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : undefined
}

function fromDraft(draft: Draft): MealPlanBody {
  const body: MealPlanBody = { name: draft.name.trim(), meals: draft.meals }
  if (draft.description.trim()) body.description = draft.description.trim()
  const kcal = target(draft.targetKcal)
  const protein = target(draft.targetProtein)
  if (kcal || protein) {
    body.targets = {}
    if (kcal) body.targets.kcal = kcal
    if (protein) body.targets.protein = protein
  }
  return body
}

const EMPTY_DRAFT: Draft = { name: '', description: '', targetKcal: '', targetProtein: '', meals: { breakfast: [], lunch: [], dinner: [], snacks: [] } }

export function MealPlanEditorPage() {
  const { id } = useParams()
  const t = useT()
  const fmt = useFormat()
  const navigate = useNavigate()
  const { notify } = useToast()
  const { ready, plans, savePlan, removePlan } = useFood()
  const existing = id ? plans.find((plan) => plan.id === id) : undefined
  usePageMeta(existing ? t('food.editor.editTitle') : t('food.editor.newTitle'))
  const [draft, setDraft] = useState<Draft | null>(() => (id ? null : EMPTY_DRAFT))
  const [picking, setPicking] = useState<MealSlot | null>(null)
  const [editing, setEditing] = useState<{ meal: MealSlot; option: FoodOption } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (draft === null && existing) {
    setDraft(toDraft(existing))
  }

  if (!ready) {
    return (
      <div className="center" role="status" aria-label={t('food.loading')}>
        <div className="spinner" />
      </div>
    )
  }

  if (draft === null) {
    return (
      <div className="page page--narrow">
        <BackButton fallback="/app/food" />
        <p className="notice">{t('food.editor.notFound')}</p>
      </div>
    )
  }

  const setMeal = (meal: MealSlot, options: FoodOption[]) => setDraft({ ...draft, meals: { ...draft.meals, [meal]: options } })

  const facts = (option: FoodOption) =>
    [option.portion, option.kcal !== undefined ? t('food.intake.kcal', { n: fmt.number(option.kcal) }) : null, option.protein ? t('food.intake.protein', { n: fmt.number(option.protein) }) : null]
      .filter(Boolean)
      .join(' · ')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const body = fromDraft(draft)
    if (!body.name) {
      setError(t('food.editor.nameRequired'))
      return
    }
    if (MEAL_SLOTS.every((meal) => body.meals[meal].length === 0)) {
      setError(t('food.editor.optionsRequired'))
      return
    }
    setSaving(true)
    try {
      await savePlan(body, existing?.id)
      notify(t('food.editor.saved'))
      navigate('/app/food')
    } catch {
      setError(t('food.editor.failed'))
      setSaving(false)
    }
  }

  const remove = () => {
    if (!existing || !window.confirm(t('food.editor.confirmDelete', { name: existing.name }))) {
      return
    }
    removePlan(existing.id).then(
      () => {
        notify(t('food.editor.deleted'))
        navigate('/app/food')
      },
      () => setError(t('food.editor.failed')),
    )
  }

  return (
    <div className="page page--narrow food-editor">
      <BackButton fallback="/app/food" />
      <header className="page__header">
        <h1 className="page__title">{existing ? t('food.editor.editTitle') : t('food.editor.newTitle')}</h1>
      </header>

      <form className="stack" onSubmit={submit} noValidate>
        <div className="card stack">
          <label className="ui-field">
            <span className="ui-field__label">{t('food.editor.name')}</span>
            <input
              className="ui-control"
              value={draft.name}
              maxLength={FOOD_LIMITS.planName}
              placeholder={t('food.editor.namePlaceholder')}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </label>
          <label className="ui-field">
            <span className="ui-field__label">{t('food.editor.description')}</span>
            <textarea
              className="ui-control food-editor__notes"
              rows={2}
              value={draft.description}
              maxLength={FOOD_LIMITS.notes}
              placeholder={t('food.editor.descriptionPlaceholder')}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </label>
          <fieldset className="food-editor__targets">
            <legend className="ui-field__label">{t('food.editor.targets')}</legend>
            <div className="meal-other__row">
              <label className="ui-field">
                <span className="ui-field__label">{t('food.editor.targetKcal')}</span>
                <input className="ui-control" type="number" inputMode="numeric" min={0} value={draft.targetKcal} onChange={(event) => setDraft({ ...draft, targetKcal: event.target.value })} />
              </label>
              <label className="ui-field">
                <span className="ui-field__label">{t('food.editor.targetProtein')}</span>
                <input className="ui-control" type="number" inputMode="numeric" min={0} value={draft.targetProtein} onChange={(event) => setDraft({ ...draft, targetProtein: event.target.value })} />
              </label>
            </div>
          </fieldset>
        </div>

        {MEAL_SLOTS.map((meal) => {
          const options = draft.meals[meal]
          return (
            <fieldset key={meal} className="card food-editor__meal">
              <legend className="section__title">{t(`food.meals.${meal}`)}</legend>
              <p className="faint food-editor__hint">{t('food.editor.mealHint')}</p>
              {options.length > 0 ? (
                <ul className="food-editor__items">
                  {options.map((option) => (
                    <li key={option.id} className="food-editor__item">
                      <button
                        type="button"
                        className="meal-option__text food-editor__edit"
                        aria-label={t('food.log.edit', { name: option.name })}
                        onClick={() => setEditing({ meal, option })}
                      >
                        <span className="meal-option__name">{option.name}</span>
                        <span className="meal-option__facts">{facts(option)}</span>
                      </button>
                      <button type="button" className="btn btn--ghost btn--icon" aria-hidden="true" tabIndex={-1} onClick={() => setEditing({ meal, option })}>
                        <Icon name="edit" />
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--icon"
                        aria-label={`${t('food.editor.removeOption')}: ${option.name}`}
                        onClick={() => setMeal(meal, options.filter((item) => item.id !== option.id))}
                      >
                        <Icon name="trash" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {options.length < FOOD_LIMITS.options ? (
                <button type="button" className="btn btn--small" onClick={() => setPicking(meal)}>
                  <Icon name="plus" />
                  {t('food.editor.addFood')}
                </button>
              ) : null}
            </fieldset>
          )
        })}

        {error ? (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="food-editor__actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            <Icon name="check" />
            {t('food.editor.save')}
          </button>
          {existing ? (
            <button type="button" className="btn btn--danger" onClick={remove}>
              <Icon name="trash" />
              {t('food.editor.delete')}
            </button>
          ) : null}
        </div>
      </form>

      <FoodPicker
        open={picking !== null || editing !== null}
        title={editing ? t('food.picker.editTitle', { name: editing.option.name }) : picking ? t('food.picker.addTitle', { meal: t(`food.meals.${picking}`) }) : ''}
        editing={editing?.option}
        onClose={() => {
          setPicking(null)
          setEditing(null)
        }}
        onPick={(choice) => {
          const option: FoodOption = { id: editing?.option.id ?? newId(), name: choice.name, kcal: choice.kcal, protein: choice.protein, servings: choice.servings }
          if (choice.foodId) option.foodId = choice.foodId
          if (choice.portion) option.portion = choice.portion
          if (editing?.option.notes) option.notes = editing.option.notes
          if (editing) {
            setMeal(editing.meal, draft.meals[editing.meal].map((item) => (item.id === option.id ? option : item)))
          } else if (picking) {
            setMeal(picking, [...draft.meals[picking], option])
          }
          setPicking(null)
          setEditing(null)
        }}
      />
    </div>
  )
}
