import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { updateSettings } from '@/settings/settings'
import { loadKorean } from '@/i18n'
import { EXERCISES_KO } from '@/i18n/ko/exercises'
import { LABELS_KO } from '@/i18n/ko/labels'
import { publicPages } from '@/i18n/ko/ui/publicPages'

vi.mock('@/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    status: 'signed-out',
    user: null,
    error: null,
    signIn: async () => false,
    signOut: async () => {},
    clearError: () => {},
  }),
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

describe('public pages in Korean', () => {
  beforeAll(async () => {
    updateSettings({ language: 'ko' })
    await loadKorean()
  })

  afterAll(() => {
    updateSettings({ language: 'en' })
  })

  it('renders the exercise library with Korean UI and labels', async () => {
    renderAt('/exercises')
    expect(await screen.findByRole('heading', { level: 1, name: publicPages.exercises.title })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: publicPages.exercises.byCategory })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: publicPages.exercises.anyEquipment })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: LABELS_KO.category.stretch })).toBeInTheDocument()
  })

  it('renders an exercise page with the Korean name and section titles', async () => {
    renderAt('/exercises/squat')
    expect(await screen.findByRole('heading', { level: 1, name: EXERCISES_KO.squat.name })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: publicPages.exerciseDetail.howTo })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: publicPages.exerciseDetail.formTips })).toBeInTheDocument()
    expect(await screen.findByText(EXERCISES_KO.squat.steps[0])).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('ko')
  })
})
