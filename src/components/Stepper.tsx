import { useId } from 'react'
import { Icon } from '@/app/Icons'
import { useT } from '@/i18n'

interface StepperProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  format?: (value: number) => string
  onChange: (value: number) => void
  hint?: string
  disabled?: boolean
}

export function Stepper({ label, value, min, max, step, format = String, onChange, hint, disabled = false }: StepperProps) {
  const id = useId()
  const t = useT()
  const set = (next: number) => onChange(Math.min(max, Math.max(min, next)))
  return (
    <div className="stepper-field" aria-disabled={disabled}>
      <div className="stepper-field__text">
        <span id={id} className="stepper-field__label">
          {label}
        </span>
        {hint ? <span className="stepper-field__hint">{hint}</span> : null}
      </div>
      <div className="stepper" role="group" aria-labelledby={id}>
        <button
          type="button"
          aria-label={t('app.components.stepper.decrease', { label: label.toLowerCase() })}
          disabled={disabled || value <= min}
          onClick={() => set(value - step)}
        >
          <Icon name="minus" />
        </button>
        <output aria-live="polite">{format(value)}</output>
        <button
          type="button"
          aria-label={t('app.components.stepper.increase', { label: label.toLowerCase() })}
          disabled={disabled || value >= max}
          onClick={() => set(value + step)}
        >
          <Icon name="plus" />
        </button>
      </div>
    </div>
  )
}
