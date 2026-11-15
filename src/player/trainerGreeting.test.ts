import { afterEach, describe, expect, it, vi } from 'vitest'
import { startTrainerGreeting } from './trainerGreeting'

class FakeAudio {
  static instances: FakeAudio[] = []
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  play = vi.fn().mockResolvedValue(undefined)
  pause = vi.fn()
  load = vi.fn()
  removeAttribute = vi.fn()
  constructor(public src: string) { FakeAudio.instances.push(this) }
}
afterEach(() => { vi.unstubAllGlobals(); FakeAudio.instances = [] })
describe('trainer greeting audio', () => {
  it('uses the requested trainer and language, completes once', () => {
    vi.stubGlobal('Audio', FakeAudio)
    const done = vi.fn(); const error = vi.fn()
    startTrainerGreeting('kai', 'ko', done, error)
    const audio = FakeAudio.instances[0]
    expect(audio.src).toMatch(/voices\/kai\/ko\/greeting.wav$/)
    expect(audio.play).toHaveBeenCalledOnce()
    audio.onended?.()
    audio.onerror?.()
    expect(done).toHaveBeenCalledOnce()
    expect(error).not.toHaveBeenCalled()
  })
  it('cancels playback and suppresses stale completion and rejection', async () => {
    vi.stubGlobal('Audio', FakeAudio)
    const done = vi.fn(); const error = vi.fn()
    const stop = startTrainerGreeting('zara', 'en', done, error)
    const audio = FakeAudio.instances[0]; const staleEnd = audio.onended
    stop(); staleEnd?.()
    expect(audio.pause).toHaveBeenCalledOnce()
    expect(audio.removeAttribute).toHaveBeenCalledWith('src')
    expect(done).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })
  it('ignores a rejected play promise after cancellation', async () => {
    let reject: (reason?: unknown) => void = () => undefined
    class RejectingAudio extends FakeAudio {
      play = vi.fn(() => new Promise<void>((_, fail) => { reject = fail }))
    }
    vi.stubGlobal('Audio', RejectingAudio)
    const error = vi.fn()
    const stop = startTrainerGreeting('nina', 'ko', vi.fn(), error)
    stop(); reject(new Error('cancelled'))
    await Promise.resolve()
    expect(error).not.toHaveBeenCalled()
  })

  it('reports playback failure without substituting another voice', () => {
    vi.stubGlobal('Audio', FakeAudio)
    const error = vi.fn()
    startTrainerGreeting('male', 'en', vi.fn(), error)
    FakeAudio.instances[0].onerror?.()
    expect(error).toHaveBeenCalledOnce()
    expect(FakeAudio.instances).toHaveLength(1)
  })
})
