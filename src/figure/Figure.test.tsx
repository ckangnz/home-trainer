import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Figure } from './Figure'
import type { FigureAnimation } from './types'

const squat: FigureAnimation = {
  view: 'side',
  keyframes: [
    { pose: {}, ms: 800 },
    { pose: { root: [-0.15, 0.62], torso: 30, legL: { at: [0, 0.097], angle: 0 }, legR: { at: [0, 0.097], angle: 0 } }, ms: 800 },
  ],
}

const reach: FigureAnimation = {
  view: 'front',
  keyframes: [{ pose: { armL: [170, 0], armR: [170, 0] }, ms: 0 }],
}

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('Figure transitions', () => {
  it('springs in on mount and cross-fades to a new animation', () => {
    vi.useFakeTimers()
    const view = render(<Figure animation={squat} playing={false} label="squat" />)
    expect(view.container.querySelector('.fig-enter')).not.toBeNull()
    expect(view.container.querySelector('.fig-leave')).toBeNull()
    view.rerender(<Figure animation={reach} playing={false} label="reach" />)
    const leaving = view.container.querySelector('.fig-leave')
    expect(leaving).not.toBeNull()
    expect(leaving?.getAttribute('aria-hidden')).toBe('true')
    expect(leaving?.querySelectorAll('path').length).toBeGreaterThan(10)
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(view.container.querySelector('.fig-leave')).toBeNull()
    expect(view.container.querySelectorAll('.fig-enter').length).toBe(1)
  })

  it('cross-fades when the restart key or side changes', () => {
    const view = render(<Figure animation={squat} playing={false} restartKey="a" label="squat" />)
    view.rerender(<Figure animation={squat} playing={false} restartKey="b" label="squat" />)
    expect(view.container.querySelector('.fig-leave')).not.toBeNull()
  })

  it('skips the cross-fade when reduced motion is requested', () => {
    mockReducedMotion(true)
    const view = render(<Figure animation={squat} label="squat" />)
    expect(view.container.querySelector('svg')?.getAttribute('data-animating')).toBe('false')
    view.rerender(<Figure animation={reach} label="reach" />)
    expect(view.container.querySelector('.fig-leave')).toBeNull()
  })

  it('drives the pose and secondary motion from the shared clock', () => {
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback))
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const view = render(<Figure animation={squat} look={{ trainer: 'female', skin: 'medium' }} label="squat" />)
    const svg = view.container.querySelector('svg')
    expect(svg?.getAttribute('data-animating')).toBe('true')
    const shapes = () => Array.from(view.container.querySelectorAll('.fig-enter path')).map((node) => node.getAttribute('d'))
    const before = shapes()
    let now = 0
    act(() => {
      for (let frame = 0; frame < 30 && frames.length > 0; frame += 1) {
        now += 1000 / 30
        frames.shift()?.(now)
      }
    })
    const after = shapes()
    expect(after.length).toBe(before.length)
    expect(after).not.toEqual(before)
    expect(after.every((d) => d !== null && !d.includes('NaN'))).toBe(true)
  })
})
