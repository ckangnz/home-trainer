import { useMemo } from 'react'
import { getExercise } from '@/exercises'
import { useLabels, useT } from '@/i18n'
import { muscleLoad, topMuscles, weightedItems } from '@/exercises/muscles'
import { effectiveTarget, normalizeDefaults } from '@/workouts/routine'
import type { RoutineBody } from '@/workouts/types'
import { MuscleMap } from './MuscleMap'

export function RoutineMuscles({ body, title }: { body: RoutineBody; title?: string }) {
  const t = useT()
  const labels = useLabels()
  const load = useMemo(() => {
    const defaults = normalizeDefaults(body.defaults)
    return muscleLoad(
      weightedItems(body.items, getExercise, (item, exercise) => {
        const target = effectiveTarget(item, defaults)
        const seconds = target.kind === 'time' ? target.seconds : target.reps * 3
        return seconds * (item.sets ?? 1) * (exercise.sided === 'perSide' ? 2 : 1)
      }),
    )
  }, [body])
  const top = topMuscles(load, 6)
  if (top.length === 0) {
    return null
  }
  return (
    <section className="card routine-muscles">
      <h2 className="section__title">{title ?? t('app.components.routineMuscles.title')}</h2>
      <MuscleMap load={load} size="md" legend />
      <div className="chip-row routine-muscles__chips">
        {top.map((entry) => (
          <span key={entry.muscle} className="chip chip--static">
            {labels.muscle[entry.muscle]}
          </span>
        ))}
      </div>
    </section>
  )
}
