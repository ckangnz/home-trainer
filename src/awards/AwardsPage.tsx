import { useMemo } from 'react'
import { useData } from '@/data/DataProvider'
import { usePageMeta } from '@/app/meta'
import { useFormat, useT } from '@/i18n'
import { toDateKey } from '@/history/streaks'
import { Badge } from './Badge'
import { HOLIDAY_ORDER, MILESTONE_WORKOUTS, MONTH_REGULAR_DAYS, STREAK_DAYS, awardSortKey, funAward, holidayAward, holidayDate, milestoneAward, monthAward, perfectMonthAward, streakAward } from './catalog'
import { monthProgress } from './evaluate'
import { earnedAwards, useAwards } from './AwardsProvider'
import { useAwardText } from './text'
import type { AwardDef, AwardProgress } from './types'
import './awards.css'

interface Tile {
  award: AwardDef
  status: string
  progress?: AwardProgress
  earned: boolean
  highlight?: boolean
}

function AwardTile({ tile }: { tile: Tile }) {
  const text = useAwardText()(tile.award)
  return (
    <li className={`award-tile${tile.earned ? ' is-earned' : ''}${tile.highlight ? ' is-highlight' : ''}`} title={text.description}>
      <Badge award={tile.award} state={tile.earned ? 'earned' : 'locked'} size="md" label={text.name} />
      <span className="award-tile__name">{text.name}</span>
      <span className="award-tile__status faint">{tile.status}</span>
      {tile.progress && !tile.earned ? (
        <span className="award-tile__bar" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (tile.progress.current / tile.progress.target) * 100)}%` }} />
        </span>
      ) : null}
    </li>
  )
}

function TileGrid({ title, tiles }: { title: string; tiles: Tile[] }) {
  if (tiles.length === 0) {
    return null
  }
  return (
    <section className="section">
      <h2 className="section__title">{title}</h2>
      <ul className="award-grid">
        {tiles.map((tile) => (
          <AwardTile key={tile.award.id} tile={tile} />
        ))}
      </ul>
    </section>
  )
}

export function AwardsPage() {
  const t = useT()
  const fmt = useFormat()
  usePageMeta(t('awards.metaTitle'))
  const { completions } = useData()
  const { ready, earned, evaluation } = useAwards()
  const today = useMemo(() => new Date(), [])
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const todayKey = toDateKey(today)

  const status = (award: AwardDef, fallback: string) => {
    const entry = earned.get(award.id)
    return entry ? t('awards.status.earned', { date: fmt.date(entry.earnedAt, { dateStyle: 'medium' }) }) : fallback
  }
  const tile = (award: AwardDef, fallback: string, progress?: AwardProgress, highlight = false): Tile => ({
    award,
    status: status(award, fallback),
    progress,
    earned: earned.has(award.id),
    highlight,
  })
  const progressText = (progress: AwardProgress) => t('awards.status.progress', { current: Math.min(progress.current, progress.target), target: progress.target })

  const thisMonth = monthProgress(completions, year, month)
  const next: Tile[] = [
    evaluation.next.streak ? tile(evaluation.next.streak.award, progressText(evaluation.next.streak.progress), evaluation.next.streak.progress, true) : null,
    evaluation.next.milestone ? tile(evaluation.next.milestone.award, progressText(evaluation.next.milestone.progress), evaluation.next.milestone.progress, true) : null,
    tile(monthAward(year, month), progressText({ current: thisMonth.days, target: MONTH_REGULAR_DAYS }), { current: thisMonth.days, target: MONTH_REGULAR_DAYS }, true),
    tile(perfectMonthAward(year, month), progressText({ current: thisMonth.days, target: thisMonth.total }), { current: thisMonth.days, target: thisMonth.total }, true),
  ].filter((entry): entry is Tile => entry !== null && !entry.earned)

  const months: Tile[] = Array.from({ length: 12 }, (_, index) => index + 1).flatMap((number) => {
    const regular = monthAward(year, number)
    const perfect = perfectMonthAward(year, number)
    const fallback = number < month ? t('awards.status.missed') : number === month ? progressText({ current: thisMonth.days, target: MONTH_REGULAR_DAYS }) : t('awards.status.locked')
    return earned.has(perfect.id) ? [tile(perfect, fallback)] : [tile(regular, fallback)]
  })

  const holidays: Tile[] = HOLIDAY_ORDER.flatMap((holiday) => {
    const date = holidayDate(holiday, year)
    if (!date) {
      return []
    }
    const key = `${year}-${String(date[0]).padStart(2, '0')}-${String(date[1]).padStart(2, '0')}`
    const when = fmt.date(new Date(year, date[0] - 1, date[1]).toISOString(), { month: 'short', day: 'numeric' })
    const fallback = key === todayKey ? t('awards.status.today') : key < todayKey ? t('awards.status.missed') : t('awards.status.upcoming', { date: when })
    return [tile(holidayAward(holiday, year), fallback, undefined, key === todayKey)]
  })

  const streaks = STREAK_DAYS.map((days) => tile(streakAward(days), progressText({ current: evaluation.currentStreak, target: days })))
  const milestones = MILESTONE_WORKOUTS.map((count) => tile(milestoneAward(count), progressText({ current: evaluation.progress.totalWorkouts, target: count })))
  const fun = [tile(funAward('earlyBird'), t('awards.status.locked')), tile(funAward('nightOwl'), t('awards.status.locked'))]
  const shown = new Set([...next, ...months, ...holidays, ...streaks, ...milestones, ...fun].map((entry) => entry.award.id))
  const older = earnedAwards(earned)
    .filter((entry) => !shown.has(entry.award.id))
    .sort((a, b) => (awardSortKey(a.award) < awardSortKey(b.award) ? 1 : -1))
    .map((entry) => tile(entry.award, ''))

  return (
    <div className="page awards-page">
      <header className="page__header">
        <h1 className="page__title">{t('awards.title')}</h1>
        <p className="page__lead">{t('awards.lead')}</p>
        {ready ? <p className="awards-page__count">{t('awards.earnedCount', { count: earned.size })}</p> : null}
      </header>
      {!ready ? (
        <div className="center" role="status" aria-label={t('awards.title')}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          <TileGrid title={t('awards.sections.next')} tiles={next} />
          <TileGrid title={t('awards.sections.months', { year })} tiles={months} />
          <TileGrid title={t('awards.sections.holidays', { year })} tiles={holidays} />
          <TileGrid title={t('awards.sections.streaks')} tiles={streaks} />
          <TileGrid title={t('awards.sections.milestones')} tiles={milestones} />
          <TileGrid title={t('awards.sections.fun')} tiles={fun} />
          <TileGrid title={t('awards.sections.earned')} tiles={older} />
        </>
      )}
    </div>
  )
}
