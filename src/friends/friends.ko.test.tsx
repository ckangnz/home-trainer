import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { Routine } from '@/workouts/types'
import type { Friend, FriendRequest, PublicProfile } from './models'

const calls: string[] = []
const savedRoutines: Routine[] = []
let initialFriends: Friend[] = []

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
  subscribeRequests: (_uid: string, _direction: string, onChange: (requests: FriendRequest[]) => void) => {
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

const { updateSettings } = await import('@/settings/settings')
const { loadKorean } = await import('@/i18n/bundle')

describe('friends in Korean', () => {
  beforeAll(async () => {
    updateSettings({ language: 'ko' })
    await loadKorean()
  })

  afterAll(() => {
    updateSettings({ language: 'en' })
  })

  beforeEach(() => {
    calls.length = 0
    savedRoutines.length = 0
    initialFriends = []
  })

  it('shows the friends page and lookup errors in Korean', async () => {
    renderAt('/app/friends')
    expect(await screen.findByText('FR-7KQ2-M9XP')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '내 친구 코드' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('친구 코드 또는 초대 링크'), { target: { value: 'nope' } })
    fireEvent.click(screen.getByRole('button', { name: /친구 찾기/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('FR-7KQ2-M9XP 같은 친구 코드를 입력하거나')
    await vi.waitFor(() => expect(document.documentElement.lang).toBe('ko'))
  })

  it("shows a friend's activity with Korean units and copies their routine", async () => {
    initialFriends = [{ ...coach, since: '2026-10-01T00:00:00Z' }]
    renderAt('/app/friends/coach-1')
    expect(await screen.findByText('Leg day')).toBeInTheDocument()
    expect(screen.getByText('90kcal')).toBeInTheDocument()
    expect(screen.getAllByText('10분').length).toBeGreaterThan(0)
    expect(screen.getByText('동작 8/8개')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /친구의 운동/ }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /내 운동에 추가/ }))
    })
    expect(savedRoutines).toHaveLength(1)
    expect(savedRoutines[0].name).toBe('Week 1 homework')
  })
})
