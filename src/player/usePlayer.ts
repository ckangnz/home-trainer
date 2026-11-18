import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlaybackStep } from '@/workouts/types'
import { coach } from './coach'
import { getSettings } from '@/settings/settings'
import { startSessionTrainer, endSessionTrainer } from './sessionTrainer'
import { TRAINERS } from '@/figure/look'
import { cuesBetween, type CoachContext } from './cues'
import {
  completeReps,
  createPlayer,
  extendPause,
  nextStep,
  holdForVoice,
  pausePlayer,
  releaseVoiceHold,
  previousStep,
  resumePlayer,
  startPlayer,
  tickPlayer,
  type PlayerState,
} from './machine'

const TICK_MS = 100
const START_CUE_MAX_HOLD_MS = 12000

function clockNow(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now()
}

export interface PlayerControls {
  state: PlayerState
  now: number
  start: () => void
  pause: () => void
  resume: () => void
  next: () => void
  previous: () => void
  done: () => void
  extend: (ms: number) => void
}

export function usePlayer(steps: PlaybackStep[], coachContext: CoachContext): PlayerControls {
  const [state, setState] = useState(() => createPlayer(steps))
  const [now, setNow] = useState(clockNow)
  const stateRef = useRef(state)
  const lastTimeRef = useRef(now)
  const contextRef = useRef(coachContext)

  useEffect(() => {
    contextRef.current = coachContext
  }, [coachContext])

  useEffect(() => {
    const fresh = createPlayer(steps)
    stateRef.current = fresh
    setState(fresh)
  }, [steps])

  const apply = useCallback((transition: (current: PlayerState, time: number) => PlayerState) => {
    const time = clockNow()
    const previous = stateRef.current
    let next = transition(previous, time)
    const cues = cuesBetween(previous, next, lastTimeRef.current, time, contextRef.current)
    const speaksStart =
      getSettings().voice &&
      next.status === 'running' &&
      next.steps[next.index]?.kind === 'work' &&
      (next.index !== previous.index || next.runId !== previous.runId) &&
      cues.some((cue) => cue.kind === 'say')
    if (speaksStart) {
      next = holdForVoice(next)
    }
    stateRef.current = next
    lastTimeRef.current = time
    if (next !== previous) {
      setState(next)
    }
    setNow(time)
    if (cues.length > 0) {
      const played = coach.play(cues)
      if (speaksStart) {
        const { index, runId } = next
        const release = () => {
          const live = stateRef.current
          if (live.voiceHold && live.index === index && live.runId === runId) {
            const at = clockNow()
            const released = releaseVoiceHold(live, at)
            stateRef.current = released
            lastTimeRef.current = at
            setState(released)
            setNow(at)
          }
        }
        // The cap keeps a stalled audio element from freezing the workout.
        void Promise.race([played, new Promise<void>((resolve) => setTimeout(resolve, START_CUE_MAX_HOLD_MS))]).then(release)
      }
    }
  }, [])

  useEffect(() => {
    if (state.status !== 'running') {
      return
    }
    const interval = window.setInterval(() => apply(tickPlayer), TICK_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        apply(tickPlayer)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [state.status, apply])

  useEffect(() => () => { coach.silence(); endSessionTrainer() }, [])

  return {
    state,
    now,
    start: useCallback(() => {
      const trainer = startSessionTrainer()
      contextRef.current = { ...contextRef.current, trainer, trainerName: TRAINERS[trainer].name }
      coach.unlock()
      apply(startPlayer)
    }, [apply]),
    pause: useCallback(() => {
      coach.silence()
      apply(pausePlayer)
    }, [apply]),
    resume: useCallback(() => { coach.unlock(); apply(resumePlayer) }, [apply]),
    next: useCallback(() => apply(nextStep), [apply]),
    previous: useCallback(() => apply(previousStep), [apply]),
    done: useCallback(() => apply(completeReps), [apply]),
    extend: useCallback((ms: number) => apply((current) => extendPause(current, ms)), [apply]),
  }
}
