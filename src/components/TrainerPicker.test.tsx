import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { TRAINER_ORDER, TRAINERS } from '@/figure/look'
import { getSettings, updateSettings } from '@/settings/settings'
import { TrainerPicker } from './TrainerPicker'

describe('TrainerPicker', () => {
  beforeEach(() => {
    updateSettings({ trainer: 'female', skin: 'medium' })
  })

  it('offers every trainer with a name and a preview', () => {
    const { container } = render(<TrainerPicker />)
    const group = screen.getByRole('radiogroup', { name: 'Trainer' })
    const options = group.querySelectorAll('[role="radio"]')
    expect(options).toHaveLength(TRAINER_ORDER.length)
    TRAINER_ORDER.forEach((id, index) => {
      expect(options[index].getAttribute('data-trainer')).toBe(id)
      expect(options[index].textContent).toContain(TRAINERS[id].name)
    })
    expect(container.querySelector('[data-trainer="female"]')?.getAttribute('aria-checked')).toBe('true')
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
