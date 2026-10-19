import { useState } from 'react'
import { SITE, absoluteUrl } from '@/app/site'
import { Icon } from '@/app/Icons'
import { useToast } from '@/app/Toast'
import './support.css'

export function SupportCard() {
  if (!SITE.supportUrl) {
    return null
  }
  return (
    <aside className="support-card card">
      <span className="support-card__icon" aria-hidden="true">
        ☕
      </span>
      <div className="stack stack--tight">
        <strong>Enjoying {SITE.name}?</strong>
        <span className="muted">It stays free thanks to ads and supporters like you.</span>
      </div>
      <a className="btn btn--small" href={SITE.supportUrl} target="_blank" rel="noreferrer">
        Buy me a coffee
      </a>
    </aside>
  )
}

export function ShareResultButton({ title, minutes, className = 'btn btn--lg' }: { title: string; minutes: number; className?: string }) {
  const { notify } = useToast()
  const [busy, setBusy] = useState(false)
  const share = async () => {
    const url = absoluteUrl('/')
    const text = `I just finished "${title}" (${minutes} min) on ${SITE.name}, the free 7-minute workout app.`
    setBusy(true)
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: SITE.name, text, url })
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`)
        notify('Copied to clipboard')
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
      Share
    </button>
  )
}

const CONFETTI_COLORS = ['#ff6a2b', '#38bdf8', '#34d399', '#fbbf24', '#f472b6']

export function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 28 }, (_, index) => (
        <span
          key={index}
          style={{
            left: `${(index * 37) % 100}%`,
            background: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
            animationDelay: `${(index % 7) * 0.12}s`,
            animationDuration: `${2.2 + (index % 5) * 0.35}s`,
          }}
        />
      ))}
    </div>
  )
}
