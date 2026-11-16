import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/i18n/language'
import { startTrainerGreeting } from '@/player/trainerGreeting'
import { getExercise } from '@/exercises'
import { TRAINER_ORDER, TRAINERS, type SkinTone, type TrainerId } from '@/figure/look'
import { paletteFor } from '@/figure/svg'
import { useT } from '@/i18n/translate'
import { updateSettings, useSettings } from '@/settings/settings'
import './trainer-picker.css'
import { ExerciseFigure } from './ExerciseFigure'

const SKINS: SkinTone[] = ['light', 'medium', 'deep']

const PREVIEW_FPS = 24

export function TrainerPicker() {
  const t = useT()
  const settings = useSettings()
  const language = useLanguage()
  const stop = useRef<(() => void) | null>(null)
  const [voiceState, setVoiceState] = useState<'idle' | 'playing' | 'error'>('idle')
  const stopPreview = () => {
    stop.current?.()
    stop.current = null
  }
  useEffect(() => {
    setVoiceState('idle')
    return stopPreview
  }, [language])
  const greet = (id: TrainerId) => {
    stopPreview()
    setVoiceState('playing')
    stop.current = startTrainerGreeting(id, language,
      () => setVoiceState('idle'), () => setVoiceState('error'))
  }
  const preview = getExercise('jumping-jacks')
  const skinFor = (id: TrainerId): SkinTone => (id === settings.trainer ? settings.skin : TRAINERS[id].skin)
  return (
    <div className="trainer-picker">
      <p className="faint trainer-picker__voice-hint">{t('settings.trainerPicker.voiceHint')}</p>
      <div className="trainer-picker__options" role="radiogroup" aria-label={t('settings.trainerPicker.trainer')}>
        <button type="button" role="radio" aria-checked={settings.randomTrainer} data-trainer="random" className="trainer-option"
          onClick={() => { stopPreview(); setVoiceState('idle'); updateSettings({ randomTrainer: true }) }}>
          <span className="trainer-option__stage trainer-option__random" aria-hidden="true">?</span>
          <span className="trainer-option__name">{t('settings.trainerPicker.random')}</span>
          <span className="trainer-option__tagline faint">{t('settings.trainerPicker.randomHint')}</span>
        </button>
        {TRAINER_ORDER.map((id) => {
          const trainer = TRAINERS[id]
          const selected = !settings.randomTrainer && settings.trainer === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-trainer={id}
              className="trainer-option"
              onClick={() => {
                updateSettings(selected ? { trainer: id, randomTrainer: false } : { trainer: id, randomTrainer: false, skin: trainer.skin })
                greet(id)
              }}
            >
              <span className="trainer-option__stage stage">
                {preview ? <ExerciseFigure exerciseId={preview.id} look={{ trainer: id, skin: skinFor(id) }} playing fps={PREVIEW_FPS} label="" /> : null}
              </span>
              <span className="trainer-option__name">{trainer.name}</span>
              <span className="trainer-option__tagline faint">{t(`settings.trainerPicker.taglines.${id}`)}</span>
            </button>
          )
        })}
      </div>
      {!settings.randomTrainer ? <div className="trainer-picker__voice">
        <button type="button" className="btn btn--small" onClick={() => greet(settings.trainer)}>
          {t('settings.trainerPicker.hearGreeting', { trainer: TRAINERS[settings.trainer].name })}
        </button>
        {voiceState === 'playing' ? <button type="button" className="btn btn--ghost btn--small" onClick={() => { stopPreview(); setVoiceState('idle') }}>{t('settings.trainerPicker.stopGreeting')}</button> : null}
        <span role="status" aria-live="polite">
          {voiceState === 'playing' ? t('settings.trainerPicker.playingGreeting') : voiceState === 'error' ? t('settings.trainerPicker.greetingError') : ''}
        </span>
      </div>
      : null}
      <div className="trainer-picker__skins" role="radiogroup" aria-label={t('settings.trainerPicker.skinTone')}>
        {SKINS.map((skin) => (
          <button
            key={skin}
            type="button"
            role="radio"
            aria-checked={settings.skin === skin}
            aria-label={t('settings.trainerPicker.skinLabel', { skin: t(`settings.trainerPicker.skins.${skin}`) })}
            className="skin-swatch"
            style={{ background: paletteFor({ trainer: settings.trainer, skin }).skin }}
            onClick={() => updateSettings({ skin })}
          />
        ))}
      </div>
    </div>
  )
}
