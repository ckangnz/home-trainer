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
// Segment banks exist for all seven trainers. Maya and Marcus are auditioned;
// the other five are first drafts pending auditions. The Korean dialect
// wording for Leo (Chungcheong), Sofia (Jeolla) and Kai (Gangwon) uses
// restrained, well-known markers only and needs a native-speaker review
// pass — style prompts steer intonation, but dialect vocabulary lives here
// in the lines themselves.
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

const LEO_KO: SegBank = {
  intro: [
    ['안녕하세요, 레오예요. 차분히 시작해 보겠습니다. 첫 운동은'],
    ['레오입니다. 편안하게 호흡하고, 첫 운동은'],
  ],
  rest: [
    ['잘하셨어요. 여유 있게 쉬었다가, 다음은'],
    ['좋습니다. 천천히 숨 고르고, 다음 운동은'],
    ['아주 좋아요. 무리하지 말고, 다음은'],
  ],
  lastUp: [
    ['마지막 운동입니다:', '차분히 끝까지.'],
    ['이제 마지막이에요,', '침착하게 마무리합시다.'],
  ],
  round: [
    (done, total) => [`${done}라운드 끝났습니다.`, `이제 ${total - done}라운드 남았어요. 천천히 가요.`],
    (done, total) => [`${done}라운드 완료.`, `좋은 페이스예요, ${total - done}라운드 더.`],
  ],
  fixedRest: '휴식하세요.',
  fixedReady: '준비하세요.',
}

const LEO_EN: SegBank = {
  intro: [
    ["Hello, Leo here. Let's begin, nice and steady. First:"],
    ["I'm Leo. Calm and focused. First exercise:"],
  ],
  rest: [
    ['Well done. Take your time. Next:'],
    ['Good work. Breathe easy. Coming up:'],
    ['Excellent. No rush. Next exercise:'],
  ],
  lastUp: [
    ['Final exercise:', 'Steady to the end.'],
    ['Last one now:', 'Calm finish, full effort.'],
  ],
  round: [
    (done, total) => [`Round ${done} complete.`, `${total - done} to go. Keep the pace easy.`],
    (done, total) => [`That's round ${done}.`, `Nicely done, ${total - done} more. Steady does it.`],
  ],
  fixedRest: 'Rest.',
  fixedReady: 'Ready when you are.',
}

const SOFIA_KO: SegBank = {
  intro: [
    ['안녕하세요, 소피아예요! 기분 좋게 시작해 볼까요? 첫 운동은'],
    ['소피아예요. 같이 신나게 가 봐요. 첫 운동은'],
  ],
  rest: [
    ['진짜 잘했다잉! 숨 돌리고, 다음은'],
    ['아이고 좋아! 쉬었다가, 다음 운동은'],
    ['수고했어요. 천천히 쉬고, 다음은'],
  ],
  lastUp: [
    ['마지막 운동이여:', '힘내서 가 보자고!'],
    ['이제 마지막이네,', '조금만 더 힘내!'],
  ],
  round: [
    (done, total) => [`${done}라운드 끝났어!`, `이제 ${total - done}라운드만 더 가 보자고!`],
    (done, total) => [`${done}라운드 했네.`, `잘하고 있어, ${total - done}라운드 남았어!`],
  ],
  fixedRest: '쉬었다 가요.',
  fixedReady: '준비해 봐요.',
}

const SOFIA_EN: SegBank = {
  intro: [
    ["Hey, I'm Sofia! Let's ease into it. First up:"],
    ['Sofia here. Good vibes only. First exercise:'],
  ],
  rest: [
    ['Beautiful work! Catch your breath. Next up:'],
    ['Love it! Quick breather. Next:'],
    ['Well done, you. Easy now. Coming up:'],
  ],
  lastUp: [
    ['Last one, nearly home:', 'Give it a red-hot go!'],
    ['Final exercise coming up:', "You've got this, all the way!"],
  ],
  round: [
    (done, total) => [`Round ${done} done!`, `Just ${total - done} to go. You beauty!`],
    (done, total) => [`That's round ${done}.`, `Only ${total - done} left. Too easy!`],
  ],
  fixedRest: 'Rest up.',
  fixedReady: 'Get ready.',
}

const ZARA_KO: SegBank = {
  intro: [
    ['자라야. 오늘 제대로 불태운다! 첫 운동은'],
    ['자라 왔다! 에너지 풀파워로 간다. 첫 운동은'],
  ],
  rest: [
    ['미쳤다! 잠깐 쉬고, 다음은'],
    ['대박! 숨 고르고, 다음 운동은'],
    ['그 기세야! 회복하고, 다음은'],
  ],
  lastUp: [
    ['마지막 운동이야:', '전부 털어!'],
    ['이제 진짜 마지막,', '한계까지 밀어붙여!'],
  ],
  round: [
    (done, total) => [`${done}라운드 클리어!`, `${total - done}라운드 남았어, 멈추지 마!`],
    (done, total) => [`${done}라운드 끝!`, `${total - done}라운드 더, 계속 달려!`],
  ],
  fixedRest: '휴식!',
  fixedReady: '준비해!',
}

const ZARA_EN: SegBank = {
  intro: [
    ["It's Zara. We are going all out today. First up:"],
    ['Zara in the house! Full send. First exercise:'],
  ],
  rest: [
    ['Insane! Quick breather. Next up:'],
    ['Beast mode! Catch your breath. Next:'],
    ['That energy! Recover. Coming up:'],
  ],
  lastUp: [
    ['Final exercise:', 'Empty the tank!'],
    ['Last one:', 'Leave nothing!'],
  ],
  round: [
    (done, total) => [`Round ${done} crushed!`, `${total - done} left. Do not stop!`],
    (done, total) => [`That's round ${done}!`, `${total - done} more. Keep that fire!`],
  ],
  fixedRest: 'Rest!',
  fixedReady: 'Get ready!',
}

const KAI_KO: SegBank = {
  intro: [
    ['안녕하세요, 카이입니다. 천천히, 몸의 소리를 들으면서 시작해 봅니다. 첫 운동은'],
    ['카이예요. 마음 편하게, 호흡부터. 첫 운동은'],
  ],
  rest: [
    ['잘했습니다. 느긋하게 숨 고르고, 다음은'],
    ['좋아요. 서두르지 말고, 다음 운동은'],
    ['아주 잘했어요. 물 한 모금 하고, 다음은'],
  ],
  lastUp: [
    ['마지막 운동입니다:', '편안한 마음으로 끝까지.'],
    ['이제 마지막이에요,', '호흡 잃지 말고 마무리해 봐요.'],
  ],
  round: [
    (done, total) => [`${done}라운드 마쳤습니다.`, `${total - done}라운드 남았어요. 여유 있게 가요.`],
    (done, total) => [`${done}라운드 끝.`, `몸 느끼면서, ${total - done}라운드 더.`],
  ],
  fixedRest: '쉬어 갑니다.',
  fixedReady: '준비되면 시작해요.',
}

const KAI_EN: SegBank = {
  intro: [
    ["Hey, Kai here. No worries, we'll take it slow. First up:"],
    ["I'm Kai. Settle in, breathe. First exercise:"],
  ],
  rest: [
    ['Nice one. Take it easy. Next up:'],
    ['Beautiful. Slow breaths. Next:'],
    ['Good on you. No hurry. Coming up:'],
  ],
  lastUp: [
    ['Last exercise:', 'Stay present to the end.'],
    ['Final one now:', 'Nice and easy, all the way through.'],
  ],
  round: [
    (done, total) => [`Round ${done} done.`, `${total - done} to go. All in good time.`],
    (done, total) => [`That's round ${done}.`, `Easy does it, ${total - done} more.`],
  ],
  fixedRest: 'Take a rest.',
  fixedReady: 'When you are ready.',
}

const NINA_KO: SegBank = {
  intro: [
    ['안녕하세요, 니나예요! 자세는 깔끔하게, 기분은 가볍게. 첫 운동은'],
    ['니나입니다. 정확하게, 그리고 즐겁게! 첫 운동은'],
  ],
  rest: [
    ['정확해요! 잠깐 쉬고, 다음은'],
    ['깔끔했어요! 숨 고르고, 다음 운동은'],
    ['완벽한 폼! 쉬었다가, 다음은'],
  ],
  lastUp: [
    ['마지막 운동이에요:', '끝까지 자세 잡아요!'],
    ['이제 마지막,', '폼 무너뜨리지 말고 피니시!'],
  ],
  round: [
    (done, total) => [`${done}라운드 완료!`, `자세 그대로, ${total - done}라운드 남았어요.`],
    (done, total) => [`${done}라운드 클리어.`, `정확하게, ${total - done}라운드 더!`],
  ],
  fixedRest: '휴식.',
  fixedReady: '준비 자세.',
}

const NINA_EN: SegBank = {
  intro: [
    ["Hi, I'm Nina! Clean form, big smiles. First up:"],
    ['Nina here. Precise, but make it fun. First exercise:'],
  ],
  rest: [
    ['Spot on! Quick rest. Next up:'],
    ['Lovely form! Catch your breath. Next:'],
    ['Crisp work! Breather. Coming up:'],
  ],
  lastUp: [
    ['Final exercise:', 'Keep that form sharp to the end!'],
    ['Last one:', 'Finish with beautiful form!'],
  ],
  round: [
    (done, total) => [`Round ${done} complete!`, `Form stays sharp, ${total - done} to go.`],
    (done, total) => [`That's round ${done}.`, `Precision, please. ${total - done} more.`],
  ],
  fixedRest: 'Rest.',
  fixedReady: 'Ready position.',
}

const SEG_BANKS: Partial<Record<TrainerId, Partial<Record<Language, SegBank>>>> = {
  female: { ko: MAYA_KO, en: MAYA_EN },
  male: { ko: LEO_KO, en: LEO_EN },
  sofia: { ko: SOFIA_KO, en: SOFIA_EN },
  zara: { ko: ZARA_KO, en: ZARA_EN },
  marcus: { ko: MARCUS_KO, en: MARCUS_EN },
  kai: { ko: KAI_KO, en: KAI_EN },
  nina: { ko: NINA_KO, en: NINA_EN },
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
