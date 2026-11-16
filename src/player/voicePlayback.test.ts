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
  constructor(src: string) { this.src = src; audios.push(this) }
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
