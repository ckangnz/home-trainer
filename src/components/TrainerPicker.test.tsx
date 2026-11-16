import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TRAINER_ORDER, TRAINERS } from '@/figure/look'
import { getSettings, updateSettings } from '@/settings/settings'
import { TrainerPicker } from './TrainerPicker'

const { start, stop } = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn() }))
vi.mock('@/player/trainerGreeting', () => ({ startTrainerGreeting: start }))

describe('TrainerPicker', () => {
  beforeEach(() => {
    start.mockReset().mockReturnValue(stop)
    stop.mockReset()
    updateSettings({ trainer: 'female', randomTrainer: false, skin: 'medium', language: 'en', voice: true })
  })

  it('offers every trainer with a name and a preview', () => {
    const { container } = render(<TrainerPicker />)
    const group = screen.getByRole('radiogroup', { name: 'Trainer' })
    const options = group.querySelectorAll('[role="radio"]')
    expect(options).toHaveLength(TRAINER_ORDER.length + 1)
    TRAINER_ORDER.forEach((id, index) => {
      expect(options[index + 1].getAttribute('data-trainer')).toBe(id)
      expect(options[index + 1].textContent).toContain(TRAINERS[id].name)
    })
    expect(container.querySelector('[data-trainer="female"]')?.getAttribute('aria-checked')).toBe('true')
  })

  it('does not autoplay, greets on selection and replay, and cancels on unmount', () => {
    const { unmount } = render(<TrainerPicker />)
    expect(start).not.toHaveBeenCalled()
    act(() => updateSettings({ voice: false }))
    fireEvent.click(screen.getByText(TRAINERS.kai.name))
    expect(start).toHaveBeenLastCalledWith('kai', 'en', expect.any(Function), expect.any(Function))
    fireEvent.click(screen.getByRole('button', { name: 'Hear Kai again' }))
    expect(stop).toHaveBeenCalledOnce()
    expect(start).toHaveBeenCalledTimes(2)
    unmount()
    expect(stop).toHaveBeenCalledTimes(2)
  })

  it('stops when requested and exposes a failed greeting without changing selection', () => {
    render(<TrainerPicker />)
    fireEvent.click(screen.getByText(TRAINERS.marcus.name))
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(stop).toHaveBeenCalledOnce()
    expect(screen.queryByText('Playing greeting…')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hear Marcus again' }))
    act(() => start.mock.calls.at(-1)?.[3]())
    expect(screen.getByRole('status')).toHaveTextContent('could not play')
    expect(getSettings().trainer).toBe('marcus')
  })

  it('selects a trainer with their suggested skin and keeps a custom skin for the current trainer', () => {
    render(<TrainerPicker />)
    fireEvent.click(screen.getByText(TRAINERS.zara.name))
    expect(getSettings().trainer).toBe('zara')
    expect(getSettings().skin).toBe(TRAINERS.zara.skin)
    fireEvent.click(screen.getByRole('radio', { name: 'Light skin tone' }))
    fireEvent.click(screen.getByText(TRAINERS.zara.name))
    expect(getSettings().skin).toBe('light')
    expect(screen.getByText(TRAINERS.zara.name).closest('[role="radio"]')?.getAttribute('aria-checked')).toBe('true')
  })
})

it('keeps Random selected without a surprise greeting, and fixed choices turn it off', () => {
  start.mockClear()
  updateSettings({ trainer: 'female', randomTrainer: false, language: 'en' })
  render(<TrainerPicker />)
  fireEvent.click(screen.getByRole('radio', { name: /Random/ }))
  expect(getSettings().randomTrainer).toBe(true)
  expect(start).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: /Hear .* again/ })).not.toBeInTheDocument()
  fireEvent.click(screen.getByText('Kai'))
  expect(getSettings().randomTrainer).toBe(false)
})
