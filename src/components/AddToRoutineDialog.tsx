import { useNavigate } from 'react-router-dom'
import { useData } from '@/data/DataProvider'
import { useToast } from '@/app/Toast'
import { blankRoutine, newId } from '@/workouts/routine'
import type { Exercise } from '@/exercises/types'
import { Dialog } from './Dialog'
import { Icon } from '@/app/Icons'

interface AddToRoutineDialogProps {
  exercise: Exercise
  open: boolean
  onClose: () => void
}

export function AddToRoutineDialog({ exercise, open, onClose }: AddToRoutineDialogProps) {
  const { routines, updateRoutine, createRoutine } = useData()
  const { notify } = useToast()
  const navigate = useNavigate()

  return (
    <Dialog open={open} title={`Add ${exercise.name}`} onClose={onClose}>
      {routines.length > 0 ? (
        <ul className="list">
          {routines.map((routine) => (
            <li key={routine.id}>
              <button
                type="button"
                className="btn btn--block btn--split"
                onClick={() => {
                  updateRoutine(routine, { ...routine, items: [...routine.items, { id: newId(), exerciseId: exercise.id }] })
                  notify(`Added to ${routine.name}`)
                  onClose()
                }}
              >
                <span>{routine.name}</span>
                <span className="faint">{routine.items.length} moves</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">You have no routines yet. Start one with this exercise.</p>
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
        New routine with {exercise.name}
      </button>
    </Dialog>
  )
}
