import { useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { useData } from '@/data/DataProvider'
import { loadRepository } from '@/data/lazy'
import { Dialog } from '@/components/Dialog'
import { useToast } from '@/app/Toast'
import { Icon } from '@/app/Icons'
import { SITE, absoluteUrl } from '@/app/site'
import type { Routine, RoutineBody } from '@/workouts/types'
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
  const { notify } = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const code = routine.shareCode

  const create = async (replace?: string) => {
    if (!user) {
      return
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('You are offline. Connect to the internet to create a share code.')
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
      setError('Could not create a share code. Please try again.')
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
      notify('Sharing stopped')
    } catch {
      setError('Could not stop sharing. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const nativeShare = async () => {
    if (!code) {
      return
    }
    const url = shareUrl(code)
    const text = `Try my "${routine.name}" workout on ${SITE.name}. Code: ${formatCode(code)}`
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: routine.name, text, url })
        return
      } catch {
        return
      }
    }
    notify((await copy(`${text}\n${url}`)) ? 'Copied invite to clipboard' : 'Could not copy')
  }

  return (
    <Dialog open={open} title={`Share ${routine.name}`} onClose={onClose}>
      {code ? (
        <div className="stack">
          <p className="muted">Anyone with this code or link can preview your routine and add a copy to their list.</p>
          <div className="share-code">
            <span className="share-code__value tabular">{formatCode(code)}</span>
            <button
              type="button"
              className="btn btn--small"
              onClick={async () => notify((await copy(formatCode(code))) ? 'Code copied' : 'Could not copy')}
            >
              <Icon name="copy" />
              Copy code
            </button>
          </div>
          <div className="share-code">
            <span className="share-code__link">{shareUrl(code)}</span>
            <button
              type="button"
              className="btn btn--small"
              onClick={async () => notify((await copy(shareUrl(code))) ? 'Link copied' : 'Could not copy')}
            >
              <Icon name="link" />
              Copy link
            </button>
          </div>
          <button type="button" className="btn btn--primary" onClick={() => void nativeShare()}>
            <Icon name="share" />
            Share…
          </button>
          <p className="faint">Edited the routine since sharing? Make a new code so friends get the latest version.</p>
          <div className="row row--wrap">
            <button type="button" className="btn btn--small" disabled={busy} onClick={() => void create(code)}>
              <Icon name="repeat" />
              New code with latest changes
            </button>
            <button type="button" className="btn btn--small btn--danger" disabled={busy} onClick={() => void stop()}>
              Stop sharing
            </button>
          </div>
        </div>
      ) : (
        <div className="stack">
          <p className="muted">
            Create a short code your friends can paste into {SITE.name} to copy this routine into their own list. They will
            get their own copy, and your routine stays private.
          </p>
          <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void create()}>
            <Icon name="share" />
            {busy ? 'Creating…' : 'Create share code'}
          </button>
        </div>
      )}
      {error ? (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      ) : null}
    </Dialog>
  )
}
