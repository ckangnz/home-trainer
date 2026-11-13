// Writes representative atom lists (/tmp/rep-en.txt, /tmp/rep-ko.txt) for
// early join-quality checks: intro, rest, lastUp, round, fixed cues and one
// exercise name per auditioned trainer, before committing quota to a full
// pack inventory. Feed to generate-voices.ts via --atoms-file.
import { writeFileSync, readFileSync } from 'node:fs'
import { BANKS } from '../src/player/cues'
import { BANKS_KO } from '../src/player/cues.ko'
import { segBankFor } from '../src/player/cueSegments'
import { EXERCISES } from '../src/exercises/index'
import { loadKorean } from '../src/i18n/bundle'
import { exerciseName } from '../src/i18n/content'
import type { TrainerId } from '../src/figure/look'
import type { Language } from '../src/i18n/types'

const trainers: TrainerId[] = ['female', 'marcus']
for (const lang of ['en', 'ko'] as Language[]) {
  if (lang === 'ko') await loadKorean()
  const lines: string[] = []
  for (const t of trainers) {
    const seg = segBankFor(t, lang)!
    const bank = lang === 'ko' ? BANKS_KO[t] : BANKS[t]
    lines.push(seg.intro[0][0])
    lines.push(seg.rest[0][0])
    lines.push(seg.lastUp[0][0], seg.lastUp[0][1])
    lines.push(seg.fixedRest, seg.fixedReady)
    lines.push(bank.go[0], bank.halfway[0], bank.tenLeft[0], bank.finish[0])
    lines.push(seg.round[0](1, 3)[0], seg.round[0](1, 3)[1])
  }
  await loadKorean()
  const jj = EXERCISES.find((e) => e.id === 'jumping-jacks')!
  lines.push(lang === 'ko' ? '30초' : '30 seconds')
  lines.push(exerciseName(jj, lang))
  writeFileSync(`/tmp/rep-${lang}.txt`, [...new Set(lines)].join('\n') + '\n')
}
console.log('en:'); console.log(readFileSync('/tmp/rep-en.txt', 'utf8'))
console.log('ko:'); console.log(readFileSync('/tmp/rep-ko.txt', 'utf8'))
