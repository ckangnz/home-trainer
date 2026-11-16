import { afterEach, expect, it, vi } from 'vitest'
import { TRAINER_ORDER } from '@/figure/look'
import { getSettings, normalizeSettings, settingsUpdatedAt, syncedPart, updateSettings } from '@/settings/settings'
import { endSessionTrainer, getWorkoutTrainer, pickWorkoutTrainer, startSessionTrainer } from './sessionTrainer'
afterEach(() => { endSessionTrainer(); vi.restoreAllMocks(); updateSettings({ randomTrainer: false, trainer: 'female' }) })
it('normalizes and syncs the choice without changing existing defaults', () => {
  expect(normalizeSettings({}).randomTrainer).toBe(false)
  expect(normalizeSettings({ randomTrainer: 'true' }).randomTrainer).toBe(false)
  expect(syncedPart(normalizeSettings({ randomTrainer: true })).randomTrainer).toBe(true)
})
it('can select every actual trainer but never immediately repeats the last random choice', () => {
  const picks = TRAINER_ORDER.map((_, i) => pickWorkoutTrainer(null, () => (i + .1) / TRAINER_ORDER.length))
  expect(picks).toEqual(TRAINER_ORDER)
  for (const last of TRAINER_ORDER) {
    expect(pickWorkoutTrainer(last, () => 0)).not.toBe(last)
    expect(pickWorkoutTrainer(last, () => .999)).not.toBe(last)
  }
})
it('keeps a random draw stable until the next Start, without writing cloud preferences', () => {
  updateSettings({ randomTrainer: true, trainer: 'kai' })
  const timestamp = settingsUpdatedAt()
  const saved = localStorage.getItem('hometrainer.settings.v1')
  vi.spyOn(Math, 'random').mockReturnValue(0)
  const first = startSessionTrainer()
  expect(getWorkoutTrainer()).toBe(first)
  expect(getWorkoutTrainer()).toBe(first)
  endSessionTrainer()
  expect(getWorkoutTrainer()).toBe('kai')
  const next = startSessionTrainer()
  expect(next).not.toBe(first)
  expect(getSettings()).toMatchObject({ trainer: 'kai', randomTrainer: true })
  expect(settingsUpdatedAt()).toBe(timestamp)
  expect(localStorage.getItem('hometrainer.settings.v1')).toBe(saved)
})
it('fixed trainers never randomize', () => {
  updateSettings({ randomTrainer: false, trainer: 'nina' })
  expect(startSessionTrainer()).toBe('nina')
  expect(startSessionTrainer()).toBe('nina')
})
