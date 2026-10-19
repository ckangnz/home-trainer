import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { GEAR_ORDER } from '@/exercises/labels'
import { CURATED_WORKOUTS } from '@/workouts/curated'
import {
  AREA_ORDER,
  DURATION_ORDER,
  GOAL_ORDER,
  NO_FILTERS,
  filterWorkouts,
  filtersFromParams,
  hasFilters,
  paramsFromFilters,
  type WorkoutFilters,
} from '@/workouts/filters'
import { WorkoutCard } from '@/components/WorkoutCard'
import { SearchField } from '@/components/SearchField'
import { usePageMeta } from '@/app/meta'
import { useHydrated } from '@/app/hydration'
import { Icon } from '@/app/Icons'
import { useContent, useT, workoutSearchText } from '@/i18n'
import './workouts.css'

const LEVELS = [1, 2, 3] as const

function ChipGroup<T extends string | number>({
  label,
  options,
  value,
  format,
  onChange,
}: {
  label: string
  options: readonly T[]
  value: T | null
  format: (option: T) => string
  onChange: (next: T | null) => void
}) {
  const t = useT()
  return (
    <div className="filter-group">
      <span className="filter-group__label">{label}</span>
      <div className="chip-row chip-row--scroll" role="group" aria-label={label}>
        <button type="button" className="chip" aria-pressed={value === null} onClick={() => onChange(null)}>
          {t('publicPages.workouts.any')}
        </button>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className="chip"
            aria-pressed={value === option}
            onClick={() => onChange(value === option ? null : option)}
          >
            {format(option)}
          </button>
        ))}
      </div>
    </div>
  )
}

export function WorkoutsPage() {
  const t = useT()
  const content = useContent()
  const { labels } = content
  usePageMeta(t('publicPages.workouts.metaTitle'), t('publicPages.workouts.metaDescription'))
  const [params, setParams] = useSearchParams()
  const hydrated = useHydrated()
  const search = params.toString()
  const filters = useMemo(() => (hydrated ? filtersFromParams(new URLSearchParams(search)) : NO_FILTERS), [hydrated, search])
  const [open, setOpen] = useState(false)
  const update = (patch: Partial<WorkoutFilters>) => setParams(paramsFromFilters({ ...filters, ...patch }), { replace: true })
  const filtered = useMemo(() => filterWorkouts(CURATED_WORKOUTS, filters, workoutSearchText(content)), [filters, content])
  const active = hasFilters(filters)
  const extra = [filters.area, filters.level, filters.gear, filters.duration].filter((value) => value !== null).length

  return (
    <div className="page workouts-page">
      <header className="page__header">
        <h1 className="page__title">{t('publicPages.workouts.title')}</h1>
        <p className="page__lead">{t('publicPages.workouts.lead', { count: CURATED_WORKOUTS.length })}</p>
        <div>
          <Link to="/app/routines/new" className="btn">
            <Icon name="plus" />
            {t('publicPages.workouts.build')}
          </Link>
        </div>
      </header>

      <div className="workout-filters stack">
        <SearchField
          label={t('publicPages.workouts.searchLabel')}
          placeholder={t('publicPages.workouts.searchPlaceholder')}
          value={filters.query}
          onChange={(query) => update({ query })}
        />
        <div className="chip-row chip-row--scroll" role="group" aria-label={t('publicPages.workouts.goal')}>
          <button type="button" className="chip" aria-pressed={filters.goal === null} onClick={() => update({ goal: null })}>
            {t('publicPages.workouts.allGoals')}
          </button>
          {GOAL_ORDER.map((goal) => (
            <button
              key={goal}
              type="button"
              className="chip"
              aria-pressed={filters.goal === goal}
              onClick={() => update({ goal: filters.goal === goal ? null : goal })}
            >
              {labels.goal[goal]}
            </button>
          ))}
        </div>
        <div className="row row--between">
          <button type="button" className="btn btn--small" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            <Icon name="grid" />
            {t('publicPages.workouts.filters')}
            {extra > 0 ? ` · ${extra}` : ''}
          </button>
          {active ? (
            <button type="button" className="btn btn--ghost btn--small" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
              {t('publicPages.workouts.clearAll')}
            </button>
          ) : null}
        </div>
        {open ? (
          <div className="card stack workout-filters__panel">
            <ChipGroup
              label={t('publicPages.workouts.area')}
              options={AREA_ORDER}
              value={filters.area}
              format={(area) => labels.area[area]}
              onChange={(area) => update({ area })}
            />
            <ChipGroup
              label={t('publicPages.workouts.level')}
              options={LEVELS}
              value={filters.level}
              format={(level) => labels.level[level]}
              onChange={(level) => update({ level })}
            />
            <ChipGroup
              label={t('publicPages.workouts.equipment')}
              options={GEAR_ORDER}
              value={filters.gear}
              format={(gear) => labels.gear[gear]}
              onChange={(gear) => update({ gear })}
            />
            <ChipGroup
              label={t('publicPages.workouts.time')}
              options={DURATION_ORDER}
              value={filters.duration}
              format={(time) => labels.duration[time]}
              onChange={(duration) => update({ duration })}
            />
          </div>
        ) : null}
      </div>

      {active ? (
        filtered.length > 0 ? (
          <section className="section">
            <p className="faint">{t('publicPages.workouts.count', { count: filtered.length })}</p>
            <div className="grid grid--wide">
              {filtered.map((workout) => (
                <WorkoutCard key={workout.id} workout={workout} />
              ))}
            </div>
          </section>
        ) : (
          <div className="empty">
            <p>{t('publicPages.workouts.empty')}</p>
            <button type="button" className="btn" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
              {t('publicPages.workouts.clearFilters')}
            </button>
          </div>
        )
      ) : (
        GOAL_ORDER.map((goal) => {
          const workouts = CURATED_WORKOUTS.filter((workout) => workout.goal === goal)
          return workouts.length > 0 ? (
            <section key={goal} className="section">
              <div className="section__head">
                <h2 className="section__title">{labels.goal[goal]}</h2>
                <button type="button" className="section__link" onClick={() => update({ goal })}>
                  {t('publicPages.workouts.seeAll', { count: workouts.length })}
                </button>
              </div>
              <div className="workout-shelf">
                {workouts.map((workout) => (
                  <WorkoutCard key={workout.id} workout={workout} />
                ))}
              </div>
            </section>
          ) : null
        })
      )}
    </div>
  )
}
