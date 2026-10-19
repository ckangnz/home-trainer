import { useEffect, useRef, useState } from 'react'
import { Dialog } from '@/components/Dialog'
import { Icon } from '@/app/Icons'
import { SITE } from '@/app/site'
import { detectPlatform, type Platform } from '@/app/platform'
import { useT } from '@/i18n'
import { richText } from '@/i18n/richText'
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
  const t = useT()
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
        aria-label={t('social.install.label')}
        onClick={() => {
          void install()
        }}
      >
        <Icon name="download" />
        <span className="install-button__label">{t('social.install.button')}</span>
      </button>
      <Dialog open={guide} title={t('social.install.title', { name: SITE.name })} onClose={() => setGuide(false)}>
        <div className="install-guide stack">
          <div className="install-guide__hero">
            <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width={64} height={64} />
            <p className="muted">{t('social.install.hero', { name: SITE.name })}</p>
          </div>
          {platform === 'ios' ? (
            <ol className="install-guide__steps">
              <li>
                <span>{richText(t('social.install.ios1'), { share: <strong>{t('social.install.shareWord')}</strong>, glyph: <ShareGlyph /> })}</span>
              </li>
              <li>
                <span>{richText(t('social.install.ios2'), { add: <strong>{t('social.install.addToHomeScreen')}</strong> })}</span>
              </li>
              <li>
                <span>{richText(t('social.install.ios3'), { add: <strong>{t('social.install.add')}</strong>, name: SITE.name })}</span>
              </li>
            </ol>
          ) : (
            <ol className="install-guide__steps">
              <li>
                <span>
                  {richText(t('social.install.android1'), {
                    glyph: (
                      <span className="install-guide__glyph" aria-hidden="true">
                        ⋮
                      </span>
                    ),
                  })}
                </span>
              </li>
              <li>
                <span>
                  {richText(t('social.install.android2'), {
                    install: <strong>{t('social.install.installApp')}</strong>,
                    addHome: <strong>{t('social.install.addToHomeScreenAndroid')}</strong>,
                  })}
                </span>
              </li>
              <li>
                <span>{richText(t('social.install.android3'), { install: <strong>{t('social.install.installWord')}</strong> })}</span>
              </li>
            </ol>
          )}
          <button type="button" className="btn btn--primary btn--block" onClick={() => setGuide(false)}>
            {t('social.install.gotIt')}
          </button>
        </div>
      </Dialog>
    </>
  )
}
