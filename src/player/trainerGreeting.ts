import type { TrainerId } from '@/figure/look'
import type { Language } from '@/i18n/types'

// Dedicated greetings are independent of the workout Voice coach preference.
// This path is used only by an explicit selection or replay gesture.
export function startTrainerGreeting(
  trainer: TrainerId,
  language: Language,
  onEnded: () => void,
  onError: () => void,
): () => void {
  const audio = new Audio(`${import.meta.env.BASE_URL}voices/${trainer}/${language}/greeting.wav`)
  let active = true
  const settle = (callback: () => void) => {
    if (!active) return
    active = false
    audio.onended = null
    audio.onerror = null
    callback()
  }
  audio.onended = () => settle(onEnded)
  audio.onerror = () => settle(onError)
  try {
    void audio.play().catch(() => settle(onError))
  } catch {
    settle(onError)
  }
  return () => {
    active = false
    audio.onended = null
    audio.onerror = null
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }
}
