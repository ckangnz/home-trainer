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

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
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
  batchSize: number
}

function parseArgs(argv: string[]): Args {
  const trainers: TrainerId[] = []
  const languages: Language[] = []
  let delayMs = 4000
  let dryRun = false
  let limit: number | null = null
  let atomsFile: string | null = null
  let batchSize = 0
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
    } else if (arg.startsWith('--batch-size=')) {
      batchSize = Number(arg.slice('--batch-size='.length))
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
    batchSize,
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
    // Distinguish minute-level throttling from daily-quota exhaustion using
    // the quota details in the error body, and honour retry-after.
    let detail = ''
    let daily = false
    let retrySeconds = 65
    try {
      const body = (await response.json()) as {
        error?: {
          message?: string
          details?: ({ '@type'?: string; violations?: { quotaMetric?: string }[]; retryDelay?: string } | Record<string, never>)[]
        }
      }
      detail = body.error?.message ?? ''
      if (/per day|retry in \d+h/i.test(detail)) daily = true
      for (const d of body.error?.details ?? []) {
        if ('retryDelay' in d && d.retryDelay) {
          const parsed = Number.parseFloat(d.retryDelay)
          if (Number.isFinite(parsed)) retrySeconds = Math.ceil(parsed) + 5
        }
        if ('violations' in d) {
          for (const v of d.violations ?? []) {
            if (v.quotaMetric && /PerDay|PerProjectDay/i.test(v.quotaMetric)) daily = true
          }
        }
      }
    } catch {
      // no parseable body; keep defaults
    }
    const error = new Error(daily ? 'DAILY_QUOTA_EXHAUSTED' : 'RATE_LIMITED') as Error & { retrySeconds?: number; detail?: string }
    error.retrySeconds = retrySeconds
    error.detail = detail.slice(0, 200)
    throw error
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
  if (args.batchSize >= 2) {
    await generateBatched(trainer, language, args, apiKey!, missing, manifest, manifestPath, dir, config.voice, style)
    return
  }
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
        if (error instanceof Error && error.message === 'DAILY_QUOTA_EXHAUSTED') {
          const detail = (error as Error & { detail?: string }).detail ?? ''
          console.log(`Daily free quota exhausted${detail ? `: ${detail}` : ''}. Stopping until tomorrow.`)
          process.exit(3)
        }
        if (error instanceof Error && error.message === 'RATE_LIMITED' && attempt < 3) {
          const retrySeconds = (error as Error & { retrySeconds?: number }).retrySeconds ?? 65
          const detail = (error as Error & { detail?: string }).detail ?? ''
          console.log(`Rate limited (per-minute, free tier). Waiting ${retrySeconds}s…${detail ? ` [${detail}]` : ''}`)
          await sleep(retrySeconds * 1000)
          continue
        }
        throw error
      }
    }
    await sleep(args.delayMs)
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

// Batch mode: many atoms in ONE request, joined with official <long pause>
// tags, then split locally at the rendered silences (scripts/batch_tools.py)
// and ASR-verified per segment. Fails CLOSED: a segment-count mismatch or an
// ASR mismatch leaves the atom missing and logged for review — audio is never
// silently assigned to the wrong atom. Batch originals and per-batch mapping
// are kept under .batches/ (gitignored) so every clip stays auditable.
async function generateBatched(
  trainer: TrainerId,
  language: Language,
  args: Args,
  apiKey: string,
  missing: string[],
  manifest: Manifest,
  manifestPath: string,
  dir: string,
  voice: string,
  style: string,
) {
  const batchDir = join(dir, '.batches')
  mkdirSync(batchDir, { recursive: true })
  let done = 0
  for (let start = 0; start < missing.length; start += args.batchSize) {
    if (args.limit !== null && start / args.batchSize >= args.limit) {
      console.log(`Stopping at --limit=${args.limit} batches. Re-run to continue.`)
      break
    }
    const group = missing.slice(start, start + args.batchSize)
    const batchId = `batch-${Date.now()}-${start}`
    const text = group.join(' <long pause> ')
    let wav: Buffer
    for (let attempt = 0; ; attempt++) {
      try {
        wav = await synthesize(apiKey, text, voice, style)
        break
      } catch (error) {
        if (error instanceof Error && error.message === 'DAILY_QUOTA_EXHAUSTED') {
          console.log('Daily free quota exhausted. Stopping until tomorrow.')
          process.exit(3)
        }
        if (error instanceof Error && error.message === 'RATE_LIMITED' && attempt < 3) {
          const retrySeconds = (error as Error & { retrySeconds?: number }).retrySeconds ?? 65
          console.log(`Rate limited (per-minute). Waiting ${retrySeconds}s…`)
          await sleep(retrySeconds * 1000)
          continue
        }
        throw error
      }
    }
    const batchWav = join(batchDir, `${batchId}.wav`)
    writeFileSync(batchWav, wav)
    const segDir = join(batchDir, batchId)
    mkdirSync(segDir, { recursive: true })
    const split = runBatchTool(['split', batchWav, String(group.length), segDir])
    const splitInfo = JSON.parse(split) as { ok: boolean; segments: number; expected: number }
    if (!splitInfo.ok) {
      // Fail closed: keep the original batch WAV for review, assign nothing.
      writeFileSync(join(batchDir, `${batchId}.review.json`), JSON.stringify({ group, split: splitInfo }, null, 2))
      console.log(`[${trainer}/${language}] ${batchId}: split mismatch (${splitInfo.segments}/${splitInfo.expected}) — batch kept for review, no clips assigned`)
      continue
    }
    writeFileSync(join(segDir, 'expected.json'), JSON.stringify(group))
    const asr = runBatchTool(['asr', language, join(segDir, 'expected.json'), segDir])
    const checks = JSON.parse(asr) as { atom: string; heard?: string; ratio?: number; ok: boolean }[]
    const mapping: { atom: string; hash: string; file: string; heard?: string; ratio?: number }[] = []
    let passed = 0
    for (let i = 0; i < group.length; i++) {
      const check = checks[i]
      if (!check?.ok) {
        console.log(`[${trainer}/${language}] ASR review needed: "${group[i]}" (heard: "${check?.heard ?? ''}", ratio ${check?.ratio ?? 0})`)
        continue
      }
      const hash = hashAtom(group[i])
      const file = `${hash}.wav`
      copyFileSync(join(segDir, `seg-${String(i).padStart(3, '0')}.wav`), join(dir, file))
      manifest.clips[hash] = file
      mapping.push({ atom: group[i], hash, file, heard: check.heard, ratio: check.ratio })
      passed++
      done++
    }
    writeFileSync(join(batchDir, `${batchId}.map.json`), JSON.stringify({ batch: `${batchId}.wav`, style, voice, mapping }, null, 2))
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    console.log(`[${trainer}/${language}] ${batchId}: ${passed}/${group.length} atoms passed split+ASR (${done} total done)`)
    rmSync(segDir, { recursive: true, force: true })
    await sleep(args.delayMs)
  }
}

function runBatchTool(argv: string[]): string {
  const result = spawnSync('python3', [join(__dirname, 'batch_tools.py'), ...argv], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (result.status !== 0 && argv[0] !== 'split') {
    throw new Error(`batch_tools.py ${argv[0]} failed: ${result.stderr?.slice(0, 300)}`)
  }
  return result.stdout.trim()
}

const args = parseArgs(process.argv.slice(2))
const apiKey = process.env.GEMINI_API_KEY
for (const trainer of args.trainers) {
  for (const language of args.languages) {
    await generatePack(trainer, language, args, apiKey)
  }
}
