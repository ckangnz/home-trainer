import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { parseCustomFood, parseLog, parsePlan, parsePrefs } from '@/food/models'
import type { CustomFood, FoodLog, FoodPrefs, MealPlan } from '@/food/types'
import { getFirebase } from './firebase'
import { stripUndefined } from './models'

function database() {
  const services = getFirebase()
  if (services === null) {
    throw new Error('Firebase is not configured.')
  }
  return services.db
}

function plansOf(uid: string, docs: { id: string; data: () => unknown }[]): MealPlan[] {
  return docs
    .map((entry) => parsePlan(entry.id, uid, entry.data()))
    .filter((plan): plan is MealPlan => plan !== null)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
}

export function subscribeMealPlans(uid: string, onChange: (plans: MealPlan[]) => void, onError: (error: unknown) => void): Unsubscribe {
  return onSnapshot(collection(database(), 'users', uid, 'mealPlans'), (snapshot) => onChange(plansOf(uid, snapshot.docs)), onError)
}

export async function fetchMealPlans(uid: string): Promise<MealPlan[]> {
  const snapshot = await getDocs(collection(database(), 'users', uid, 'mealPlans'))
  return plansOf(uid, snapshot.docs)
}

export function saveMealPlan(plan: MealPlan): Promise<void> {
  const { id, ownerId, ...body } = plan
  return setDoc(doc(database(), 'users', ownerId, 'mealPlans', id), stripUndefined(body))
}

export function deleteMealPlan(uid: string, id: string): Promise<void> {
  return deleteDoc(doc(database(), 'users', uid, 'mealPlans', id))
}

export function subscribeFoodPrefs(uid: string, onChange: (prefs: FoodPrefs) => void, onError: (error: unknown) => void): Unsubscribe {
  return onSnapshot(doc(database(), 'users', uid, 'food', 'prefs'), (snapshot) => onChange(parsePrefs(snapshot.data())), onError)
}

export async function fetchFoodPrefs(uid: string): Promise<FoodPrefs> {
  const snapshot = await getDoc(doc(database(), 'users', uid, 'food', 'prefs'))
  return parsePrefs(snapshot.data())
}

export function saveFoodPrefs(uid: string, prefs: FoodPrefs): Promise<void> {
  return setDoc(doc(database(), 'users', uid, 'food', 'prefs'), {
    activePlanId: prefs.activePlanId,
    shareWithFriends: prefs.shareWithFriends,
    updatedAt: new Date().toISOString(),
  })
}

function logsOf(docs: { id: string; data: () => unknown }[]): FoodLog[] {
  return docs.map((entry) => parseLog(entry.id, entry.data())).filter((log): log is FoodLog => log !== null)
}

export function subscribeFoodLogs(
  uid: string,
  fromDay: string,
  onChange: (logs: FoodLog[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(database(), 'users', uid, 'foodLogs'), where('date', '>=', fromDay), orderBy('date', 'asc')),
    (snapshot) => onChange(logsOf(snapshot.docs)),
    onError,
  )
}

export async function fetchFoodLogs(uid: string, fromDay: string, toDay: string): Promise<FoodLog[]> {
  const snapshot = await getDocs(
    query(collection(database(), 'users', uid, 'foodLogs'), where('date', '>=', fromDay), where('date', '<=', toDay), orderBy('date', 'asc')),
  )
  return logsOf(snapshot.docs)
}

export function saveFoodLog(uid: string, log: FoodLog): Promise<void> {
  if (log.entries.length === 0 && !log.cheat) {
    return deleteDoc(doc(database(), 'users', uid, 'foodLogs', log.date))
  }
  return setDoc(
    doc(database(), 'users', uid, 'foodLogs', log.date),
    stripUndefined({ date: log.date, entries: log.entries, cheat: log.cheat ? true : undefined, updatedAt: log.updatedAt }),
  )
}

export function subscribeCustomFoods(uid: string, onChange: (foods: CustomFood[]) => void, onError: (error: unknown) => void): Unsubscribe {
  return onSnapshot(
    collection(database(), 'users', uid, 'customFoods'),
    (snapshot) =>
      onChange(
        snapshot.docs
          .map((entry) => parseCustomFood(entry.id, entry.data()))
          .filter((food): food is CustomFood => food !== null)
          .sort((a, b) => a.name.localeCompare(b.name)),
      ),
    onError,
  )
}

export function saveCustomFood(uid: string, food: CustomFood): Promise<void> {
  const { id, ...body } = food
  return setDoc(doc(database(), 'users', uid, 'customFoods', id), body)
}

export function deleteCustomFood(uid: string, id: string): Promise<void> {
  return deleteDoc(doc(database(), 'users', uid, 'customFoods', id))
}
