type Repository = typeof import('./repository')

let pending: Promise<Repository> | null = null

export function loadRepository(): Promise<Repository> {
  pending ??= import('./repository').catch((error: unknown) => {
    pending = null
    throw error
  })
  return pending
}
