import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/App'
import { AppRoutes } from '@/app/routes'

vi.mock('@/data/config', () => ({ firebaseConfig: null, isFirebaseConfigured: false }))

function renderAt(path: string) {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  )
}

async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

describe('workout player', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      shouldAdvanceTime: true,
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('runs get ready, a timed exercise, and a rest with an up-next preview', async () => {
    renderAt('/dev/play/workout/classic-7-minute')
    await act(async () => {
      await vi.dynamicImportSettled()
    })
    expect(await screen.findByRole('heading', { name: 'Classic 7-Minute Workout' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    await advance(200)
    expect(screen.getByText('Get ready')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Jumping jacks' })).toBeInTheDocument()

    await advance(10_000)
    expect(screen.getByText('Exercise 1 of 12')).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveAccessibleName(/0:30 remaining|0:29 remaining/)

    await advance(30_000)
    expect(screen.getByText('Rest')).toBeInTheDocument()
    expect(screen.getByText('Up next')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Wall sit' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Skip/ }))
    await advance(200)
    expect(screen.getByText('Exercise 2 of 12')).toBeInTheDocument()
  })

  it('waits for Done on rep targets and pauses on request', async () => {
    renderAt('/dev/play/exercise/push-up')
    await act(async () => {
      await vi.dynamicImportSettled()
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Start' }))
    await advance(5_500)
    expect(screen.getByText(/reps/)).toBeInTheDocument()

    await advance(120_000)
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: /Pause/ })[0])
    expect(screen.getByRole('dialog', { name: 'Paused' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    await advance(200)
    expect(screen.getByRole('heading', { name: 'Workout complete!' })).toBeInTheDocument()
  })

  it('pauses from the rest screen and the top bar', async () => {
    renderAt('/app/play/workout/classic-7-minute')
    fireEvent.click(await screen.findByRole('button', { name: /^Start$/ }))
    const rest = screen.getAllByRole('button', { name: /Pause/ })
    expect(rest.length).toBe(2)
    fireEvent.click(rest[1])
    expect(screen.getByRole('dialog', { name: 'Paused' })).toBeInTheDocument()
  })
})
