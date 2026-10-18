import { useEffect, useRef, useState } from 'react'
import './ads.css'

const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT?.trim() ?? ''

export const AD_SLOTS = {
  rest: import.meta.env.VITE_ADSENSE_SLOT_REST?.trim() ?? '',
  content: import.meta.env.VITE_ADSENSE_SLOT_CONTENT?.trim() ?? '',
} as const

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
        <aside className={`ad-unit ad-unit--placeholder ${className ?? ''}`} aria-label="Advertisement">
          <span className="ad-unit__label">Advertisement</span>
          <div className="ad-unit__placeholder">Ad slot ({placement})</div>
        </aside>
      )
    }
    return null
  }

  return (
    <aside className={`ad-unit ${className ?? ''}`} aria-label="Advertisement">
      <span className="ad-unit__label">Advertisement</span>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
        {...(import.meta.env.DEV ? { 'data-adtest': 'on' } : {})}
      />
    </aside>
  )
}
