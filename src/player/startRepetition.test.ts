import { beforeEach, expect, it, vi } from 'vitest'
import { hashAtom } from './voicehash'
let elements: TestAudio[] = []
class TestAudio {
  src = ''; onended: (() => void) | null = null; onerror: (() => void) | null = null
  pause() {} load() {} removeAttribute() {}
  play = vi.fn(async () => {})
  constructor() { elements.push(this) }
}
beforeEach(() => {
  vi.resetModules(); elements = []
  vi.stubGlobal('Audio', TestAudio)
  vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(public text: string) {} })
  vi.stubGlobal('speechSynthesis', { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [] })
  vi.stubGlobal('fetch', vi.fn(async () => ({ok:true,json:async()=>({clips:{[hashAtom('스쿼트')]:'name.wav',[hashAtom('30초')]:'duration.wav',[hashAtom('가자!')]:'go.wav'}})})))
})
it('does not repeat a completed exercise name when a later atom fails', async () => {
  const { updateSettings } = await import('@/settings/settings')
  updateSettings({voice:true, beeps:false, trainer:'female', language:'ko'})
  const { coach } = await import('./coach')
  coach.play([{kind:'say',text:'스쿼트, 30초. 가자!',atoms:['스쿼트','30초','가자!']}])
  await vi.waitFor(()=>expect(elements[0]?.src).toContain('name.wav'))
  elements[0].onended?.()
  await vi.waitFor(()=>expect(elements[0].src).toContain('duration.wav'))
  elements[0].onerror?.()
  await vi.waitFor(()=>expect(speechSynthesis.speak).toHaveBeenCalledOnce())
  expect(vi.mocked(speechSynthesis.speak).mock.calls[0][0].text).toBe('30초, 가자!')
})

it('preserves the full announcement fallback if no recorded atom completed', async () => {
  const { updateSettings } = await import('@/settings/settings')
  updateSettings({voice:true, beeps:false, trainer:'female', language:'ko'})
  const { coach } = await import('./coach')
  coach.play([{kind:'say',text:'스쿼트, 30초. 가자!',atoms:['스쿼트','30초','가자!']}])
  await vi.waitFor(()=>expect(elements[0]?.src).toContain('name.wav'))
  elements[0].onerror?.()
  await vi.waitFor(()=>expect(speechSynthesis.speak).toHaveBeenCalledOnce())
  expect(vi.mocked(speechSynthesis.speak).mock.calls[0][0].text).toBe('스쿼트, 30초. 가자!')
})
it('does not revive remainder fallback after Pause', async () => {
  const { updateSettings } = await import('@/settings/settings')
  updateSettings({voice:true, beeps:false, trainer:'female', language:'ko'})
  const { coach } = await import('./coach')
  coach.play([{kind:'say',text:'스쿼트, 30초. 가자!',atoms:['스쿼트','30초','가자!']}])
  await vi.waitFor(()=>expect(elements[0]?.src).toContain('name.wav'))
  elements[0].onended?.()
  await vi.waitFor(()=>expect(elements[0].src).toContain('duration.wav'))
  coach.silence()
  await Promise.resolve()
  expect(speechSynthesis.speak).not.toHaveBeenCalled()
})
