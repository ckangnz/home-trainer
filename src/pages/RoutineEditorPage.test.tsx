import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { Routine } from '@/workouts/types'

const saved: Routine[] = []

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
  deleteRoutine: async () => {},
  recordCompletion: async () => {},
  deleteCompletion: async () => {},
}))

const { AppProviders } = await import('@/app/App')
const { AppRoutes } = await import('@/app/routes')

async function renderEditor(path = '/app/routines/new') {
  render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  )
  return screen.findByLabelText('Workout name')
}

describe('routine editor', () => {
  beforeEach(() => {
    saved.length = 0
    sessionStorage.clear()
  })

  it('shows how-to in place and keeps the draft after leaving the page', async () => {
    const name = await renderEditor()
    fireEvent.change(name, { target: { value: 'Leg day' } })
    fireEvent.click(screen.getAllByRole('button', { name: /Add exercises/ })[0])
    const picker = await screen.findByRole('dialog', { name: 'Add exercises' })
    fireEvent.click(within(picker).getByRole('button', { name: /^Squat\s*Legs/ }))
    fireEvent.click(within(picker).getByRole('button', { name: /^Add \d+ exercises?/ }))

    fireEvent.click(screen.getByRole('button', { name: /^Squat/ }))
    fireEvent.click(screen.getByRole('button', { name: /How to do it/ }))
    const info = await screen.findByRole('dialog', { name: 'Squat' })
    expect(within(info).getByRole('heading', { name: 'Form tips' })).toBeInTheDocument()
    expect(screen.getByLabelText('Workout name')).toHaveValue('Leg day')
    const muscles = screen.getByRole('heading', { name: 'Muscles this workout targets' }).closest('section') as HTMLElement
    expect(within(muscles).getByRole('img', { name: /Quads/ })).toBeInTheDocument()

    cleanup()
    const restored = await renderEditor()
    expect(restored).toHaveValue('Leg day')
    expect(screen.getByRole('button', { name: /^Squat/ })).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    cleanup()
    expect(await renderEditor()).toHaveValue('My workout')
  })

  it('builds a routine with defaults and per-exercise overrides', async () => {
    const name = await renderEditor()
    fireEvent.change(name, { target: { value: 'Morning burner' } })

    fireEvent.click(screen.getAllByRole('button', { name: /Add exercises/ })[0])
    const picker = await screen.findByRole('dialog', { name: 'Add exercises' })
    fireEvent.click(within(picker).getByRole('button', { name: /Jumping jacks/ }))
    fireEvent.click(within(picker).getByRole('button', { name: /^Push-up\s*Upper body/ }))
    fireEvent.click(within(picker).getByRole('button', { name: /^Add 2 exercises/ }))

    const pushUp = screen.getByRole('button', { name: /^Push-up/, expanded: false })
    fireEvent.click(pushUp)
    fireEvent.click(screen.getByRole('button', { name: 'Reps', pressed: false }))
    fireEvent.click(screen.getByRole('button', { name: 'Increase sets' }))
    fireEvent.click(screen.getByRole('button', { name: 'Increase sets' }))

    fireEvent.click(screen.getByRole('button', { name: 'Increase rounds' }))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })

    expect(saved).toHaveLength(1)
    const routine = saved[0]
    expect(routine.name).toBe('Morning burner')
    expect(routine.defaults.rounds).toBe(2)
    expect(routine.items.map((item) => item.exerciseId)).toEqual(['jumping-jacks', 'push-up'])
    expect(routine.items[0].target).toBeUndefined()
    expect(routine.items[1]).toMatchObject({ target: { kind: 'reps', reps: 10 }, sets: 3 })
  })

  it('reorders and removes exercises', async () => {
    await renderEditor()
    fireEvent.click(screen.getAllByRole('button', { name: /Add exercises/ })[0])
    const picker = await screen.findByRole('dialog', { name: 'Add exercises' })
    fireEvent.click(within(picker).getByRole('button', { name: /Jumping jacks/ }))
    fireEvent.click(within(picker).getByRole('button', { name: /^Squat\s*Legs/ }))
    fireEvent.click(within(picker).getByRole('button', { name: /^Add \d+ exercises?/ }))

    fireEvent.click(screen.getAllByRole('button', { name: 'Move up' })[1])
    const titles = screen.getAllByRole('button', { expanded: false }).map((button) => button.textContent ?? '')
    expect(titles[0]).toMatch(/^Squat/)

    fireEvent.click(screen.getByRole('button', { name: /^Squat/ }))
    fireEvent.click(screen.getByRole('button', { name: /Remove/ }))
    expect(screen.queryByRole('button', { name: /^Squat/ })).not.toBeInTheDocument()
  })

  it('starts a customized copy from a curated workout', async () => {
    const name = (await renderEditor('/app/routines/new?from=classic-7-minute')) as HTMLInputElement
    expect(name.value).toBe('Classic 7-Minute Workout (my version)')
    expect(screen.getAllByRole('button', { name: 'Move up' })).toHaveLength(12)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })

    expect(saved[0].source).toEqual({ kind: 'curated', id: 'classic-7-minute' })
    expect(saved[0].items[11]).toMatchObject({ exerciseId: 'side-plank', target: { kind: 'time', seconds: 15 } })
    expect(saved[0].items[0].id).not.toBe('classic-7-minute-1')
  })

  it('swaps an exercise for a weighted variation and keeps its settings', async () => {
    await renderEditor()
    fireEvent.click(screen.getAllByRole('button', { name: /Add exercises/ })[0])
    const picker = await screen.findByRole('dialog', { name: 'Add exercises' })
    fireEvent.click(within(picker).getByRole('button', { name: /^Squat\s*Legs/ }))
    fireEvent.click(within(picker).getByRole('button', { name: /^Add \d+ exercises?/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Squat/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Reps', pressed: false }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Squat variations' })).getByRole('button', { name: 'Kettlebell goblet' }))
    expect(screen.getByRole('button', { name: /^Kettlebell goblet squat/ })).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(saved[0].items[0]).toMatchObject({ exerciseId: 'kettlebell-goblet-squat', target: { kind: 'reps' } })
  })

  it('only adds the exercises still selected when you confirm', async () => {
    await renderEditor()
    fireEvent.click(screen.getAllByRole('button', { name: /Add exercises/ })[0])
    let picker = await screen.findByRole('dialog', { name: 'Add exercises' })
    const squat = within(picker).getByRole('button', { name: /^Squat\s*Legs/ })
    fireEvent.click(squat)
    expect(squat).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: /^Squat/, expanded: false })).not.toBeInTheDocument()
    fireEvent.click(within(picker).getByRole('button', { name: /Jumping jacks/ }))
    fireEvent.click(squat)
    expect(squat).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(within(picker).getByRole('button', { name: /^Add 1 exercise$/ }))
    expect(screen.getByRole('button', { name: /^Jumping jacks/, expanded: false })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Squat/, expanded: false })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Add more exercises/ }))
    picker = await screen.findByRole('dialog', { name: 'Add exercises' })
    fireEvent.click(within(picker).getByRole('button', { name: /^Squat\s*Legs/ }))
    fireEvent.click(within(picker).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('button', { name: /^Squat/, expanded: false })).not.toBeInTheDocument()
  })
})
