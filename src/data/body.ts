import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, type Unsubscribe } from 'firebase/firestore'
import { KG_RANGE, type WeightEntry } from '@/body/types'
import { getFirebase } from './firebase'

const DAY = /^\d{4}-\d{2}-\d{2}$/

function database() {
  const services = getFirebase()
  if (services === null) {
    throw new Error('Firebase is not configured.')
  }
  return services.db
}

function parseWeight(id: string, value: unknown): WeightEntry | null {
  if (typeof value !== 'object' || value === null || !DAY.test(id)) {
    return null
  }
  const data = value as Record<string, unknown>
  const kg = data.kg
  if (typeof kg !== 'number' || !Number.isFinite(kg) || kg < KG_RANGE[0] || kg > KG_RANGE[1]) {
    return null
  }
  return { date: id, kg, updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '' }
}

export function subscribeWeights(uid: string, onChange: (entries: WeightEntry[]) => void, onError: (error: unknown) => void): Unsubscribe {
  return onSnapshot(
    query(collection(database(), 'users', uid, 'weights'), orderBy('date', 'asc')),
    (snapshot) => {
      onChange(snapshot.docs.map((entry) => parseWeight(entry.id, entry.data())).filter((entry): entry is WeightEntry => entry !== null))
    },
    onError,
  )
}

export function saveWeight(uid: string, entry: WeightEntry): Promise<void> {
  return setDoc(doc(database(), 'users', uid, 'weights', entry.date), { date: entry.date, kg: entry.kg, updatedAt: entry.updatedAt })
}

export function deleteWeight(uid: string, date: string): Promise<void> {
  return deleteDoc(doc(database(), 'users', uid, 'weights', date))
}
