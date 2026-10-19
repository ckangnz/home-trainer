import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore'
import { generateCode } from '@/sharing/code'
import type { Routine } from '@/workouts/types'
import { requestId } from '@/friends/code'
import {
  parseCodeOwner,
  parseFriend,
  parseOwnProfile,
  parseRequest,
  type Friend,
  type FriendRequest,
  type OwnProfile,
  type PublicProfile,
} from '@/friends/models'
import { getFirebase } from './firebase'
import { parseCompletion, parseRoutine, stripUndefined, type Completion } from './models'

const FRIEND_HISTORY_LIMIT = 60
const CODE_ATTEMPTS = 4

function database(): Firestore {
  const services = getFirebase()
  if (services === null) {
    throw new Error('Firebase is not configured.')
  }
  return services.db
}

function personFields(prefix: 'from' | 'to', person: PublicProfile): Record<string, string> {
  const fields: Record<string, string> = { [prefix]: person.uid, [`${prefix}Name`]: person.displayName }
  if (person.photoURL) {
    fields[`${prefix}Photo`] = person.photoURL
  }
  return fields
}

export async function ensureProfile(me: PublicProfile): Promise<OwnProfile> {
  const db = database()
  const profileRef = doc(db, 'users', me.uid)
  const existing = parseOwnProfile(me.uid, (await getDoc(profileRef)).data())
  const now = new Date().toISOString()
  if (existing) {
    if (existing.displayName !== me.displayName || existing.photoURL !== me.photoURL) {
      const batch = writeBatch(db)
      batch.set(profileRef, stripUndefined({ displayName: me.displayName, photoURL: me.photoURL, friendCode: existing.friendCode, updatedAt: now }))
      batch.set(doc(db, 'friendCodes', existing.friendCode), stripUndefined({ uid: me.uid, displayName: me.displayName, photoURL: me.photoURL }))
      await batch.commit()
    }
    return { ...me, friendCode: existing.friendCode }
  }
  let lastError: unknown = null
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
    const friendCode = generateCode()
    try {
      await setDoc(doc(db, 'friendCodes', friendCode), stripUndefined({ uid: me.uid, displayName: me.displayName, photoURL: me.photoURL }))
      await setDoc(profileRef, stripUndefined({ displayName: me.displayName, photoURL: me.photoURL, friendCode, updatedAt: now }))
      return { ...me, friendCode }
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error('Could not create a friend code.')
}

export async function lookupFriendCode(code: string): Promise<PublicProfile | null> {
  const snapshot = await getDoc(doc(database(), 'friendCodes', code))
  return snapshot.exists() ? parseCodeOwner(snapshot.data()) : null
}

export function sendFriendRequest(me: PublicProfile, target: PublicProfile): Promise<void> {
  return setDoc(
    doc(database(), 'friendRequests', requestId(me.uid, target.uid)),
    { ...personFields('from', me), ...personFields('to', target), createdAt: new Date().toISOString() },
  )
}

export function subscribeRequests(
  uid: string,
  direction: 'incoming' | 'outgoing',
  onChange: (requests: FriendRequest[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(database(), 'friendRequests'), where(direction === 'incoming' ? 'to' : 'from', '==', uid)),
    (snapshot) => {
      onChange(
        snapshot.docs
          .map((entry) => parseRequest(entry.id, entry.data()))
          .filter((request): request is FriendRequest => request !== null)
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
      )
    },
    onError,
  )
}

export async function acceptFriendRequest(request: FriendRequest): Promise<void> {
  const db = database()
  const since = new Date().toISOString()
  const batch = writeBatch(db)
  batch.set(doc(db, 'users', request.to.uid, 'friends', request.from.uid), stripUndefined({ ...request.from, since }))
  batch.set(doc(db, 'users', request.from.uid, 'friends', request.to.uid), stripUndefined({ ...request.to, since }))
  batch.delete(doc(db, 'friendRequests', request.id))
  await batch.commit()
}

export async function deleteFriendRequest(request: FriendRequest): Promise<void> {
  const db = database()
  const batch = writeBatch(db)
  batch.delete(doc(db, 'friendRequests', request.id))
  await batch.commit()
}

export function subscribeFriends(uid: string, onChange: (friends: Friend[]) => void, onError: (error: unknown) => void): Unsubscribe {
  return onSnapshot(
    collection(database(), 'users', uid, 'friends'),
    (snapshot) => {
      onChange(
        snapshot.docs
          .map((entry) => parseFriend(entry.id, entry.data()))
          .filter((friend): friend is Friend => friend !== null)
          .sort((a, b) => a.displayName.localeCompare(b.displayName)),
      )
    },
    onError,
  )
}

export async function removeFriend(uid: string, friendUid: string): Promise<void> {
  const db = database()
  const batch = writeBatch(db)
  batch.delete(doc(db, 'users', uid, 'friends', friendUid))
  batch.delete(doc(db, 'users', friendUid, 'friends', uid))
  await batch.commit()
}

export async function fetchFriendRoutines(friendUid: string): Promise<Routine[]> {
  const snapshot = await getDocs(collection(database(), 'users', friendUid, 'routines'))
  return snapshot.docs
    .map((entry) => parseRoutine(entry.id, friendUid, entry.data()))
    .filter((routine): routine is Routine => routine !== null)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
}

export async function fetchFriendCompletions(friendUid: string): Promise<Completion[]> {
  const snapshot = await getDocs(
    query(collection(database(), 'users', friendUid, 'completions'), orderBy('completedAt', 'desc'), limit(FRIEND_HISTORY_LIMIT)),
  )
  return snapshot.docs
    .map((entry) => parseCompletion(entry.id, friendUid, entry.data()))
    .filter((completion): completion is Completion => completion !== null)
}
