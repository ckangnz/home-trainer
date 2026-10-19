import { useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { useData } from '@/data/DataProvider'
import { loadRepository } from '@/data/lazy'
import { Dialog } from '@/components/Dialog'
import { useToast } from '@/app/Toast'
import { Icon } from '@/app/Icons'
import { SITE, absoluteUrl } from '@/app/site'
import type { Routine, RoutineBody } from '@/workouts/types'
import { useT, type MessageKey } from '@/i18n'
import { formatCode, sharePath } from './code'

function shareUrl(code: string): string {
  return absoluteUrl(sharePath(code))
}

function bodyOf(routine: Routine): RoutineBody {
  const body: RoutineBody = { name: routine.name, defaults: routine.defaults, items: routine.items }
  if (routine.description) {
    body.description = routine.description
  }
  return body
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function ShareDialog({ routine, open, onClose }: { routine: Routine; open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const { setShareCode } = useData()
  const t = useT()
  const { notify } = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<MessageKey | null>(null)
  const code = routine.shareCode

  const create = async (replace?: string) => {
    if (!user) {
      return
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('social.share.offline')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const repository = await loadRepository()
      const next = await repository.createShare(user.uid, bodyOf(routine))
      setShareCode(routine, next)
      if (replace) {
        await repository.deleteShare(replace).catch(() => undefined)
      }
    } catch {
      setError('social.share.createFailed')
    } finally {
      setBusy(false)
    }
  }

  const stop = async () => {
    if (!code) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const repository = await loadRepository()
      await repository.deleteShare(code)
      setShareCode(routine, undefined)
      notify(t('social.share.stopped'))
    } catch {
      setError('social.share.stopFailed')
    } finally {
      setBusy(false)
    }
  }

  const nativeShare = async () => {
    if (!code) {
      return
    }
    const url = shareUrl(code)
    const text = t('social.share.text', { name: routine.name, site: SITE.name, code: formatCode(code) })
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: routine.name, text, url })
        return
      } catch {
        return
      }
    }
    notify((await copy(`${text}\n${url}`)) ? t('social.share.inviteCopied') : t('social.share.copyFailed'))
  }

  return (
    <Dialog open={open} title={t('social.share.title', { name: routine.name })} onClose={onClose}>
      {code ? (
        <div className="stack">
          <p className="muted">{t('social.share.explain')}</p>
          <div className="share-code">
            <span className="share-code__value tabular">{formatCode(code)}</span>
            <button
              type="button"
              className="btn btn--small"
              onClick={async () => notify((await copy(formatCode(code))) ? t('social.share.codeCopied') : t('social.share.copyFailed'))}
            >
              <Icon name="copy" />
              {t('social.share.copyCode')}
            </button>
          </div>
          <div className="share-code">
            <span className="share-code__link">{shareUrl(code)}</span>
            <button
              type="button"
              className="btn btn--small"
              onClick={async () => notify((await copy(shareUrl(code))) ? t('social.share.linkCopied') : t('social.share.copyFailed'))}
            >
              <Icon name="link" />
              {t('social.share.copyLink')}
            </button>
          </div>
          <button type="button" className="btn btn--primary" onClick={() => void nativeShare()}>
            <Icon name="share" />
            {t('social.share.share')}
          </button>
          <p className="faint">{t('social.share.editedHint')}</p>
          <div className="row row--wrap">
            <button type="button" className="btn btn--small" disabled={busy} onClick={() => void create(code)}>
              <Icon name="repeat" />
              {t('social.share.newCode')}
            </button>
            <button type="button" className="btn btn--small btn--danger" disabled={busy} onClick={() => void stop()}>
              {t('social.share.stop')}
            </button>
          </div>
        </div>
      ) : (
        <div className="stack">
          <p className="muted">{t('social.share.intro', { site: SITE.name })}</p>
          <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void create()}>
            <Icon name="share" />
            {busy ? t('social.share.creating') : t('social.share.create')}
          </button>
        </div>
      )}
      {error ? (
        <p className="notice notice--error" role="alert">
          {t(error)}
        </p>
      ) : null}
    </Dialog>
  )
}
