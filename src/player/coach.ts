import { getSettings } from '@/settings/settings'
import type { Cue } from './cues'

type AudioContextConstructor = typeof AudioContext

let audio: AudioContext | null = null

function audioContext(): AudioContext | null {
  if (audio) {
    return audio
  }
  const Constructor: AudioContextConstructor | undefined =
    typeof window === 'undefined'
      ? undefined
      : window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext
  if (!Constructor) {
    return null
  }
  audio = new Constructor()
  return audio
}

const TONES: Record<Extract<Cue, { kind: 'beep' }>['tone'], { frequency: number; durationMs: number }[]> = {
  count: [{ frequency: 660, durationMs: 140 }],
  go: [{ frequency: 990, durationMs: 320 }],
  end: [
    { frequency: 660, durationMs: 160 },
    { frequency: 880, durationMs: 160 },
    { frequency: 1175, durationMs: 380 },
  ],
}

function beep(tone: Extract<Cue, { kind: 'beep' }>['tone']) {
  const context = audioContext()
  if (!context) {
    return
  }
  let start = context.currentTime
  for (const note of TONES[tone]) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = note.frequency
    const end = start + note.durationMs / 1000
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(start)
    oscillator.stop(end + 0.02)
    start = end
  }
}

function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
}

export function availableVoices(): SpeechSynthesisVoice[] {
  if (!speechAvailable()) {
    return []
  }
  return window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith('en'))
}

function speak(text: string) {
  if (!speechAvailable()) {
    return
  }
  const synth = window.speechSynthesis
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const { voiceName } = getSettings()
  const voice = voiceName ? synth.getVoices().find((candidate) => candidate.name === voiceName) : undefined
  if (voice) {
    utterance.voice = voice
  }
  utterance.lang = voice?.lang ?? 'en-US'
  utterance.rate = 1.02
  synth.speak(utterance)
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern)
  }
}

export const coach = {
  unlock() {
    const context = audioContext()
    if (context && context.state === 'suspended') {
      void context.resume()
    }
    if (speechAvailable() && getSettings().voice) {
      const primer = new SpeechSynthesisUtterance(' ')
      primer.volume = 0
      window.speechSynthesis.speak(primer)
    }
  },
  play(cues: Cue[]) {
    const settings = getSettings()
    for (const cue of cues) {
      if (cue.kind === 'say') {
        if (settings.voice) {
          speak(cue.text)
        }
      } else {
        if (settings.beeps) {
          beep(cue.tone)
        }
        if (settings.vibration) {
          vibrate(cue.tone === 'count' ? 60 : cue.tone === 'go' ? 180 : [120, 80, 120, 80, 260])
        }
      }
    }
  },
  silence() {
    if (speechAvailable()) {
      window.speechSynthesis.cancel()
    }
  },
}
