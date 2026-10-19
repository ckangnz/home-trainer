import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/App'
import { AppRoutes } from '@/app/routes'
import { loadKorean } from '@/i18n'
import { EXERCISES_KO } from '@/i18n/ko/exercises'
import { WORKOUTS_KO } from '@/i18n/ko/workouts'
import { updateSettings } from '@/settings/settings'

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

describe('workout player in Korean', () => {
  beforeAll(async () => {
    updateSettings({ language: 'ko' })
    await loadKorean()
  })

  afterAll(() => {
    updateSettings({ language: 'en' })
  })

  beforeEach(() => {
    vi.useFakeTimers({
      shouldAdvanceTime: true,
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows Korean controls, pause titles, and workout names', async () => {
    renderAt('/dev/play/workout/classic-7-minute')
    await act(async () => {
      await vi.dynamicImportSettled()
    })
    const title = WORKOUTS_KO['classic-7-minute']?.name ?? 'Classic 7-Minute Workout'
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '시작' }))
    await advance(200)
    expect(screen.getByText('준비')).toBeInTheDocument()
    expect(screen.getByText('다음 동작')).toBeInTheDocument()

    await advance(10_000)
    expect(screen.getByText('동작 1/12')).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveAccessibleName(/0:30 남음|0:29 남음/)
    expect(screen.getByRole('button', { name: '동작 건너뛰기' })).toBeInTheDocument()
  })

  it('finishes a rep exercise with the Korean summary', async () => {
    renderAt('/dev/play/exercise/squat')
    await act(async () => {
      await vi.dynamicImportSettled()
    })
    const name = EXERCISES_KO.squat?.name ?? 'Squat'
    expect(await screen.findByRole('heading', { name })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '시작' }))
    await advance(5_500)
    fireEvent.click(screen.getByRole('button', { name: '일시정지' }))
    expect(screen.getByRole('dialog', { name: '일시정지' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '계속' }))
    const done = screen.queryByRole('button', { name: '완료' })
    if (done) {
      fireEvent.click(done)
    } else {
      await advance(120_000)
    }
    await advance(200)
    expect(screen.getByRole('heading', { name: '운동 완료!' })).toBeInTheDocument()
    expect(screen.getByText('연속 기록')).toBeInTheDocument()
  })
})
