import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useData } from '@/data/DataProvider'
import { useToast } from '@/app/Toast'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { BackButton } from '@/components/BackButton'
import { ExerciseFigure } from '@/components/ExerciseFigure'
import { ExercisePicker } from '@/components/ExercisePicker'
import { Stepper } from '@/components/Stepper'
import { TextField } from '@/components/ui'
import { toDateKey } from '@/history/streaks'
import { useContent, useT } from '@/i18n'
import { useSettings } from '@/settings/settings'
import {
  LOG_LIMITS,
  buildManualCompletion,
  entryMs,
  estimateLog,
  newLogEntry,
  parseWindow,
  switchAmount,
  type LogAmount,
  type LogEntry,
} from '@/workouts/manualLog'
import './log.css'

function moveEntry(entries: LogEntry[], from: number, to: number): LogEntry[] {
  const next = [...entries]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

const AMOUNTS: LogAmount[] = ['reps', 'time']

function timeOf(date: Date): string {
  return `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`
}

function defaultWindow(): { start: string; end: string } {
  const now = new Date()
  const earliest = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(Math.max(earliest.getTime(), now.getTime() - 30 * 60_000))
  return { start: timeOf(start), end: timeOf(now) }
}

export function LogWorkoutPage() {
  const t = useT()
  const content = useContent()
  usePageMeta(t('app.log.metaTitle'))
  const navigate = useNavigate()
  const { addCompletion } = useData()
  const { notify } = useToast()
  const { weightKg } = useSettings()
  const initial = useMemo(defaultWindow, [])
  const today = toDateKey(new Date())
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today)
  const [start, setStart] = useState(initial.start)
  const [end, setEnd] = useState(initial.end)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const window = parseWindow(date, start, end, new Date())
  const activeMs = typeof window === 'string' ? null : window.endedAt.getTime() - window.startedAt.getTime()
  const calories = activeMs === null || entries.length === 0 ? null : estimateLog(entries, activeMs, weightKg)
  const exerciseMs = entries.reduce((sum, entry) => sum + entryMs(entry), 0)

  const update = (key: string, change: (entry: LogEntry) => LogEntry) =>
    setEntries((current) => current.map((entry) => (entry.key === key ? change(entry) : entry)))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (entries.length === 0) {
      setError(t('app.log.errors.noExercises'))
      return
    }
    if (typeof window === 'string') {
      setError(t(`app.log.errors.${window}`))
      return
    }
    addCompletion(
      buildManualCompletion({
        title: title.trim() || t('app.log.defaultTitle'),
        entries,
        startedAt: window.startedAt,
        endedAt: window.endedAt,
        weightKg,
      }),
    )
    notify(t('app.log.saved'))
    navigate('/app/history', { replace: true })
  }

  return (
    <div className="page page--narrow">
      <BackButton fallback="/app/history" />
      <header className="page__header">
        <h1 className="page__title">{t('app.log.title')}</h1>
        <p className="page__lead">{t('app.log.lead')}</p>
      </header>

      <form className="stack" onSubmit={submit} noValidate>
        <div className="card log-card">
          <TextField
            label={t('app.log.name')}
            value={title}
            maxLength={120}
            placeholder={t('app.log.defaultTitle')}
            onChange={(event) => setTitle(event.target.value)}
          />
          <div className="log-when">
            <label className="ui-field">
              <span className="ui-field__label">{t('app.log.date')}</span>
              <input type="date" className="ui-control" value={date} max={today} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label className="ui-field">
              <span className="ui-field__label">{t('app.log.start')}</span>
              <input type="time" className="ui-control" value={start} onChange={(event) => setStart(event.target.value)} />
            </label>
            <label className="ui-field">
              <span className="ui-field__label">{t('app.log.end')}</span>
              <input type="time" className="ui-control" value={end} onChange={(event) => setEnd(event.target.value)} />
            </label>
          </div>
        </div>

        <section className="stack stack--tight">
          <h2 className="section__title">{t('app.log.exercises')}</h2>
          {entries.length === 0 ? <p className="faint">{t('app.log.noneYet')}</p> : null}
          <ul className="list">
            {entries.map((entry, index) => (
              <li key={entry.key} className="card log-card">
                <div className="log-entry__header">
                  <Link to={`/exercises/${entry.exercise.id}`} className="log-entry__thumb stage" aria-label={t('app.log.viewExercise', { name: content.exerciseName(entry.exercise) })}>
                    <ExerciseFigure exerciseId={entry.exercise.id} lazy label="" />
                  </Link>
                  <div className="log-entry__text">
                    <strong>{content.exerciseName(entry.exercise)}</strong>
                    <span className="faint">
                      {content.labels.category[entry.exercise.category]} · {entry.exercise.muscles.slice(0, 2).map((muscle) => content.labels.muscle[muscle]).join(', ')}
                    </span>
                    <div className="log-entry__actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--icon"
                        aria-label={t('app.editor.moveUp')}
                        disabled={index === 0}
                        onClick={() => setEntries((current) => moveEntry(current, index, index - 1))}
                      >
                        <Icon name="up" />
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--icon"
                        aria-label={t('app.editor.moveDown')}
                        disabled={index === entries.length - 1}
                        onClick={() => setEntries((current) => moveEntry(current, index, index + 1))}
                      >
                        <Icon name="down" />
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--icon"
                        aria-label={t('app.log.remove', { name: content.exerciseName(entry.exercise) })}
                        onClick={() => setEntries((current) => current.filter((item) => item.key !== entry.key))}
                      >
                        <Icon name="trash" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="chip-row" role="group" aria-label={t('app.log.measure')}>
                  {AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      className="chip"
                      aria-pressed={entry.amount === amount}
                      onClick={() => update(entry.key, (current) => switchAmount(current, amount))}
                    >
                      {t(`app.log.by.${amount}`)}
                    </button>
                  ))}
                </div>
                <Stepper
                  label={t('app.log.sets')}
                  value={entry.sets}
                  min={LOG_LIMITS.sets[0]}
                  max={LOG_LIMITS.sets[1]}
                  step={1}
                  format={(value) => t('units.sets', { count: value })}
                  onChange={(sets) => update(entry.key, (current) => ({ ...current, sets }))}
                />
                {entry.amount === 'reps' ? (
                  <Stepper
                    label={t('app.log.repsPerSet')}
                    value={entry.value}
                    min={LOG_LIMITS.reps[0]}
                    max={LOG_LIMITS.reps[1]}
                    step={1}
                    format={(value) => t('units.reps', { count: value })}
                    onChange={(value) => update(entry.key, (current) => ({ ...current, value }))}
                  />
                ) : (
                  <Stepper
                    label={t('app.log.secondsPerSet')}
                    value={entry.value}
                    min={LOG_LIMITS.seconds[0]}
                    max={LOG_LIMITS.seconds[1]}
                    step={5}
                    format={(value) => t('units.sec', { n: value })}
                    onChange={(value) => update(entry.key, (current) => ({ ...current, value }))}
                  />
                )}
                {entry.exercise.sided === 'perSide' ? <p className="faint log-note">{t('app.log.perSideNote')}</p> : null}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn--block"
            disabled={entries.length >= LOG_LIMITS.entries}
            onClick={() => setPicking(true)}
          >
            <Icon name="plus" />
            {t('app.log.addExercises')}
          </button>
        </section>

        <div className="card log-estimate" aria-live="polite">
          <span className="faint">{t('app.log.estimate')}</span>
          <strong className="log-estimate__value">{calories === null ? '—' : t('units.calories', { n: calories })}</strong>
          <span className="faint">
            {t('app.log.estimateNote', { weight: weightKg })}
            {activeMs !== null && exerciseMs > activeMs ? ` ${t('app.log.longerThanWindow')}` : ''}
          </span>
        </div>

        {error ? (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn--primary btn--block">
          {t('app.log.save')}
        </button>
      </form>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        limit={LOG_LIMITS.entries - entries.length}
        onAdd={(picked) => {
          setEntries((current) => [...current, ...picked.map(newLogEntry)])
          setError(null)
        }}
      />
    </div>
  )
}
