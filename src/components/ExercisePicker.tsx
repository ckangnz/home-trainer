import { useEffect, useMemo, useState } from 'react'
import { EXERCISES } from '@/exercises'
import { CATEGORY_ORDER } from '@/exercises/labels'
import type { Category, ExerciseInfo } from '@/exercises/types'
import { matchesQuery } from '@/exercises/search'
import { Icon } from '@/app/Icons'
import { useContent, useT } from '@/i18n'
import { Dialog } from './Dialog'
import { SearchField } from './SearchField'
import { ExerciseFigure } from './ExerciseFigure'

interface ExercisePickerProps {
  open: boolean
  onClose: () => void
  onAdd: (exercises: ExerciseInfo[]) => void
  limit?: number
}

export function ExercisePicker({ open, onClose, onAdd, limit = Infinity }: ExercisePickerProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | null>(null)
  const [selected, setSelected] = useState<ExerciseInfo[]>([])
  const t = useT()
  const content = useContent()
  const { labels, language } = content

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return EXERCISES.filter((exercise) => {
      if (category && exercise.category !== category && !exercise.tags.includes(category)) {
        return false
      }
      if (!needle) {
        return true
      }
      return matchesQuery(exercise, needle, language)
    })
  }, [query, category, language])

  useEffect(() => {
    if (open) {
      setSelected([])
    }
  }, [open])

  const full = selected.length >= limit

  const toggle = (exercise: ExerciseInfo) => {
    setSelected((current) =>
      current.some((entry) => entry.id === exercise.id)
        ? current.filter((entry) => entry.id !== exercise.id)
        : current.length >= limit
          ? current
          : [...current, exercise],
    )
  }

  const close = () => {
    setSelected([])
    onClose()
  }

  const confirm = () => {
    if (selected.length > 0) {
      onAdd(selected)
    }
    close()
  }

  return (
    <Dialog open={open} title={t('app.components.picker.title')} onClose={close}>
      <SearchField label={t('app.components.picker.search')} placeholder={t('app.components.picker.placeholder')} value={query} onChange={setQuery} />
      <div className="chip-row chip-row--scroll" role="group" aria-label={t('app.components.picker.byCategory')}>
        <button type="button" className="chip" aria-pressed={category === null} onClick={() => setCategory(null)}>
          {t('common.all')}
        </button>
        {CATEGORY_ORDER.map((entry) => (
          <button
            key={entry}
            type="button"
            className="chip"
            aria-pressed={category === entry}
            onClick={() => setCategory(category === entry ? null : entry)}
          >
            {labels.category[entry]}
          </button>
        ))}
      </div>
      <ul className="picker-list">
        {results.map((exercise) => {
          const order = selected.findIndex((entry) => entry.id === exercise.id)
          const picked = order >= 0
          return (
            <li key={exercise.id}>
              <button
                type="button"
                className="picker-item"
                aria-pressed={picked}
                disabled={!picked && full}
                onClick={() => toggle(exercise)}
              >
                <span className="picker-item__thumb stage">
                  <ExerciseFigure exerciseId={exercise.id} lazy playing={false} label="" />
                </span>
                <span className="picker-item__text">
                  <span className="picker-item__name">{content.exerciseName(exercise)}</span>
                  <span className="faint">
                    {labels.category[exercise.category]} · {labels.level[exercise.level]}
                  </span>
                </span>
                <span className="picker-item__check" aria-hidden="true">
                  {picked ? order + 1 : <Icon name="plus" />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="picker-footer">
        {selected.length > 0 ? (
          <button type="button" className="btn btn--ghost btn--small" onClick={() => setSelected([])}>
            {t('app.components.picker.clear')}
          </button>
        ) : (
          <span className="faint">{full ? t('app.components.picker.limit', { max: limit }) : t('app.components.picker.hint')}</span>
        )}
        <button type="button" className="btn btn--primary" onClick={confirm}>
          {selected.length > 0 ? t('app.components.picker.addSelected', { count: selected.length }) : t('common.done')}
        </button>
      </div>
    </Dialog>
  )
}
