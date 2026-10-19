import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { TextField } from '@/components/ui'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { useT, type MessageKey } from '@/i18n'
import { parseCode, sharePath } from './code'

export function ImportPage() {
  const t = useT()
  usePageMeta(t('social.importPage.title'))
  const [params] = useSearchParams()
  const [value, setValue] = useState(params.get('code') ?? '')
  const [error, setError] = useState<MessageKey | null>(null)
  const navigate = useNavigate()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const code = parseCode(value)
    if (code === null) {
      setError('social.importPage.invalid')
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
      setError('social.importPage.pasteBlocked')
    }
  }

  return (
    <div className="page page--narrow">
      <header className="page__header">
        <h1 className="page__title">{t('social.importPage.title')}</h1>
        <p className="page__lead">{t('social.importPage.lead')}</p>
      </header>
      <form className="card stack" onSubmit={submit}>
        <TextField
          label={t('social.importPage.field')}
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
            {t(error)}
          </p>
        ) : null}
        <div className="row row--wrap">
          <button type="submit" className="btn btn--primary">
            <Icon name="forward" />
            {t('social.importPage.preview')}
          </button>
          {typeof navigator !== 'undefined' && navigator.clipboard && 'readText' in navigator.clipboard ? (
            <button type="button" className="btn" onClick={() => void paste()}>
              <Icon name="copy" />
              {t('social.importPage.paste')}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  )
}
