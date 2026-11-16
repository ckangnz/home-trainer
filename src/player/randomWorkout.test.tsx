import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { updateSettings } from '@/settings/settings'
import { TRAINERS } from '@/figure/look'
import { getWorkoutTrainer } from './sessionTrainer'
import { usePlayer } from './usePlayer'
import type { PlaybackStep } from '@/workouts/types'
const sound = vi.hoisted(() => ({ unlock: vi.fn(), play: vi.fn(), silence: vi.fn() }))
vi.mock('./coach', () => ({ coach: sound }))
afterEach(() => { vi.restoreAllMocks(); updateSettings({ randomTrainer: false }) })
it('picks before intro/unlock and keeps that trainer through Pause/Resume/Skip', () => {
  updateSettings({ trainer: 'kai', randomTrainer: true })
  vi.spyOn(Math, 'random').mockReturnValue(0)
  const steps: PlaybackStep[] = [{ kind: 'pause', reason: 'getReady', durationMs: 6000, nextWork: 1 }, { kind: 'work', exerciseId: 'squat', target: { kind: 'reps', reps: 8 }, set: 1, sets: 1, round: 1, rounds: 1, item: 1, items: 1 }]
  let unlockedTrainer = ''
  sound.unlock.mockImplementation(() => { unlockedTrainer = getWorkoutTrainer() })
  const hook = renderHook(() => usePlayer(steps, { trainer: 'kai', trainerName: 'Kai', language: 'en', nameOf: () => 'Squat' }))
  act(() => hook.result.current.start())
  const chosen = getWorkoutTrainer()
  expect(unlockedTrainer).toBe(chosen)
  expect(sound.play.mock.calls.flat(2).some(cue => cue.kind === 'say' && cue.text.includes(TRAINERS[chosen].name))).toBe(true)
  act(() => hook.result.current.pause())
  act(() => hook.result.current.resume())
  expect(getWorkoutTrainer()).toBe(chosen)
  act(() => hook.result.current.done())
  expect(getWorkoutTrainer()).toBe(chosen)
  hook.unmount()
  expect(getWorkoutTrainer()).toBe('kai')
})
