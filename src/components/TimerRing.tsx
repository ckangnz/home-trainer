import type { ReactNode } from 'react'
import './timer-ring.css'

interface TimerRingProps {
  fraction: number
  tone?: 'work' | 'rest'
  size?: 'md' | 'lg'
  children: ReactNode
  label: string
}

const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function TimerRing({ fraction, tone = 'work', size = 'md', children, label }: TimerRingProps) {
  const clamped = Math.min(1, Math.max(0, fraction))
  return (
    <div className={`timer-ring timer-ring--${tone} timer-ring--${size}`} role="timer" aria-label={label}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={RADIUS} className="timer-ring__track" />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          className="timer-ring__value"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="timer-ring__center">{children}</div>
    </div>
  )
}
