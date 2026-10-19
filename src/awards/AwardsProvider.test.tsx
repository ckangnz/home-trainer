import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { StoredProgress } from './evaluate'
import type { EarnedAward } from './types'

const saves: { awards: EarnedAward[]; progress: StoredProgress }[] = []
let existing: EarnedAward[] = []

function day(offset: number) {
  const date = new Date()
  date.setDate(date.getDate() - offset)
  date.setHours(12, 0, 0, 0)
  return date.toISOString()
}

vi.mock('@/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({ status: 'signed-in', user: { uid: 'user-1', displayName: 'Test', email: null, photoURL: null } }),
}))

vi.mock('@/data/repository', () => ({
  subscribeRoutines: (_uid: string, onChange: (value: unknown[]) => void) => {
    onChange([])
    return () => {}
  },
  subscribeCompletions: (_uid: string, onChange: (value: unknown[]) => void) => {
    onChange(
      Array.from({ length: 7 }, (_, index) => ({
        id: `c${index}`,
        ownerId: 'user-1',
        schemaVersion: 2,
        title: 'Workout',
        source: { kind: 'curated', id: 'classic-7-minute' },
        startedAt: day(index),
        completedAt: day(index),
        durationMs: 420000,
        exercises: 12,
        totalExercises: 12,
      })),
    )
    return () => {}
  },
}))

vi.mock('@/data/awards', () => ({
  subscribeAwards: (_uid: string, onChange: (awards: EarnedAward[]) => void) => {
    onChange(existing)
    return () => {}
  },
  subscribeProgress: (_uid: string, onChange: (progress: StoredProgress) => void) => {
    onChange({ totalWorkouts: 0, lastCompletedAt: null, longestStreak: 0, streakStart: null, streakEnd: null })
    return () => {}
  },
  saveAwards: async (_uid: string, awards: EarnedAward[], progress: StoredProgress) => {
    saves.push({ awards, progress })
  },
}))

const { AppProviders } = await import('@/app/App')
const { useAwards } = await import('./AwardsProvider')

function Probe() {
  const { ready, fresh, evaluation } = useAwards()
  return <p data-testid="probe">{ready ? `${evaluation.currentStreak}:${fresh.map((award) => award.id).join(',')}` : 'loading'}</p>
}

describe('AwardsProvider', () => {
  beforeEach(() => {
    saves.length = 0
    existing = []
  })

  it('records newly earned awards with progress once', async () => {
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    )
    await vi.waitFor(() => expect(saves.length).toBeGreaterThan(0))
    const ids = saves[0].awards.map((award) => award.id)
    expect(ids).toEqual(expect.arrayContaining(['streak-3', 'streak-7', 'workouts-1']))
    expect(saves[0].progress).toMatchObject({ totalWorkouts: 7, longestStreak: 7 })
    expect(screen.getByTestId('probe').textContent).toMatch(/^7:.*streak-7/)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(saves).toHaveLength(1)
  })

  it('does not re-save awards already on the account', async () => {
    existing = [{ id: 'streak-3', earnedAt: '2026-01-01T00:00:00.000Z' }, { id: 'workouts-1', earnedAt: '2026-01-01T00:00:00.000Z' }]
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    )
    await vi.waitFor(() => expect(saves.length).toBeGreaterThan(0))
    const ids = saves[0].awards.map((award) => award.id)
    expect(ids).toContain('streak-7')
    expect(ids).not.toContain('streak-3')
  })
})
