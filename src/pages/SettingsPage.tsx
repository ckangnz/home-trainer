import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { useToast } from '@/app/Toast'
import { userPhoto } from '@/friends/models'
import { availableVoices, coach } from '@/player/coach'
import { LANGUAGE_PREFERENCES, WEIGHT_RANGE, updateSettings, useSettings, type LanguagePreference } from '@/settings/settings'
import type { MessageKey } from '@/i18n/en'
import { useT } from '@/i18n/translate'
import { SelectField } from '@/components/ui'
import { TrainerPicker } from '@/components/TrainerPicker'
import { Stepper } from '@/components/Stepper'
import { usePageMeta } from '@/app/meta'
import './history.css'

type ToggleField = 'voice' | 'beeps' | 'vibration' | 'keepAwake'

function Toggle({ label, hint, field }: { label: MessageKey; hint: MessageKey; field: ToggleField }) {
  const t = useT()
  const settings = useSettings()
  return (
    <label className="switch">
      <span className="stack stack--tight">
        <strong>{t(label)}</strong>
        <span className="faint">{t(hint)}</span>
      </span>
      <input type="checkbox" checked={settings[field]} onChange={(event) => updateSettings({ [field]: event.target.checked })} />
    </label>
  )
}

function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => availableVoices())
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return
    }
    const update = () => setVoices(availableVoices())
    window.speechSynthesis.addEventListener?.('voiceschanged', update)
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', update)
  }, [])
  return voices
}

const LANGUAGE_OPTION: Record<LanguagePreference, MessageKey> = {
  auto: 'settings.language.auto',
  en: 'settings.language.en',
  ko: 'settings.language.ko',
}

export function SettingsPage() {
  const t = useT()
  usePageMeta(t('settings.title'))
  const { user, signOut, status, refreshProfile, profileVersion, error } = useAuth()
  const photo = userPhoto(user)
  const [refreshing, setRefreshing] = useState(false)
  const { notify } = useToast()
  const settings = useSettings()
  const voices = useVoices()

  return (
    <div className="page page--narrow">
      <header className="page__header">
        <h1 className="page__title">{t('settings.title')}</h1>
      </header>

      <section className="card stack">
        <h2 className="section__title">{t('settings.language.title')}</h2>
        <SelectField
          label={t('settings.language.label')}
          value={settings.language}
          onChange={(event) => updateSettings({ language: event.target.value as LanguagePreference })}
        >
          {LANGUAGE_PREFERENCES.map((option) => (
            <option key={option} value={option} lang={option === 'auto' ? undefined : option}>
              {t(LANGUAGE_OPTION[option])}
            </option>
          ))}
        </SelectField>
        <p className="faint">{t('settings.language.hint')}</p>
      </section>

      <section className="card stack">
        <h2 className="section__title">{t('settings.trainer')}</h2>
        <TrainerPicker />
      </section>

      <section className="card stack">
        <h2 className="section__title">{t('settings.calories.title')}</h2>
        <Stepper
          label={t('settings.calories.weight')}
          hint={t('settings.calories.weightHint')}
          value={settings.weightKg}
          min={WEIGHT_RANGE[0]}
          max={WEIGHT_RANGE[1]}
          step={1}
          format={(value) => t('units.kg', { n: value })}
          onChange={(weightKg) => updateSettings({ weightKg })}
        />
      </section>

      <section className="card stack">
        <h2 className="section__title">{t('settings.coach.title')}</h2>
        <div className="settings-group">
          <Toggle field="voice" label="settings.coach.voice" hint="settings.coach.voiceHint" />
          <Toggle field="beeps" label="settings.coach.beeps" hint="settings.coach.beepsHint" />
          <Toggle field="vibration" label="settings.coach.vibration" hint="settings.coach.vibrationHint" />
          <Toggle field="keepAwake" label="settings.coach.keepAwake" hint="settings.coach.keepAwakeHint" />
        </div>
        {voices.length > 0 ? (
          <SelectField
            label={t('settings.coach.voiceSelect')}
            value={settings.voiceName ?? ''}
            onChange={(event) => updateSettings({ voiceName: event.target.value || null })}
          >
            <option value="">{t('settings.coach.systemVoice')}</option>
            {voices.map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.name}
              </option>
            ))}
          </SelectField>
        ) : null}
        <div>
          <button
            type="button"
            className="btn btn--small"
            onClick={() => {
              coach.unlock()
              coach.play([
                { kind: 'beep', tone: 'go' },
                { kind: 'say', text: t('settings.coach.testPhrase') },
              ])
            }}
          >
            {t('settings.coach.test')}
          </button>
        </div>
      </section>

      {status === 'signed-in' ? (
      <section className="card stack">
        <h2 className="section__title">{t('settings.account.title')}</h2>
        <div className="settings-account">
          <span className="avatar avatar--lg" aria-hidden="true">
            {photo ? (
              <img key={`${photo}-${profileVersion}`} src={photo} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="avatar__initial">{(user?.displayName ?? user?.email ?? '?').charAt(0).toUpperCase()}</span>
            )}
          </span>
          <p className="muted">{t('settings.account.signedInAs', { name: user?.email ?? user?.displayName ?? t('settings.account.googleAccount') })}</p>
        </div>
        <div className="row row--wrap">
          <Link to="/app/friends" className="btn">
            {t('settings.account.friends')}
          </Link>
          <button
            type="button"
            className="btn"
            disabled={refreshing}
            onClick={() => {
              setRefreshing(true)
              void refreshProfile()
                .then((result) => {
                  if (result !== 'failed') {
                    notify(t(`settings.account.photo.${result}`))
                  }
                })
                .finally(() => setRefreshing(false))
            }}
          >
            {refreshing ? t('settings.account.refreshing') : t('settings.account.refreshPhoto')}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              void signOut()
            }}
          >
            {t('common.signOut')}
          </button>
        </div>
        {error ? (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
      ) : null}

      <section className="card stack">
        <h2 className="section__title">{t('settings.about.title')}</h2>
        <p className="muted">{t('settings.about.body')}</p>
        <div className="row row--wrap">
          <Link to="/privacy" className="section__link">
            {t('settings.about.privacy')}
          </Link>
          <Link to="/terms" className="section__link">
            {t('settings.about.terms')}
          </Link>
        </div>
      </section>
    </div>
  )
}
