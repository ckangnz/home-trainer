import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { availableVoices, coach } from '@/player/coach'
import { WEIGHT_RANGE, updateSettings, useSettings } from '@/settings/settings'
import { SelectField } from '@/components/ui'
import { TrainerPicker } from '@/components/TrainerPicker'
import { Stepper } from '@/components/Stepper'
import { usePageMeta } from '@/app/meta'
import './history.css'

type ToggleField = 'voice' | 'beeps' | 'vibration' | 'keepAwake'

function Toggle({ label, hint, field }: { label: string; hint: string; field: ToggleField }) {
  const settings = useSettings()
  return (
    <label className="switch">
      <span className="stack stack--tight">
        <strong>{label}</strong>
        <span className="faint">{hint}</span>
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

export function SettingsPage() {
  usePageMeta('Settings')
  const { user, signOut, status } = useAuth()
  const settings = useSettings()
  const voices = useVoices()

  return (
    <div className="page page--narrow">
      <header className="page__header">
        <h1 className="page__title">Settings</h1>
      </header>

      <section className="card stack">
        <h2 className="section__title">Your trainer</h2>
        <TrainerPicker />
      </section>

      <section className="card stack">
        <h2 className="section__title">Calories</h2>
        <Stepper
          label="Body weight"
          hint="Used to estimate calories burned. Stays on this device."
          value={settings.weightKg}
          min={WEIGHT_RANGE[0]}
          max={WEIGHT_RANGE[1]}
          step={1}
          format={(value) => `${value} kg`}
          onChange={(weightKg) => updateSettings({ weightKg })}
        />
      </section>

      <section className="card stack">
        <h2 className="section__title">Coach</h2>
        <div className="settings-group">
          <Toggle field="voice" label="Voice coach" hint="Announces each exercise, rests, and the halfway point." />
          <Toggle field="beeps" label="Countdown beeps" hint="Beeps for the last three seconds and each new exercise." />
          <Toggle field="vibration" label="Vibration" hint="Buzzes with the beeps on supported phones." />
          <Toggle field="keepAwake" label="Keep screen on" hint="Stops your screen from sleeping during a workout." />
        </div>
        {voices.length > 0 ? (
          <SelectField
            label="Voice"
            value={settings.voiceName ?? ''}
            onChange={(event) => updateSettings({ voiceName: event.target.value || null })}
          >
            <option value="">System default</option>
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
                { kind: 'say', text: 'Push-ups, 30 seconds. You have got this!' },
              ])
            }}
          >
            Test sound
          </button>
        </div>
      </section>

      {status === 'signed-in' ? (
      <section className="card stack">
        <h2 className="section__title">Account</h2>
        <p className="muted">Signed in as {user?.email ?? user?.displayName ?? 'your Google account'}.</p>
        <div className="row row--wrap">
          <Link to="/app/friends" className="btn">
            Friends
          </Link>
          <button
            type="button"
            className="btn"
            onClick={() => {
              void signOut()
            }}
          >
            Sign out
          </button>
        </div>
      </section>
      ) : null}

      <section className="card stack">
        <h2 className="section__title">About</h2>
        <p className="muted">
          HomeTrainer is free and supported by ads shown on some rest screens. Exercise guidance is general information,
          not medical advice.
        </p>
        <div className="row row--wrap">
          <Link to="/privacy" className="section__link">
            Privacy policy
          </Link>
          <Link to="/terms" className="section__link">
            Terms of use
          </Link>
        </div>
      </section>
    </div>
  )
}
