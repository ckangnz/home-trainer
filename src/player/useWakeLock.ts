import { useEffect } from 'react'

interface WakeLockSentinelLike {
  release: () => Promise<void>
  addEventListener?: (type: 'release', listener: () => void) => void
}

interface WakeLockNavigator {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> }
}

export function useWakeLock(active: boolean): void {
  useEffect(() => {
    const wakeLock = (navigator as Navigator & WakeLockNavigator).wakeLock
    if (!active || !wakeLock) {
      return
    }
    let sentinel: WakeLockSentinelLike | null = null
    let cancelled = false
    const acquire = async () => {
      if (document.visibilityState !== 'visible' || sentinel) {
        return
      }
      try {
        const next = await wakeLock.request('screen')
        if (cancelled) {
          void next.release()
          return
        }
        sentinel = next
        next.addEventListener?.('release', () => {
          sentinel = null
        })
      } catch {
        sentinel = null
      }
    }
    const onVisibility = () => {
      void acquire()
    }
    void acquire()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      if (sentinel) {
        void sentinel.release()
        sentinel = null
      }
    }
  }, [active])
}
