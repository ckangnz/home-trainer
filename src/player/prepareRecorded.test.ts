import { beforeEach, expect, it, vi } from 'vitest'
import { cuesBetween } from './cues'
import { createPlayer, startPlayer } from './machine'
import { hashAtom } from './voicehash'
import type { PlaybackStep } from '@/workouts/types'
const exercise = '거꾸로 덤벨 팔 돌리기'
const existing = '안녕하세요, 니나예요! 자세는 깔끔하게, 기분은 가볍게. 첫 운동은'
const missing = '니나입니다. 정확하게, 그리고 즐겁게! 첫 운동은'
let audios: FakeAudio[] = []
class FakeAudio {
  src = ''; onended: (() => void) | null = null; onerror: (() => void) | null = null
  pause() {} load() {} removeAttribute() {}
  play = vi.fn(async()=>{})
  constructor(){audios.push(this)}
}
beforeEach(()=>{
  vi.resetModules();audios=[]
  vi.stubGlobal('Audio',FakeAudio)
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({clips:{[hashAtom(existing)]:'intro.wav',[hashAtom(exercise)]:'name.wav'}})})))
})
function prepareCue(){
  const steps: PlaybackStep[]=[{kind:'pause',reason:'getReady',durationMs:10000,nextWork:1},{kind:'work',exerciseId:'reverse-dumbbell-arm-circles',target:{kind:'reps',reps:20},set:1,sets:1,round:1,rounds:4,item:1,items:3}]
  const state=createPlayer(steps)
  return cuesBetween(state,startPlayer(state,0),0,0,{language:'ko',trainer:'nina',trainerName:'Nina',nameOf:()=>exercise}).find(c=>c.kind==='say')!
}
it('offers same-trainer recorded variants for the exact captured custom first exercise',()=>{
  const cue=prepareCue()
  expect(cue).toMatchObject({atoms:[missing,exercise]})
  if(cue.kind==='say')expect(cue.alternativeAtoms).toContainEqual([existing,exercise])
})
it('plays one existing complete recorded prepare intro instead of going silent on a missing variant',async()=>{
  const {tryVoicePack}=await import('./voicepack')
  const cue=prepareCue();if(cue.kind!=='say')throw Error('missing cue')
  const progress=vi.fn()
  const pending=tryVoicePack(cue.atoms!,'nina','ko',true,progress,cue.alternativeAtoms)
  await vi.waitFor(()=>expect(audios[0]?.src).toContain('intro.wav'))
  audios[0].onended?.()
  await vi.waitFor(()=>expect(audios[0].src).toContain('name.wav'))
  audios[0].onended?.()
  expect(await pending).toBe(true)
  expect(progress).toHaveBeenLastCalledWith(2,[existing,exercise])
  expect(audios[0].play).toHaveBeenCalledTimes(2)
})
it('still returns false when no complete same-trainer recorded prepare variant exists',async()=>{
  const {tryVoicePack}=await import('./voicepack')
  expect(await tryVoicePack([missing,'unknown'],'nina','ko',true,undefined,[[existing,'unknown']])).toBe(false)
  expect(audios).toHaveLength(0)
})
it('keeps the primary recorded variant when it is complete',async()=>{
  const {tryVoicePack}=await import('./voicepack')
  const progress=vi.fn()
  const pending=tryVoicePack([existing,exercise],'nina','ko',true,progress,[[missing,exercise]])
  await vi.waitFor(()=>expect(audios[0]?.src).toContain('intro.wav'))
  audios[0].onended?.()
  await vi.waitFor(()=>expect(audios[0].src).toContain('name.wav'))
  audios[0].onended?.()
  expect(await pending).toBe(true)
  expect(progress).toHaveBeenLastCalledWith(2,[existing,exercise])
})
it('reports progress using the chosen alternative, without retry after a later failure',async()=>{
  const {tryVoicePack}=await import('./voicepack')
  const progress=vi.fn()
  const pending=tryVoicePack([missing,exercise],'nina','ko',true,progress,[[existing,exercise]])
  await vi.waitFor(()=>expect(audios[0]?.src).toContain('intro.wav'))
  audios[0].onended?.()
  await vi.waitFor(()=>expect(audios[0].src).toContain('name.wav'))
  audios[0].onerror?.()
  expect(await pending).toBe(false)
  expect(progress).toHaveBeenCalledExactlyOnceWith(1,[existing,exercise])
  expect(audios[0].play).toHaveBeenCalledTimes(2)
})
