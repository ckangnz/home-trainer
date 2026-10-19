import { useRef } from 'react'
import { Icon } from '@/app/Icons'
import './search-field.css'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
}

export function SearchField({ value, onChange, label, placeholder }: SearchFieldProps) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className="search" role="search">
      <Icon name="search" className="icon search__icon" />
      <input
        ref={input}
        type="search"
        className="ui-control"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        enterKeyHint="search"
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            input.current?.blur()
          }
        }}
      />
      {value ? (
        <button
          type="button"
          className="search__clear"
          aria-label="Clear search"
          onClick={() => {
            onChange('')
            input.current?.focus()
          }}
        >
          <Icon name="close" />
        </button>
      ) : null}
    </div>
  )
}
