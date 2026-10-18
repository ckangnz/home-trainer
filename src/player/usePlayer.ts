import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlaybackStep } from '@/workouts/types'
import { coach } from './coach'
import { cuesBetween, type CoachContext } from './cues'
import {
  completeReps,
  createPlayer,
  extendPause,
  nextStep,
  pausePlayer,
  previousStep,
  resumePlayer,
  startPlayer,
  tickPlayer,
  type PlayerState,
} from './machine'

const TICK_MS = 100

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
    const next = transition(previous, time)
    const cues = cuesBetween(previous, next, lastTimeRef.current, time, contextRef.current)
    stateRef.current = next
    lastTimeRef.current = time
    if (next !== previous) {
      setState(next)
    }
    setNow(time)
    if (cues.length > 0) {
      coach.play(cues)
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

  useEffect(() => () => coach.silence(), [])

  return {
    state,
    now,
    start: useCallback(() => {
      coach.unlock()
      apply(startPlayer)
    }, [apply]),
    pause: useCallback(() => {
      coach.silence()
      apply(pausePlayer)
    }, [apply]),
    resume: useCallback(() => apply(resumePlayer), [apply]),
    next: useCallback(() => apply(nextStep), [apply]),
    previous: useCallback(() => apply(previousStep), [apply]),
    done: useCallback(() => apply(completeReps), [apply]),
    extend: useCallback((ms: number) => apply((current) => extendPause(current, ms)), [apply]),
  }
}
