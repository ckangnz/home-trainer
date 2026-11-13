import type { TrainerId } from '@/figure/look'
import type { Language } from '@/i18n/types'
import { hashAtom } from './voicehash'

// Voice-pack playback: plays pre-generated per-trainer clips for cue atoms.
// Falls back (returns false) when the pack or any atom clip is missing, so the
// caller can use speechSynthesis instead. Packs live under
// public/voices/<trainer>/<language>/ and are produced by
// scripts/generate-voices.ts (see docs/voice-coach.md).

interface VoiceManifest {
  clips: Record<string, string>
}

const MANIFEST_TIMEOUT_MS = 900

const manifests = new Map<string, Promise<VoiceManifest | null>>()
let current: HTMLAudioElement | null = null
let session = 0

function packBase(trainer: TrainerId, language: Language): string {
  return `${import.meta.env.BASE_URL}voices/${trainer}/${language}/`
}

function loadManifest(trainer: TrainerId, language: Language): Promise<VoiceManifest | null> {
  const key = `${trainer}/${language}`
  const cached = manifests.get(key)
  if (cached) {
    return cached
  }
  const pending = (async (): Promise<VoiceManifest | null> => {
    if (typeof fetch === 'undefined') {
      return null
    }
    try {
      const response = await fetch(`${packBase(trainer, language)}manifest.json`)
      if (!response.ok) {
        return null
      }
      return (await response.json()) as VoiceManifest
    } catch {
      return null
    }
  })()
  manifests.set(key, pending)
  return pending
}

function timeout(ms: number): Promise<null> {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms))
}

function playOne(url: string, token: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (token !== session) {
      resolve(false)
      return
    }
    const audio = new Audio(url)
    current = audio
    const settle = (ok: boolean) => {
      if (current === audio) {
        current = null
      }
      resolve(ok && token === session)
    }
    audio.onended = () => settle(true)
    audio.onerror = () => settle(false)
    void audio.play().catch(() => settle(false))
  })
}

export function silenceVoicePack() {
  session += 1
  if (current) {
    current.pause()
    current.src = ''
    current = null
  }
}

// Plays the atom clips in order. Returns false without playing anything when
// the pack cannot fully cover the atoms (caller falls back to speechSynthesis
// with the full text).
export async function tryVoicePack(atoms: string[], trainer: TrainerId, language: Language, interrupt: boolean): Promise<boolean> {
  if (atoms.length === 0) {
    return false
  }
  const manifest = await Promise.race([loadManifest(trainer, language), timeout(MANIFEST_TIMEOUT_MS)])
  if (!manifest) {
    return false
  }
  const files = atoms.map((atom) => manifest.clips[hashAtom(atom)])
  if (files.some((file) => !file)) {
    return false
  }
  if (interrupt) {
    silenceVoicePack()
  }
  const token = session
  const base = packBase(trainer, language)
  for (const file of files) {
    if (!file || !(await playOne(base + file, token))) {
      return true // playback started; do not double-speak via speechSynthesis
    }
  }
  return true
}
