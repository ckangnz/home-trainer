import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadExercises } from '@/exercises/content'
import { ExerciseFigure } from './ExerciseFigure'

type Callback = (entries: { isIntersecting: boolean }[]) => void

let callbacks: Callback[] = []
let observed: Element[] = []

class FakeObserver {
  constructor(callback: Callback) {
    callbacks.push(callback)
  }
  observe(element: Element) {
    observed.push(element)
  }
  disconnect() {}
  unobserve() {}
}

const setNear = (isIntersecting: boolean) => act(() => callbacks.forEach((callback) => callback([{ isIntersecting }])))

describe('lazy exercise figure', () => {
  beforeEach(async () => {
    callbacks = []
    observed = []
    vi.stubGlobal('IntersectionObserver', FakeObserver)
    await loadExercises(['squat'])
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('draws the figure near the viewport and drops it again when scrolled far away', () => {
    const { container } = render(
      <div className="stage">
        <ExerciseFigure exerciseId="squat" lazy label="" />
      </div>,
    )
    expect(container.querySelector('svg')).toBeNull()
    expect(observed).toEqual([container.firstElementChild])

    setNear(true)
    expect(container.querySelector('svg')).not.toBeNull()

    setNear(false)
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('.figure--pending')).not.toBeNull()

    setNear(true)
    expect(container.querySelector('svg')).not.toBeNull()
  })
})
