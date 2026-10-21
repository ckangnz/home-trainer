import { useState, type CSSProperties } from 'react'
import { SITE, absoluteUrl } from '@/app/site'
import { Icon } from '@/app/Icons'
import { useToast } from '@/app/Toast'
import { useT } from '@/i18n'
import './support.css'

export function SupportCard() {
  const t = useT()
  if (!SITE.supportUrl) {
    return null
  }
  return (
    <aside className="support-card card">
      <span className="support-card__icon" aria-hidden="true">
        ☕
      </span>
      <div className="stack stack--tight">
        <strong>{t('app.components.support.enjoying', { name: SITE.name })}</strong>
        <span className="muted">{t('app.components.support.body')}</span>
      </div>
      <a className="btn btn--small" href={SITE.supportUrl} target="_blank" rel="noreferrer">
        {t('app.components.support.coffee')}
      </a>
    </aside>
  )
}

export function ShareResultButton({ title, minutes, className = 'btn btn--lg' }: { title: string; minutes: number; className?: string }) {
  const { notify } = useToast()
  const t = useT()
  const [busy, setBusy] = useState(false)
  const share = async () => {
    const url = absoluteUrl('/')
    const text = t('app.components.support.shareText', { title, minutes, name: SITE.name })
    setBusy(true)
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: SITE.name, text, url })
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`)
        notify(t('app.components.support.copied'))
      }
    } catch {
      return
    } finally {
      setBusy(false)
    }
  }
  return (
    <button type="button" className={className} disabled={busy} onClick={() => void share()}>
      <Icon name="share" />
      {t('common.share')}
    </button>
  )
}

const CONFETTI_COLORS = ['#ff6a2b', '#38bdf8', '#34d399', '#fbbf24', '#f472b6']

const BURST_PIECES = 64

const RAIN_PIECES = 36

const SHAPES = ['rect', 'round', 'ribbon'] as const

function seeded(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return value - Math.floor(value)
}

export function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: BURST_PIECES }, (_, index) => {
        const angle = -Math.PI / 2 + (seeded(index, 1) - 0.5) * Math.PI * 1.5
        const power = 28 + seeded(index, 2) * 34
        return (
          <span
            key={`burst-${index}`}
            className={`confetti__piece confetti__piece--${SHAPES[index % SHAPES.length]} confetti__burst`}
            style={
              {
                background: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
                '--dx': `${Math.cos(angle) * power}vw`,
                '--dy': `${Math.sin(angle) * power * 0.9}vh`,
                '--spin': `${360 + seeded(index, 3) * 720}deg`,
                animationDelay: `${seeded(index, 4) * 0.12}s`,
                animationDuration: `${1.9 + seeded(index, 5) * 1.1}s`,
              } as CSSProperties
            }
          />
        )
      })}
      {Array.from({ length: RAIN_PIECES }, (_, index) => (
        <span
          key={`rain-${index}`}
          className="confetti__rain"
          style={
            {
              left: `${seeded(index, 6) * 100}%`,
              animationDelay: `${1.1 + seeded(index, 7) * 5}s`,
              animationDuration: `${5 + seeded(index, 8) * 4}s`,
            } as CSSProperties
          }
        >
          <span
            className={`confetti__piece confetti__piece--${SHAPES[(index + 1) % SHAPES.length]} confetti__sway`}
            style={
              {
                background: CONFETTI_COLORS[(index + 2) % CONFETTI_COLORS.length],
                animationDuration: `${1.4 + seeded(index, 9) * 1.4}s`,
                animationDelay: `${-seeded(index, 10) * 2}s`,
              } as CSSProperties
            }
          />
        </span>
      ))}
    </div>
  )
}
