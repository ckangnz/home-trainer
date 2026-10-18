import type { InputHTMLAttributes } from 'react'
import { Field } from './Field'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
  label: string
  className?: string
}

export function TextField({ label, className, ...inputProps }: TextFieldProps) {
  return (
    <Field label={label} className={className}>
      <input type="text" className="ui-control" {...inputProps} />
    </Field>
  )
}
