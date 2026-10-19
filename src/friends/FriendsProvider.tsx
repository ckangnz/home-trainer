import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { loadFriendsRepository } from '@/data/lazy'
import type { Completion } from '@/data/models'
import type { Routine } from '@/workouts/types'
import { cleanName, userPhoto, type Friend, type FriendRequest, type OwnProfile, type PublicProfile } from './models'
import { getLanguage } from '@/i18n/language'
import { translator } from '@/i18n/translate'
import type { EarnedAward } from '@/awards/types'

export interface FriendActivity {
  routines: Routine[]
  completions: Completion[]
  awards: EarnedAward[]
}

interface FriendsContextValue {
  ready: boolean
  me: PublicProfile | null
  profile: OwnProfile | null
  friends: Friend[]
  incoming: FriendRequest[]
  outgoing: FriendRequest[]
  error: string | null
  lookup: (code: string) => Promise<PublicProfile | null>
  sendRequest: (target: PublicProfile) => Promise<void>
  accept: (request: FriendRequest) => Promise<void>
  dismiss: (request: FriendRequest) => Promise<void>
  remove: (friendUid: string) => Promise<void>
  loadActivity: (friendUid: string) => Promise<FriendActivity>
}

const FriendsContext = createContext<FriendsContextValue | null>(null)

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { user, profileVersion } = useAuth()
  const uid = user?.uid ?? null
  const displayName = cleanName(user?.displayName ?? user?.email?.split('@')[0])
  const photo = useMemo(() => userPhoto(user), [user, profileVersion])
  const me = useMemo<PublicProfile | null>(() => {
    if (uid === null) {
      return null
    }
    const person: PublicProfile = { uid, displayName }
    if (photo) {
      person.photoURL = photo
    }
    return person
  }, [uid, displayName, photo])
  const [profile, setProfile] = useState<OwnProfile | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [incoming, setIncoming] = useState<FriendRequest[]>([])
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setProfile(null)
    setFriends([])
    setIncoming([])
    setOutgoing([])
    setLoaded(false)
    setError(null)
    if (me === null) {
      return
    }
    const fail = () => setError(translator(getLanguage())('social.friends.loadFailed'))
    let cancelled = false
    let stops: (() => void)[] = []
    loadFriendsRepository()
      .then((repository) => {
        if (cancelled) {
          return
        }
        repository
          .ensureProfile(me)
          .then((next) => {
            if (!cancelled) {
              setProfile(next)
            }
          })
          .catch(fail)
        stops = [
          repository.subscribeFriends(
            me.uid,
            (next) => {
              setFriends(next)
              setLoaded(true)
            },
            fail,
          ),
          repository.subscribeRequests(me.uid, 'incoming', setIncoming, fail),
          repository.subscribeRequests(me.uid, 'outgoing', setOutgoing, fail),
        ]
      })
      .catch(fail)
    return () => {
      cancelled = true
      stops.forEach((stop) => stop())
    }
  }, [me])

  const lookup = useCallback(async (code: string) => (await loadFriendsRepository()).lookupFriendCode(code), [])

  const sendRequest = useCallback(
    async (target: PublicProfile) => {
      if (me === null) {
        throw new Error('Sign in to add friends.')
      }
      const reverse = incoming.find((request) => request.from.uid === target.uid)
      const repository = await loadFriendsRepository()
      if (reverse) {
        await repository.acceptFriendRequest(reverse)
      } else {
        await repository.sendFriendRequest(me, target)
      }
    },
    [me, incoming],
  )

  const accept = useCallback(async (request: FriendRequest) => (await loadFriendsRepository()).acceptFriendRequest(request), [])

  const dismiss = useCallback(async (request: FriendRequest) => (await loadFriendsRepository()).deleteFriendRequest(request), [])

  const remove = useCallback(
    async (friendUid: string) => {
      if (me === null) {
        return
      }
      await (await loadFriendsRepository()).removeFriend(me.uid, friendUid)
    },
    [me],
  )

  const loadActivity = useCallback(async (friendUid: string) => {
    const repository = await loadFriendsRepository()
    const [routines, completions, awards] = await Promise.all([
      repository.fetchFriendRoutines(friendUid),
      repository.fetchFriendCompletions(friendUid),
      import('@/data/awards')
        .then((module) => module.fetchFriendAwards(friendUid))
        .catch(() => [] as EarnedAward[]),
    ])
    return { routines, completions, awards }
  }, [])

  const value = useMemo<FriendsContextValue>(
    () => ({ ready: loaded, me, profile, friends, incoming, outgoing, error, lookup, sendRequest, accept, dismiss, remove, loadActivity }),
    [loaded, me, profile, friends, incoming, outgoing, error, lookup, sendRequest, accept, dismiss, remove, loadActivity],
  )

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>
}

export function useFriends(): FriendsContextValue {
  const context = useContext(FriendsContext)
  if (context === null) {
    throw new Error('useFriends must be used within a FriendsProvider.')
  }
  return context
}
