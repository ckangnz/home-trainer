import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '@/data/DataProvider'
import { groupByDay, summarizeStreak } from '@/history/streaks'
import { getExercise } from '@/exercises'
import type { Completion } from '@/data/models'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { useContent, useFormat, useT, type Localizer } from '@/i18n'
import { AdUnit } from '@/ads/AdUnit'
import { ShareResultButton } from '@/components/Support'
import { HealthExportDialog } from '@/health/HealthExportDialog'
import { healthWorkoutFrom } from '@/health/fromCompletion'
import './history.css'

const DAY_FORMAT: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' }
const TIME_FORMAT: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }

function entryTitle(entry: Completion, content: Localizer): string {
  if (entry.source.kind === 'curated') {
    return content.workoutName({ id: entry.source.id, name: entry.title })
  }
  if (entry.source.kind === 'exercise') {
    const exercise = getExercise(entry.source.id)
    return exercise && exercise.name === entry.title ? content.exerciseName(exercise) : entry.title
  }
  return entry.title
}

export function HistoryPage() {
  const t = useT()
  const fmt = useFormat()
  const content = useContent()
  usePageMeta(t('app.history.title'))
  const { completions, removeCompletion, ready } = useData()
  const [exporting, setExporting] = useState<{ entry: Completion; title: string } | null>(null)
  const today = useMemo(() => new Date(), [])
  const streak = summarizeStreak(completions, today)
  const totalMs = completions.reduce((sum, completion) => sum + completion.durationMs, 0)
  const days = groupByDay(completions)

  return (
    <div className="page page--narrow">
      <header className="page__header">
        <h1 className="page__title">{t('app.history.title')}</h1>
      </header>

      <dl className="history-stats">
        <div className="card">
          <dt>{t('app.history.currentStreak')}</dt>
          <dd>{streak.current}</dd>
        </div>
        <div className="card">
          <dt>{t('app.history.bestStreak')}</dt>
          <dd>{streak.longest}</dd>
        </div>
        <div className="card">
          <dt>{t('app.history.workouts')}</dt>
          <dd>{completions.length}</dd>
        </div>
        <div className="card">
          <dt>{t('app.history.totalTime')}</dt>
          <dd>{fmt.duration(totalMs)}</dd>
        </div>
      </dl>

      <AdUnit placement="page" className="page-ad" />

      {!ready ? (
        <div className="center" role="status" aria-label={t('app.history.loading')}>
          <div className="spinner" />
        </div>
      ) : days.length === 0 ? (
        <div className="empty">
          <p>{t('app.history.empty')}</p>
          <Link to="/workouts" className="btn btn--primary">
            {t('app.history.findWorkout')}
          </Link>
        </div>
      ) : (
        <div className="stack">
          {days.map((day) => (
            <section key={day.key} className="history-day">
              <h2 className="history-day__title">{fmt.date(`${day.key}T12:00:00`, DAY_FORMAT)}</h2>
              <ul className="list">
                {day.entries.map((entry) => {
                  const title = entryTitle(entry, content)
                  return (
                    <li key={entry.id} className="history-entry card">
                      <div className="stack stack--tight">
                        <strong>{title}</strong>
                        <span className="faint">
                          {fmt.date(entry.completedAt, TIME_FORMAT)} · {fmt.duration(entry.durationMs)} ·{' '}
                          {t('app.history.moves', { done: entry.exercises, total: entry.totalExercises })}
                        </span>
                      </div>
                      <div className="history-entry__actions">
                        <button type="button" className="btn btn--small" onClick={() => setExporting({ entry, title })}>
                          <Icon name="heart" />
                          {t('app.history.saveToHealth')}
                        </button>
                        <ShareResultButton title={title} minutes={Math.max(1, Math.round(entry.durationMs / 60000))} className="btn btn--small" />
                        <button
                          type="button"
                          className="btn btn--ghost btn--icon"
                          aria-label={t('app.history.removeName', { name: title })}
                          onClick={() => {
                            if (window.confirm(t('app.history.confirmRemove'))) {
                              removeCompletion(entry.id)
                            }
                          }}
                        >
                          <Icon name="trash" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      {exporting ? (
        <HealthExportDialog workout={healthWorkoutFrom(exporting.entry, exporting.title)} open onClose={() => setExporting(null)} />
      ) : null}
    </div>
  )
}
