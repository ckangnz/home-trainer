import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InstallPrompt } from './InstallPrompt'

describe('InstallPrompt', () => {
  it('consumes an install prompt only once after it is accepted', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined)
    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    })
    render(<InstallPrompt />)

    act(() => window.dispatchEvent(event))
    const button = await screen.findByRole('button', { name: 'Install app' })
    await act(async () => {
      fireEvent.click(button)
      fireEvent.click(button)
    })

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Install app' })).toBeNull())
    expect(prompt).toHaveBeenCalledTimes(1)
  })

  it('allows retry when requesting installation fails', async () => {
    const prompt = vi.fn().mockRejectedValue(new Error('unavailable'))
    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    })
    render(<InstallPrompt />)

    act(() => window.dispatchEvent(event))
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Install app' }))
    })

    expect(await screen.findByRole('button', { name: 'Install app' })).toBeInTheDocument()
  })
})
