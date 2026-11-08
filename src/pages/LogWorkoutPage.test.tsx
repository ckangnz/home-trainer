import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

const saved = vi.hoisted(() => [] as Record<string, unknown>[])

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
    onChange([])
    return () => {}
  },
  recordCompletion: async (completion: Record<string, unknown>) => {
    saved.push(completion)
  },
}))

const { AppProviders } = await import('@/app/App')
const { LogWorkoutPage } = await import('./LogWorkoutPage')

function renderPage() {
  render(
    <AppProviders>
      <MemoryRouter initialEntries={['/app/history/log']}>
        <Routes>
          <Route path="/app/history/log" element={<LogWorkoutPage />} />
          <Route path="/app/history" element={<p>History page</p>} />
        </Routes>
      </MemoryRouter>
    </AppProviders>,
  )
}

describe('log a workout', () => {
  it('asks for at least one exercise before saving', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Save to history' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Add at least one exercise.')
    expect(saved).toHaveLength(0)
  })

  it('reorders exercises', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Add exercises' }))
    const items = screen.getAllByRole('button', { pressed: false }).filter((button) => button.classList.contains('picker-item'))
    const names = items.slice(0, 2).map((item) => item.querySelector('.picker-item__name')!.textContent!)
    items.slice(0, 2).forEach((item) => fireEvent.click(item))
    fireEvent.click(screen.getByRole('button', { name: /^Add 2/ }))
    const order = () => screen.getAllByRole('listitem').filter((item) => item.classList.contains('log-card')).map((item) => item.querySelector('strong')!.textContent)
    expect(order()).toEqual(names)
    fireEvent.click(screen.getAllByRole('button', { name: 'Move down' })[0])
    expect(order()).toEqual([names[1], names[0]])
    expect(screen.getAllByRole('button', { name: 'Move up' })[0]).toBeDisabled()
  })

  it('rejects an end time before the start time', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '10:00' } })
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '09:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add exercises' }))
    fireEvent.click(screen.getAllByRole('button', { pressed: false }).find((button) => button.classList.contains('picker-item'))!)
    fireEvent.click(screen.getByRole('button', { name: /^Add 1/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save to history' }))
    expect(screen.getByRole('alert')).toHaveTextContent('end time must be after')
    expect(saved).toHaveLength(0)
  })

  it('logs picked exercises with a time window and shows the calorie estimate', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-01-05' } })
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '09:45' } })
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'PT session' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add exercises' }))
    fireEvent.click(screen.getAllByRole('button', { pressed: false }).find((button) => button.classList.contains('picker-item'))!)
    fireEvent.click(screen.getByRole('button', { name: /^Add 1/ }))
    expect(screen.getByText(/\d+ kcal/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save to history' }))
    await waitFor(() => expect(saved).toHaveLength(1))
    expect(saved[0]).toMatchObject({
      title: 'PT session',
      durationMs: 45 * 60_000,
      source: { kind: 'manual', id: 'manual' },
      startedAt: new Date('2026-01-05T09:00:00').toISOString(),
      completedAt: new Date('2026-01-05T09:45:00').toISOString(),
    })
    expect(saved[0].calories as number).toBeGreaterThan(0)
    expect(await screen.findByText('History page')).toBeInTheDocument()
  })
})
