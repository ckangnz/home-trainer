import { render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Badge } from './Badge'
import type { AwardDef, AwardIcon, AwardKind, AwardTier } from './types'

const kinds: AwardKind[] = ['streak', 'milestone', 'month', 'perfectMonth', 'holiday', 'fun']
const tiers: AwardTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
const icons: AwardIcon[] = [
  'flame',
  'trophy',
  'calendar',
  'crown',
  'newYear',
  'lunarNewYear',
  'valentines',
  'chuseok',
  'halloween',
  'christmasEve',
  'christmas',
  'newYearsEve',
  'earlyBird',
  'nightOwl',
]

const streak: AwardDef = { id: 'streak-7', kind: 'streak', tier: 'gold', icon: 'flame', value: 7 }

describe('Badge', () => {
  it('renders every kind, tier and icon in both states', () => {
    for (const kind of kinds) {
      for (const tier of tiers) {
        for (const state of ['earned', 'locked'] as const) {
          const { container, unmount } = render(<Badge award={{ id: `${kind}-${tier}`, kind, tier, icon: 'flame', value: 3 }} state={state} />)
          expect(container.querySelector('svg')).not.toBeNull()
          unmount()
        }
      }
    }
    for (const icon of icons) {
      for (const state of ['earned', 'locked'] as const) {
        const { container, unmount } = render(<Badge award={{ id: icon, kind: 'holiday', tier: 'silver', icon, year: 2026 }} state={state} size="xl" />)
        expect(container.querySelectorAll('path').length).toBeGreaterThan(3)
        unmount()
      }
    }
  })

  it('exposes the label as an accessible image name', () => {
    render(<Badge award={streak} label="7-day streak" />)
    const badge = screen.getByRole('img', { name: '7-day streak' })
    expect(badge).toHaveAttribute('data-kind', 'streak')
    expect(badge).toHaveAttribute('data-tier', 'gold')
    expect(badge).toHaveAttribute('data-size', 'md')
  })

  it('falls back to the award id when no label is given', () => {
    render(<Badge award={streak} />)
    expect(screen.getByRole('img', { name: 'streak-7' })).toBeInTheDocument()
  })

  it('distinguishes earned and locked states', () => {
    const { container, rerender } = render(<Badge award={streak} label="streak" />)
    const badge = screen.getByRole('img')
    expect(badge).toHaveAttribute('data-state', 'earned')
    expect(container.querySelector('.award-badge__lock')).toBeNull()
    expect(container.querySelector('.award-badge__shine')).not.toBeNull()
    rerender(<Badge award={streak} state="locked" label="streak" />)
    expect(badge).toHaveAttribute('data-state', 'locked')
    expect(container.querySelector('.award-badge__lock')).not.toBeNull()
    expect(container.querySelector('.award-badge__shine')).toBeNull()
  })

  it('uses unique gradient ids per instance', () => {
    const { container } = render(
      <>
        <Badge award={streak} label="a" />
        <Badge award={streak} label="b" />
      </>,
    )
    const svgs = container.querySelectorAll('svg')
    expect(svgs).toHaveLength(2)
    const idsOf = (svg: Element) => Array.from(svg.querySelectorAll('[id]')).map((node) => node.id)
    const first = idsOf(svgs[0])
    const second = idsOf(svgs[1])
    expect(first.length).toBeGreaterThan(4)
    expect(first.filter((id) => second.includes(id))).toEqual([])
    const all = Array.from(container.querySelectorAll('[id]')).map((node) => node.id)
    expect(new Set(all).size).toBe(all.length)
    for (const svg of svgs) {
      const own = new Set(idsOf(svg))
      for (const node of svg.querySelectorAll('[fill^="url(#"], [clip-path^="url(#"]')) {
        const ref = (node.getAttribute('fill') ?? node.getAttribute('clip-path') ?? '').slice(5, -1)
        if (ref) expect(own.has(ref)).toBe(true)
      }
    }
  })

  it('shows value, month and year text', () => {
    const { container, unmount } = render(<Badge award={streak} />)
    expect(container.querySelector('.award-badge__value')).toHaveTextContent('7')
    unmount()
    const month = render(<Badge award={{ id: 'm', kind: 'month', tier: 'silver', icon: 'calendar', month: 3, year: 2026 }} />)
    expect(month.container.querySelector('.award-badge__month')).toHaveTextContent('3')
    expect(month.container.querySelector('.award-badge__value')).toHaveTextContent('2026')
    month.unmount()
    const holiday = render(<Badge award={{ id: 'h', kind: 'holiday', tier: 'gold', icon: 'chuseok', holiday: 'chuseok', year: 2027 }} />)
    expect(holiday.container.querySelector('.award-badge__value')).toHaveTextContent('2027')
  })

  it('omits the plate when there is nothing to show', () => {
    const { container } = render(<Badge award={{ id: 'x', kind: 'fun', tier: 'gold', icon: 'earlyBird' }} />)
    expect(container.querySelector('.award-badge__plate')).toBeNull()
  })

  it('renders celebration effects only when celebrating', () => {
    const { container, rerender } = render(<Badge award={streak} size="xl" />)
    expect(container.querySelector('.award-badge__fx')).toBeNull()
    rerender(<Badge award={streak} size="xl" celebrate />)
    expect(container.querySelector('.award-badge--celebrate')).not.toBeNull()
    expect(container.querySelectorAll('.award-badge__particle').length).toBeGreaterThan(0)
  })

  it('renders on the server', () => {
    const html = renderToStaticMarkup(<Badge award={streak} label="7-day streak" celebrate />)
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="7-day streak"')
    expect(html).toContain('data-state="earned"')
  })
})
