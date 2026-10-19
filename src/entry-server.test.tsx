import { beforeAll, describe, expect, it } from 'vitest'
import { PRERENDER_ROUTES, prepare, render } from './entry-server'

describe('prerendering', () => {
  beforeAll(() => prepare())

  it('lists every public route once', () => {
    expect(new Set(PRERENDER_ROUTES).size).toBe(PRERENDER_ROUTES.length)
    expect(PRERENDER_ROUTES).toContain('/')
    expect(PRERENDER_ROUTES).toContain('/workouts/classic-7-minute')
    expect(PRERENDER_ROUTES).toContain('/privacy')
  })

  it.each(PRERENDER_ROUTES.map((route) => [route]))('renders %s to static HTML with page metadata', (route) => {
    const { html, meta } = render(route)
    expect(html.length).toBeGreaterThan(500)
    expect(html).not.toContain('We could not find that page')
    expect(meta.title).toMatch(/HomeTrainer/)
    expect(meta.description.length).toBeGreaterThan(40)
  })

  it('renders exercise instructions into the page for crawlers', () => {
    const { html, meta, catalogs } = render('/exercises/squat')
    expect(html).toContain('How to do it')
    expect(html).toContain('Stand with your feet')
    expect(html).toContain('class="figure"')
    expect(meta.title).toContain('Squat')
    expect(catalogs).toEqual(['lower'])
  })

  it('keeps list pages light by deferring thumbnail figures', () => {
    const { html, catalogs } = render('/exercises')
    expect(html).toContain('figure--pending')
    expect(html).not.toContain('class="figure"')
    expect(catalogs).toEqual([])
    expect(html.length).toBeLessThan(400_000)
  })

  it('keeps signed-in pages out of the static output', () => {
    expect(PRERENDER_ROUTES.some((route) => route.startsWith('/app'))).toBe(false)
  })
})
