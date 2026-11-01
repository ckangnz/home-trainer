import { useEffect, useMemo, useState } from 'react'
import type { Completion } from '@/data/models'
import { loadRepository } from '@/data/lazy'

const cache = new Map<string, Promise<Completion[]>>()

export interface CompletionRange {
  loading: boolean
  completions: Completion[]
  error: boolean
}

export function useCompletionRange(ownerUid: string | null, startIso: string, endIso: string, live: Completion[] = []): CompletionRange {
  const key = ownerUid ? `${ownerUid}|${startIso}|${endIso}` : ''
  const [state, setState] = useState<{ key: string; completions: Completion[]; error: boolean } | null>(null)

  useEffect(() => {
    if (!key || !ownerUid) {
      return
    }
    let cancelled = false
    let pending = cache.get(key)
    if (!pending) {
      pending = loadRepository().then((repository) => repository.fetchCompletionsBetween(ownerUid, startIso, endIso))
      cache.set(key, pending)
      pending.catch(() => cache.delete(key))
    }
    pending
      .then((completions) => {
        if (!cancelled) {
          setState({ key, completions, error: false })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ key, completions: [], error: true })
        }
      })
    return () => {
      cancelled = true
    }
  }, [key, ownerUid, startIso, endIso])

  return useMemo(() => {
    const fetched = state?.key === key ? state.completions : []
    const inRange = live.filter((entry) => entry.completedAt >= startIso && entry.completedAt < endIso)
    const byId = new Map([...fetched, ...inRange].map((entry) => [entry.id, entry]))
    return {
      loading: Boolean(key) && state?.key !== key,
      completions: [...byId.values()].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1)),
      error: state?.key === key ? state.error : false,
    }
  }, [state, key, live, startIso, endIso])
}
