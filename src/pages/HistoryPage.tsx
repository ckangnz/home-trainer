import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '@/data/DataProvider'
import { groupByDay } from '@/history/streaks'
import { earnedAwards, useAwards } from '@/awards/AwardsProvider'
import { useBody } from '@/body/BodyProvider'
import { useAuth } from '@/auth/AuthProvider'
import { loadRepository } from '@/data/lazy'
import { PAGE_SIZE, RECENT_LIMIT } from '@/data/limits'
import { MonthCalendar } from '@/history/MonthCalendar'
import { useToast } from '@/app/Toast'
import { getExercise } from '@/exercises'
import type { Completion } from '@/data/models'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { useContent, useFormat, useT, type Localizer } from '@/i18n'
import { AdUnit } from '@/ads/AdUnit'
import { ShareResultButton } from '@/components/Support'
import { HealthExportDialog } from '@/health/HealthExportDialog'
import { healthWorkoutFrom } from '@/health/fromCompletion'
import { getCuratedWorkout } from '@/workouts/curated'
import { HistoryDetails } from './HistoryDetails'
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

function dayCalories(entries: Completion[]): number {
  return entries.reduce((sum, entry) => sum + (entry.calories ?? 0), 0)
}

export function HistoryPage() {
  const t = useT()
  const fmt = useFormat()
  const content = useContent()
  usePageMeta(t('app.history.title'))
  const { completions, removeCompletion, ready, getRoutine } = useData()
  const { user } = useAuth()
  const { notify } = useToast()
  const itemsOf = (completion: Completion): string[] => {
    const { kind, id } = completion.source
    const items = kind === 'curated' ? getCuratedWorkout(id)?.items : kind === 'routine' ? getRoutine(id)?.items : undefined
    return items ? items.map((item) => item.exerciseId) : kind === 'exercise' ? [id] : []
  }
  const [exporting, setExporting] = useState<{ entry: Completion; title: string } | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const { evaluation, earned } = useAwards()
  const { latest } = useBody()
  const awardCount = earnedAwards(earned).length
  const streak = { current: evaluation.currentStreak, longest: evaluation.progress.longestStreak }
  const totalMs = evaluation.progress.totalMs
  const [older, setOlder] = useState<Completion[]>([])
  const [loadingMore, setLoadingMore] = useState(false)
  const [exhausted, setExhausted] = useState(false)
  const shown = useMemo(() => {
    const byId = new Map([...completions, ...older].map((entry) => [entry.id, entry]))
    return [...byId.values()].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))
  }, [completions, older])
  const days = groupByDay(shown)
  const canLoadMore = !exhausted && completions.length >= RECENT_LIMIT
  const loadMore = async () => {
    const oldest = shown.at(-1)
    if (!user || !oldest) {
      return
    }
    setLoadingMore(true)
    try {
      const page = await (await loadRepository()).fetchCompletionsBefore(user.uid, oldest.completedAt, PAGE_SIZE)
      setOlder((current) => [...current, ...page])
      if (page.length < PAGE_SIZE) {
        setExhausted(true)
      }
    } catch {
      notify(t('app.history.loadMoreFailed'))
    } finally {
      setLoadingMore(false)
    }
  }

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
          <dd>{evaluation.progress.totalWorkouts}</dd>
        </div>
        <div className="card">
          <dt>{t('app.history.totalTime')}</dt>
          <dd>{fmt.duration(totalMs)}</dd>
        </div>
      </dl>

      <Link to="/app/history/log" className="btn btn--block">
        <Icon name="plus" />
        {t('app.history.logWorkout')}
      </Link>

      <div className="history-links">
        <Link to="/app/awards" className="card history-link">
          <span className="history-link__icon">
            <Icon name="trophy" />
          </span>
          <span className="history-link__text">
            <strong>{t('awards.open')}</strong>
            <span className="faint">{t('awards.earnedCount', { count: awardCount })}</span>
          </span>
          <Icon name="forward" />
        </Link>
        <Link to="/app/body" className="card history-link">
          <span className="history-link__icon">
            <Icon name="scale" />
          </span>
          <span className="history-link__text">
            <strong>{latest ? t('units.kg', { n: fmt.number(latest.kg, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }) : t('body.open')}</strong>
            <span className="faint">
              {latest ? `${t('body.open')} · ${t('body.summary.currentOn', { date: fmt.date(`${latest.date}T12:00:00`, { month: 'short', day: 'numeric' }) })}` : t('body.openEmpty')}
            </span>
          </span>
          <Icon name="forward" />
        </Link>
      </div>

      <MonthCalendar ownerUid={user?.uid ?? null} live={completions} />

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
              <div className="history-day__header">
                <h2 className="history-day__title">{fmt.date(`${day.key}T12:00:00`, DAY_FORMAT)}</h2>
                {dayCalories(day.entries) > 0 ? <span className="faint">{t('app.history.dayCalories', { n: dayCalories(day.entries) })}</span> : null}
              </div>
              <ul className="list">
                {day.entries.map((entry) => {
                  const title = entryTitle(entry, content)
                  return (
                    <li key={entry.id} className="history-entry card">
                      <button
                        type="button"
                        className="history-entry__summary"
                        aria-expanded={openId === entry.id}
                        aria-label={`${title} · ${openId === entry.id ? t('app.history.hideDetails') : t('app.history.details')}`}
                        onClick={() => setOpenId(openId === entry.id ? null : entry.id)}
                      >
                        <span className="stack stack--tight">
                          <strong>{title}</strong>
                          <span className="faint">
                            {fmt.date(entry.completedAt, TIME_FORMAT)} · {fmt.duration(entry.durationMs)} ·{' '}
                            {t('app.history.moves', { done: entry.exercises, total: entry.totalExercises })}
                            {entry.calories !== undefined ? ` · ${entry.calories} kcal` : ''}
                          </span>
                        </span>
                        <Icon name={openId === entry.id ? 'up' : 'down'} />
                      </button>
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
                      {openId === entry.id ? <HistoryDetails entry={entry} itemsOf={itemsOf} /> : null}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
          {canLoadMore ? (
            <button type="button" className="btn btn--block" disabled={loadingMore} onClick={() => void loadMore()}>
              {loadingMore ? t('app.history.loadingMore') : t('app.history.loadMore')}
            </button>
          ) : null}
        </div>
      )}
      {exporting ? (
        <HealthExportDialog workout={healthWorkoutFrom(exporting.entry, exporting.title, itemsOf)} open onClose={() => setExporting(null)} />
      ) : null}
    </div>
  )
}
