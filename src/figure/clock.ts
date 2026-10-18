type Listener = (now: number) => void

const listeners = new Set<Listener>()
let handle = 0

function tick(now: number) {
  handle = 0
  for (const listener of [...listeners]) {
    listener(now)
  }
  if (listeners.size > 0) {
    handle = requestAnimationFrame(tick)
  }
}

export function subscribeClock(listener: Listener): () => void {
  listeners.add(listener)
  if (handle === 0 && typeof requestAnimationFrame === 'function') {
    handle = requestAnimationFrame(tick)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && handle !== 0) {
      cancelAnimationFrame(handle)
      handle = 0
    }
  }
}
