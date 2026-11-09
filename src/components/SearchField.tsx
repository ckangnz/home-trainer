import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/app/Icons'
import { useT } from '@/i18n'
import './search-field.css'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
}

export function SearchField({ value, onChange, label, placeholder }: SearchFieldProps) {
  const input = useRef<HTMLInputElement>(null)
  const t = useT()
  const [draft, setDraft] = useState(value)
  const emitted = useRef<string[]>([])
  const composing = useRef(false)

  useEffect(() => {
    if (composing.current) {
      return
    }
    const index = emitted.current.indexOf(value)
    if (index >= 0) {
      emitted.current = emitted.current.slice(index + 1)
      return
    }
    setDraft(value)
  }, [value])

  const commit = (next: string) => {
    setDraft(next)
    emitted.current.push(next)
    onChange(next)
  }

  return (
    <div className="search" role="search">
      <Icon name="search" className="icon search__icon" />
      <input
        ref={input}
        type="search"
        className="ui-control"
        aria-label={label}
        placeholder={placeholder}
        value={draft}
        enterKeyHint="search"
        autoComplete="off"
        onChange={(event) => commit(event.target.value)}
        onCompositionStart={() => {
          composing.current = true
        }}
        onCompositionEnd={(event) => {
          composing.current = false
          commit(event.currentTarget.value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            input.current?.blur()
          }
        }}
      />
      {draft ? (
        <button
          type="button"
          className="search__clear"
          aria-label={t('app.components.search.clear')}
          onClick={() => {
            commit('')
            input.current?.focus()
          }}
        >
          <Icon name="close" />
        </button>
      ) : null}
    </div>
  )
}
