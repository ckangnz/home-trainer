import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { Routine } from '@/workouts/types'
import { updateSettings } from '@/settings/settings'
import { loadKorean } from '@/i18n'
import { app } from '@/i18n/ko/ui/app'

const routines: Routine[] = [
  {
    id: 'routine-1',
    ownerId: 'user-1',
    schemaVersion: 2,
    name: 'Leg day',
    defaults: { workSec: 30, restSec: 10, rounds: 2, roundRestSec: 60, getReadySec: 10, switchSec: 5 },
    items: [{ id: 'item-1', exerciseId: 'squat' }],
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  },
]

vi.mock('@/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    status: 'signed-in',
    user: { uid: 'user-1', displayName: 'Test User', email: 'test@example.com', photoURL: null },
    error: null,
    signIn: async () => {},
    signOut: async () => {},
    clearError: () => {},
  }),
}))

vi.mock('@/data/repository', () => ({
  subscribeRoutines: (_uid: string, onChange: (routines: Routine[]) => void) => {
    onChange(routines)
    return () => {}
  },
  subscribeCompletions: (_uid: string, onChange: (completions: never[]) => void) => {
    onChange([])
    return () => {}
  },
  saveRoutine: async () => {},
  deleteRoutine: async () => {},
  recordCompletion: async () => {},
  deleteCompletion: async () => {},
}))

const { AppProviders } = await import('@/app/App')
const { AppRoutes } = await import('@/app/routes')

function renderAt(path: string) {
  render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  )
}

describe('signed-in pages in Korean', () => {
  beforeAll(async () => {
    updateSettings({ language: 'ko' })
    await loadKorean()
  })

  afterAll(() => {
    updateSettings({ language: 'en' })
  })

  it('renders the home page with Korean copy and units', async () => {
    renderAt('/app')
    expect(await screen.findByRole('heading', { name: app.home.myWorkouts })).toBeInTheDocument()
    const card = screen.getByRole('heading', { name: 'Leg day' }).closest('article') as HTMLElement
    expect(within(card).getByText(/^동작 1개 · .*2라운드$/)).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: 'Leg day 편집' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: app.home.lastSevenDays })).toBeInTheDocument()
  })

  it('renders the routine editor with Korean labels and stepper controls', async () => {
    renderAt('/app/routines/routine-1')
    expect(await screen.findByLabelText(app.editor.name)).toHaveValue('Leg day')
    expect(screen.getByRole('heading', { name: app.editor.defaultsTitle })).toBeInTheDocument()
    expect(screen.getByText(app.editor.workTime)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '라운드 늘리기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument()
  })
})
