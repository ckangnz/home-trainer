import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useData } from '@/data/DataProvider'
import { getExercise } from '@/exercises'
import type { ExerciseInfo, Target } from '@/exercises/types'
import { getCuratedWorkout } from '@/workouts/curated'
import { blankRoutine, DEFAULT_ROUTINE_DEFAULTS, effectiveTarget, LIMITS, moveItem, newId, withFreshIds } from '@/workouts/routine'
import { estimateDurationMs } from '@/workouts/steps'
import type { RoutineBody, RoutineDefaults, RoutineItem, RoutineSource } from '@/workouts/types'
import { ExercisePicker } from '@/components/ExercisePicker'
import { ExerciseInfoDialog } from '@/components/ExerciseInfoDialog'
import { VariationPicker } from '@/components/VariationPicker'
import { clearDraft, draftKey, loadDraft, saveDraft } from '@/workouts/drafts'
import { Field, TextField } from '@/components/ui'
import { Stepper } from '@/components/Stepper'
import { useToast } from '@/app/Toast'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import { ExerciseFigure } from '@/components/ExerciseFigure'
import { RoutineMuscles } from '@/components/RoutineMuscles'
import { useContent, useFormat, useT, type Localizer, type TFunction } from '@/i18n'
import './editor.css'

type TargetMode = 'default' | 'time' | 'reps'

function targetMode(item: RoutineItem): TargetMode {
  return item.target ? item.target.kind : 'default'
}

function defaultRepsFor(exercise: ExerciseInfo): number {
  return exercise.defaultTarget.kind === 'reps' ? exercise.defaultTarget.reps : 12
}

function ItemEditor({
  item,
  index,
  count,
  defaults,
  expanded,
  onToggle,
  onChange,
  onMove,
  onRemove,
  onInfo,
}: {
  item: RoutineItem
  index: number
  count: number
  defaults: RoutineDefaults
  expanded: boolean
  onToggle: () => void
  onChange: (item: RoutineItem) => void
  onMove: (to: number) => void
  onRemove: () => void
  onInfo: (exercise: ExerciseInfo) => void
}) {
  const exercise = getExercise(item.exerciseId)
  const t = useT()
  const fmt = useFormat()
  const content = useContent()
  if (!exercise) {
    return (
      <li className="editor-item card">
        <div className="editor-item__row">
          <span className="muted">{t('app.editor.unavailable', { id: item.exerciseId })}</span>
          <button type="button" className="btn btn--small btn--danger" onClick={onRemove}>
            {t('common.remove')}
          </button>
        </div>
      </li>
    )
  }
  const mode = targetMode(item)
  const sets = item.sets ?? 1
  const summary = [
    fmt.target(effectiveTarget(item, defaults), exercise.sided),
    sets > 1 ? t('app.editor.sets', { count: sets }) : null,
    item.restAfterSec !== undefined ? t('app.editor.restAfter', { time: fmt.seconds(item.restAfterSec) }) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const setTarget = (target: Target | undefined) => {
    const next: RoutineItem = { ...item }
    if (target) {
      next.target = target
    } else {
      delete next.target
    }
    onChange(next)
  }

  return (
    <li className="editor-item card">
      <div className="editor-item__row">
        <span className="editor-item__index tabular">{index + 1}</span>
        <span className="editor-item__thumb stage">
          <ExerciseFigure exerciseId={exercise.id} lazy playing={expanded} label="" />
        </span>
        <button type="button" className="editor-item__title" onClick={onToggle} aria-expanded={expanded}>
          <span className="editor-item__name">{content.exerciseName(exercise)}</span>
          <span className="faint">{summary}</span>
        </button>
        <div className="editor-item__order">
          <button type="button" className="btn btn--ghost btn--icon" aria-label={t('app.editor.moveUp')} disabled={index === 0} onClick={() => onMove(index - 1)}>
            <Icon name="up" />
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            aria-label={t('app.editor.moveDown')}
            disabled={index === count - 1}
            onClick={() => onMove(index + 1)}
          >
            <Icon name="down" />
          </button>
        </div>
      </div>
      {expanded ? (
        <div className="editor-item__panel">
          <VariationPicker exercise={exercise} onPick={(next) => onChange({ ...item, exerciseId: next.id })} />
          <div className="stack">
            <span className="ui-field__label">{t('app.editor.target')}</span>
            <div className="segmented" role="group" aria-label={t('app.editor.targetType')}>
              <button type="button" aria-pressed={mode === 'default'} onClick={() => setTarget(undefined)}>
                {t('app.editor.defaultTime', { time: fmt.seconds(defaults.workSec) })}
              </button>
              <button
                type="button"
                aria-pressed={mode === 'time'}
                onClick={() => setTarget({ kind: 'time', seconds: item.target?.kind === 'time' ? item.target.seconds : defaults.workSec })}
              >
                {t('app.editor.time')}
              </button>
              <button
                type="button"
                aria-pressed={mode === 'reps'}
                onClick={() => setTarget({ kind: 'reps', reps: item.target?.kind === 'reps' ? item.target.reps : defaultRepsFor(exercise) })}
              >
                {t('app.editor.reps')}
              </button>
            </div>
          </div>
          {item.target?.kind === 'time' ? (
            <Stepper
              label={exercise.sided === 'perSide' ? t('app.editor.timePerSide') : t('app.editor.time')}
              value={item.target.seconds}
              min={LIMITS.targetSec[0]}
              max={LIMITS.targetSec[1]}
              step={5}
              format={fmt.seconds}
              onChange={(seconds) => setTarget({ kind: 'time', seconds })}
            />
          ) : null}
          {item.target?.kind === 'reps' ? (
            <Stepper
              label={exercise.sided === 'perSide' ? t('app.editor.repsPerSide') : t('app.editor.reps')}
              value={item.target.reps}
              min={LIMITS.reps[0]}
              max={LIMITS.reps[1]}
              step={1}
              onChange={(reps) => setTarget({ kind: 'reps', reps })}
            />
          ) : null}
          <Stepper
            label={t('app.editor.setsLabel')}
            value={sets}
            min={1}
            max={LIMITS.sets[1]}
            step={1}
            onChange={(value) => {
              const next: RoutineItem = { ...item }
              if (value > 1) {
                next.sets = value
              } else {
                delete next.sets
                delete next.setRestSec
              }
              onChange(next)
            }}
          />
          {sets > 1 ? (
            <Stepper
              label={t('app.editor.restBetweenSets')}
              value={item.setRestSec ?? defaults.restSec}
              min={0}
              max={LIMITS.restSec[1]}
              step={5}
              format={fmt.seconds}
              onChange={(setRestSec) => onChange({ ...item, setRestSec })}
            />
          ) : null}
          {index < count - 1 ? (
            <div className="stack stack--tight">
              <Stepper
                label={t('app.editor.restAfterExercise')}
                hint={
                  item.restAfterSec === undefined
                    ? t('app.editor.restDefault', { time: fmt.seconds(defaults.restSec) })
                    : t('app.editor.restCustom', { time: fmt.seconds(defaults.restSec) })
                }
                value={item.restAfterSec ?? defaults.restSec}
                min={0}
                max={LIMITS.restSec[1]}
                step={5}
                format={fmt.seconds}
                onChange={(restAfterSec) => onChange({ ...item, restAfterSec })}
              />
              {item.restAfterSec !== undefined ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--small editor-item__reset"
                  onClick={() => {
                    const next: RoutineItem = { ...item }
                    delete next.restAfterSec
                    onChange(next)
                  }}
                >
                  <Icon name="repeat" />
                  {t('app.editor.useDefaultRest')}
                </button>
              ) : null}
            </div>
          ) : (
            <p className="faint">{defaults.rounds > 1 ? t('app.editor.lastExerciseRounds') : t('app.editor.lastExercise')}</p>
          )}
          <div className="row row--between">
            <button type="button" className="btn btn--small btn--ghost" onClick={() => onInfo(exercise)}>
              <Icon name="info" />
              {t('app.editor.howTo')}
            </button>
            <button type="button" className="btn btn--small btn--danger" onClick={onRemove}>
              <Icon name="trash" />
              {t('common.remove')}
            </button>
          </div>
        </div>
      ) : null}
    </li>
  )
}

function seedFrom(workoutId: string | null, t: TFunction, content: Localizer): { body: RoutineBody; source?: RoutineSource } {
  const workout = workoutId ? getCuratedWorkout(workoutId) : undefined
  if (!workout) {
    return { body: blankRoutine() }
  }
  const copy = withFreshIds(workout)
  return {
    body: {
      name: t('app.editor.myVersion', { name: content.workoutName(workout) }),
      description: content.workoutDescription(workout),
      defaults: copy.defaults,
      items: copy.items,
    },
    source: { kind: 'curated', id: workout.id },
  }
}

export function RoutineEditorPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const isNew = id === undefined
  const { ready, getRoutine, createRoutine, updateRoutine, removeRoutine } = useData()
  const routine = id ? getRoutine(id) : undefined
  const navigate = useNavigate()
  const { notify } = useToast()
  const t = useT()
  const fmt = useFormat()
  const content = useContent()
  const [storageKey] = useState(() => draftKey(id, params.get('from')))
  const [restored] = useState(() => loadDraft(storageKey))
  const [seed] = useState(() => (isNew ? seedFrom(params.get('from'), t, content) : null))
  const [draft, setDraft] = useState<RoutineBody | null>(() => restored ?? seed?.body ?? null)
  const [dirty, setDirty] = useState(restored !== null)
  const [info, setInfo] = useState<ExerciseInfo | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  usePageMeta(isNew ? t('app.editor.metaNew') : t('app.editor.metaEdit'))

  useEffect(() => {
    if (!isNew && draft === null && routine) {
      setDraft({ name: routine.name, description: routine.description, defaults: routine.defaults, items: routine.items })
    }
  }, [isNew, draft, routine])

  useEffect(() => {
    if (dirty && draft) {
      saveDraft(storageKey, draft)
    }
  }, [dirty, draft, storageKey])

  useEffect(() => {
    if (!dirty) {
      return
    }
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const duration = useMemo(() => (draft ? estimateDurationMs(draft, getExercise) : 0), [draft])

  if (!isNew && !ready) {
    return (
      <div className="center" role="status" aria-label={t('app.editor.loading')}>
        <div className="spinner" />
      </div>
    )
  }
  if (!isNew && !routine) {
    return (
      <div className="page page--narrow">
        <div className="empty">
          <p>{t('app.editor.missing')}</p>
          <Link to="/app" className="btn">
            {t('app.editor.backHome')}
          </Link>
        </div>
      </div>
    )
  }
  if (!draft) {
    return null
  }

  const edit = (next: RoutineBody) => {
    setDraft(next)
    setDirty(true)
  }
  const setDefaults = (patch: Partial<RoutineDefaults>) => edit({ ...draft, defaults: { ...DEFAULT_ROUTINE_DEFAULTS, ...draft.defaults, ...patch } })
  const defaults = { ...DEFAULT_ROUTINE_DEFAULTS, ...draft.defaults }

  const save = () => {
    const body = { ...draft, name: draft.name.trim() || t('app.editor.defaultName') }
    if (routine) {
      updateRoutine(routine, body)
    } else {
      createRoutine(body, seed?.source)
    }
    clearDraft(storageKey)
    setDirty(false)
    notify(t('app.editor.saved'))
    navigate('/app')
  }

  const cancel = () => {
    if (!dirty || window.confirm(t('app.editor.confirmDiscard'))) {
      clearDraft(storageKey)
      setDirty(false)
      navigate('/app')
    }
  }

  return (
    <div className="page page--narrow editor">
      <header className="row row--between">
        <button type="button" className="btn btn--ghost" onClick={cancel}>
          <Icon name="back" />
          {t('common.cancel')}
        </button>
        <button type="button" className="btn btn--primary" onClick={save}>
          <Icon name="check" />
          {t('common.save')}
        </button>
      </header>

      <section className="stack">
        <TextField
          label={t('app.editor.name')}
          className="editor__name"
          value={draft.name}
          maxLength={LIMITS.name}
          onChange={(event) => edit({ ...draft, name: event.target.value })}
          placeholder={t('app.editor.namePlaceholder')}
        />
        <Field label={t('app.editor.description')}>
          <textarea
            className="ui-control"
            value={draft.description ?? ''}
            maxLength={LIMITS.description}
            onChange={(event) => edit({ ...draft, description: event.target.value })}
            placeholder={t('app.editor.descriptionPlaceholder')}
          />
        </Field>
      </section>

      <div className="editor__summary card">
        <div>
          <span className="faint">{t('app.editor.total')}</span>
          <strong className="tabular">{fmt.duration(duration)}</strong>
        </div>
        <div>
          <span className="faint">{t('app.editor.moves')}</span>
          <strong className="tabular">{draft.items.length}</strong>
        </div>
        <div>
          <span className="faint">{t('app.editor.rounds')}</span>
          <strong className="tabular">{defaults.rounds}</strong>
        </div>
      </div>

      <section className="card stack">
        <h2 className="section__title">{t('app.editor.defaultsTitle')}</h2>
        <p className="faint">{t('app.editor.defaultsIntro')}</p>
        <Stepper
          label={t('app.editor.workTime')}
          hint={t('app.editor.workTimeHint')}
          value={defaults.workSec}
          min={LIMITS.workSec[0]}
          max={LIMITS.workSec[1]}
          step={5}
          format={fmt.seconds}
          onChange={(workSec) => setDefaults({ workSec })}
        />
        <Stepper
          label={t('app.editor.restSec')}
          hint={t('app.editor.restSecHint')}
          value={defaults.restSec}
          min={0}
          max={LIMITS.restSec[1]}
          step={5}
          format={fmt.seconds}
          onChange={(restSec) => setDefaults({ restSec })}
        />
        <Stepper
          label={t('app.editor.rounds')}
          hint={t('app.editor.roundsHint')}
          value={defaults.rounds}
          min={1}
          max={LIMITS.rounds[1]}
          step={1}
          onChange={(rounds) => setDefaults({ rounds })}
        />
        <Stepper
          label={t('app.editor.roundRest')}
          hint={defaults.rounds === 1 ? t('app.editor.roundRestSingle') : t('app.editor.roundRestHint')}
          value={defaults.roundRestSec}
          min={0}
          max={LIMITS.roundRestSec[1]}
          step={15}
          format={fmt.seconds}
          disabled={defaults.rounds === 1}
          onChange={(roundRestSec) => setDefaults({ roundRestSec })}
        />
        <Stepper
          label={t('app.editor.getReady')}
          value={defaults.getReadySec}
          min={0}
          max={LIMITS.getReadySec[1]}
          step={5}
          format={fmt.seconds}
          onChange={(getReadySec) => setDefaults({ getReadySec })}
        />
        <Stepper
          label={t('app.editor.switchSides')}
          hint={t('app.editor.switchSidesHint')}
          value={defaults.switchSec}
          min={0}
          max={LIMITS.switchSec[1]}
          step={1}
          format={fmt.seconds}
          onChange={(switchSec) => setDefaults({ switchSec })}
        />
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">{t('app.editor.exercises')}</h2>
          <button type="button" className="btn btn--small btn--primary" onClick={() => setPicking(true)}>
            <Icon name="plus" />
            {t('app.editor.add')}
          </button>
        </div>
        {draft.items.length === 0 ? (
          <div className="empty">
            <p>{t('app.editor.empty')}</p>
            <button type="button" className="btn btn--primary" onClick={() => setPicking(true)}>
              <Icon name="plus" />
              {t('app.editor.addExercises')}
            </button>
          </div>
        ) : (
          <ol className="list">
            {draft.items.map((item, index) => (
              <ItemEditor
                key={item.id}
                item={item}
                index={index}
                count={draft.items.length}
                defaults={defaults}
                expanded={expanded === item.id}
                onToggle={() => setExpanded(expanded === item.id ? null : item.id)}
                onChange={(next) => edit({ ...draft, items: draft.items.map((entry) => (entry.id === item.id ? next : entry)) })}
                onMove={(to) => edit({ ...draft, items: moveItem(draft.items, index, to) })}
                onRemove={() => edit({ ...draft, items: draft.items.filter((entry) => entry.id !== item.id) })}
                onInfo={setInfo}
              />
            ))}
          </ol>
        )}
        {draft.items.length > 0 && draft.items.length < LIMITS.items ? (
          <button type="button" className="btn btn--block" onClick={() => setPicking(true)}>
            <Icon name="plus" />
            {t('app.editor.addMore')}
          </button>
        ) : null}
      </section>

      <RoutineMuscles body={draft} title={t('app.editor.muscles')} />

      {routine ? (
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => {
            if (window.confirm(t('app.home.confirmDelete', { name: routine.name }))) {
              clearDraft(storageKey)
              setDirty(false)
              removeRoutine(routine.id)
              navigate('/app')
            }
          }}
        >
          <Icon name="trash" />
          {t('app.editor.deleteRoutine')}
        </button>
      ) : null}

      <ExerciseInfoDialog exercise={info} onClose={() => setInfo(null)} />

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        limit={Math.max(0, LIMITS.items - draft.items.length)}
        onAdd={(exercises) => {
          setDraft((current) =>
            current
              ? {
                  ...current,
                  items: [...current.items, ...exercises.map((exercise) => ({ id: newId(), exerciseId: exercise.id }))].slice(0, LIMITS.items),
                }
              : current,
          )
          setDirty(true)
        }}
      />
    </div>
  )
}
