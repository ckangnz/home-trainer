import { useEffect, useRef, useState } from 'react'
import { useT } from '@/i18n'
import './ads.css'

const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT?.trim() ?? ''

const REST_SLOT = import.meta.env.VITE_ADSENSE_SLOT_REST?.trim() ?? ''

export const AD_SLOTS = {
  rest: REST_SLOT,
  page: import.meta.env.VITE_ADSENSE_SLOT_PAGE?.trim() || REST_SLOT,
} as const

const AD_FORMAT: Record<keyof typeof AD_SLOTS, string> = {
  rest: 'auto',
  page: 'horizontal',
}

export type AdPlacement = keyof typeof AD_SLOTS

export const adsConfigured = CLIENT.startsWith('ca-pub-')

const SCRIPT_ID = 'adsbygoogle-loader'

type AdsQueue = { push: (config: object) => void }

function loadScript() {
  if (typeof document === 'undefined' || document.getElementById(SCRIPT_ID)) {
    return
  }
  const script = document.createElement('script')
  script.id = SCRIPT_ID
  script.async = true
  script.crossOrigin = 'anonymous'
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(CLIENT)}`
  document.head.appendChild(script)
}

function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

interface AdUnitProps {
  placement: AdPlacement
  className?: string
}

export function AdUnit({ placement, className }: AdUnitProps) {
  const slot = AD_SLOTS[placement]
  const t = useT()
  const online = useOnline()
  const insRef = useRef<HTMLModElement>(null)
  const live = adsConfigured && slot !== '' && online

  useEffect(() => {
    const ins = insRef.current
    if (!live || !ins || ins.dataset.adsbygoogleStatus) {
      return
    }
    loadScript()
    try {
      const queue = ((window as unknown as { adsbygoogle?: AdsQueue }).adsbygoogle ??= [] as unknown as AdsQueue)
      queue.push({})
    } catch {
      ins.dataset.adsbygoogleStatus = 'failed'
    }
  }, [live])

  if (!live) {
    if (import.meta.env.DEV) {
      return (
        <aside className={`ad-unit ad-unit--placeholder ${className ?? ''}`} aria-label={t('player.ads.label')}>
          <span className="ad-unit__label">{t('player.ads.label')}</span>
          <div className="ad-unit__placeholder">{t('player.ads.placeholder', { placement })}</div>
        </aside>
      )
    }
    return null
  }

  return (
    <aside className={`ad-unit ad-unit--${placement} ${className ?? ''}`} aria-label={t('player.ads.label')}>
      <span className="ad-unit__label">{t('player.ads.label')}</span>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format={AD_FORMAT[placement]}
        data-full-width-responsive="true"
        {...(import.meta.env.DEV ? { 'data-adtest': 'on' } : {})}
      />
    </aside>
  )
}
