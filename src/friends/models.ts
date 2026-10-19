import { isShareCode } from '@/data/models'

export interface PublicProfile {
  uid: string
  displayName: string
  photoURL?: string
}

export interface OwnProfile extends PublicProfile {
  friendCode: string
}

export interface Friend extends PublicProfile {
  since: string
}

export interface FriendRequest {
  id: string
  from: PublicProfile
  to: PublicProfile
  createdAt: string
}

type Json = Record<string, unknown>

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max
}

export function cleanName(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim().slice(0, 80)
  return trimmed || 'HomeTrainer user'
}

export function cleanPhoto(photo: string | null | undefined): string | undefined {
  if (!photo || !photo.startsWith('https://') || photo.length > 500 || /default-user/.test(photo)) {
    return undefined
  }
  return photo
}

function parsePerson(uid: unknown, name: unknown, photo: unknown): PublicProfile | null {
  if (!isText(uid, 128)) {
    return null
  }
  const person: PublicProfile = { uid, displayName: isText(name, 80) ? name : 'HomeTrainer user' }
  const photoURL = typeof photo === 'string' ? cleanPhoto(photo) : undefined
  if (photoURL) {
    person.photoURL = photoURL
  }
  return person
}

export function parseCodeOwner(value: unknown): PublicProfile | null {
  return isObject(value) ? parsePerson(value.uid, value.displayName, value.photoURL) : null
}

export function parseOwnProfile(uid: string, value: unknown): OwnProfile | null {
  if (!isObject(value) || typeof value.friendCode !== 'string' || !isShareCode(value.friendCode)) {
    return null
  }
  const person = parsePerson(uid, value.displayName, value.photoURL)
  return person ? { ...person, friendCode: value.friendCode } : null
}

export function parseFriend(uid: string, value: unknown): Friend | null {
  if (!isObject(value) || value.uid !== uid || typeof value.since !== 'string') {
    return null
  }
  const person = parsePerson(uid, value.displayName, value.photoURL)
  return person ? { ...person, since: value.since } : null
}

export function parseRequest(id: string, value: unknown): FriendRequest | null {
  if (!isObject(value) || typeof value.createdAt !== 'string') {
    return null
  }
  const from = parsePerson(value.from, value.fromName, value.fromPhoto)
  const to = parsePerson(value.to, value.toName, value.toPhoto)
  if (!from || !to || id !== `${from.uid}_${to.uid}`) {
    return null
  }
  return { id, from, to, createdAt: value.createdAt }
}
