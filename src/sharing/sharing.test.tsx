import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { SharedRoutine } from '@/data/models'
import type { Routine } from '@/workouts/types'

const saved: Routine[] = []
const shares = new Map<string, SharedRoutine>()

vi.mock('@/data/config', () => ({ firebaseConfig: {}, isFirebaseConfigured: true }))

vi.mock('@/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    status: 'signed-in',
    user: { uid: 'friend-2', displayName: 'Friend', email: 'friend@example.com', photoURL: null },
    error: null,
    signIn: async () => {},
    signOut: async () => {},
    clearError: () => {},
  }),
}))

vi.mock('@/data/repository', () => ({
  subscribeRoutines: (_uid: string, onChange: (routines: Routine[]) => void) => {
    onChange([])
    return () => {}
  },
  subscribeCompletions: (_uid: string, onChange: (completions: never[]) => void) => {
    onChange([])
    return () => {}
  },
  saveRoutine: async (routine: Routine) => {
    saved.push(routine)
  },
  fetchShare: async (code: string) => shares.get(code) ?? null,
  deleteRoutine: async () => {},
  recordCompletion: async () => {},
  deleteCompletion: async () => {},
}))

const { AppProviders } = await import('@/app/App')
const { AppRoutes } = await import('@/app/routes')

function renderAt(path: string) {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  )
}

describe('share code import', () => {
  beforeEach(() => {
    saved.length = 0
    shares.clear()
    shares.set('7KQ2M9XP', {
      code: '7KQ2M9XP',
      ownerId: 'owner-1',
      schemaVersion: 2,
      createdAt: '2026-10-18T08:00:00.000Z',
      routine: {
        name: 'Morning burner',
        defaults: { workSec: 40, restSec: 15, rounds: 3, roundRestSec: 60, getReadySec: 10, switchSec: 5 },
        items: [
          { id: 'a', exerciseId: 'jumping-jacks' },
          { id: 'b', exerciseId: 'retired-move' },
          { id: 'c', exerciseId: 'push-up', target: { kind: 'reps', reps: 12 } },
        ],
      },
    })
  })

  it('previews a pasted code and adds an independent copy', async () => {
    renderAt('/app/import')
    fireEvent.change(await screen.findByLabelText('Share code or link'), { target: { value: 'Code: ht-7kq2-m9xp' } })
    fireEvent.click(screen.getByRole('button', { name: /Preview routine/ }))

    expect(await screen.findByRole('heading', { name: 'Morning burner' })).toBeInTheDocument()
    expect(screen.getByText(/1 exercise is not available/)).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Add to My workouts/ }))
    })

    expect(saved).toHaveLength(1)
    const copy = saved[0]
    expect(copy.ownerId).toBe('friend-2')
    expect(copy.source).toEqual({ kind: 'share', code: '7KQ2M9XP' })
    expect(copy.items.map((item) => item.exerciseId)).toEqual(['jumping-jacks', 'push-up'])
    expect(copy.items.map((item) => item.id)).not.toContain('a')
    expect(copy.defaults.rounds).toBe(3)
  })

  it('explains unknown or malformed codes', async () => {
    renderAt('/r/ZZZZZZZZ')
    expect(await screen.findByText(/does not exist or sharing was stopped/)).toBeInTheDocument()
    renderAt('/app/import')
    const inputs = await screen.findAllByLabelText('Share code or link')
    fireEvent.change(inputs[inputs.length - 1], { target: { value: 'hello' } })
    fireEvent.click(screen.getAllByRole('button', { name: /Preview routine/ }).at(-1) as HTMLElement)
    expect(screen.getByRole('alert')).toHaveTextContent(/8-character code/)
  })
})
