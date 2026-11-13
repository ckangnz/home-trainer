import type { TrainerId } from '@/figure/look'
import type { Language } from '@/i18n/types'

// Compositional voice-pack segment banks.
//
// Each spoken announcement is broken into atoms: short strings that each map
// to one pre-generated audio clip (see scripts/generate-voices.ts and
// docs/voice-coach.md). At runtime the player plays the atom clips in order;
// if any atom has no clip, the whole announcement falls back to the browser's
// speechSynthesis voice (the pre-voice-pack behaviour).
//
// Prototype scope: segment banks exist for Maya and Marcus only (the two
// auditioned characters). Other trainers return no bank and always fall back.
// Adding a trainer means writing their segment bank here, adding their voice
// to voices.config.mjs, and running the generator.

export interface SegBank {
  // Variants as fixed atom lists; the exercise name atom is appended last.
  intro: string[][]
  rest: string[][]
  // Variants as [beforeName, afterName]; name atom goes between.
  lastUp: [string, string][]
  // Variants building the full atom list from round numbers.
  round: ((done: number, total: number) => string[])[]
  fixedRest: string
  fixedReady: string
}

const MAYA_KO: SegBank = {
  intro: [
    ['안녕하세요, 마야예요! 같이 움직여 볼까요? 첫 운동은'],
    ['마야예요. 준비됐죠? 첫 운동은'],
  ],
  rest: [
    ['잘했어요! 숨 고르세요. 다음은'],
    ['좋아요! 쉬어 가요. 다음 운동은'],
    ['수고했어요. 천천히 호흡하세요. 다음은'],
  ],
  lastUp: [
    ['마지막 운동이에요:', '끝까지 힘내요!'],
    ['이제 마지막,', '전부 쏟아 봐요!'],
  ],
  round: [
    (done, total) => [`${done}라운드 끝!`, `${total - done}라운드 남았어요. 물 한 모금 마셔요.`],
    (done, total) => [`${done}라운드 완료.`, `몸 풀고, ${total - done}라운드 더!`],
  ],
  fixedRest: '휴식.',
  fixedReady: '준비하세요.',
}

const MAYA_EN: SegBank = {
  intro: [
    ["Hi, I'm Maya! Let's get moving. First up:"],
    ['Hey, Maya here. Ready? First up:'],
  ],
  rest: [
    ['Great work! Take a breather. Next up:'],
    ['Nice job! Rest up. Next:'],
    ['Well done. Breathe. Coming up:'],
  ],
  lastUp: [
    ['Last one coming up:', 'Finish strong!'],
    ['Final exercise next:', 'Give it everything!'],
  ],
  round: [
    (done, total) => [`Round ${done} done!`, `${total - done} to go. Grab some water.`],
    (done, total) => [`That's round ${done}.`, `Shake it out, ${total - done} more.`],
  ],
  fixedRest: 'Rest.',
  fixedReady: 'Get ready.',
}

const MARCUS_KO: SegBank = {
  intro: [
    ['마커스다. 오늘도 강하게 간다. 첫 운동은'],
    ['마커스입니다. 한계를 넘어 봅시다. 첫 운동은'],
  ],
  rest: [
    ['좋다! 회복해. 다음은'],
    ['강했어. 쉬고, 다음 운동은'],
    ['잘했다. 호흡 가다듬어. 다음은'],
  ],
  lastUp: [
    ['마지막:', '남김없이!'],
    ['마지막 운동,', '끝까지 간다!'],
  ],
  round: [
    (done, total) => [`${done}라운드 끝!`, `${total - done}라운드 남았다!`],
    (done, total) => [`${done}라운드 완료.`, `${total - done}라운드 더, 힘내!`],
  ],
  fixedRest: '휴식.',
  fixedReady: '준비하세요.',
}

const MARCUS_EN: SegBank = {
  intro: [
    ["I'm Marcus. Today we build strength. First:"],
    ['Marcus here. Lock in. First up:'],
  ],
  rest: [
    ['Good. Reset your breath. Next:'],
    ['Strong set. Recover. Up next:'],
    ["That's power. Rest. Next:"],
  ],
  lastUp: [
    ['Last one:', "Everything you've got."],
    ['Final exercise:', 'Finish strong.'],
  ],
  round: [
    (done, total) => [`Round ${done} done.`, `${total - done} left. Stay locked in.`],
    (done, total) => [`That's round ${done}.`, `${total - done} more. Keep building.`],
  ],
  fixedRest: 'Rest.',
  fixedReady: 'Get ready.',
}

const SEG_BANKS: Partial<Record<TrainerId, Partial<Record<Language, SegBank>>>> = {
  female: { ko: MAYA_KO, en: MAYA_EN },
  marcus: { ko: MARCUS_KO, en: MARCUS_EN },
}

export function segBankFor(trainer: TrainerId, language: Language): SegBank | undefined {
  return SEG_BANKS[trainer]?.[language]
}

// Rounds covered by pre-generated round atoms.
export const ROUND_MIN = 1
export const ROUND_MAX = 10

// Target phrase atoms, mirroring targetPhrase() in cues.ts. Anything outside
// these ranges falls back to speechSynthesis at runtime.
export function targetAtoms(language: Language): string[] {
  const atoms: string[] = []
  for (let reps = 1; reps <= 30; reps++) {
    atoms.push(language === 'ko' ? `${reps}회` : `${reps} reps`)
  }
  for (let seconds = 10; seconds <= 180; seconds += 5) {
    if (seconds % 60 === 0) {
      const minutes = seconds / 60
      atoms.push(language === 'ko' ? `${minutes}분` : minutes === 1 ? '1 minute' : `${minutes} minutes`)
    } else {
      atoms.push(language === 'ko' ? `${seconds}초` : `${seconds} seconds`)
    }
  }
  return atoms
}

// Set phrase atoms, mirroring workAnnouncement() in cues.ts.
export function setAtoms(language: Language): string[] {
  const atoms: string[] = []
  for (let sets = 2; sets <= 6; sets++) {
    for (let set = 1; set <= sets; set++) {
      atoms.push(language === 'ko' ? `${sets}세트 중 ${set}세트` : `set ${set} of ${sets}`)
    }
  }
  return atoms
}

export function sideAtoms(language: Language): string[] {
  return language === 'ko' ? ['왼쪽', '오른쪽'] : ['left side', 'right side']
}

// Every atom a trainer+language pack needs. fixedPhrases: the trainer's
// go/halfway/tenLeft/switchSides/finish variants from the phrase banks;
// exerciseNames: every catalog name in this language.
export function voicePackInventory(bank: SegBank, language: Language, fixedPhrases: string[], exerciseNames: string[]): Set<string> {
  return new Set([...fixedAtomInventory(bank, language, fixedPhrases), ...exerciseNames])
}

// Fixed atoms only (everything except exercise names). Round atoms are
// enumerated for every variant and every done/total pair in range.
export function fixedAtomInventory(bank: SegBank, language: Language, extra: string[] = []): string[] {
  const atoms = new Set<string>(extra)
  for (const variant of bank.intro) for (const atom of variant) atoms.add(atom)
  for (const variant of bank.rest) for (const atom of variant) atoms.add(atom)
  for (const [before, after] of bank.lastUp) {
    atoms.add(before)
    atoms.add(after)
  }
  for (const variant of bank.round) {
    for (let done = ROUND_MIN; done <= ROUND_MAX; done++) {
      for (let total = done + 1; total <= ROUND_MAX; total++) {
        for (const atom of variant(done, total)) atoms.add(atom)
      }
    }
  }
  atoms.add(bank.fixedRest)
  atoms.add(bank.fixedReady)
  for (const atom of targetAtoms(language)) atoms.add(atom)
  for (const atom of setAtoms(language)) atoms.add(atom)
  for (const atom of sideAtoms(language)) atoms.add(atom)
  return [...atoms]
}
