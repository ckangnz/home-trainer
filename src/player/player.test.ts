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
    expect(finished.workLog.map((entry) => entry.ms)).toEqual([1000, 6000])
  })

  it('restarts the current exercise or goes back one exercise', () => {
    const atWork = tickPlayer(startPlayer(createPlayer(steps), 0), 5000)
    const restarted = previousStep(atWork, 15000)
    expect(restarted.index).toBe(1)
    expect(stepRemaining(restarted, 15000)).toBe(30000)
    const atRest = tickPlayer(restarted, 45000)
    expect(atRest.index).toBe(2)
    expect(atRest.completedWork).toBe(1)
    expect(atRest.workLog).toEqual([{ exerciseId: atRest.steps[1].kind === 'work' ? atRest.steps[1].exerciseId : '', ms: 30000 }])
    const back = previousStep(atRest, 46000)
    expect(back.index).toBe(1)
    expect(back.completedWork).toBe(0)
    expect(back.workLog).toEqual([])
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

const coach = { nameOf: names, tipOf: (id: string) => (id === 'squat' ? 'Keep your chest lifted.' : undefined), trainer: 'female' as const, trainerName: 'Maya' }

describe('coach cues', () => {
  it('announces work with its target, side, and set', () => {
    expect(workAnnouncement(steps[3] as Extract<PlaybackStep, { kind: 'work' }>, names)).toBe('Push-up, 10 reps, set 1 of 2.')
    expect(
      workAnnouncement({ ...(steps[1] as Extract<PlaybackStep, { kind: 'work' }>), side: 'left', target: { kind: 'time', ms: 60000 } }, names),
    ).toBe('Squat, left side, 1 minute.')
  })

  it('introduces the trainer, starts work, and previews the final exercise', () => {
    const ready = createPlayer(steps)
    const started = startPlayer(ready, 0)
    const intro = cuesBetween(ready, started, 0, 0, coach)
    expect(intro).toHaveLength(1)
    expect(intro[0]).toMatchObject({ kind: 'say', text: expect.stringContaining('Maya') })
    expect(intro[0]).toMatchObject({ text: expect.stringContaining('Squat') })

    const working = tickPlayer(started, 5000)
    const go = cuesBetween(started, working, 4900, 5000, coach)
    expect(go[0]).toEqual({ kind: 'beep', tone: 'go' })
    expect(go[1]).toMatchObject({ kind: 'say', text: expect.stringMatching(/^Squat, 30 seconds\. /) })

    const resting = tickPlayer(working, 35000)
    const rest = cuesBetween(working, resting, 34900, 35000, coach)
    expect(rest).toEqual([{ kind: 'say', text: expect.stringContaining('Push-up') }])
  })

  it('coaches during long exercises with a tip, halfway, ten seconds left, and a countdown', () => {
    const long: PlaybackStep[] = [{ ...(steps[1] as Extract<PlaybackStep, { kind: 'work' }>), target: { kind: 'time', ms: 60000 } }]
    const running = startPlayer(createPlayer(long), 0)
    expect(cuesBetween(running, running, 5000, 6500, coach)).toEqual([{ kind: 'say', text: 'Keep your chest lifted.' }])
    expect(cuesBetween(running, running, 29000, 30500, coach)).toEqual([{ kind: 'say', text: expect.any(String) }])
    expect(cuesBetween(running, running, 49000, 50500, coach)).toEqual([{ kind: 'say', text: expect.any(String) }])
    expect(cuesBetween(running, running, 56500, 58500, coach)).toEqual([
      { kind: 'beep', tone: 'count' },
      { kind: 'beep', tone: 'count' },
    ])
  })

  it('speaks in each trainer\'s own voice', () => {
    const ready = createPlayer(steps)
    const started = startPlayer(ready, 0)
    const maya = cuesBetween(ready, started, 0, 0, coach)
    const leo = cuesBetween(ready, started, 0, 0, { ...coach, trainer: 'male', trainerName: 'Leo' })
    expect(maya[0]).not.toEqual(leo[0])
    expect(leo[0]).toMatchObject({ text: expect.stringContaining('Leo') })
  })

  it('celebrates the finish', () => {
    const atReps = nextStep(nextStep(nextStep(startPlayer(createPlayer(steps), 0), 1), 2), 3)
    const finished = completeReps(atReps, 4)
    const cues = cuesBetween(atReps, finished, 3, 4, coach)
    expect(cues[0]).toEqual({ kind: 'beep', tone: 'end' })
    expect(cues[1]).toMatchObject({ kind: 'say', text: expect.stringMatching(/complete|wrap|Done/) })
  })
})

describe('Korean coach cues', () => {
  it('announces exercises and phrases in Korean', async () => {
    const { workAnnouncement, entryAnnouncement } = await import('./cues')
    const step = { kind: 'work' as const, exerciseId: 'squat', target: { kind: 'reps' as const, reps: 12 }, side: 'left' as const, set: 1, sets: 3, round: 1, rounds: 1, item: 1, items: 1 }
    expect(workAnnouncement(step, () => '스쿼트', 'ko')).toBe('스쿼트, 왼쪽, 12회, 3세트 중 1세트.')
    expect(workAnnouncement({ ...step, side: undefined, sets: 1, target: { kind: 'time', ms: 60000 } }, () => 'Plank')).toBe('Plank, 1 minute.')
    const finished = { ...createPlayer([step]), status: 'finished' as const }
    const korean = entryAnnouncement(finished, { nameOf: () => '스쿼트', trainer: 'kai', language: 'ko' })
    expect(korean).toMatch(/[가-힣]/)
  })
})
