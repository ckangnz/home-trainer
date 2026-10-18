import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  className?: string
  children: ReactNode
}

export function Field({ label, className, children }: FieldProps) {
  return (
    <label className={className === undefined ? 'ui-field' : `ui-field ${className}`}>
      <span className="ui-field__label">{label}</span>
      {children}
    </label>
  )
}
