import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlaybackStep } from '@/workouts/types'
import { coach } from './coach'
import { getSettings } from '@/settings/settings'
import { startSessionTrainer, endSessionTrainer } from './sessionTrainer'
import { TRAINERS } from '@/figure/look'
import { announcementAtoms, cuesBetween, entryAnnouncement, type Cue, type CoachContext } from './cues'
import { atomsDurationMs } from './voicepack'
import {
  completeReps,
  createPlayer,
  extendPause,
  nextStep,
  holdForVoice,
  pausePlayer,
  releaseVoiceHold,
  stepLimitMs,
  stepRemaining,
  previousStep,
  resumePlayer,
  startPlayer,
  tickPlayer,
  type PlayerState,
} from './machine'

const TICK_MS = 100
const START_CUE_MAX_HOLD_MS = 12000
// A lead-in only fits when the pause is long enough to also hear its own cue.
const LEAD_IN_MIN_EXTRA_MS = 2500

// The next exercise's start cue is played inside the pause before it, timed to
// finish exactly when the pause reaches zero.
interface LeadIn {
  pauseIndex: number
  workIndex: number
  runId: number
  cue: Cue
  durationMs: number | null
  played: boolean
}

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
  const leadRef = useRef<LeadIn | null>(null)

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
    let cues = cuesBetween(previous, next, lastTimeRef.current, time, contextRef.current)
    const entered = next.index !== previous.index || next.runId !== previous.runId
    const lead = leadRef.current
    // Entering the exercise right after its lead-in played: the cue already ended at zero.
    if (
      entered &&
      lead?.played &&
      next.status === 'running' &&
      next.index === lead.workIndex &&
      next.runId === lead.runId &&
      previous.index === lead.pauseIndex &&
      next.enteredBy === 'timer'
    ) {
      cues = cues.filter((cue) => cue.kind !== 'say')
    }
    if (entered) {
      leadRef.current = null
      const step = next.steps[next.index]
      if (next.status === 'running' && step?.kind === 'pause' && step.nextWork >= 0 && getSettings().voice) {
        const context = contextRef.current
        const workState = { ...next, index: step.nextWork }
        const text = entryAnnouncement(workState, context)
        const atoms = announcementAtoms(workState, context)
        if (text && atoms) {
          const created: LeadIn = { pauseIndex: next.index, workIndex: step.nextWork, runId: next.runId, cue: { kind: 'say', text, atoms }, durationMs: null, played: false }
          leadRef.current = created
          void atomsDurationMs(atoms, context.trainer ?? 'female', context.language ?? 'en').then((ms) => {
            created.durationMs = ms
          })
        }
      }
    }
    const pending = leadRef.current
    if (
      pending &&
      !pending.played &&
      pending.durationMs !== null &&
      next.status === 'running' &&
      next.index === pending.pauseIndex &&
      next.runId === pending.runId &&
      !entered
    ) {
      const limit = stepLimitMs(next)
      const remaining = stepRemaining(next, time)
      if (limit !== null && remaining !== null && limit >= pending.durationMs + LEAD_IN_MIN_EXTRA_MS && remaining <= pending.durationMs) {
        pending.played = true
        cues = [...cues, pending.cue]
      }
    }
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
      if (leadRef.current) leadRef.current.played = false
      apply(pausePlayer)
    }, [apply]),
    resume: useCallback(() => { coach.unlock(); apply(resumePlayer) }, [apply]),
    next: useCallback(() => apply(nextStep), [apply]),
    previous: useCallback(() => apply(previousStep), [apply]),
    done: useCallback(() => apply(completeReps), [apply]),
    extend: useCallback((ms: number) => apply((current) => extendPause(current, ms)), [apply]),
  }
}
