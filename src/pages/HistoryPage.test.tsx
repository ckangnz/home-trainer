import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

const now = Date.now()
const iso = (minutes: number) => new Date(now - minutes * 60000).toISOString()

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
    onChange([
      {
        id: 'recent',
        ownerId: 'user-1',
        schemaVersion: 2,
        title: 'Stretch time',
        source: { kind: 'curated', id: 'full-body-stretch' },
        startedAt: iso(40),
        completedAt: iso(30),
        durationMs: 600000,
        exercises: 2,
        totalExercises: 2,
        calories: 25,
        muscles: ['hamstrings', 'glutes'],
        exerciseIds: ['standing-hamstring-stretch', 'pigeon-pose'],
      },
      {
        id: 'old',
        ownerId: 'user-1',
        schemaVersion: 2,
        title: 'Classic 7-Minute Workout',
        source: { kind: 'curated', id: 'classic-7-minute' },
        startedAt: iso(1500),
        completedAt: iso(1490),
        durationMs: 420000,
        exercises: 12,
        totalExercises: 12,
      },
    ])
    return () => {}
  },
}))

const { AppProviders } = await import('@/app/App')
const { HistoryPage } = await import('./HistoryPage')

describe('history details', () => {
  it('expands an entry to show times, calories, type, muscles, and exercises', async () => {
    render(
      <AppProviders>
        <MemoryRouter>
          <HistoryPage />
        </MemoryRouter>
      </AppProviders>,
    )
    const recent = await screen.findByRole('button', { name: /Stretch time/, expanded: false })
    fireEvent.click(recent)
    const card = recent.closest('li') as HTMLElement
    expect(within(card).getByText('Started')).toBeInTheDocument()
    expect(within(card).getByText('25 kcal')).toBeInTheDocument()
    expect(within(card).getByText('Flexibility')).toBeInTheDocument()
    expect(within(card).getByText('Pigeon pose')).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: /Do it again/ })).toHaveAttribute('href', '/app/play/workout/full-body-stretch')

    const old = screen.getByRole('button', { name: /Classic 7-Minute Workout/, expanded: false })
    fireEvent.click(old)
    const oldCard = old.closest('li') as HTMLElement
    expect(within(oldCard).getByText(/from the workout plan/)).toBeInTheDocument()
    expect(within(oldCard).getByText('Jumping jacks')).toBeInTheDocument()
    expect(within(oldCard).getByText('High Intensity Interval Training')).toBeInTheDocument()
  })
})
