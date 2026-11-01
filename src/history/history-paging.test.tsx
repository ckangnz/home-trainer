import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

function completion(index: number, daysAgo: number) {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(9, 0, 0, 0)
  return {
    id: `c${index}`,
    ownerId: 'user-1',
    schemaVersion: 2,
    title: `Workout ${index}`,
    source: { kind: 'curated', id: 'classic-7-minute' },
    startedAt: date.toISOString(),
    completedAt: date.toISOString(),
    durationMs: 420000,
    exercises: 12,
    totalExercises: 12,
  }
}

const recent = Array.from({ length: 60 }, (_, index) => completion(index, Math.floor(index / 2)))
const older = Array.from({ length: 5 }, (_, index) => completion(100 + index, 40 + index))
const before = vi.fn(async () => older)

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
    onChange(recent)
    return () => {}
  },
  fetchCompletionsBefore: before,
  fetchCompletionsBetween: async () => [],
}))

const { AppProviders } = await import('@/app/App')
const { HistoryPage } = await import('@/pages/HistoryPage')

describe('history paging and calendar', () => {
  it('loads older workouts on demand and hides the button when exhausted', async () => {
    render(
      <AppProviders>
        <MemoryRouter>
          <HistoryPage />
        </MemoryRouter>
      </AppProviders>,
    )
    const more = await screen.findByRole('button', { name: 'Load older workouts' })
    expect(screen.queryByText('Workout 100')).not.toBeInTheDocument()
    await act(async () => {
      fireEvent.click(more)
    })
    expect(before).toHaveBeenCalledWith('user-1', recent[59].completedAt, 30)
    expect(await screen.findByText('Workout 100')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load older workouts' })).not.toBeInTheDocument()
  })

  it('marks worked-out days and today on the calendar', async () => {
    render(
      <AppProviders>
        <MemoryRouter>
          <HistoryPage />
        </MemoryRouter>
      </AppProviders>,
    )
    const grid = await screen.findByRole('grid')
    const today = new Date().getDate()
    const cell = within(grid).getAllByRole('gridcell').find((entry) => entry.textContent?.startsWith(String(today)))
    expect(cell?.className).toContain('is-worked')
    expect(cell?.textContent).toContain('2')
    expect(within(grid).getAllByRole('gridcell').some((entry) => entry.className.includes('is-future') || entry.className.includes('is-worked'))).toBe(true)
  })
})
