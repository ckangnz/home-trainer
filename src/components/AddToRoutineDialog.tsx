import { useNavigate } from 'react-router-dom'
import { useData } from '@/data/DataProvider'
import { useToast } from '@/app/Toast'
import { blankRoutine, newId } from '@/workouts/routine'
import type { ExerciseInfo } from '@/exercises/types'
import { Dialog } from './Dialog'
import { Icon } from '@/app/Icons'
import { useContent, useT } from '@/i18n'

interface AddToRoutineDialogProps {
  exercise: ExerciseInfo
  open: boolean
  onClose: () => void
}

export function AddToRoutineDialog({ exercise, open, onClose }: AddToRoutineDialogProps) {
  const { routines, updateRoutine, createRoutine } = useData()
  const { notify } = useToast()
  const navigate = useNavigate()
  const t = useT()
  const content = useContent()
  const name = content.exerciseName(exercise)

  return (
    <Dialog open={open} title={t('app.components.addToRoutine.title', { name })} onClose={onClose}>
      {routines.length > 0 ? (
        <ul className="list">
          {routines.map((routine) => (
            <li key={routine.id}>
              <button
                type="button"
                className="btn btn--block btn--split"
                onClick={() => {
                  updateRoutine(routine, { ...routine, items: [...routine.items, { id: newId(), exerciseId: exercise.id }] })
                  notify(t('app.components.addToRoutine.added', { name: routine.name }))
                  onClose()
                }}
              >
                <span>{routine.name}</span>
                <span className="faint">{t('app.components.addToRoutine.moves', { count: routine.items.length })}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{t('app.components.addToRoutine.none')}</p>
      )}
      <button
        type="button"
        className="btn btn--primary"
        onClick={() => {
          const routine = createRoutine({ ...blankRoutine(), items: [{ id: newId(), exerciseId: exercise.id }] })
          onClose()
          navigate(`/app/routines/${routine.id}`)
        }}
      >
        <Icon name="plus" />
        {t('app.components.addToRoutine.newWith', { name })}
      </button>
    </Dialog>
  )
}
