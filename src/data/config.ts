export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

function readConfig(): FirebaseConfig | null {
  const env = import.meta.env
  const config: FirebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: env.VITE_FIREBASE_APP_ID ?? '',
  }
  const missing = (Object.keys(config) as (keyof FirebaseConfig)[]).filter((key) => config[key].trim() === '')
  return missing.length > 0 ? null : config
}

export const firebaseConfig = readConfig()

export const isFirebaseConfigured = firebaseConfig !== null
