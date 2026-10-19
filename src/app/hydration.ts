import { useEffect, useState } from 'react'

let hydrated = false

export function useHydrated(): boolean {
  const [ready, setReady] = useState(hydrated)
  useEffect(() => {
    hydrated = true
    setReady(true)
  }, [])
  return ready
}
