import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '@/data/DataProvider'
import { groupByDay, summarizeStreak } from '@/history/streaks'
import { formatDuration } from '@/workouts/steps'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import './history.css'

const DAY_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

export function HistoryPage() {
  usePageMeta('History')
  const { completions, removeCompletion, ready } = useData()
  const today = useMemo(() => new Date(), [])
  const streak = summarizeStreak(completions, today)
  const totalMs = completions.reduce((sum, completion) => sum + completion.durationMs, 0)
  const days = groupByDay(completions)

  return (
    <div className="page page--narrow">
      <header className="page__header">
        <h1 className="page__title">History</h1>
      </header>

      <dl className="history-stats">
        <div className="card">
          <dt>Current streak</dt>
          <dd>{streak.current}</dd>
        </div>
        <div className="card">
          <dt>Best streak</dt>
          <dd>{streak.longest}</dd>
        </div>
        <div className="card">
          <dt>Workouts</dt>
          <dd>{completions.length}</dd>
        </div>
        <div className="card">
          <dt>Total time</dt>
          <dd>{formatDuration(totalMs)}</dd>
        </div>
      </dl>

      {!ready ? (
        <div className="center" role="status" aria-label="Loading history">
          <div className="spinner" />
        </div>
      ) : days.length === 0 ? (
        <div className="empty">
          <p>No workouts yet. Finish one and it will show up here.</p>
          <Link to="/workouts" className="btn btn--primary">
            Find a workout
          </Link>
        </div>
      ) : (
        <div className="stack">
          {days.map((day) => (
            <section key={day.key} className="history-day">
              <h2 className="history-day__title">{DAY_FORMAT.format(new Date(`${day.key}T12:00:00`))}</h2>
              <ul className="list">
                {day.entries.map((entry) => (
                  <li key={entry.id} className="history-entry card">
                    <div className="stack stack--tight">
                      <strong>{entry.title}</strong>
                      <span className="faint">
                        {TIME_FORMAT.format(new Date(entry.completedAt))} · {formatDuration(entry.durationMs)} ·{' '}
                        {entry.exercises}/{entry.totalExercises} moves
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn--ghost btn--icon"
                      aria-label={`Remove ${entry.title} from history`}
                      onClick={() => {
                        if (window.confirm('Remove this workout from your history?')) {
                          removeCompletion(entry.id)
                        }
                      }}
                    >
                      <Icon name="trash" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
