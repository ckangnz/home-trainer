import { render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MuscleMap } from './MuscleMap'

describe('MuscleMap', () => {
  it('labels the chart with the worked muscles ordered by intensity', () => {
    render(<MuscleMap load={{ glutes: 0.5, quads: 1 }} label="Legs day" />)
    expect(screen.getByRole('img', { name: 'Legs day: Quads, Glutes' })).toBeInTheDocument()
  })

  it('marks each region with its muscle and intensity level on both views', () => {
    const { container } = render(<MuscleMap load={{ quads: 1, glutes: 0.5, calves: 0.2 }} />)
    const level = (view: string, muscle: string) => container.querySelector(`.muscle-map__view--${view} [data-muscle="${muscle}"]`)?.getAttribute('data-level')
    expect(level('front', 'quads')).toBe('3')
    expect(level('back', 'glutes')).toBe('2')
    expect(level('front', 'calves')).toBe('1')
    expect(level('back', 'calves')).toBe('1')
    expect(level('front', 'chest')).toBe('0')
    expect(level('back', 'lats')).toBe('0')
    expect(container.querySelector('.muscle-map__view--front [data-muscle="glutes"]')).toBeNull()
  })

  it('mirrors every region so both sides of the body are drawn', () => {
    const { container } = render(<MuscleMap load={{ chest: 1 }} />)
    const paths = container.querySelectorAll('[data-muscle="chest"] path')
    expect(paths).toHaveLength(2)
    expect(paths[1].getAttribute('transform')).toBe('matrix(-1 0 0 1 200 0)')
  })

  it('gives every region a hover title and captions both views', () => {
    const { container } = render(<MuscleMap load={{ chest: 1 }} />)
    expect(container.querySelector('[data-muscle="chest"] title')?.textContent).toBe('Chest: strong')
    expect(container.querySelector('.muscle-map__view--back [data-muscle="lats"] title')?.textContent).toBe('Lats: not worked')
    expect([...container.querySelectorAll('.muscle-map__caption')].map((node) => node.textContent)).toEqual(['Front', 'Back'])
  })

  it('reports when nothing is highlighted and shows the legend on request', () => {
    const { container } = render(<MuscleMap load={{}} size="sm" legend />)
    expect(screen.getByRole('img', { name: 'Muscles worked: none highlighted' })).toBeInTheDocument()
    expect(container.querySelector('.muscle-map')).toHaveClass('muscle-map--sm')
    expect(container.querySelectorAll('[data-level]:not([data-level="0"])')).toHaveLength(3)
    expect(screen.getByText('Strong')).toBeInTheDocument()
  })

  it('renders to static markup without a browser', () => {
    const markup = renderToStaticMarkup(<MuscleMap load={{ abs: 1 }} />)
    expect(markup).toContain('data-muscle="abs" data-level="3"')
    expect(markup).toContain('aria-label="Muscles worked: Abs"')
  })
})
