import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore'
import type { SyncedSettings } from '@/settings/settings'
import { getFirebase } from './firebase'

export interface RemoteSettings {
  settings: Partial<Record<keyof SyncedSettings, unknown>>
  updatedAt: number
}

function settingsRef(uid: string) {
  const services = getFirebase()
  if (services === null) {
    throw new Error('Firebase is not configured.')
  }
  return doc(services.db, 'users', uid, 'private', 'settings')
}

export function subscribeRemoteSettings(
  uid: string,
  onChange: (remote: RemoteSettings | null) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    settingsRef(uid),
    (snapshot) => {
      const data = snapshot.data()
      if (!data || typeof data.updatedAt !== 'number' || typeof data.settings !== 'object' || data.settings === null) {
        onChange(null)
        return
      }
      onChange({ settings: data.settings as RemoteSettings['settings'], updatedAt: data.updatedAt })
    },
    onError,
  )
}

export function saveRemoteSettings(uid: string, settings: SyncedSettings, updatedAt: number): Promise<void> {
  return setDoc(settingsRef(uid), { settings, updatedAt })
}
