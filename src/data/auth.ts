import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth'
import { getFirebase } from './firebase'
import { errorCode } from './authErrors'

export type { User }

export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super('Firebase is not configured. Set the VITE_FIREBASE_* environment variables.')
    this.name = 'FirebaseNotConfiguredError'
  }
}

const googleProvider = new GoogleAuthProvider()

const REDIRECT_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
])

export function subscribeToAuth(onChange: (user: User | null) => void, onError?: (error: unknown) => void): () => void {
  const services = getFirebase()
  if (services === null) {
    onChange(null)
    return () => {}
  }
  return onAuthStateChanged(services.auth, onChange, onError)
}

export async function signInWithGoogle(): Promise<void> {
  const services = getFirebase()
  if (services === null) {
    throw new FirebaseNotConfiguredError()
  }
  try {
    await signInWithPopup(services.auth, googleProvider)
  } catch (error) {
    if (REDIRECT_FALLBACK_CODES.has(errorCode(error))) {
      await signInWithRedirect(services.auth, googleProvider)
      return
    }
    throw error
  }
}

export async function completeRedirectSignIn(): Promise<void> {
  const services = getFirebase()
  if (services !== null) {
    await getRedirectResult(services.auth)
  }
}

export async function signOutCurrentUser(): Promise<void> {
  const services = getFirebase()
  if (services === null) {
    throw new FirebaseNotConfiguredError()
  }
  await signOut(services.auth)
}
