import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import { firebaseConfig } from './config'

export interface FirebaseServices {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

function createFirestore(app: FirebaseApp): Firestore {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  } catch {
    return getFirestore(app)
  }
}

let cachedServices: FirebaseServices | null = null

export function getFirebase(): FirebaseServices | null {
  if (firebaseConfig === null) {
    return null
  }
  if (cachedServices === null) {
    const app = initializeApp(firebaseConfig)
    cachedServices = { app, auth: getAuth(app), db: createFirestore(app) }
  }
  return cachedServices
}
