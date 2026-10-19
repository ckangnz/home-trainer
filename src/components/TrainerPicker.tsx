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
  const preview = getExercise('jumping-jacks')
  const skinFor = (id: TrainerId): SkinTone => (id === settings.trainer ? settings.skin : TRAINERS[id].skin)
  return (
    <div className="trainer-picker">
      <div className="trainer-picker__options" role="radiogroup" aria-label={t('settings.trainerPicker.trainer')}>
        {TRAINER_ORDER.map((id) => {
          const trainer = TRAINERS[id]
          const selected = settings.trainer === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-trainer={id}
              className="trainer-option"
              onClick={() => updateSettings(selected ? { trainer: id } : { trainer: id, skin: trainer.skin })}
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
