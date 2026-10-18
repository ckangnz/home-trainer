import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { TextField } from '@/components/ui'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { parseCode, sharePath } from './code'

export function ImportPage() {
  usePageMeta('Import a routine')
  const [params] = useSearchParams()
  const [value, setValue] = useState(params.get('code') ?? '')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const code = parseCode(value)
    if (code === null) {
      setError('Enter the 8-character code, like HT-7KQ2-M9XP, or paste the full link.')
      return
    }
    navigate(sharePath(code))
  }

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setValue(text.trim())
      setError(null)
    } catch {
      setError('Your browser did not allow pasting. Long-press the field and paste instead.')
    }
  }

  return (
    <div className="page page--narrow">
      <header className="page__header">
        <h1 className="page__title">Import a routine</h1>
        <p className="page__lead">Got a code from a friend? Paste it here to preview the routine and add your own copy.</p>
      </header>
      <form className="card stack" onSubmit={submit}>
        <TextField
          label="Share code or link"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setError(null)
          }}
          placeholder="HT-7KQ2-M9XP"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
        />
        {error ? (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="row row--wrap">
          <button type="submit" className="btn btn--primary">
            <Icon name="forward" />
            Preview routine
          </button>
          {typeof navigator !== 'undefined' && navigator.clipboard && 'readText' in navigator.clipboard ? (
            <button type="button" className="btn" onClick={() => void paste()}>
              <Icon name="copy" />
              Paste
            </button>
          ) : null}
        </div>
      </form>
    </div>
  )
}
