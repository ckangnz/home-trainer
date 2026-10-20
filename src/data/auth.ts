import {
  GoogleAuthProvider,
  getAdditionalUserInfo,
  getRedirectResult,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
  type UserCredential,
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

export type PhotoSync = 'updated' | 'unchanged' | 'missing'

async function syncGooglePhoto(credential: UserCredential | null): Promise<PhotoSync> {
  if (credential === null) {
    return 'unchanged'
  }
  const picture = getAdditionalUserInfo(credential)?.profile?.picture
  if (typeof picture !== 'string' || !picture.startsWith('https://') || /default-user/.test(picture)) {
    return 'missing'
  }
  if (picture === credential.user.photoURL) {
    return 'unchanged'
  }
  await updateProfile(credential.user, { photoURL: picture })
  return 'updated'
}

export async function signInWithGoogle(): Promise<void> {
  const services = getFirebase()
  if (services === null) {
    throw new FirebaseNotConfiguredError()
  }
  try {
    await syncGooglePhoto(await signInWithPopup(services.auth, googleProvider))
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
    await syncGooglePhoto(await getRedirectResult(services.auth))
  }
}

export async function refreshGoogleProfile(): Promise<PhotoSync> {
  const services = getFirebase()
  const user = services?.auth.currentUser
  if (!services || !user) {
    throw new FirebaseNotConfiguredError()
  }
  return syncGooglePhoto(await reauthenticateWithPopup(user, googleProvider))
}

export async function signOutCurrentUser(): Promise<void> {
  const services = getFirebase()
  if (services === null) {
    throw new FirebaseNotConfiguredError()
  }
  await signOut(services.auth)
}
