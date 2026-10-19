import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useData } from '@/data/DataProvider'
import { getExercise } from '@/exercises'
import { formatSeconds, formatTarget } from '@/exercises/labels'
import type { Exercise, Target } from '@/exercises/types'
import { Figure } from '@/figure/Figure'
import { getCuratedWorkout } from '@/workouts/curated'
import { blankRoutine, DEFAULT_ROUTINE_DEFAULTS, effectiveTarget, LIMITS, moveItem, newId, withFreshIds } from '@/workouts/routine'
import { estimateDurationMs, formatDuration } from '@/workouts/steps'
import type { RoutineBody, RoutineDefaults, RoutineItem, RoutineSource } from '@/workouts/types'
import { ExercisePicker } from '@/components/ExercisePicker'
import { ExerciseInfoDialog } from '@/components/ExerciseInfoDialog'
import { clearDraft, draftKey, loadDraft, saveDraft } from '@/workouts/drafts'
import { Field, TextField } from '@/components/ui'
import { Stepper } from '@/components/Stepper'
import { useToast } from '@/app/Toast'
import { usePageMeta } from '@/app/meta'
import { Icon } from '@/app/Icons'
import './editor.css'

type TargetMode = 'default' | 'time' | 'reps'

function targetMode(item: RoutineItem): TargetMode {
  return item.target ? item.target.kind : 'default'
}

function defaultRepsFor(exercise: Exercise): number {
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
  onInfo: (exercise: Exercise) => void
}) {
  const exercise = getExercise(item.exerciseId)
  if (!exercise) {
    return (
      <li className="editor-item card">
        <div className="editor-item__row">
          <span className="muted">Unavailable exercise ({item.exerciseId})</span>
          <button type="button" className="btn btn--small btn--danger" onClick={onRemove}>
            Remove
          </button>
        </div>
      </li>
    )
  }
  const mode = targetMode(item)
  const sets = item.sets ?? 1
  const summary = [
    formatTarget(effectiveTarget(item, defaults), exercise.sided),
    sets > 1 ? `${sets} sets` : null,
    item.restAfterSec !== undefined ? `rest ${formatSeconds(item.restAfterSec)}` : null,
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
          <Figure animation={exercise.animation} playing={expanded} label="" />
        </span>
        <button type="button" className="editor-item__title" onClick={onToggle} aria-expanded={expanded}>
          <span className="editor-item__name">{exercise.name}</span>
          <span className="faint">{summary}</span>
        </button>
        <div className="editor-item__order">
          <button type="button" className="btn btn--ghost btn--icon" aria-label="Move up" disabled={index === 0} onClick={() => onMove(index - 1)}>
            <Icon name="up" />
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            aria-label="Move down"
            disabled={index === count - 1}
            onClick={() => onMove(index + 1)}
          >
            <Icon name="down" />
          </button>
        </div>
      </div>
      {expanded ? (
        <div className="editor-item__panel">
          <div className="stack">
            <span className="ui-field__label">Target</span>
            <div className="segmented" role="group" aria-label="Target type">
              <button type="button" aria-pressed={mode === 'default'} onClick={() => setTarget(undefined)}>
                Default ({formatSeconds(defaults.workSec)})
              </button>
              <button
                type="button"
                aria-pressed={mode === 'time'}
                onClick={() => setTarget({ kind: 'time', seconds: item.target?.kind === 'time' ? item.target.seconds : defaults.workSec })}
              >
                Time
              </button>
              <button
                type="button"
                aria-pressed={mode === 'reps'}
                onClick={() => setTarget({ kind: 'reps', reps: item.target?.kind === 'reps' ? item.target.reps : defaultRepsFor(exercise) })}
              >
                Reps
              </button>
            </div>
          </div>
          {item.target?.kind === 'time' ? (
            <Stepper
              label={exercise.sided === 'perSide' ? 'Time per side' : 'Time'}
              value={item.target.seconds}
              min={LIMITS.targetSec[0]}
              max={LIMITS.targetSec[1]}
              step={5}
              format={formatSeconds}
              onChange={(seconds) => setTarget({ kind: 'time', seconds })}
            />
          ) : null}
          {item.target?.kind === 'reps' ? (
            <Stepper
              label={exercise.sided === 'perSide' ? 'Reps per side' : 'Reps'}
              value={item.target.reps}
              min={LIMITS.reps[0]}
              max={LIMITS.reps[1]}
              step={1}
              onChange={(reps) => setTarget({ kind: 'reps', reps })}
            />
          ) : null}
          <Stepper
            label="Sets"
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
              label="Rest between sets"
              value={item.setRestSec ?? defaults.restSec}
              min={0}
              max={LIMITS.restSec[1]}
              step={5}
              format={formatSeconds}
              onChange={(setRestSec) => onChange({ ...item, setRestSec })}
            />
          ) : null}
          {index < count - 1 ? (
            <Stepper
              label="Rest after"
              hint={item.restAfterSec === undefined ? 'Using the routine default' : undefined}
              value={item.restAfterSec ?? defaults.restSec}
              min={0}
              max={LIMITS.restSec[1]}
              step={5}
              format={formatSeconds}
              onChange={(restAfterSec) => onChange({ ...item, restAfterSec })}
            />
          ) : null}
          <div className="row row--between">
            <button type="button" className="btn btn--small btn--ghost" onClick={() => onInfo(exercise)}>
              <Icon name="info" />
              How to do it
            </button>
            <button type="button" className="btn btn--small btn--danger" onClick={onRemove}>
              <Icon name="trash" />
              Remove
            </button>
          </div>
        </div>
      ) : null}
    </li>
  )
}

function seedFrom(workoutId: string | null): { body: RoutineBody; source?: RoutineSource } {
  const workout = workoutId ? getCuratedWorkout(workoutId) : undefined
  if (!workout) {
    return { body: blankRoutine() }
  }
  const copy = withFreshIds(workout)
  return {
    body: { name: `${workout.name} (my version)`, description: workout.description, defaults: copy.defaults, items: copy.items },
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
  const [storageKey] = useState(() => draftKey(id, params.get('from')))
  const [restored] = useState(() => loadDraft(storageKey))
  const [seed] = useState(() => (isNew ? seedFrom(params.get('from')) : null))
  const [draft, setDraft] = useState<RoutineBody | null>(() => restored ?? seed?.body ?? null)
  const [dirty, setDirty] = useState(restored !== null)
  const [info, setInfo] = useState<Exercise | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  usePageMeta(isNew ? 'New routine' : 'Edit routine')

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
      <div className="center" role="status" aria-label="Loading routine">
        <div className="spinner" />
      </div>
    )
  }
  if (!isNew && !routine) {
    return (
      <div className="page page--narrow">
        <div className="empty">
          <p>This routine no longer exists.</p>
          <Link to="/app" className="btn">
            Back home
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
    const body = { ...draft, name: draft.name.trim() || 'My routine' }
    if (routine) {
      updateRoutine(routine, body)
    } else {
      createRoutine(body, seed?.source)
    }
    clearDraft(storageKey)
    setDirty(false)
    notify('Routine saved')
    navigate('/app')
  }

  const cancel = () => {
    if (!dirty || window.confirm('Discard your changes?')) {
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
          Cancel
        </button>
        <button type="button" className="btn btn--primary" onClick={save}>
          <Icon name="check" />
          Save
        </button>
      </header>

      <section className="stack">
        <TextField
          label="Routine name"
          className="editor__name"
          value={draft.name}
          maxLength={LIMITS.name}
          onChange={(event) => edit({ ...draft, name: event.target.value })}
          placeholder="Morning burner"
        />
        <Field label="Description (optional)">
          <textarea
            className="ui-control"
            value={draft.description ?? ''}
            maxLength={LIMITS.description}
            onChange={(event) => edit({ ...draft, description: event.target.value })}
            placeholder="What is this routine for?"
          />
        </Field>
      </section>

      <div className="editor__summary card">
        <div>
          <span className="faint">Total</span>
          <strong className="tabular">{formatDuration(duration)}</strong>
        </div>
        <div>
          <span className="faint">Moves</span>
          <strong className="tabular">{draft.items.length}</strong>
        </div>
        <div>
          <span className="faint">Rounds</span>
          <strong className="tabular">{defaults.rounds}</strong>
        </div>
      </div>

      <section className="card stack">
        <h2 className="section__title">Timing</h2>
        <p className="faint">These apply to every exercise unless you change it below.</p>
        <Stepper
          label="Work time"
          hint="For exercises without their own target"
          value={defaults.workSec}
          min={LIMITS.workSec[0]}
          max={LIMITS.workSec[1]}
          step={5}
          format={formatSeconds}
          onChange={(workSec) => setDefaults({ workSec })}
        />
        <Stepper
          label="Rest between exercises"
          value={defaults.restSec}
          min={0}
          max={LIMITS.restSec[1]}
          step={5}
          format={formatSeconds}
          onChange={(restSec) => setDefaults({ restSec })}
        />
        <Stepper label="Rounds" value={defaults.rounds} min={1} max={LIMITS.rounds[1]} step={1} onChange={(rounds) => setDefaults({ rounds })} />
        <Stepper
          label="Rest between rounds"
          value={defaults.roundRestSec}
          min={0}
          max={LIMITS.roundRestSec[1]}
          step={15}
          format={formatSeconds}
          disabled={defaults.rounds === 1}
          onChange={(roundRestSec) => setDefaults({ roundRestSec })}
        />
        <Stepper
          label="Get ready countdown"
          value={defaults.getReadySec}
          min={0}
          max={LIMITS.getReadySec[1]}
          step={5}
          format={formatSeconds}
          onChange={(getReadySec) => setDefaults({ getReadySec })}
        />
        <Stepper
          label="Switch sides pause"
          hint="For one-sided exercises"
          value={defaults.switchSec}
          min={0}
          max={LIMITS.switchSec[1]}
          step={1}
          format={formatSeconds}
          onChange={(switchSec) => setDefaults({ switchSec })}
        />
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Exercises</h2>
          <button type="button" className="btn btn--small btn--primary" onClick={() => setPicking(true)}>
            <Icon name="plus" />
            Add
          </button>
        </div>
        {draft.items.length === 0 ? (
          <div className="empty">
            <p>Add exercises from the library to build your routine.</p>
            <button type="button" className="btn btn--primary" onClick={() => setPicking(true)}>
              <Icon name="plus" />
              Add exercises
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
            Add more exercises
          </button>
        ) : null}
      </section>

      {routine ? (
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => {
            if (window.confirm(`Delete "${routine.name}"? This cannot be undone.`)) {
              clearDraft(storageKey)
              setDirty(false)
              removeRoutine(routine.id)
              navigate('/app')
            }
          }}
        >
          <Icon name="trash" />
          Delete routine
        </button>
      ) : null}

      <ExerciseInfoDialog exercise={info} onClose={() => setInfo(null)} />

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(exercise) => {
          if (draft.items.length >= LIMITS.items) {
            return
          }
          setDraft((current) => (current ? { ...current, items: [...current.items, { id: newId(), exerciseId: exercise.id }] } : current))
          setDirty(true)
        }}
      />
    </div>
  )
}
