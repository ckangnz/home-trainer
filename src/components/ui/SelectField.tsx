import type { ReactNode, SelectHTMLAttributes } from 'react'
import { Field } from './Field'

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  label: string
  className?: string
  children: ReactNode
}

export function SelectField({ label, className, children, ...selectProps }: SelectFieldProps) {
  return (
    <Field label={label} className={className}>
      <select className="ui-control" {...selectProps}>
        {children}
      </select>
    </Field>
  )
}
