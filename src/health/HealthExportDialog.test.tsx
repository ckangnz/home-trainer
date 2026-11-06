import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HealthExportDialog } from './HealthExportDialog'
import type { HealthWorkout } from './export'

const workout: HealthWorkout = {
  title: 'Leg day',
  startedAt: '2026-10-19T07:00:00.000Z',
  endedAt: '2026-10-19T07:21:30.000Z',
  activeMs: 20 * 60_000,
  calories: 143,
  activity: 'traditionalStrength',
  exercises: 9,
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('HealthExportDialog', () => {
  it('closes after opening the Apple Health shortcut', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(<HealthExportDialog workout={workout} open onClose={onClose} />)
    const link = screen.getByRole('link', { name: /Send to Apple Health/ })
    expect(link.getAttribute('href')).toMatch(/^shortcuts:/)
    link.addEventListener('click', (event) => event.preventDefault())
    fireEvent.click(link)
    expect(onClose).not.toHaveBeenCalled()
    act(() => {
      vi.runAllTimers()
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes after downloading the workout file', () => {
    const onClose = vi.fn()
    URL.createObjectURL = vi.fn(() => 'blob:workout')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<HealthExportDialog workout={workout} open onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /Download \.tcx/ }))
    return vi.waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
})
