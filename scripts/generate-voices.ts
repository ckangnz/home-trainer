// Voice clip generator for the coach voice pack.
//
//   GEMINI_API_KEY=... npm run voices -- --trainer=female --lang=ko
//
// Generates one WAV per cue atom into public/voices/<trainer>/<language>/ and
// a manifest.json the runtime player (src/player/voicepack.ts) uses to find
// clips. Re-runnable: existing clips are skipped, so adding an exercise or a
// phrase only generates the missing atoms.
//
// API: Gemini speech generation, model and request shape per
// https://ai.google.dev/gemini-api/docs/speech-generation
// Key: free AI Studio API key (no billing), exported as GEMINI_API_KEY.
// Free-tier note: Google states that content sent to the unpaid tier may be
// used to improve its products. Only workout coaching lines from this repo
// are sent — never user data.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { EXERCISES } from '../src/exercises/index'
import { exerciseName } from '../src/i18n/content'
import { loadKorean } from '../src/i18n/bundle'
import type { Language } from '../src/i18n/types'
import { BANKS } from '../src/player/cues'
import { BANKS_KO } from '../src/player/cues.ko'
import { segBankFor, voicePackInventory } from '../src/player/cueSegments'
import { hashAtom } from '../src/player/voicehash'
import { VOICE_LANGUAGES, VOICE_MODEL, VOICE_TRAINERS } from '../voices.config.mjs'
import type { TrainerId } from '../src/figure/look'

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions'

interface Manifest {
  trainer: string
  language: Language
  model: string
  voice: string
  clips: Record<string, string>
}

interface Args {
  trainers: TrainerId[]
  languages: Language[]
  delayMs: number
  dryRun: boolean
  limit: number | null
  atomsFile: string | null
}

function parseArgs(argv: string[]): Args {
  const trainers: TrainerId[] = []
  const languages: Language[] = []
  let delayMs = 4000
  let dryRun = false
  let limit: number | null = null
  let atomsFile: string | null = null
  for (const arg of argv) {
    if (arg.startsWith('--trainer=')) {
      const value = arg.slice('--trainer='.length)
      if (value === 'all') {
        trainers.push(...(Object.keys(VOICE_TRAINERS) as TrainerId[]))
      } else {
        trainers.push(value as TrainerId)
      }
    } else if (arg.startsWith('--lang=')) {
      const value = arg.slice('--lang='.length)
      if (value === 'all') {
        languages.push(...VOICE_LANGUAGES)
      } else {
        languages.push(value as Language)
      }
    } else if (arg.startsWith('--delay-ms=')) {
      delayMs = Number(arg.slice('--delay-ms='.length))
    } else if (arg.startsWith('--limit=')) {
      limit = Number(arg.slice('--limit='.length))
    } else if (arg.startsWith('--atoms-file=')) {
      atomsFile = arg.slice('--atoms-file='.length)
    } else if (arg === '--dry-run') {
      dryRun = true
    } else {
      console.error(`Unknown argument: ${arg}`)
      process.exit(2)
    }
  }
  return {
    trainers: trainers.length > 0 ? trainers : ['female', 'marcus'],
    languages: languages.length > 0 ? languages : [...VOICE_LANGUAGES],
    delayMs,
    dryRun,
    limit,
    atomsFile,
  }
}

// Every atom the pack must cover: fixed cue phrases (from the phrase banks in
// cues.ts/cues.ko.ts), segment-bank atoms, and one atom per exercise name.
function inventoryFor(trainer: TrainerId, language: Language): string[] | null {
  const bank = language === 'ko' ? BANKS_KO[trainer] : BANKS[trainer]
  const seg = segBankFor(trainer, language)
  if (!bank || !seg) {
    return null
  }
  const fixed = [...bank.go, ...bank.halfway, ...bank.tenLeft, ...bank.switchSides, ...bank.finish]
  const names = EXERCISES.map((exercise) => exerciseName(exercise, language)).filter(Boolean)
  return [...voicePackInventory(seg, language, fixed, names)].sort()
}

async function synthesize(apiKey: string, text: string, voice: string, style: string): Promise<Buffer> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      model: VOICE_MODEL,
      input: [
        {
          type: 'user_input',
          content: [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style }] }],
        },
      ],
      response_format: { type: 'audio' },
      generation_config: { speech_config: [{ voice }] },
    }),
  })
  if (response.status === 429) {
    throw new Error('RATE_LIMITED')
  }
  if (!response.ok) {
    throw new Error(`API ${response.status}: ${(await response.text()).slice(0, 300)}`)
  }
  const json = (await response.json()) as {
    steps?: { type?: string; content?: { type?: string; data?: string }[] }[]
  }
  const audio = (json.steps ?? [])
    .filter((step) => step.type === 'model_output')
    .flatMap((step) => step.content ?? [])
    .filter((part) => part.type === 'audio' && part.data)
    .pop()
  if (!audio?.data) {
    throw new Error('No audio in API response')
  }
  return Buffer.from(audio.data, 'base64')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function generatePack(trainer: TrainerId, language: Language, args: Args, apiKey: string | undefined) {
  const config = VOICE_TRAINERS[trainer]
  if (!config) {
    throw new Error(`Trainer "${trainer}" missing from voices.config.mjs`)
  }
  const dir = join('public', 'voices', trainer, language)
  mkdirSync(dir, { recursive: true })
  const manifestPath = join(dir, 'manifest.json')
  const manifest: Manifest = existsSync(manifestPath)
    ? { ...(JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest), model: VOICE_MODEL, voice: config.voice }
    : { trainer, language, model: VOICE_MODEL, voice: config.voice, clips: {} }

  // The Korean content bundle loads asynchronously in the app; without this,
  // ko inventories silently fall back to English exercise names.
  if (language === 'ko') {
    await loadKorean()
  }
  const atoms = inventoryFor(trainer, language)
  if (!atoms) {
    console.log(`[${trainer}/${language}] skipped: no segment bank yet (see src/player/cueSegments.ts)`)
    return
  }
  // --atoms-file: generate only the listed atoms (one per line, exact
  // match). For representative early samples before committing quota to a
  // pack's full inventory.
  const only = args.atomsFile ? new Set(readFileSync(args.atomsFile, 'utf8').split('\n').map((line) => line.trim()).filter(Boolean)) : null
  const wanted = only ? atoms.filter((atom) => only.has(atom)) : atoms
  if (only) {
    const found = new Set(wanted)
    for (const atom of only) if (!found.has(atom)) console.log(`  not in inventory: ${atom}`)
  }
  const missing = wanted.filter((atom) => !manifest.clips[hashAtom(atom)] || !existsSync(join(dir, manifest.clips[hashAtom(atom)])))
  console.log(`[${trainer}/${language}] ${wanted.length}${only ? ` of ${atoms.length}` : ''} atoms, ${wanted.length - missing.length} already generated, ${missing.length} to go`)
  if (args.dryRun) {
    for (const atom of missing.slice(0, 20)) console.log(`  missing: ${atom}`)
    if (missing.length > 20) console.log(`  …and ${missing.length - 20} more`)
    return
  }
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Create a free key in Google AI Studio and export it first (see docs/voice-coach.md).')
  }
  const style = config.style[language]
  let done = 0
  for (const atom of missing) {
    if (args.limit !== null && done >= args.limit) {
      console.log(`Stopping at --limit=${args.limit}. Re-run to continue.`)
      break
    }
    const hash = hashAtom(atom)
    const file = `${hash}.wav`
    for (let attempt = 0; ; attempt++) {
      try {
        const wav = await synthesize(apiKey, atom, config.voice, style)
        writeFileSync(join(dir, file), wav)
        manifest.clips[hash] = file
        writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
        done++
        console.log(`[${trainer}/${language}] ${done}/${missing.length} ${atom}`)
        break
      } catch (error) {
        if (error instanceof Error && error.message === 'RATE_LIMITED' && attempt < 3) {
          console.log('Rate limited (free tier). Waiting 65s…')
          await sleep(65000)
          continue
        }
        throw error
      }
    }
    await sleep(args.delayMs)
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

const args = parseArgs(process.argv.slice(2))
const apiKey = process.env.GEMINI_API_KEY
for (const trainer of args.trainers) {
  for (const language of args.languages) {
    await generatePack(trainer, language, args, apiKey)
  }
}
