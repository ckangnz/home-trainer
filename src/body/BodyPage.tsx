import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { useData } from '@/data/DataProvider'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { useToast } from '@/app/Toast'
import { toDateKey } from '@/history/streaks'
import { useCompletionRange } from '@/history/useCompletionRange'
import { HEIGHT_RANGE, updateSettings, useSettings } from '@/settings/settings'
import { useFormat, useT } from '@/i18n'
import { bmiBand, bmiOf, useBody, type BmiBand } from './BodyProvider'
import { BarChart, LineChart, type Band } from './BodyCharts'
import { changeOver, chartDomain, dayKey, dayNumber, entriesIn, localDayKey, niceTicks, RANGE_KEYS, rangeDomain, rangeIso, weeklyWorkouts, type RangeKey, type WeekBucket } from './series'
import { KG_RANGE } from './types'
import { BackButton } from '@/components/BackButton'
import './body.css'

const SERIES = { weight: 'var(--series-1)', bmi: 'var(--series-2)', workouts: 'var(--series-3)' }

const LIST_LIMIT = 12

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const BMI_BANDS: { band: BmiBand; from: number; to: number }[] = [
  { band: 'under', from: 0, to: 18.5 },
  { band: 'healthy', from: 18.5, to: 25 },
  { band: 'over', from: 25, to: 30 },
  { band: 'obese', from: 30, to: 100 },
]

export function BodyPage() {
  const t = useT()
  const fmt = useFormat()
  const { notify } = useToast()
  usePageMeta(t('body.metaTitle'))
  const { user } = useAuth()
  const { completions: live } = useData()
  const { ready, entries, latest, save, remove } = useBody()
  const { heightCm } = useSettings()
  const today = useMemo(() => toDateKey(new Date()), [])

  const [range, setRange] = useState<RangeKey>('3m')
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const [date, setDate] = useState(today)
  const [kg, setKg] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [height, setHeight] = useState('')
  const [heightError, setHeightError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const kgRef = useRef<HTMLInputElement>(null)

  const domain = useMemo(() => rangeDomain(range, today, entries), [range, today, entries])
  const xDomain = useMemo(() => chartDomain(domain), [domain])
  const { startIso, endIso } = useMemo(() => rangeIso(domain), [domain])
  const workouts = useCompletionRange(user?.uid ?? null, startIso, endIso, live)
  const loadedBuckets = useRef<WeekBucket[]>([])
  const buckets = useMemo(() => weeklyWorkouts(workouts.completions, domain), [workouts.completions, domain])
  if (!workouts.loading) {
    loadedBuckets.current = buckets
  }
  const shownBuckets = workouts.loading && loadedBuckets.current.length > 0 ? loadedBuckets.current : buckets
  const workoutsInRange = workouts.completions.filter((entry) => dayNumber(localDayKey(entry.completedAt)) >= domain[0]).length

  const visible = useMemo(() => entriesIn(entries, domain), [entries, domain])
  const change = changeOver(visible)
  const weightPoints = visible.map((entry) => ({ day: dayNumber(entry.date), value: entry.kg }))
  const bmiPoints = heightCm ? visible.map((entry) => ({ day: dayNumber(entry.date), value: bmiOf(entry.kg, heightCm) ?? 0 })) : []
  const latestBmi = latest ? bmiOf(latest.kg, heightCm) : null

  const kgText = (value: number, signed = false) =>
    t('units.kg', { n: fmt.number(value, { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: signed ? 'exceptZero' : 'auto' }) })
  const bmiText = (value: number) => fmt.number(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const dayDate = (day: number) => fmt.date(`${dayKey(day)}T12:00:00`, { dateStyle: 'medium' })
  const entryDate = (value: string) => fmt.date(`${value}T12:00:00`, { dateStyle: 'medium' })
  const short = domain[1] - domain[0] <= 45
  const axisDay = (day: number) => {
    const value = `${dayKey(day)}T12:00:00`
    if (short) {
      return fmt.date(value, { month: 'short', day: 'numeric' })
    }
    return new Date(value).getMonth() === 0 ? fmt.date(value, { year: 'numeric' }) : fmt.date(value, { month: 'short' })
  }
  const tick = (value: number) => fmt.number(value, { maximumFractionDigits: 1 })

  const weightTicks = niceTicks(Math.min(...weightPoints.map((point) => point.value)), Math.max(...weightPoints.map((point) => point.value)), 3, 2)
  const bmiTicks = niceTicks(Math.min(...bmiPoints.map((point) => point.value)), Math.max(...bmiPoints.map((point) => point.value)), 3, 2)
  const maxCount = Math.max(3, ...shownBuckets.map((bucket) => bucket.count))
  const countTicks = niceTicks(0, maxCount, 3, 1, true)
  const bands: Band[] = BMI_BANDS.map((item) => ({ from: item.from, to: item.to, label: t(`body.bands.${item.band}`), emphasis: item.band === 'healthy' }))

  const describeWeek = (bucket: WeekBucket) => ({
    value: t('units.workouts', { count: bucket.count }),
    meta: `${t('body.charts.weekOf', { date: fmt.date(`${dayKey(bucket.start)}T12:00:00`, { month: 'short', day: 'numeric' }) })} · ${t('body.charts.minutes', { n: bucket.minutes })}`,
  })

  const existing = entries.find((entry) => entry.date === date)

  const startEdit = (entryDateKey: string, value: number) => {
    setEditing(entryDateKey)
    setDate(entryDateKey)
    setKg(String(value))
    setFormError(null)
    formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    kgRef.current?.focus()
  }

  const resetForm = () => {
    setEditing(null)
    setDate(today)
    setKg('')
    setFormError(null)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const value = Number(kg)
    if (!DATE_PATTERN.test(date) || date > today) {
      setFormError(t('body.form.invalidDate'))
      return
    }
    if (kg.trim() === '' || !Number.isFinite(value) || value < KG_RANGE[0] || value > KG_RANGE[1]) {
      setFormError(t('body.form.invalid', { min: KG_RANGE[0], max: KG_RANGE[1] }))
      return
    }
    try {
      await save(date, value)
      notify(t('body.form.saved'))
      resetForm()
    } catch {
      setFormError(t('body.form.failed'))
    }
  }

  const saveHeight = (event: FormEvent) => {
    event.preventDefault()
    const value = Number(height)
    if (height.trim() === '' || !Number.isFinite(value) || value < HEIGHT_RANGE[0] || value > HEIGHT_RANGE[1]) {
      setHeightError(t('body.height.invalid', { min: HEIGHT_RANGE[0], max: HEIGHT_RANGE[1] }))
      return
    }
    updateSettings({ heightCm: Math.round(value) })
    setHeightError(null)
    notify(t('body.height.saved'))
  }

  const removeEntry = (entryDateKey: string) => {
    const label = entryDate(entryDateKey)
    if (window.confirm(t('body.entries.confirmRemove', { date: label }))) {
      if (editing === entryDateKey) {
        resetForm()
      }
      remove(entryDateKey).then(
        () => notify(t('body.entries.removed')),
        () => {},
      )
    }
  }

  const newestFirst = entries.map((entry, index) => ({ entry, previous: index > 0 ? entries[index - 1] : null })).reverse()
  const listed = showAll ? newestFirst : newestFirst.slice(0, LIST_LIMIT)

  return (
    <div className="page page--narrow body-page">
      <BackButton fallback="/app/history" />
      <header className="page__header">
        <h1 className="page__title">{t('body.title')}</h1>
        <p className="page__lead">{t('body.lead')}</p>
      </header>

      {!ready ? (
        <div className="center" role="status" aria-label={t('body.loading')}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          <dl className="body-summary">
            <div className="card body-tile">
              <dt>{t('body.summary.current')}</dt>
              <dd className="body-tile__value">{latest ? kgText(latest.kg) : '—'}</dd>
              {latest ? <dd className="body-tile__meta">{t('body.summary.currentOn', { date: entryDate(latest.date) })}</dd> : null}
            </div>
            <div className="card body-tile">
              <dt>{t('body.summary.change')}</dt>
              <dd className="body-tile__value">{change ? kgText(change.kg, true) : '—'}</dd>
              <dd className="body-tile__meta">{change ? t('body.summary.changeOver', { count: change.days }) : t('body.summary.changeNone')}</dd>
            </div>
            <div className="card body-tile">
              <dt>{t('body.summary.bmi')}</dt>
              <dd className="body-tile__value">{latestBmi !== null ? bmiText(latestBmi) : '—'}</dd>
              {latestBmi !== null ? <dd className="body-tile__meta">{t(`body.bands.${bmiBand(latestBmi)}`)}</dd> : null}
            </div>
            <div className="card body-tile">
              <dt>{t('body.summary.workouts')}</dt>
              <dd className="body-tile__value">{workoutsInRange}</dd>
              <dd className="body-tile__meta">{t('body.summary.workoutsIn')}</dd>
            </div>
          </dl>

          {heightCm ? (
            <p className="body-note faint">
              <Icon name="info" />
              {t('body.summary.bmiNote')}
            </p>
          ) : (
            <form className="card body-height" onSubmit={saveHeight} noValidate>
              <p>{t('body.height.prompt')}</p>
              <div className="body-height__row">
                <label className="ui-field">
                  <span className="ui-field__label">{t('body.height.label')}</span>
                  <input
                    className="ui-control"
                    type="number"
                    inputMode="numeric"
                    min={HEIGHT_RANGE[0]}
                    max={HEIGHT_RANGE[1]}
                    step={1}
                    value={height}
                    onChange={(event) => setHeight(event.target.value)}
                  />
                </label>
                <button type="submit" className="btn">
                  {t('body.height.save')}
                </button>
              </div>
              {heightError ? (
                <p className="notice notice--error" role="alert">
                  {heightError}
                </p>
              ) : null}
              <p className="faint body-height__note">{t('body.summary.bmiNote')}</p>
            </form>
          )}

          <section className="section">
            <div className="body-filters">
              <div className="segmented" role="group" aria-label={t('body.range.label')}>
                {RANGE_KEYS.map((key) => (
                  <button key={key} type="button" aria-pressed={range === key} onClick={() => setRange(key)}>
                    {t(`body.range.${key}`)}
                  </button>
                ))}
              </div>
              <button type="button" className="btn btn--small btn--ghost" aria-pressed={view === 'table'} onClick={() => setView(view === 'chart' ? 'table' : 'chart')}>
                <Icon name={view === 'chart' ? 'grid' : 'history'} />
                {view === 'chart' ? t('body.view.table') : t('body.view.chart')}
              </button>
            </div>

            {view === 'chart' ? (
              <div className="body-charts">
                <figure className="card body-chart-card">
                  <figcaption className="body-chart-card__title">{t('body.charts.weight')}</figcaption>
                  {weightPoints.length > 0 ? (
                    <LineChart
                      label={t('body.charts.weightLabel')}
                      points={weightPoints}
                      domain={xDomain}
                      y={weightTicks}
                      height={190}
                      color={SERIES.weight}
                      formatValue={(value) => kgText(value)}
                      formatTick={tick}
                      formatDay={axisDay}
                      formatDate={dayDate}
                    />
                  ) : (
                    <p className="body-chart-card__empty faint">{entries.length === 0 ? t('body.charts.empty') : t('body.charts.noWeights')}</p>
                  )}
                </figure>
                {heightCm && bmiPoints.length > 0 ? (
                  <figure className="card body-chart-card">
                    <figcaption className="body-chart-card__title">{t('body.charts.bmi')}</figcaption>
                    <LineChart
                      label={t('body.charts.bmiLabel')}
                      points={bmiPoints}
                      domain={xDomain}
                      y={bmiTicks}
                      height={150}
                      color={SERIES.bmi}
                      bands={bands}
                      formatValue={bmiText}
                      formatTick={tick}
                      formatDay={axisDay}
                      formatDate={dayDate}
                    />
                  </figure>
                ) : null}
                <figure className="card body-chart-card">
                  <figcaption className="body-chart-card__title">{t('body.charts.workouts')}</figcaption>
                  {!workouts.loading && shownBuckets.every((bucket) => bucket.count === 0) ? (
                    <p className="body-chart-card__empty faint">{t('body.charts.noWorkouts')}</p>
                  ) : (
                    <BarChart
                      label={t('body.charts.workoutsLabel')}
                      buckets={shownBuckets}
                      domain={xDomain}
                      y={countTicks}
                      height={130}
                      color={SERIES.workouts}
                      dimmed={workouts.loading}
                      formatTick={tick}
                      formatDay={axisDay}
                      describe={describeWeek}
                    />
                  )}
                </figure>
              </div>
            ) : (
              <div className="body-tables">
                <div className="card card--flush body-table-wrap">
                  <table className="body-table">
                    <caption className="visually-hidden">{t('body.charts.weightLabel')}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{t('body.table.date')}</th>
                        <th scope="col">{t('body.table.weight')}</th>
                        {heightCm ? <th scope="col">{t('body.table.bmi')}</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {visible.length === 0 ? (
                        <tr>
                          <td colSpan={heightCm ? 3 : 2}>{t('body.charts.noWeights')}</td>
                        </tr>
                      ) : (
                        [...visible].reverse().map((entry) => (
                          <tr key={entry.date}>
                            <th scope="row">{entryDate(entry.date)}</th>
                            <td>{kgText(entry.kg)}</td>
                            {heightCm ? <td>{bmiText(bmiOf(entry.kg, heightCm) ?? 0)}</td> : null}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="card card--flush body-table-wrap">
                  <table className="body-table">
                    <caption className="visually-hidden">{t('body.charts.workoutsLabel')}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{t('body.table.week')}</th>
                        <th scope="col">{t('body.table.workouts')}</th>
                        <th scope="col">{t('body.table.minutes')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...shownBuckets].reverse().map((bucket) => (
                        <tr key={bucket.start}>
                          <th scope="row">{dayDate(bucket.start)}</th>
                          <td>{bucket.count}</td>
                          <td>{bucket.minutes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <section className="section">
            <form ref={formRef} className="card body-form" onSubmit={submit} noValidate>
              <h2 className="section__title">{editing ? t('body.form.editTitle') : t('body.form.title')}</h2>
              <div className="body-form__row">
                <label className="ui-field">
                  <span className="ui-field__label">{t('body.form.date')}</span>
                  <input className="ui-control" type="date" max={today} value={date} required onChange={(event) => setDate(event.target.value)} />
                </label>
                <label className="ui-field">
                  <span className="ui-field__label">{t('body.form.weight')}</span>
                  <input
                    ref={kgRef}
                    className="ui-control"
                    type="number"
                    inputMode="decimal"
                    min={KG_RANGE[0]}
                    max={KG_RANGE[1]}
                    step={0.1}
                    value={kg}
                    required
                    onChange={(event) => setKg(event.target.value)}
                  />
                </label>
              </div>
              {existing && editing !== date ? <p className="faint body-form__hint">{t('body.form.replaces')}</p> : null}
              {formError ? (
                <p className="notice notice--error" role="alert">
                  {formError}
                </p>
              ) : null}
              <div className="body-form__actions">
                <button type="submit" className="btn btn--primary">
                  <Icon name="check" />
                  {existing ? t('body.form.update') : t('body.form.save')}
                </button>
                {editing ? (
                  <button type="button" className="btn btn--ghost" onClick={resetForm}>
                    {t('body.form.cancel')}
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <section className="section">
            <h2 className="section__title">{t('body.entries.title')}</h2>
            {entries.length === 0 ? (
              <div className="empty">
                <Icon name="scale" />
                <p>{t('body.entries.empty')}</p>
              </div>
            ) : (
              <ul className="body-entries card card--flush">
                {listed.map(({ entry, previous }) => {
                  const label = entryDate(entry.date)
                  const delta = previous ? Math.round((entry.kg - previous.kg) * 10) / 10 : null
                  return (
                    <li key={entry.date} className={`body-entry${editing === entry.date ? ' is-editing' : ''}`}>
                      <span className="body-entry__main">
                        <strong className="body-entry__kg">{kgText(entry.kg)}</strong>
                        <span className="faint">{label}</span>
                      </span>
                      <span className="body-entry__delta muted">
                        {delta === null
                          ? t('body.entries.first')
                          : t('body.entries.delta', { delta: fmt.number(delta, { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero' }) })}
                      </span>
                      <span className="body-entry__actions">
                        <button type="button" className="btn btn--ghost btn--icon" aria-label={t('body.entries.edit', { date: label })} onClick={() => startEdit(entry.date, entry.kg)}>
                          <Icon name="edit" />
                        </button>
                        <button type="button" className="btn btn--ghost btn--icon" aria-label={t('body.entries.remove', { date: label })} onClick={() => removeEntry(entry.date)}>
                          <Icon name="trash" />
                        </button>
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
            {!showAll && newestFirst.length > LIST_LIMIT ? (
              <button type="button" className="btn btn--block" onClick={() => setShowAll(true)}>
                {t('body.entries.showAll', { count: newestFirst.length - LIST_LIMIT })}
              </button>
            ) : null}
          </section>
        </>
      )}
    </div>
  )
}
