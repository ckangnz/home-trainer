import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { loadKorean } from '@/i18n/bundle'
import { getSettings, updateSettings } from '@/settings/settings'

vi.mock('@/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    status: 'signed-in',
    user: { uid: 'user-1', displayName: 'Test User', email: 'test@example.com', photoURL: null },
    error: null,
    profileVersion: 0,
    refreshProfile: async () => {},
    signIn: async () => {},
    signOut: async () => {},
    clearError: () => {},
  }),
}))

const { SettingsPage } = await import('./SettingsPage')

function renderSettings() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  )
}

describe('settings language', () => {
  beforeAll(async () => {
    await loadKorean()
  })

  afterEach(() => {
    updateSettings({ language: 'auto' })
  })

  it('switches the page to Korean from the language select', async () => {
    renderSettings()
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    const select = screen.getByLabelText('Language · 언어')
    expect(select).toHaveValue('auto')
    expect(screen.getByRole('option', { name: '한국어' })).toBeInTheDocument()
    act(() => {
      fireEvent.change(select, { target: { value: 'ko' } })
    })
    expect(getSettings().language).toBe('ko')
    expect(await screen.findByRole('heading', { level: 1, name: '설정' })).toBeInTheDocument()
    expect(screen.getByLabelText('언어 · Language')).toHaveValue('ko')
    expect(screen.getByText('음성 코치')).toBeInTheDocument()
    expect(screen.getByText('test@example.com 계정으로 로그인했어요.')).toBeInTheDocument()
  })
})
