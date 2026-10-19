import { collection, doc, getDocs, onSnapshot, writeBatch, type Unsubscribe } from 'firebase/firestore'
import { EMPTY_PROGRESS, type StoredProgress } from '@/awards/evaluate'
import type { EarnedAward } from '@/awards/types'
import { getFirebase } from './firebase'

function database() {
  const services = getFirebase()
  if (services === null) {
    throw new Error('Firebase is not configured.')
  }
  return services.db
}

function parseEarned(id: string, value: unknown): EarnedAward | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const earnedAt = (value as { earnedAt?: unknown }).earnedAt
  return typeof earnedAt === 'string' ? { id, earnedAt } : null
}

function parseProgress(value: unknown): StoredProgress {
  if (typeof value !== 'object' || value === null) {
    return EMPTY_PROGRESS
  }
  const data = value as Record<string, unknown>
  const text = (entry: unknown) => (typeof entry === 'string' ? entry : null)
  const count = (entry: unknown) => (typeof entry === 'number' && Number.isFinite(entry) && entry >= 0 ? Math.floor(entry) : 0)
  return {
    totalWorkouts: count(data.totalWorkouts),
    lastCompletedAt: text(data.lastCompletedAt),
    longestStreak: count(data.longestStreak),
    streakStart: text(data.streakStart),
    streakEnd: text(data.streakEnd),
  }
}

export function subscribeAwards(uid: string, onChange: (awards: EarnedAward[]) => void, onError: (error: unknown) => void): Unsubscribe {
  return onSnapshot(
    collection(database(), 'users', uid, 'awards'),
    (snapshot) => {
      onChange(snapshot.docs.map((entry) => parseEarned(entry.id, entry.data())).filter((award): award is EarnedAward => award !== null))
    },
    onError,
  )
}

export function subscribeProgress(uid: string, onChange: (progress: StoredProgress) => void, onError: (error: unknown) => void): Unsubscribe {
  return onSnapshot(doc(database(), 'users', uid, 'private', 'progress'), (snapshot) => onChange(parseProgress(snapshot.data())), onError)
}

export async function saveAwards(uid: string, awards: EarnedAward[], progress: StoredProgress): Promise<void> {
  const db = database()
  const batch = writeBatch(db)
  batch.set(doc(db, 'users', uid, 'private', 'progress'), progress)
  for (const award of awards) {
    batch.set(doc(db, 'users', uid, 'awards', award.id), { earnedAt: award.earnedAt })
  }
  await batch.commit()
}

export async function fetchFriendAwards(friendUid: string): Promise<EarnedAward[]> {
  const snapshot = await getDocs(collection(database(), 'users', friendUid, 'awards'))
  return snapshot.docs.map((entry) => parseEarned(entry.id, entry.data())).filter((award): award is EarnedAward => award !== null)
}
