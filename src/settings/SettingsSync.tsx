import { useEffect } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { DEFAULT_SETTINGS, SYNCED_KEYS, applyRemoteSettings, getSettings, settingsUpdatedAt, stampSettings, subscribeSettings, syncedPart } from './settings'

const UPLOAD_DELAY_MS = 800

type SettingsDocModule = typeof import('@/data/settingsDoc')

function customized(): boolean {
  const current = getSettings()
  return SYNCED_KEYS.some((key) => current[key] !== DEFAULT_SETTINGS[key])
}

export function SettingsSync() {
  const { user } = useAuth()
  const uid = user?.uid ?? null

  useEffect(() => {
    if (uid === null) {
      return
    }
    let cancelled = false
    let synced = -1
    let timer: number | undefined
    let module: SettingsDocModule | null = null
    let stopRemote: (() => void) | null = null

    const upload = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const at = settingsUpdatedAt()
        if (!module || cancelled || at <= synced) {
          return
        }
        synced = at
        void module.saveRemoteSettings(uid, syncedPart(getSettings()), at).catch(() => {
          synced = -1
        })
      }, UPLOAD_DELAY_MS)
    }

    const stopLocal = subscribeSettings(upload)

    import('@/data/settingsDoc')
      .then((loaded) => {
        if (cancelled) {
          return
        }
        module = loaded
        stopRemote = loaded.subscribeRemoteSettings(
          uid,
          (remote) => {
            const local = settingsUpdatedAt()
            if (remote && (local === 0 || remote.updatedAt > local)) {
              synced = remote.updatedAt
              applyRemoteSettings(remote.settings, remote.updatedAt)
            } else if (remote) {
              synced = Math.max(synced, remote.updatedAt)
              if (local > remote.updatedAt) {
                upload()
              }
            } else if (local === 0 && customized()) {
              stampSettings()
              upload()
            } else if (local > 0) {
              upload()
            }
          },
          () => undefined,
        )
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      stopLocal()
      stopRemote?.()
    }
  }, [uid])

  return null
}
