import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hashAtom } from './voicehash'
let audios: FakeAudio[] = []
class FakeAudio {
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  src: string
  pause = vi.fn()
  load = vi.fn()
  removeAttribute = vi.fn()
  play = vi.fn(() => Promise.resolve())
  constructor(src: string = '') { this.src = src; audios.push(this) }
}
beforeEach(() => {
  vi.resetModules(); vi.restoreAllMocks(); audios = []
  vi.stubGlobal('Audio', FakeAudio)
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ clips: { [hashAtom('Go!')]: 'go.wav' } }) })))
})
describe('workout clip failure and cancellation', () => {
  it('reports successful playback only once the clip ends', async () => {
    const { tryVoicePack } = await import('./voicepack')
    const pending = tryVoicePack(['Go!'], 'female', 'en', true)
    await vi.waitFor(() => expect(audios).toHaveLength(1))
    audios[0].onended?.()
    expect(await pending).toBe(true)
  })
  it('returns false on a rejected play so device speech is not suppressed', async () => {
    const { tryVoicePack } = await import('./voicepack')
    vi.stubGlobal('Audio', class extends FakeAudio { play = vi.fn().mockRejectedValue(new DOMException('blocked', 'NotAllowedError')) })
    expect(await tryVoicePack(['Go!'], 'female', 'en', true)).toBe(false)
  })
  it('returns false on a media/network error', async () => {
    const { tryVoicePack } = await import('./voicepack')
    const pending = tryVoicePack(['Go!'], 'female', 'en', true)
    await vi.waitFor(() => expect(audios).toHaveLength(1))
    audios[0].onerror?.()
    expect(await pending).toBe(false)
  })
  it('keeps missing atoms eligible for device speech', async () => {
    const { tryVoicePack } = await import('./voicepack')
    expect(await tryVoicePack(['Missing'], 'female', 'ko', true)).toBe(false)
  })
  it('does not revive old audio or fallback after cancellation during manifest fetch', async () => {
    let finish!: (value: unknown) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { finish = resolve })))
    const { tryVoicePack, silenceVoicePack } = await import('./voicepack')
    const pending = tryVoicePack(['Go!'], 'female', 'en', true)
    silenceVoicePack()
    finish({ ok: true, json: async () => ({ clips: { [hashAtom('Go!')]: 'go.wav' } }) })
    expect(await pending).toBe(true)
    expect(audios).toHaveLength(0)
  })
  it('settles stopped playback without blocking the next transition', async () => {
    const { tryVoicePack, silenceVoicePack } = await import('./voicepack')
    const pending = tryVoicePack(['Go!'], 'female', 'en', true)
    await vi.waitFor(() => expect(audios).toHaveLength(1))
    silenceVoicePack()
    expect(await pending).toBe(true)
    expect(audios[0].pause).toHaveBeenCalledOnce()
  })
})

it('primes one real media element during Start and reuses it for later timer cues', async () => {
  const { unlockVoicePack, tryVoicePack } = await import('./voicepack')
  unlockVoicePack('female', 'ko')
  expect(audios).toHaveLength(1)
  expect(audios[0].load).toHaveBeenCalledOnce()
  expect(audios[0].play).not.toHaveBeenCalled()
  expect(audios[0].src).toContain('/female/ko/greeting.wav')
  for (let i = 0; i < 2; i++) {
    const pending = tryVoicePack(['Go!'], 'female', 'ko', true)
    await vi.waitFor(() => expect(audios[0].play).toHaveBeenCalledTimes(i + 1))
    audios[0].onended?.()
    expect(await pending).toBe(true)
  }
  expect(audios).toHaveLength(1)
})

it('a cancelled old media error cannot clear the reused element next handlers', async () => {
  const { tryVoicePack, silenceVoicePack } = await import('./voicepack')
  const first = tryVoicePack(['Go!'], 'female', 'en', true)
  await vi.waitFor(() => expect(audios[0]?.play).toHaveBeenCalledOnce())
  // Simulate a later browser event from the old source after the next source.
  const oldError = audios[0].onerror
  silenceVoicePack()
  expect(await first).toBe(true)
  const second = tryVoicePack(['Go!'], 'female', 'en', true)
  await vi.waitFor(() => expect(audios[0].play).toHaveBeenCalledTimes(2))
  const nextEnd = audios[0].onended
  oldError?.()
  expect(audios[0].onended).toBe(nextEnd)
  nextEnd?.()
  expect(await second).toBe(true)
  expect(audios).toHaveLength(1)
})
