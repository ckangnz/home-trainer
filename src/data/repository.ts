import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore'
import { generateCode } from '@/sharing/code'
import { ROUTINE_SCHEMA_VERSION } from '@/workouts/routine'
import type { Routine, RoutineBody } from '@/workouts/types'
import { getFirebase } from './firebase'
import {
  COMPLETION_SCHEMA_VERSION,
  SHARE_SCHEMA_VERSION,
  parseCompletion,
  parseRoutine,
  parseShare,
  stripUndefined,
  type Completion,
  type SharedRoutine,
} from './models'

const HISTORY_LIMIT = 200
const SHARE_ATTEMPTS = 4

function database(): Firestore {
  const services = getFirebase()
  if (services === null) {
    throw new Error('Firebase is not configured.')
  }
  return services.db
}

export function subscribeRoutines(
  uid: string,
  onChange: (routines: Routine[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    collection(database(), 'users', uid, 'routines'),
    (snapshot) => {
      const routines = snapshot.docs
        .map((entry) => parseRoutine(entry.id, uid, entry.data()))
        .filter((routine): routine is Routine => routine !== null)
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      onChange(routines)
    },
    onError,
  )
}

export function saveRoutine(routine: Routine): Promise<void> {
  const { id, ownerId, ...data } = routine
  return setDoc(
    doc(database(), 'users', ownerId, 'routines', id),
    stripUndefined({ ...data, schemaVersion: ROUTINE_SCHEMA_VERSION }),
  )
}

export function deleteRoutine(uid: string, id: string): Promise<void> {
  return deleteDoc(doc(database(), 'users', uid, 'routines', id))
}

export function subscribeCompletions(
  uid: string,
  onChange: (completions: Completion[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(database(), 'users', uid, 'completions'), orderBy('completedAt', 'desc'), limit(HISTORY_LIMIT)),
    (snapshot) => {
      onChange(
        snapshot.docs
          .map((entry) => parseCompletion(entry.id, uid, entry.data()))
          .filter((completion): completion is Completion => completion !== null),
      )
    },
    onError,
  )
}

export function recordCompletion(completion: Completion): Promise<void> {
  const { id, ownerId, ...data } = completion
  return setDoc(
    doc(database(), 'users', ownerId, 'completions', id),
    stripUndefined({ ...data, schemaVersion: COMPLETION_SCHEMA_VERSION }),
  )
}

export function deleteCompletion(uid: string, id: string): Promise<void> {
  return deleteDoc(doc(database(), 'users', uid, 'completions', id))
}

export async function fetchShare(code: string): Promise<SharedRoutine | null> {
  const snapshot = await getDoc(doc(database(), 'shares', code))
  return snapshot.exists() ? parseShare(code, snapshot.data()) : null
}

function isPermissionDenied(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'permission-denied'
}

export async function createShare(uid: string, routine: RoutineBody): Promise<string> {
  let lastError: unknown = null
  for (let attempt = 0; attempt < SHARE_ATTEMPTS; attempt += 1) {
    const code = generateCode()
    try {
      await setDoc(
        doc(database(), 'shares', code),
        stripUndefined({
          code,
          ownerId: uid,
          schemaVersion: SHARE_SCHEMA_VERSION,
          createdAt: new Date().toISOString(),
          routine,
        }),
      )
      return code
    } catch (error) {
      lastError = error
      if (!isPermissionDenied(error)) {
        throw error
      }
    }
  }
  throw lastError ?? new Error('Could not create a share code.')
}

export function deleteShare(code: string): Promise<void> {
  return deleteDoc(doc(database(), 'shares', code))
}
