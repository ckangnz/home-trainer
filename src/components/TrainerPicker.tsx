import { getExercise } from '@/exercises'
import { Figure } from '@/figure/Figure'
import { TRAINERS, type SkinTone, type TrainerId } from '@/figure/look'
import { paletteFor } from '@/figure/svg'
import { updateSettings, useSettings } from '@/settings/settings'
import './trainer-picker.css'

const SKINS: { id: SkinTone; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'medium', label: 'Medium' },
  { id: 'deep', label: 'Deep' },
]

const TAGLINES: Record<TrainerId, string> = {
  female: 'Upbeat and encouraging',
  male: 'Calm and focused',
}

export function TrainerPicker() {
  const settings = useSettings()
  const preview = getExercise('jumping-jacks')
  return (
    <div className="trainer-picker">
      <div className="trainer-picker__options" role="radiogroup" aria-label="Trainer">
        {(Object.keys(TRAINERS) as TrainerId[]).map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={settings.trainer === id}
            className="trainer-option"
            onClick={() => updateSettings({ trainer: id })}
          >
            <span className="trainer-option__stage stage">
              {preview ? <Figure animation={preview.animation} look={{ trainer: id, skin: settings.skin }} playing={false} label="" /> : null}
            </span>
            <span className="trainer-option__name">{TRAINERS[id].name}</span>
            <span className="faint">{TAGLINES[id]}</span>
          </button>
        ))}
      </div>
      <div className="trainer-picker__skins" role="radiogroup" aria-label="Skin tone">
        {SKINS.map((skin) => (
          <button
            key={skin.id}
            type="button"
            role="radio"
            aria-checked={settings.skin === skin.id}
            aria-label={`${skin.label} skin tone`}
            className="skin-swatch"
            style={{ background: paletteFor({ trainer: settings.trainer, skin: skin.id }).skin }}
            onClick={() => updateSettings({ skin: skin.id })}
          />
        ))}
      </div>
    </div>
  )
}
