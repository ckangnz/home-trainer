type Repository = typeof import('./repository')

let pending: Promise<Repository> | null = null

export function loadRepository(): Promise<Repository> {
  pending ??= import('./repository').catch((error: unknown) => {
    pending = null
    throw error
  })
  return pending
}

type FriendsRepository = typeof import('./friends')

let pendingFriends: Promise<FriendsRepository> | null = null

export function loadFriendsRepository(): Promise<FriendsRepository> {
  pendingFriends ??= import('./friends').catch((error: unknown) => {
    pendingFriends = null
    throw error
  })
  return pendingFriends
}
