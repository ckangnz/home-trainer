import type { TrainerId } from '@/figure/look'
import type { Language } from '@/i18n/types'
import { BANKS_KO } from './cues.ko'
import type { PlaybackStep, WorkStep } from '@/workouts/types'
import { stepElapsed, stepLimitMs, type PlayerState } from './machine'

export type Cue = { kind: 'say'; text: string } | { kind: 'beep'; tone: 'count' | 'go' | 'end' }

export type NameOf = (exerciseId: string) => string

export interface CoachContext {
  nameOf: NameOf
  tipOf?: (exerciseId: string) => string | undefined
  trainer?: TrainerId
  trainerName?: string
  language?: Language
}

export interface PhraseBank {
  intro: (trainer: string, first: string) => string[]
  go: string[]
  halfway: string[]
  tenLeft: string[]
  rest: (next: string) => string[]
  lastUp: (next: string) => string[]
  round: (done: number, total: number) => string[]
  switchSides: string[]
  finish: string[]
}

const BANKS: Record<TrainerId, PhraseBank> = {
  female: {
    intro: (trainer, first) => [`Hi, I'm ${trainer}! Let's get moving. First up: ${first}.`, `Hey, ${trainer} here. Ready? First up: ${first}.`],
    go: ['Go!', "Let's go!", 'You got this!', 'Here we go!'],
    halfway: ['Halfway there!', "You're halfway, keep it up!", 'Looking strong, keep going!'],
    tenLeft: ['Ten seconds left!', 'Ten more seconds, push!', 'Almost there, stay with me!'],
    rest: (next) => [`Great work! Take a breather. Next up: ${next}.`, `Nice job! Rest up. Next: ${next}.`, `Well done. Breathe. Coming up: ${next}.`],
    lastUp: (next) => [`Last one coming up: ${next}. Finish strong!`, `Final exercise next: ${next}. Give it everything!`],
    round: (done, total) => [`Round ${done} done! ${total - done} to go. Grab some water.`, `That's round ${done}. Shake it out, ${total - done} more.`],
    switchSides: ['Switch sides!', 'Other side now!'],
    finish: ['Workout complete! Amazing effort!', "That's a wrap! You crushed it!", 'Done! So proud of you. See you next time!'],
  },
  male: {
    intro: (trainer, first) => [`Hey, I'm ${trainer}. Let's get to work. First up: ${first}.`, `${trainer} here. Focus up. First: ${first}.`],
    go: ['Go.', "Let's work.", 'Start now.', 'Begin.'],
    halfway: ['Halfway. Stay steady.', 'Halfway point. Good form.', 'Halfway. Keep breathing.'],
    tenLeft: ['Ten seconds. Finish it.', 'Ten more. Stay strong.', 'Last ten seconds.'],
    rest: (next) => [`Good work. Recover. Next: ${next}.`, `Solid. Take your rest. Up next: ${next}.`, `Nice. Breathe deep. Next: ${next}.`],
    lastUp: (next) => [`Final exercise next: ${next}. Leave nothing behind.`, `Last one: ${next}. Bring it home.`],
    round: (done, total) => [`Round ${done} complete. ${total - done} left. Reset and breathe.`, `That's round ${done}. ${total - done} more to go.`],
    switchSides: ['Switch sides.', 'Other side.'],
    finish: ['Workout complete. Great work today.', 'Done. Strong session. Rest up.', "That's it. Well earned."],
  },
  sofia: {
    intro: (trainer, first) => [`Hey there, I'm ${trainer}! Let's make this feel amazing. First up: ${first}.`, `Hi, ${trainer} here. Breathe in, and let's begin with ${first}.`],
    go: ['Here we go!', "Let's shine!", "Let's flow!", 'Begin, beautiful work!'],
    halfway: ['Halfway, you look fantastic!', 'Halfway there, keep that energy!', 'Halfway. Smooth and strong.'],
    tenLeft: ['Ten seconds, stay with me!', 'Ten more, you can do this!', 'Last ten, finish proud!'],
    rest: (next) => [`Lovely work. Shake it out. Next: ${next}.`, `So good! Sip some water. Up next: ${next}.`, `Beautiful. Breathe. Coming up: ${next}.`],
    lastUp: (next) => [`Last one: ${next}. Finish beautifully!`, `Final move next: ${next}. Give it your heart!`],
    round: (done, total) => [`Round ${done} done! ${total - done} to go, you're glowing.`, `That's round ${done}. ${total - done} more, together.`],
    switchSides: ['Other side, lovely!', 'Switch sides!'],
    finish: ['All done! You were amazing today!', "That's a wrap. Feel that glow!", 'Finished! Proud of you, see you soon!'],
  },
  zara: {
    intro: (trainer, first) => [`What's up! I'm ${trainer}, and we're turning it up. First: ${first}!`, `${trainer} in the house! Let's go hard. First up: ${first}!`],
    go: ['Go go go!', 'Turn it up!', "Let's get it!", 'Bring the energy!'],
    halfway: ['Halfway! Keep that fire!', "Halfway, don't you dare slow down!", 'Halfway! Strong and loud!'],
    tenLeft: ['Ten seconds! Empty the tank!', 'Ten more! Push push push!', 'Last ten, make it count!'],
    rest: (next) => [`Yes! Catch your breath. Next: ${next}.`, `That's what I'm talking about! Next up: ${next}.`, `Big work! Quick rest. Coming up: ${next}.`],
    lastUp: (next) => [`Last one: ${next}! Leave it all out here!`, `Final round of fire: ${next}! Let's go!`],
    round: (done, total) => [`Round ${done} smashed! ${total - done} to go!`, `Round ${done} down! ${total - done} more, stay hype!`],
    switchSides: ['Switch it up!', 'Other side, go!'],
    finish: ['Done! You absolutely crushed it!', 'Workout over! That was fire!', 'Finished! Go celebrate, champ!'],
  },
  marcus: {
    intro: (trainer, first) => [`I'm ${trainer}. Today we build strength. First: ${first}.`, `${trainer} here. Lock in. First up: ${first}.`],
    go: ['Work.', 'Drive!', 'Power up.', "Let's build."],
    halfway: ['Halfway. Own every rep.', 'Halfway. Stay tight.', 'Halfway. Strong body, strong mind.'],
    tenLeft: ['Ten seconds. Dig deep.', 'Ten more. No quitting.', 'Last ten. Finish like a champion.'],
    rest: (next) => [`Good. Reset your breath. Next: ${next}.`, `Strong set. Recover. Up next: ${next}.`, `That's power. Rest. Next: ${next}.`],
    lastUp: (next) => [`Last one: ${next}. Everything you've got.`, `Final exercise: ${next}. Finish strong.`],
    round: (done, total) => [`Round ${done} done. ${total - done} left. Stay locked in.`, `That's round ${done}. ${total - done} more. Keep building.`],
    switchSides: ['Switch sides.', 'Other side. Same power.'],
    finish: ['Session complete. You got stronger today.', 'Done. Respect. Rest and refuel.', 'That was real work. Well done.'],
  },
  kai: {
    intro: (trainer, first) => [`Hey, I'm ${trainer}. Let's move with intention. First up: ${first}.`, `${trainer} here. Settle in, nice and easy. First: ${first}.`],
    go: ['And go.', 'Find your rhythm.', 'Here we go, nice and smooth.', 'Begin.'],
    halfway: ['Halfway. Breathe and stay present.', 'Halfway. Nice and steady.', 'Halfway. Feel every movement.'],
    tenLeft: ['Ten seconds. Stay calm and strong.', 'Ten more. Breathe through it.', 'Last ten. Keep it smooth.'],
    rest: (next) => [`Nice work. Let your breath settle. Next: ${next}.`, `Good flow. Relax your shoulders. Up next: ${next}.`, `Easy now. Recover. Coming up: ${next}.`],
    lastUp: (next) => [`Last one: ${next}. Finish with focus.`, `Final move: ${next}. Stay with your breath.`],
    round: (done, total) => [`Round ${done} complete. ${total - done} to go. Reset.`, `That's round ${done}. ${total - done} more. Stay easy.`],
    switchSides: ['Switch sides, slow and steady.', 'Other side.'],
    finish: ['Workout complete. Take a moment, you earned it.', 'Done. Good energy today.', 'All finished. Breathe it in.'],
  },
  nina: {
    intro: (trainer, first) => [`Hi, I'm ${trainer}! Clean form, big smiles. First: ${first}.`, `${trainer} here, let's be precise and have fun. First up: ${first}.`],
    go: ['Go!', 'And begin!', 'Form first, go!', 'Show me good form!'],
    halfway: ['Halfway! Form is looking sharp.', 'Halfway, nice and controlled!', 'Halfway! Posture tall.'],
    tenLeft: ['Ten seconds, keep it clean!', 'Ten more, stay precise!', 'Last ten, perfect reps!'],
    rest: (next) => [`Nicely done! Quick breather. Next: ${next}.`, `Sharp work! Rest up. Up next: ${next}.`, `Lovely control. Breathe. Coming up: ${next}.`],
    lastUp: (next) => [`Last one: ${next}. Make it your best form!`, `Final exercise: ${next}. Precise and proud!`],
    round: (done, total) => [`Round ${done} done! ${total - done} to go, nice pacing.`, `That's round ${done}. ${total - done} more, keep it tidy.`],
    switchSides: ['Switch sides!', 'Other side, same great form!'],
    finish: ['Workout complete! Beautiful form today!', 'All done! That was so well executed!', 'Finished! High five, see you next time!'],
  },
}

function pick<T>(options: T[], seed: number): T {
  return options[Math.abs(Math.round(seed)) % options.length]
}

function targetPhrase(step: WorkStep, language: Language): string {
  if (language === 'ko') {
    if (step.target.kind === 'reps') {
      return `${step.target.reps}회`
    }
    const seconds = Math.round(step.target.ms / 1000)
    return seconds % 60 === 0 ? `${seconds / 60}분` : `${seconds}초`
  }
  if (step.target.kind === 'reps') {
    return `${step.target.reps} reps`
  }
  const seconds = Math.round(step.target.ms / 1000)
  if (seconds % 60 === 0) {
    const minutes = seconds / 60
    return minutes === 1 ? '1 minute' : `${minutes} minutes`
  }
  return `${seconds} seconds`
}

export function workAnnouncement(step: WorkStep, nameOf: NameOf, language: Language = 'en'): string {
  if (language === 'ko') {
    const korean = [nameOf(step.exerciseId)]
    if (step.side) {
      korean.push(step.side === 'left' ? '왼쪽' : '오른쪽')
    }
    korean.push(targetPhrase(step, language))
    if (step.sets > 1) {
      korean.push(`${step.sets}세트 중 ${step.set}세트`)
    }
    return `${korean.join(', ')}.`
  }
  const parts = [nameOf(step.exerciseId)]
  if (step.side) {
    parts.push(`${step.side} side`)
  }
  parts.push(targetPhrase(step, language))
  if (step.sets > 1) {
    parts.push(`set ${step.set} of ${step.sets}`)
  }
  return `${parts.join(', ')}.`
}

function upNext(steps: PlaybackStep[], index: number): WorkStep | undefined {
  const step = steps[index]
  if (step?.kind !== 'pause' || step.nextWork < 0) {
    return undefined
  }
  const next = steps[step.nextWork]
  return next?.kind === 'work' ? next : undefined
}

function isFinalWork(steps: PlaybackStep[], index: number): boolean {
  return steps.slice(index + 1).every((step) => step.kind !== 'work')
}

function bankFor(context: CoachContext): PhraseBank {
  const banks = context.language === 'ko' ? BANKS_KO : BANKS
  return banks[context.trainer ?? 'female'] ?? banks.female
}

export function entryAnnouncement(state: PlayerState, context: CoachContext): string | null {
  const bank = bankFor(context)
  const seed = state.index + state.runId
  if (state.status === 'finished') {
    return pick(bank.finish, seed)
  }
  const step = state.steps[state.index]
  if (!step) {
    return null
  }
  if (step.kind === 'work') {
    return `${workAnnouncement(step, context.nameOf, context.language)} ${pick(bank.go, seed)}`
  }
  const next = upNext(state.steps, state.index)
  const nextName = next ? context.nameOf(next.exerciseId) : null
  switch (step.reason) {
    case 'getReady':
      return nextName ? pick(bank.intro(context.trainerName ?? (context.language === 'ko' ? '코치' : 'your coach'), nextName), seed) : context.language === 'ko' ? '준비하세요.' : 'Get ready.'
    case 'switch':
      return pick(bank.switchSides, seed)
    case 'round': {
      const finished = state.steps.slice(0, state.index).reverse().find((candidate) => candidate.kind === 'work')
      const round = finished?.kind === 'work' ? finished.round : 1
      const total = finished?.kind === 'work' ? finished.rounds : round + 1
      return pick(bank.round(round, total), seed)
    }
    default:
      if (!nextName || !next) {
        return context.language === 'ko' ? '휴식.' : 'Rest.'
      }
      return step.nextWork >= 0 && isFinalWork(state.steps, step.nextWork) ? pick(bank.lastUp(nextName), seed) : pick(bank.rest(nextName), seed)
  }
}

const COUNTDOWN_SECONDS = [3, 2, 1]
const HALFWAY_MIN_MS = 20000
const TEN_LEFT_MIN_MS = 40000
const TIP_AT_MS = 6000
const TIP_MIN_MS = 25000

function crossed(before: number, after: number, mark: number): boolean {
  return mark > 0 && before < mark && after >= mark
}

export function cuesBetween(previous: PlayerState, next: PlayerState, previousNow: number, now: number, context: CoachContext): Cue[] {
  const cues: Cue[] = []
  const entered =
    next.runId !== previous.runId ||
    next.index !== previous.index ||
    (next.status === 'finished' && previous.status !== 'finished') ||
    (previous.status === 'ready' && next.status === 'running')
  if (entered) {
    const step = next.steps[next.index]
    if (next.status === 'finished') {
      cues.push({ kind: 'beep', tone: 'end' })
    } else if (step?.kind === 'work') {
      cues.push({ kind: 'beep', tone: 'go' })
    }
    const text = entryAnnouncement(next, context)
    if (text) {
      cues.push({ kind: 'say', text })
    }
    return cues
  }
  if (next.status !== 'running') {
    return cues
  }
  const limit = stepLimitMs(next)
  const before = stepElapsed(previous, previousNow)
  const after = stepElapsed(next, now)
  const step = next.steps[next.index]
  const bank = bankFor(context)
  const seed = next.index + next.runId
  if (step?.kind === 'work' && step.set === 1 && step.round === 1 && step.side !== 'right') {
    const tip = context.tipOf?.(step.exerciseId)
    const tipWorthy = limit === null || limit >= TIP_MIN_MS
    if (tip && tipWorthy && crossed(before, after, TIP_AT_MS)) {
      cues.push({ kind: 'say', text: tip })
    }
  }
  if (limit === null) {
    return cues
  }
  if (step?.kind === 'work') {
    if (limit >= HALFWAY_MIN_MS && crossed(before, after, limit / 2)) {
      cues.push({ kind: 'say', text: pick(bank.halfway, seed) })
    }
    if (limit >= TEN_LEFT_MIN_MS && crossed(before, after, limit - 10000)) {
      cues.push({ kind: 'say', text: pick(bank.tenLeft, seed) })
    }
  }
  for (const second of COUNTDOWN_SECONDS) {
    if (crossed(before, after, limit - second * 1000)) {
      cues.push({ kind: 'beep', tone: 'count' })
    }
  }
  return cues
}
