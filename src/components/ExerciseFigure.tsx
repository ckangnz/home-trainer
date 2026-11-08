import { useEffect, useRef, useState } from 'react'
import { useFullExercise } from '@/exercises/content'
import { Figure, type FigureProps } from '@/figure/Figure'

type ExerciseFigureProps = Omit<FigureProps, 'animation'> & {
  exerciseId: string
  lazy?: boolean
}

const NEAR_MARGIN = '500px 0px'

function useNearViewport(enabled: boolean) {
  const ref = useRef<HTMLSpanElement>(null)
  const [near, setNear] = useState(!enabled)
  useEffect(() => {
    if (!enabled) {
      return
    }
    const host = ref.current?.parentElement
    if (!host || typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }
    const observer = new IntersectionObserver((entries) => setNear(entries[entries.length - 1].isIntersecting), { rootMargin: NEAR_MARGIN })
    observer.observe(host)
    return () => observer.disconnect()
  }, [enabled])
  return { ref, near }
}

export function ExerciseFigure({ exerciseId, lazy = false, className, ...props }: ExerciseFigureProps) {
  const [mounted, setMounted] = useState(!lazy)
  const { ref, near } = useNearViewport(lazy)
  useEffect(() => {
    setMounted(true)
  }, [])
  const exercise = useFullExercise(exerciseId, mounted && near)
  if (!exercise || !mounted || !near) {
    return <span ref={ref} className={className ? `figure figure--pending ${className}` : 'figure figure--pending'} aria-hidden="true" />
  }
  return <Figure {...props} className={className} animation={exercise.animation} />
}
