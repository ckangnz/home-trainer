import { act, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getExercise } from '@/exercises'
import { matchesQuery } from '@/exercises/search'
import { updateSettings } from '@/settings/settings'
import { getKorean, loadKorean } from './bundle'
import { messageKeys, type Message } from './catalog'
import { localizer, useLabels } from './content'
import { EN } from './en'
import { formattersFor } from './format'
import { LanguageSync, getLanguage, resolveLanguage, useLanguage } from './language'
import { translate, useT } from './translate'
import { UI_KO } from './ko/ui'
import { EXERCISES_KO } from './ko/exercises'

function Greeting() {
  const t = useT()
  const language = useLanguage()
  const labels = useLabels()
  return (
    <p data-language={language}>
      {t('settings.title')} | {t('units.moves', { count: 1 })} | {t('units.moves', { count: 3 })} | {labels.category.cardio}
    </p>
  )
}

function placeholders(message: Message): string[] {
  const forms = typeof message === 'string' ? [message] : [message.one, message.other]
  return [...new Set(forms.flatMap((form) => [...form.matchAll(/\{(\w+)\}/g)].map((match) => match[1])))].sort()
}

function lookup(catalog: object, key: string): Message {
  return key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], catalog) as Message
}

describe('language preference', () => {
  it('resolves auto from the browser language', () => {
    expect(resolveLanguage('auto', 'ko-KR')).toBe('ko')
    expect(resolveLanguage('auto', 'ko')).toBe('ko')
    expect(resolveLanguage('auto', 'en-US')).toBe('en')
    expect(resolveLanguage('auto', '')).toBe('en')
    expect(resolveLanguage('en', 'ko-KR')).toBe('en')
    expect(resolveLanguage('ko', 'en-US')).toBe('ko')
  })

  it('validates the stored language setting', async () => {
    localStorage.setItem('hometrainer.settings.v1', JSON.stringify({ language: 'fr' }))
    vi.resetModules()
    const fresh = await import('@/settings/settings')
    expect(fresh.getSettings().language).toBe('auto')
    localStorage.setItem('hometrainer.settings.v1', JSON.stringify({ language: 'ko' }))
    vi.resetModules()
    const again = await import('@/settings/settings')
    expect(again.getSettings().language).toBe('ko')
    localStorage.removeItem('hometrainer.settings.v1')
    vi.resetModules()
  })
})

describe('message catalogs', () => {
  it('has a Korean message for every English key and nothing extra', () => {
    expect(messageKeys(UI_KO).sort()).toEqual(messageKeys(EN).sort())
  })

  it('keeps the same placeholders in every Korean message', () => {
    const korean: Record<string, string[]> = { 'units.minSec': ['m', 's'] }
    for (const key of messageKeys(EN)) {
      const expected = korean[key] ?? placeholders(lookup(EN, key))
      expect({ key, params: placeholders(lookup(UI_KO, key)) }).toEqual({ key, params: expected })
    }
  })

  it('interpolates and pluralizes English', () => {
    expect(translate('en', 'units.moves', { count: 1 })).toBe('1 move')
    expect(translate('en', 'units.moves', { count: 12 })).toBe('12 moves')
    expect(translate('en', 'shell.footer.support', { name: 'HomeTrainer' })).toBe('Support HomeTrainer')
  })

  it('falls back to English until the Korean bundle loads', () => {
    if (getKorean() === null) {
      expect(translate('ko', 'settings.title')).toBe('Settings')
    }
  })
})

describe('Korean language', () => {
  beforeAll(async () => {
    await loadKorean()
  })

  afterEach(() => {
    updateSettings({ language: 'en' })
  })

  afterAll(() => {
    updateSettings({ language: 'auto' })
  })

  it('renders English by default and Korean once selected', async () => {
    updateSettings({ language: 'en' })
    render(
      <>
        <LanguageSync />
        <Greeting />
      </>,
    )
    expect(screen.getByText(/Settings \| 1 move \| 3 moves \| Cardio & HIIT/)).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
    act(() => updateSettings({ language: 'ko' }))
    expect(screen.getByText(/설정 \| 동작 1개 \| 동작 3개/)).toHaveAttribute('data-language', 'ko')
    expect(document.documentElement.lang).toBe('ko')
    expect(getLanguage()).toBe('ko')
  })

  it('renders English on the server and during hydration even when Korean is preferred', async () => {
    updateSettings({ language: 'ko' })
    const html = renderToString(<Greeting />)
    expect(html).toContain('Settings')
    expect(html).not.toContain('설정')
    expect(html).toContain('data-language="en"')

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    const errors: unknown[] = []
    const consoleError = vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args))
    await act(async () => {
      hydrateRoot(container, <Greeting />, { onRecoverableError: (error) => errors.push(error) })
    })
    consoleError.mockRestore()
    expect(errors).toEqual([])
    expect(container.textContent).toContain('설정')
    container.remove()
  })

  it('localizes content with per-field English fallback', () => {
    const content = localizer('ko')
    expect(content.exerciseName({ id: 'not-a-real-exercise', name: 'Mystery move' })).toBe('Mystery move')
    expect(content.workoutDescription({ id: 'not-a-real-workout', description: 'Plain' })).toBe('Plain')
    expect(content.labels.level[1]).not.toBe('Beginner')
    expect(localizer('en').labels.level[1]).toBe('Beginner')
    const squat = getExercise('squat')
    expect(squat).toBeDefined()
    if (squat && EXERCISES_KO.squat) {
      expect(content.exerciseName(squat)).toBe(EXERCISES_KO.squat.name)
      expect(localizer('en').exerciseName(squat)).toBe('Squat')
    }
  })

  it('formats units for the active language', () => {
    expect(formattersFor('en').seconds(90)).toBe('1:30 min')
    expect(formattersFor('ko').seconds(90)).toBe('1분 30초')
    expect(formattersFor('en').target({ kind: 'reps', reps: 10 }, 'perSide')).toBe('10 reps per side')
    expect(formattersFor('ko').target({ kind: 'reps', reps: 10 }, 'perSide')).toBe('한쪽당 10회')
    expect(formattersFor('ko').duration(65 * 60_000)).toBe('1시간 5분')
  })

  it('matches Korean names in search only when Korean is active', () => {
    const squat = getExercise('squat')
    const name = EXERCISES_KO.squat?.name
    if (squat && name) {
      expect(matchesQuery(squat, name, 'ko')).toBe(true)
      expect(matchesQuery(squat, name, 'en')).toBe(false)
      expect(matchesQuery(squat, 'squat', 'ko')).toBe(true)
    }
  })
})
