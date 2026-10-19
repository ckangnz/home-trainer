import { useEffect, useRef, useState } from 'react'
import { Dialog } from '@/components/Dialog'
import { Icon } from '@/app/Icons'
import { SITE } from '@/app/site'
import { detectPlatform, type Platform } from '@/app/platform'
import './install.css'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

function isStandalone(): boolean {
  const media = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches
  return media || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function isMobile(platform: Platform): boolean {
  return platform === 'ios' || platform === 'android'
}

function ShareGlyph() {
  return (
    <span className="install-guide__glyph" aria-hidden="true">
      <Icon name="share" />
    </span>
  )
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [guide, setGuide] = useState(false)
  const requestingRef = useRef(false)

  useEffect(() => {
    setInstalled(isStandalone())
    setPlatform(detectPlatform(navigator.userAgent, navigator.maxTouchPoints))
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
      setGuide(false)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || platform === null || (deferred === null && !isMobile(platform))) {
    return null
  }

  const install = async () => {
    if (deferred === null) {
      setGuide(true)
      return
    }
    if (requestingRef.current) {
      return
    }
    requestingRef.current = true
    const promptEvent = deferred
    setDeferred(null)
    try {
      await promptEvent.prompt()
      await promptEvent.userChoice
    } catch {
      setDeferred(promptEvent)
    } finally {
      requestingRef.current = false
    }
  }

  return (
    <>
      <button
        type="button"
        className="install-button"
        aria-label="Install app"
        onClick={() => {
          void install()
        }}
      >
        <Icon name="download" />
        <span className="install-button__label">Install</span>
      </button>
      <Dialog open={guide} title={`Install ${SITE.name}`} onClose={() => setGuide(false)}>
        <div className="install-guide stack">
          <div className="install-guide__hero">
            <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width={64} height={64} />
            <p className="muted">Add {SITE.name} to your home screen. It opens full screen like an app and works offline.</p>
          </div>
          {platform === 'ios' ? (
            <ol className="install-guide__steps">
              <li>
                <span>
                  Tap the <strong>Share</strong> button <ShareGlyph /> in your browser&apos;s toolbar. In Chrome it&apos;s at the top right.
                </span>
              </li>
              <li>
                <span>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </span>
              </li>
              <li>
                <span>
                  Tap <strong>Add</strong>. {SITE.name} appears on your home screen.
                </span>
              </li>
            </ol>
          ) : (
            <ol className="install-guide__steps">
              <li>
                <span>
                  Open your browser menu <span className="install-guide__glyph" aria-hidden="true">⋮</span> at the top right.
                </span>
              </li>
              <li>
                <span>
                  Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                </span>
              </li>
              <li>
                <span>
                  Confirm with <strong>Install</strong>.
                </span>
              </li>
            </ol>
          )}
          <button type="button" className="btn btn--primary btn--block" onClick={() => setGuide(false)}>
            Got it
          </button>
        </div>
      </Dialog>
    </>
  )
}
