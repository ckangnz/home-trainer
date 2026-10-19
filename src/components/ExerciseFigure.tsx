import { useEffect, useRef, useState } from 'react'
import { useFullExercise } from '@/exercises/content'
import { Figure, type FigureProps } from '@/figure/Figure'

type ExerciseFigureProps = Omit<FigureProps, 'animation'> & {
  exerciseId: string
  lazy?: boolean
}

function useNearViewport(enabled: boolean) {
  const ref = useRef<HTMLSpanElement>(null)
  const [near, setNear] = useState(!enabled)
  useEffect(() => {
    if (!enabled || near) {
      return
    }
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled, near])
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
