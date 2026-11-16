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
let player: HTMLAudioElement | null = null
let cancelCurrent: (() => void) | null = null
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

function packPlayer(): HTMLAudioElement {
  player ??= new Audio()
  return player
}

// Called directly by Start/Resume, not after fetching the manifest. Safari
// unlocks media per element; every later timer-driven atom reuses this element.
// Loading a real greeting primes the element without playing an extra sound.
export function unlockVoicePack(trainer: TrainerId, language: Language) {
  const audio = packPlayer()
  if (!current) {
    audio.src = `${packBase(trainer, language)}greeting.wav`
    audio.load()
  }
  void loadManifest(trainer, language)
}

function playOne(url: string, token: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (token !== session) {
      resolve(false)
      return
    }
    const audio = packPlayer()
    current = audio
    audio.src = url
    let settled = false
    const settle = (ok: boolean) => {
      if (settled) return
      settled = true
      audio.onended = null
      audio.onerror = null
      if (current === audio) {
        current = null
        cancelCurrent = null
      }
      resolve(ok && token === session)
    }
    cancelCurrent = () => { audio.pause(); audio.removeAttribute('src'); audio.load(); settle(false) }
    audio.onended = () => settle(true)
    audio.onerror = () => settle(false)
    try { void audio.play().catch(() => settle(false)) } catch { settle(false) }
  })
}

export function silenceVoicePack() {
  session += 1
  cancelCurrent?.()
  current = null
  cancelCurrent = null
}

// Plays the atom clips in order. Returns false without playing anything when
// the pack cannot fully cover the atoms (caller falls back to speechSynthesis
// with the full text).
export async function tryVoicePack(atoms: string[], trainer: TrainerId, language: Language, interrupt: boolean, onAtomEnded?: (completed: number, selectedAtoms: string[]) => void, alternativeAtoms: string[][] = []): Promise<boolean> {
  if (atoms.length === 0) {
    return false
  }
  if (interrupt) silenceVoicePack()
  const token = session
  const manifest = await Promise.race([loadManifest(trainer, language), timeout(MANIFEST_TIMEOUT_MS)])
  if (token !== session) return true // canceled: never start stale fallback
  if (!manifest) {
    return false
  }
  const selectedAtoms = [atoms, ...alternativeAtoms].find(candidate =>
    candidate.length > 0 && candidate.every(atom => manifest.clips[hashAtom(atom)]))
  if (!selectedAtoms) {
    return false
  }
  const files = selectedAtoms.map(atom => manifest.clips[hashAtom(atom)])
  const base = packBase(trainer, language)
  for (const [index, file] of files.entries()) {
    if (!file || !(await playOne(base + file, token))) {
      return token !== session // canceled is handled; a real failure needs fallback
    }
    onAtomEnded?.(index + 1, selectedAtoms)
  }
  return true
}
