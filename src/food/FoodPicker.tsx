import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Icon } from '@/app/Icons'
import { useToast } from '@/app/Toast'
import { Dialog } from '@/components/Dialog'
import { useFormat, useLanguage, useT, type Formatters, type TFunction } from '@/i18n'
import { CATEGORY_ICONS, customToItem, FOOD_CATEGORIES, loadFoodList, sameCustomFood, scaled, searchFoods } from './db/search'
import type { FoodCategory, FoodItem } from './db/types'
import { useFood } from './FoodProvider'
import { FOOD_LIMITS } from './types'

export interface FoodChoice {
  name: string
  portion?: string
  note?: string
  kcal: number
  protein: number
  foodId?: string
  servings: number
}

export interface EditableFood {
  name: string
  portion?: string
  note?: string
  kcal?: number
  protein?: number
  foodId?: string
  servings?: number
}

interface FoodPickerProps {
  open: boolean
  title: string
  withNote?: boolean
  editing?: EditableFood | null
  onClose: () => void
  onPick: (choice: FoodChoice) => void
}

type Filter = FoodCategory | 'mine' | null

const STEP = 0.5

export function foodName(food: FoodItem, language: string): string {
  return language === 'ko' && food.ko ? food.ko : food.name
}

export function servingText(food: FoodItem, servings: number, t: TFunction, fmt: Formatters): string {
  if (food.label) {
    return servings === 1 ? food.label : `${fmt.number(servings)} × ${food.label}`
  }
  const amount = food.qty * servings
  const base = t(`food.units.${food.unit}`, { count: amount, n: fmt.number(amount, { maximumFractionDigits: 2 }) })
  return food.grams && food.unit !== 'g' && food.unit !== 'ml' ? `${base} (${t('food.units.grams', { n: fmt.number(Math.round(food.grams * servings)) })})` : base
}

function fromEntry(entry: EditableFood): FoodItem {
  const servings = entry.servings ?? 1
  return {
    id: entry.foodId ?? '',
    name: entry.name,
    qty: 1,
    unit: 'serving',
    label: servings === 1 ? entry.portion : undefined,
    kcal: (entry.kcal ?? 0) / servings,
    protein: (entry.protein ?? 0) / servings,
    category: 'meals',
    custom: true,
  }
}

type CustomDraft = { id?: string; name: string; serving: string; kcal: string; protein: string }

export function FoodPicker({ open, title, withNote, editing, onClose, onPick }: FoodPickerProps) {
  const t = useT()
  const fmt = useFormat()
  const { notify } = useToast()
  const language = useLanguage()
  const { customFoods, addCustomFood, updateCustomFood, removeCustomFood } = useFood()
  const [foods, setFoods] = useState<FoodItem[] | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>(null)
  const [selected, setSelected] = useState<FoodItem | null>(null)
  const [servings, setServings] = useState(1)
  const [note, setNote] = useState('')
  const [custom, setCustom] = useState<CustomDraft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const seeded = useRef(false)

  useEffect(() => {
    if (open && foods === null) {
      loadFoodList().then(setFoods, () => setFoods([]))
    }
  }, [open, foods])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setFilter(null)
      setSelected(null)
      setCustom(null)
      setNote('')
      setError(null)
      seeded.current = false
    }
  }, [open])

  const mine = useMemo(() => customFoods.map(customToItem), [customFoods])

  useEffect(() => {
    if (!open || !editing || seeded.current || foods === null) {
      return
    }
    seeded.current = true
    const known = editing.foodId ? [...mine, ...foods].find((food) => food.id === editing.foodId) : undefined
    setSelected(known ?? fromEntry(editing))
    setServings(editing.servings ?? 1)
    setNote(editing.note ?? '')
  }, [open, editing, foods, mine])

  useEffect(() => {
    if (selected?.id.startsWith('custom:')) {
      const fresh = mine.find((food) => food.id === selected.id)
      if (fresh && (fresh.kcal !== selected.kcal || fresh.protein !== selected.protein || fresh.name !== selected.name || fresh.label !== selected.label)) {
        setSelected(fresh)
      }
    }
  }, [mine, selected])
  const results = useMemo(() => {
    if (filter === 'mine') {
      return searchFoods(mine, query, null, 60)
    }
    return searchFoods([...mine, ...(foods ?? [])], query, filter, 60)
  }, [foods, mine, query, filter])

  const choose = (food: FoodItem) => {
    setSelected(food)
    setServings(1)
  }

  const add = () => {
    if (!selected) {
      return
    }
    const nutrition = scaled(selected, servings)
    onPick({
      name: foodName(selected, language),
      portion: servingText(selected, servings, t, fmt),
      note: note.trim() || undefined,
      kcal: nutrition.kcal,
      protein: nutrition.protein,
      foodId: selected.id || undefined,
      servings,
    })
  }

  const editCustom = (food: FoodItem) => {
    const source = customFoods.find((item) => `custom:${item.id}` === food.id)
    if (source) {
      setCustom({ id: source.id, name: source.name, serving: source.serving, kcal: String(source.kcal), protein: String(source.protein) })
    }
  }

  const deleteCustomFood = async (id: string, name: string) => {
    if (!window.confirm(t('food.picker.confirmDeleteCustom', { name }))) {
      return
    }
    try {
      await removeCustomFood(id)
      setCustom(null)
      setSelected(null)
      setError(null)
      notify(t('food.picker.customDeleted', { name }))
    } catch {
      setError(t('food.picker.customFailed'))
    }
  }

  const saveCustom = async (event: FormEvent) => {
    event.preventDefault()
    if (!custom) {
      return
    }
    const kcal = Number(custom.kcal)
    const protein = Number(custom.protein || 0)
    if (!custom.name.trim()) {
      setError(t('food.picker.customNameRequired'))
      return
    }
    if (custom.kcal.trim() === '' || !Number.isFinite(kcal) || kcal < 0 || !Number.isFinite(protein) || protein < 0) {
      setError(t('food.picker.customKcalRequired'))
      return
    }
    const values = { name: custom.name.trim(), serving: custom.serving.trim(), kcal: Math.round(kcal), protein: Math.round(protein) }
    const duplicate = customFoods.find((item) => item.id !== custom.id && sameCustomFood(item, values))
    if (duplicate && custom.id) {
      setError(t('food.picker.customDuplicate'))
      return
    }
    setSaving(true)
    try {
      if (custom.id) {
        const updated = await updateCustomFood(custom.id, values)
        setSelected(customToItem(updated))
        notify(t('food.picker.customUpdated'))
      } else if (duplicate) {
        choose(customToItem(duplicate))
        notify(t('food.picker.customExists'))
      } else {
        choose(customToItem(await addCustomFood(values)))
        notify(t('food.picker.customSaved'))
      }
      setCustom(null)
      setError(null)
    } catch {
      setError(t('food.picker.customFailed'))
    } finally {
      setSaving(false)
    }
  }

  const nutritionText = (kcal: number, protein: number) => t('food.picker.nutrition', { kcal: fmt.number(kcal), protein: fmt.number(protein) })

  return (
    <Dialog open={open} title={title} onClose={onClose}>
      {custom ? (
        <form className="food-picker__custom" onSubmit={(event) => void saveCustom(event)} noValidate>
          <button type="button" className="btn btn--ghost btn--small food-picker__back" onClick={() => setCustom(null)}>
            <Icon name="back" />
            {custom.id ? t('food.picker.backToFood') : t('food.picker.back')}
          </button>
          <label className="ui-field">
            <span className="ui-field__label">{t('food.picker.customName')}</span>
            <input className="ui-control" value={custom.name} maxLength={FOOD_LIMITS.name} autoFocus onChange={(event) => setCustom({ ...custom, name: event.target.value })} />
          </label>
          <label className="ui-field">
            <span className="ui-field__label">{t('food.picker.customServing')}</span>
            <input
              className="ui-control"
              value={custom.serving}
              maxLength={FOOD_LIMITS.portion}
              placeholder={t('food.picker.customServingPlaceholder')}
              onChange={(event) => setCustom({ ...custom, serving: event.target.value })}
            />
          </label>
          <div className="meal-other__row">
            <label className="ui-field">
              <span className="ui-field__label">{t('food.picker.customKcal')}</span>
              <input className="ui-control" type="number" inputMode="numeric" min={0} value={custom.kcal} onChange={(event) => setCustom({ ...custom, kcal: event.target.value })} />
            </label>
            <label className="ui-field">
              <span className="ui-field__label">{t('food.picker.customProtein')}</span>
              <input className="ui-control" type="number" inputMode="numeric" min={0} value={custom.protein} onChange={(event) => setCustom({ ...custom, protein: event.target.value })} />
            </label>
          </div>
          {error ? (
            <p className="notice notice--error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="food-picker__actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              <Icon name="check" />
              {custom.id ? t('food.picker.customUpdate') : t('food.picker.customSave')}
            </button>
            {custom.id ? (
              <button type="button" className="btn btn--ghost btn--danger" onClick={() => void deleteCustomFood(custom.id as string, custom.name)}>
                <Icon name="trash" />
                {t('food.picker.deleteCustom')}
              </button>
            ) : null}
          </div>
        </form>
      ) : selected ? (
        <div className="food-picker__detail">
          <button type="button" className="btn btn--ghost btn--small food-picker__back" onClick={() => setSelected(null)}>
            <Icon name={editing ? 'swap' : 'back'} />
            {editing ? t('food.picker.change') : t('food.picker.back')}
          </button>
          <div className="food-picker__chosen">
            <strong>
              <span className="food-icon" aria-hidden="true">
                {CATEGORY_ICONS[selected.custom ? 'mine' : selected.category]}
              </span>
              {foodName(selected, language)}
            </strong>
            <span className="muted">{servingText(selected, servings, t, fmt)}</span>
            {selected.id.startsWith('custom:') ? (
              <button type="button" className="btn btn--ghost btn--small food-picker__edit" onClick={() => editCustom(selected)}>
                <Icon name="edit" />
                {t('food.picker.editCustom')}
              </button>
            ) : null}
          </div>
          <div className="food-picker__amount">
            <span className="ui-field__label">{t('food.picker.servings')}</span>
            <div className="stepper">
              <button type="button" className="btn btn--icon" aria-label={t('food.picker.fewer')} disabled={servings <= STEP} onClick={() => setServings(Math.max(STEP, servings - STEP))}>
                <Icon name="minus" />
              </button>
              <output aria-live="polite">{fmt.number(servings)}</output>
              <button type="button" className="btn btn--icon" aria-label={t('food.picker.more')} disabled={servings >= 20} onClick={() => setServings(Math.min(20, servings + STEP))}>
                <Icon name="plus" />
              </button>
            </div>
          </div>
          <p className="food-picker__total">{nutritionText(scaled(selected, servings).kcal, scaled(selected, servings).protein)}</p>
          {withNote ? (
            <label className="ui-field">
              <span className="ui-field__label">{t('food.picker.note')}</span>
              <input className="ui-control" value={note} maxLength={FOOD_LIMITS.notes} onChange={(event) => setNote(event.target.value)} />
            </label>
          ) : null}
          <button type="button" className="btn btn--primary" onClick={add}>
            <Icon name={editing ? 'check' : 'plus'} />
            {editing ? t('food.picker.save') : t('food.picker.add')}
          </button>
          {!selected.custom ? <p className="faint food-picker__estimate">{t('food.picker.estimate')}</p> : null}
        </div>
      ) : (
        <div className="food-picker">
          <label className="food-picker__search">
            <Icon name="search" />
            <input
              className="ui-control"
              type="search"
              value={query}
              autoFocus
              aria-label={t('food.picker.search')}
              placeholder={t('food.picker.searchPlaceholder')}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="chip-row chip-row--scroll" role="group" aria-label={t('food.picker.search')}>
            <button type="button" className={`chip${filter === null ? ' chip--active' : ''}`} aria-pressed={filter === null} onClick={() => setFilter(null)}>
              {t('food.categories.all')}
            </button>
            {mine.length > 0 ? (
              <button type="button" className={`chip${filter === 'mine' ? ' chip--active' : ''}`} aria-pressed={filter === 'mine'} onClick={() => setFilter('mine')}>
                <span className="food-icon" aria-hidden="true">
                  {CATEGORY_ICONS.mine}
                </span>
                {t('food.categories.mine')}
              </button>
            ) : null}
            {FOOD_CATEGORIES.map((category) => (
              <button key={category} type="button" className={`chip${filter === category ? ' chip--active' : ''}`} aria-pressed={filter === category} onClick={() => setFilter(category)}>
                <span className="food-icon" aria-hidden="true">
                  {CATEGORY_ICONS[category]}
                </span>
                {t(`food.categories.${category}`)}
              </button>
            ))}
          </div>
          {foods === null ? (
            <div className="center" role="status" aria-label={t('food.loading')}>
              <div className="spinner" />
            </div>
          ) : results.length === 0 ? (
            <p className="muted food-picker__empty">{t('food.picker.noResults', { query })}</p>
          ) : (
            <ul className="food-picker__results">
              {results.map((food) => (
                <li key={food.id} className="food-result-row">
                  <button type="button" className="food-result" onClick={() => choose(food)}>
                    <span className="food-result__icon" aria-hidden="true">
                      {CATEGORY_ICONS[food.custom ? 'mine' : food.category]}
                    </span>
                    <span className="food-result__text">
                      <span className="food-result__name">
                        {foodName(food, language)}
                        {food.custom ? <span className="food-result__mine">{t('food.picker.mine')}</span> : null}
                      </span>
                      <span className="faint">{servingText(food, 1, t, fmt)}</span>
                    </span>
                    <span className="food-result__facts">
                      <span className="food-result__kcal">
                        <strong>{fmt.number(food.kcal)}</strong> kcal
                      </span>
                      <span className="faint">{t('food.intake.protein', { n: fmt.number(food.protein) })}</span>
                    </span>
                  </button>
                  {food.custom ? (
                    <button
                      type="button"
                      className="btn btn--icon btn--ghost btn--danger food-result__delete"
                      aria-label={t('food.picker.deleteCustomNamed', { name: food.name })}
                      onClick={() => void deleteCustomFood(food.id.replace(/^custom:/, ''), food.name)}
                    >
                      <Icon name="trash" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="btn btn--block" onClick={() => setCustom({ name: query.trim(), serving: '', kcal: '', protein: '' })}>
            <Icon name="plus" />
            {query.trim() ? t('food.picker.addCustomNamed', { query: query.trim() }) : t('food.picker.addCustom')}
          </button>
        </div>
      )}
    </Dialog>
  )
}
