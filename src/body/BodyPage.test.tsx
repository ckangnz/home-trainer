import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { WeightEntry } from './types'

const store = vi.hoisted(() => ({
  entries: [] as WeightEntry[],
  listener: null as ((entries: WeightEntry[]) => void) | null,
  saved: [] as WeightEntry[],
  deleted: [] as string[],
}))

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
  fetchCompletionsBetween: async () => [],
}))

vi.mock('@/data/body', () => ({
  subscribeWeights: (_uid: string, onChange: (entries: WeightEntry[]) => void) => {
    store.listener = onChange
    onChange(store.entries)
    return () => {
      store.listener = null
    }
  },
  saveWeight: async (_uid: string, entry: WeightEntry) => {
    store.saved.push(entry)
  },
  deleteWeight: async (_uid: string, date: string) => {
    store.deleted.push(date)
  },
}))

const { AppProviders } = await import('@/app/App')
const { BodyPage } = await import('./BodyPage')
const { updateSettings } = await import('@/settings/settings')
const { toDateKey } = await import('@/history/streaks')

const daysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return toDateKey(date)
}

function renderPage() {
  return render(
    <AppProviders>
      <MemoryRouter>
        <BodyPage />
      </MemoryRouter>
    </AppProviders>,
  )
}

beforeEach(() => {
  store.entries = [
    { date: daysAgo(20), kg: 82, updatedAt: '' },
    { date: daysAgo(10), kg: 81.4, updatedAt: '' },
    { date: daysAgo(2), kg: 80.2, updatedAt: '' },
  ]
  store.saved = []
  store.deleted = []
  updateSettings({ heightCm: null })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('body page', () => {
  it('summarizes the latest weight and change, and asks for height before BMI', async () => {
    renderPage()
    const current = (await screen.findByText('Current weight')).closest('div') as HTMLElement
    expect(within(current).getByText('80.2 kg')).toBeInTheDocument()
    const change = screen.getByText('Change').closest('div') as HTMLElement
    expect(within(change).getByText('-1.8 kg')).toBeInTheDocument()
    expect(within(change).getByText('over 18 days')).toBeInTheDocument()
    expect(screen.getAllByText('Add your height to see your BMI.').length).toBeGreaterThan(0)
    expect(screen.queryByRole('img', { name: 'BMI over time chart' })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Weight over time chart' })).toBeInTheDocument()
    expect(await screen.findByText('No workouts in this range.')).toBeInTheDocument()
  })

  it('shows BMI with its band once height is set', async () => {
    renderPage()
    await screen.findByText('Current weight')
    fireEvent.change(screen.getByLabelText('Height (cm)'), { target: { value: '180' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save height' }))
    const tile = (await screen.findByText('BMI', { selector: 'dt' })).closest('div') as HTMLElement
    expect(within(tile).getByText('24.8')).toBeInTheDocument()
    expect(within(tile).getByText('Healthy range')).toBeInTheDocument()
    expect(screen.getByText('BMI is a general indicator, not medical advice.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'BMI over time chart' })).toBeInTheDocument()
  })

  it('adds a new entry and edits an existing one', async () => {
    renderPage()
    await screen.findByText('Current weight')
    const form = screen.getByRole('heading', { name: 'Log weight' }).closest('form') as HTMLElement
    fireEvent.change(within(form).getByLabelText('Weight (kg)'), { target: { value: '79.9' } })
    await act(async () => {
      fireEvent.click(within(form).getByRole('button', { name: 'Save' }))
    })
    expect(store.saved).toEqual([expect.objectContaining({ date: daysAgo(0), kg: 79.9 })])
    expect(within(screen.getByText('Current weight').closest('div') as HTMLElement).getByText('79.9 kg')).toBeInTheDocument()

    fireEvent.change(within(form).getByLabelText('Weight (kg)'), { target: { value: '500' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Update' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent('Enter a weight between 20 and 400 kg.')

    const label = screen.getAllByRole('button', { name: /^Edit / })[2].getAttribute('aria-label') as string
    fireEvent.click(screen.getByRole('button', { name: label }))
    expect(screen.getByRole('heading', { name: 'Edit weight' })).toBeInTheDocument()
    expect(within(form).getByLabelText('Weight (kg)')).toHaveValue(81.4)
    expect(within(form).getByLabelText('Date')).toHaveValue(daysAgo(10))
    fireEvent.change(within(form).getByLabelText('Weight (kg)'), { target: { value: '81' } })
    await act(async () => {
      fireEvent.click(within(form).getByRole('button', { name: 'Update' }))
    })
    expect(store.saved[1]).toEqual(expect.objectContaining({ date: daysAgo(10), kg: 81 }))
    expect(screen.getByText('81.0 kg')).toBeInTheDocument()
    expect(screen.queryByText('81.4 kg')).not.toBeInTheDocument()
  })

  it('deletes an entry after confirming and shows deltas', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()
    await screen.findByText('Current weight')
    expect(screen.getByText('-1.2 kg since last')).toBeInTheDocument()
    expect(screen.getByText('First entry')).toBeInTheDocument()
    const remove = screen.getAllByRole('button', { name: /^Delete / })[0]
    await act(async () => {
      fireEvent.click(remove)
    })
    expect(window.confirm).toHaveBeenCalled()
    expect(store.deleted).toEqual([daysAgo(2)])
    expect(within(screen.getByText('Current weight').closest('div') as HTMLElement).getByText('81.4 kg')).toBeInTheDocument()
  })

  it('switches to a table view', async () => {
    renderPage()
    await screen.findByText('Current weight')
    fireEvent.click(screen.getByRole('button', { name: 'Show table' }))
    expect(screen.getAllByRole('table')).toHaveLength(2)
    expect(screen.getAllByRole('row').length).toBeGreaterThan(3)
    expect(screen.queryByRole('img', { name: 'Weight over time chart' })).not.toBeInTheDocument()
  })

  it('shows an empty state without entries', async () => {
    store.entries = []
    renderPage()
    expect(await screen.findAllByText('No weights yet. Log your first one above to start your chart.')).not.toHaveLength(0)
  })
})
