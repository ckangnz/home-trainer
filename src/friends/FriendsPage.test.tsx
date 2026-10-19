import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { Routine } from '@/workouts/types'
import type { Friend, FriendRequest, PublicProfile } from './models'

const calls: string[] = []
const savedRoutines: Routine[] = []
let initialFriends: Friend[] = []
let incomingListener: ((requests: FriendRequest[]) => void) | null = null

const coach: PublicProfile = { uid: 'coach-1', displayName: 'Coach Kim' }

vi.mock('@/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    status: 'signed-in',
    user: { uid: 'user-1', displayName: 'Test User', email: 'test@example.com', photoURL: null },
    error: null,
    signIn: async () => true,
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
    savedRoutines.push(routine)
  },
}))

vi.mock('@/data/friends', () => ({
  ensureProfile: async (me: PublicProfile) => ({ ...me, friendCode: '7KQ2M9XP' }),
  lookupFriendCode: async (code: string) => (code === 'ABCD2345' ? coach : null),
  sendFriendRequest: async (_me: PublicProfile, target: PublicProfile) => {
    calls.push(`send:${target.uid}`)
  },
  subscribeFriends: (_uid: string, onChange: (friends: Friend[]) => void) => {
    onChange(initialFriends)
    return () => {}
  },
  subscribeRequests: (_uid: string, direction: string, onChange: (requests: FriendRequest[]) => void) => {
    if (direction === 'incoming') {
      incomingListener = onChange
    }
    onChange([])
    return () => {}
  },
  acceptFriendRequest: async (request: FriendRequest) => {
    calls.push(`accept:${request.id}`)
  },
  deleteFriendRequest: async () => {},
  removeFriend: async () => {},
  fetchFriendRoutines: async () => [
    {
      id: 'homework',
      ownerId: 'coach-1',
      schemaVersion: 2,
      name: 'Week 1 homework',
      defaults: { workSec: 30, restSec: 15, rounds: 2, roundRestSec: 60, getReadySec: 10, switchSec: 5 },
      items: [{ id: 'a', exerciseId: 'squat' }],
      createdAt: '2026-10-19T00:00:00Z',
      updatedAt: '2026-10-19T00:00:00Z',
    },
  ],
  fetchFriendCompletions: async () => [
    {
      id: 'c1',
      ownerId: 'coach-1',
      schemaVersion: 2,
      title: 'Leg day',
      source: { kind: 'routine', id: 'x' },
      startedAt: new Date(Date.now() - 3_600_000).toISOString(),
      completedAt: new Date(Date.now() - 3_000_000).toISOString(),
      durationMs: 600_000,
      exercises: 8,
      totalExercises: 8,
      calories: 90,
      muscles: ['quads', 'glutes'],
    },
  ],
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

describe('friends', () => {
  beforeEach(() => {
    calls.length = 0
    savedRoutines.length = 0
    initialFriends = []
    incomingListener = null
  })

  it('shows my code, finds a friend by code, and sends a request', async () => {
    renderAt('/app/friends')
    expect(await screen.findByText('FR-7KQ2-M9XP')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Friend code or invite link'), { target: { value: 'fr-abcd-2345' } })
    fireEvent.click(screen.getByRole('button', { name: /Find friend/ }))
    expect(await screen.findByText('Coach Kim')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send request/ }))
    })
    expect(calls).toEqual(['send:coach-1'])
  })

  it('accepts incoming requests', async () => {
    renderAt('/app/friends')
    await screen.findByText('FR-7KQ2-M9XP')
    await vi.waitFor(() => expect(incomingListener).not.toBeNull())
    act(() => {
      incomingListener?.([{ id: 'coach-1_user-1', from: coach, to: { uid: 'user-1', displayName: 'Test User' }, createdAt: '2026-10-19T00:00:00Z' }])
    })
    const card = (await screen.findByText('wants to be friends')).closest('li') as HTMLElement
    await act(async () => {
      fireEvent.click(within(card).getByRole('button', { name: /Accept/ }))
    })
    expect(calls).toEqual(['accept:coach-1_user-1'])
  })

  it("shows a friend's workouts and imports their routine", async () => {
    initialFriends = [{ ...coach, since: '2026-10-01T00:00:00Z' }]
    renderAt('/app/friends/coach-1')
    expect(await screen.findByText('Leg day')).toBeInTheDocument()
    expect(screen.getByText('90 kcal')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /muscles this week/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /Their workouts/ }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Add to My workouts/ }))
    })
    expect(savedRoutines).toHaveLength(1)
    expect(savedRoutines[0]).toMatchObject({ name: 'Week 1 homework', source: { kind: 'friend', uid: 'coach-1', routineId: 'homework' } })
    expect(savedRoutines[0].items[0].id).not.toBe('a')
  })
})
