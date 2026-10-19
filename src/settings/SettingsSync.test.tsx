import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RemoteSettings } from '@/data/settingsDoc'

const saved: { settings: Record<string, unknown>; updatedAt: number }[] = []
let push: ((remote: RemoteSettings | null) => void) | null = null

vi.mock('@/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { uid: 'user-1' } }),
}))

vi.mock('@/data/settingsDoc', () => ({
  subscribeRemoteSettings: (_uid: string, onChange: (remote: RemoteSettings | null) => void) => {
    push = onChange
    return () => {
      push = null
    }
  },
  saveRemoteSettings: async (_uid: string, settings: Record<string, unknown>, updatedAt: number) => {
    saved.push({ settings, updatedAt })
  },
}))

async function setup() {
  vi.resetModules()
  const settings = await import('./settings')
  const { SettingsSync } = await import('./SettingsSync')
  render(<SettingsSync />)
  await act(async () => {
    await vi.waitFor(() => expect(push).not.toBeNull())
  })
  return settings
}

describe('settings sync', () => {
  beforeEach(() => {
    localStorage.clear()
    saved.length = 0
    push = null
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('adopts account settings on a device that never changed its own', async () => {
    const settings = await setup()
    act(() => push?.({ settings: { trainer: 'zara', weightKg: 82, language: 'ko' }, updatedAt: 1000 }))
    expect(settings.getSettings()).toMatchObject({ trainer: 'zara', weightKg: 82, language: 'ko' })
    expect(saved).toHaveLength(0)
  })

  it('applies newer account settings but keeps the device voice', async () => {
    localStorage.setItem('hometrainer.settings.v1', JSON.stringify({ trainer: 'kai', voiceName: 'Yuna' }))
    localStorage.setItem('hometrainer.settings.updatedAt', '500')
    const settings = await setup()
    act(() => push?.({ settings: { trainer: 'marcus' }, updatedAt: 900 }))
    expect(settings.getSettings()).toMatchObject({ trainer: 'marcus', voiceName: 'Yuna' })
  })

  it('uploads local changes and newer local settings', async () => {
    localStorage.setItem('hometrainer.settings.v1', JSON.stringify({ trainer: 'kai' }))
    localStorage.setItem('hometrainer.settings.updatedAt', '2000')
    const settings = await setup()
    act(() => push?.({ settings: { trainer: 'marcus' }, updatedAt: 900 }))
    await vi.waitFor(() => expect(saved.at(-1)?.settings).toMatchObject({ trainer: 'kai' }))
    act(() => settings.updateSettings({ weightKg: 64 }))
    await vi.waitFor(() => expect(saved.at(-1)?.settings).toMatchObject({ weightKg: 64 }))
    expect(saved.at(-1)?.settings).not.toHaveProperty('voiceName')
  })

  it('uploads customized settings when the account has none yet', async () => {
    localStorage.setItem('hometrainer.settings.v1', JSON.stringify({ trainer: 'nina' }))
    await setup()
    act(() => push?.(null))
    await vi.waitFor(() => expect(saved.at(-1)?.settings).toMatchObject({ trainer: 'nina' }))
  })
})
