import { beforeEach, expect, it, vi } from 'vitest'
const pack = vi.hoisted(() => ({ tryVoicePack: vi.fn(), silenceVoicePack: vi.fn(), unlockVoicePack: vi.fn() }))
vi.mock('./voicepack', () => pack)
vi.mock('@/settings/settings', () => ({ getSettings: () => ({ voice: true, beeps: false, vibration: false, trainer: 'female', voiceName: null }) }))
vi.mock('@/i18n/language', () => ({ getLanguage: () => 'ko' }))
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks()
  vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(public text: string) {} })
  vi.stubGlobal('speechSynthesis', { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [] })
})
it('actually invokes device Korean speech when recorded playback fails', async () => {
  pack.tryVoicePack.mockResolvedValue(false)
  const { coach } = await import('./coach')
  coach.play([{ kind: 'say', text: '반대쪽으로 바꿔요.', atoms: ['반대쪽으로 바꿔요.'] }])
  await vi.waitFor(() => expect(speechSynthesis.speak).toHaveBeenCalledOnce())
  expect(vi.mocked(speechSynthesis.speak).mock.calls[0][0]).toMatchObject({ text: '반대쪽으로 바꿔요.', lang: 'ko-KR' })
})
it('does not let a countdown beep cancel pending fallback speech', async () => {
  let finish!: (value: boolean) => void
  pack.tryVoicePack.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const { coach } = await import('./coach')
  coach.play([{ kind: 'say', text: '쉬세요.', atoms: ['쉬세요.'] }])
  coach.play([{ kind: 'beep', tone: 'count' }])
  finish(false)
  await vi.waitFor(() => expect(speechSynthesis.speak).toHaveBeenCalledOnce())
})
it('does not speak a delayed fallback after pausing or leaving the workout', async () => {
  let finish!: (value: boolean) => void
  pack.tryVoicePack.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const { coach } = await import('./coach')
  coach.play([{ kind: 'say', text: '다음 동작', atoms: ['다음 동작'] }])
  coach.silence(); finish(false)
  await Promise.resolve()
  expect(speechSynthesis.speak).not.toHaveBeenCalled()
})
it('resumes an interrupted countdown context and schedules all three finish tones', async () => {
  const oscillator = { frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() }
  const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() }
  oscillator.connect.mockReturnValue(gain); gain.connect.mockReturnValue({})
  const context = { state: 'interrupted', currentTime: 4, resume: vi.fn().mockResolvedValue(undefined), destination: {},
    createOscillator: vi.fn(() => oscillator), createGain: vi.fn(() => gain) }
  vi.stubGlobal('AudioContext', class { constructor() { return context } })
  vi.doMock('@/settings/settings', () => ({ getSettings: () => ({ voice: true, beeps: true, vibration: false, trainer: 'female', voiceName: null }) }))
  const { coach } = await import('./coach')
  coach.play([{kind: 'beep', tone: 'end'}])
  expect(context.resume).toHaveBeenCalledOnce()
  expect(context.createOscillator).toHaveBeenCalledTimes(3)
  expect(oscillator.start).toHaveBeenCalledTimes(3)
})
