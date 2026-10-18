import { describe, expect, it } from 'vitest'
import type { PlaybackStep } from '@/workouts/types'
import {
  activeDurationMs,
  completeReps,
  createPlayer,
  extendPause,
  nextStep,
  pausePlayer,
  previousStep,
  resumePlayer,
  startPlayer,
  stepRemaining,
  tickPlayer,
} from './machine'
import { cuesBetween, workAnnouncement } from './cues'

const steps: PlaybackStep[] = [
  { kind: 'pause', reason: 'getReady', durationMs: 5000, nextWork: 1 },
  { kind: 'work', exerciseId: 'squat', target: { kind: 'time', ms: 30000 }, set: 1, sets: 1, round: 1, rounds: 1, item: 1, items: 2 },
  { kind: 'pause', reason: 'item', durationMs: 10000, nextWork: 3 },
  { kind: 'work', exerciseId: 'push-up', target: { kind: 'reps', reps: 10 }, set: 1, sets: 2, round: 1, rounds: 1, item: 2, items: 2 },
]

const names = (id: string) => ({ squat: 'Squat', 'push-up': 'Push-up' })[id] ?? id

describe('player machine', () => {
  it('starts ready and runs from the first step', () => {
    const ready = createPlayer(steps)
    expect(ready.status).toBe('ready')
    const running = startPlayer(ready, 1000)
    expect(running.status).toBe('running')
    expect(running.index).toBe(0)
    expect(stepRemaining(running, 3000)).toBe(3000)
  })

  it('auto-advances timed steps with carry-over', () => {
    const running = startPlayer(createPlayer(steps), 0)
    expect(tickPlayer(running, 4999).index).toBe(0)
    const advanced = tickPlayer(running, 5200)
    expect(advanced.index).toBe(1)
    expect(advanced.enteredBy).toBe('timer')
    expect(stepRemaining(advanced, 5200)).toBe(29800)
  })

  it('catches up after a long gap but waits on rep targets', () => {
    const running = startPlayer(createPlayer(steps), 0)
    const caughtUp = tickPlayer(running, 600000)
    expect(caughtUp.index).toBe(3)
    expect(caughtUp.status).toBe('running')
    expect(stepRemaining(caughtUp, 600000)).toBeNull()
  })

  it('freezes time while paused', () => {
    const running = tickPlayer(startPlayer(createPlayer(steps), 0), 6000)
    const paused = pausePlayer(running, 10000)
    expect(stepRemaining(paused, 50000)).toBe(25000)
    const resumed = resumePlayer(paused, 50000)
    expect(stepRemaining(resumed, 52000)).toBe(23000)
    expect(tickPlayer(resumed, 70000).index).toBe(1)
    expect(tickPlayer(resumed, 75001).index).toBe(2)
  })

  it('marks user skips and rep completion as user-entered', () => {
    const running = startPlayer(createPlayer(steps), 0)
    const skipped = nextStep(running, 1000)
    expect(skipped.index).toBe(1)
    expect(skipped.enteredBy).toBe('user')
    expect(completeReps(skipped, 2000)).toBe(skipped)
    const atReps = nextStep(nextStep(skipped, 2000), 3000)
    const finished = completeReps(atReps, 9000)
    expect(finished.status).toBe('finished')
    expect(finished.completedWork).toBe(2)
  })

  it('restarts the current exercise or goes back one exercise', () => {
    const atWork = tickPlayer(startPlayer(createPlayer(steps), 0), 5000)
    const restarted = previousStep(atWork, 15000)
    expect(restarted.index).toBe(1)
    expect(stepRemaining(restarted, 15000)).toBe(30000)
    const atRest = tickPlayer(restarted, 45000)
    expect(atRest.index).toBe(2)
    expect(atRest.completedWork).toBe(1)
    const back = previousStep(atRest, 46000)
    expect(back.index).toBe(1)
    expect(back.completedWork).toBe(0)
  })

  it('extends only pause steps', () => {
    const running = startPlayer(createPlayer(steps), 0)
    expect(stepRemaining(extendPause(running, 10000), 1000)).toBe(14000)
    const atWork = tickPlayer(running, 5000)
    expect(extendPause(atWork, 10000)).toBe(atWork)
  })

  it('reports active duration without paused time', () => {
    const running = startPlayer(createPlayer(steps), 1000)
    const paused = pausePlayer(running, 3000)
    const resumed = resumePlayer(paused, 13000)
    expect(activeDurationMs(resumed, 20000)).toBe(9000)
  })

  it('finishes immediately when there is nothing to play', () => {
    expect(createPlayer([]).status).toBe('finished')
  })
})

describe('coach cues', () => {
  it('announces work with its target, side, and set', () => {
    expect(workAnnouncement(steps[3] as Extract<PlaybackStep, { kind: 'work' }>, names)).toBe('Push-up, 10 reps, set 1 of 2.')
    expect(
      workAnnouncement({ ...(steps[1] as Extract<PlaybackStep, { kind: 'work' }>), side: 'left', target: { kind: 'time', ms: 60000 } }, names),
    ).toBe('Squat, left side, 1 minute.')
  })

  it('announces entries, halfway, and the final countdown', () => {
    const ready = createPlayer(steps)
    const started = startPlayer(ready, 0)
    expect(cuesBetween(ready, started, 0, 0, names)).toEqual([{ kind: 'say', text: 'Get ready. First up: Squat.' }])
    const working = tickPlayer(started, 5000)
    expect(cuesBetween(started, working, 4900, 5000, names)).toEqual([
      { kind: 'beep', tone: 'go' },
      { kind: 'say', text: 'Squat, 30 seconds.' },
    ])
    expect(cuesBetween(working, working, 19000, 20500, names)).toEqual([{ kind: 'say', text: 'Halfway there.' }])
    expect(cuesBetween(working, working, 31500, 33500, names)).toEqual([
      { kind: 'beep', tone: 'count' },
      { kind: 'beep', tone: 'count' },
    ])
    const resting = tickPlayer(working, 35000)
    expect(cuesBetween(working, resting, 34900, 35000, names)).toEqual([{ kind: 'say', text: 'Rest. Next up: Push-up.' }])
  })

  it('celebrates the finish', () => {
    const atReps = nextStep(nextStep(nextStep(startPlayer(createPlayer(steps), 0), 1), 2), 3)
    const finished = completeReps(atReps, 4)
    expect(cuesBetween(atReps, finished, 3, 4, names)).toEqual([
      { kind: 'beep', tone: 'end' },
      { kind: 'say', text: 'Workout complete. Great job!' },
    ])
  })
})
