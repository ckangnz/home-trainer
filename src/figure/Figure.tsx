import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { prepareAnimation, sampleSkeleton, thumbSkeleton, type PreparedAnimation } from './animate'
import { subscribeClock } from './clock'
import { animationBounds, viewBoxFor } from './framing'
import { propParts, shadowFor, skeletonParts, type Shadow } from './parts'
import { capPath, polyPoints, sceneTransform } from './svg'
import type { FigureAnimation, Part } from './types'
import './figure.css'

export interface FigureProps {
  animation: FigureAnimation
  playing?: boolean
  mirrored?: boolean
  speed?: number
  restartKey?: string | number
  aspect?: number
  className?: string
  label?: string
}

const MAX_FRAME_STEP_MS = 100

let nextAnimationId = 1
const animationIds = new WeakMap<PreparedAnimation, number>()

function animationId(prepared: PreparedAnimation): number {
  let id = animationIds.get(prepared)
  if (id === undefined) {
    id = nextAnimationId
    nextAnimationId += 1
    animationIds.set(prepared, id)
  }
  return id
}

function useInView(ref: RefObject<Element | null>): boolean {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      return
    }
    const observer = new IntersectionObserver((entries) => {
      setVisible(entries.some((entry) => entry.isIntersecting))
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref])
  return visible
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])
  return reduced
}

function fixed(value: number): number {
  return Math.round(value * 10000) / 10000
}

function applyPart(node: SVGElement, part: Part) {
  switch (part.kind) {
    case 'seg':
      node.setAttribute('x1', String(fixed(part.a[0])))
      node.setAttribute('y1', String(fixed(part.a[1])))
      node.setAttribute('x2', String(fixed(part.b[0])))
      node.setAttribute('y2', String(fixed(part.b[1])))
      return
    case 'poly':
      node.setAttribute('points', polyPoints(part.points))
      return
    case 'circle':
      node.setAttribute('cx', String(fixed(part.center[0])))
      node.setAttribute('cy', String(fixed(part.center[1])))
      return
    case 'cap':
      node.setAttribute('d', capPath(part))
  }
}

function applyShadow(node: SVGEllipseElement | null, shadow: Shadow) {
  if (!node) {
    return
  }
  node.setAttribute('cx', String(fixed(shadow.cx)))
  node.setAttribute('rx', String(fixed(shadow.rx)))
  node.setAttribute('opacity', String(fixed(shadow.opacity * 0.4)))
}

function PartNode({ part, register }: { part: Part; register?: (node: SVGElement | null) => void }) {
  switch (part.kind) {
    case 'seg':
      return (
        <line
          ref={register}
          className={`fig-s-${part.tone}`}
          x1={fixed(part.a[0])}
          y1={fixed(part.a[1])}
          x2={fixed(part.b[0])}
          y2={fixed(part.b[1])}
          strokeWidth={part.width}
          strokeLinecap="round"
        />
      )
    case 'poly':
      return part.closed ? (
        <polygon
          ref={register}
          className={`fig-s-${part.tone} fig-f-${part.tone}`}
          points={polyPoints(part.points)}
          strokeWidth={part.width}
          strokeLinejoin="round"
        />
      ) : (
        <polyline
          ref={register}
          className={`fig-s-${part.tone} fig-nofill`}
          points={polyPoints(part.points)}
          strokeWidth={part.width}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )
    case 'circle':
      return (
        <circle ref={register} className={`fig-f-${part.tone}`} cx={fixed(part.center[0])} cy={fixed(part.center[1])} r={part.r} />
      )
    case 'cap':
      return <path ref={register} className={`fig-f-${part.tone}`} d={capPath(part)} />
  }
}

export function Figure({
  animation,
  playing = true,
  mirrored = false,
  speed = 1,
  restartKey,
  aspect = 1,
  className,
  label,
}: FigureProps) {
  const prepared = useMemo(() => prepareAnimation(animation), [animation])
  const viewBox = useMemo(() => viewBoxFor(animationBounds(prepared), aspect), [prepared, aspect])
  const props = useMemo(() => propParts(prepared.props), [prepared])
  const still = useMemo(() => thumbSkeleton(prepared), [prepared])
  const stillParts = useMemo(() => skeletonParts(still), [still])
  const stillShadow = useMemo(() => shadowFor(still), [still])
  const svgRef = useRef<SVGSVGElement>(null)
  const shadowRef = useRef<SVGEllipseElement>(null)
  const nodes = useRef(new Map<string, SVGElement>())
  const elapsed = useRef(0)
  const visible = useInView(svgRef)
  const reducedMotion = useReducedMotion()
  const animating = playing && visible && !reducedMotion && prepared.cycleMs > 0

  useEffect(() => {
    elapsed.current = 0
  }, [restartKey, prepared])

  useEffect(() => {
    if (!animating) {
      return
    }
    let last: number | null = null
    return subscribeClock((now) => {
      if (last !== null) {
        elapsed.current += Math.min(MAX_FRAME_STEP_MS, Math.max(0, now - last)) * speed
      }
      last = now
      const skeleton = sampleSkeleton(prepared, elapsed.current)
      for (const part of skeletonParts(skeleton)) {
        const node = nodes.current.get(part.id)
        if (node) {
          applyPart(node, part)
        }
      }
      applyShadow(shadowRef.current, shadowFor(skeleton))
    })
  }, [animating, prepared, speed, restartKey])

  const box = `${fixed(viewBox.x)} ${fixed(viewBox.y)} ${fixed(viewBox.width)} ${fixed(viewBox.height)}`

  return (
    <svg
      ref={svgRef}
      className={className ? `figure ${className}` : 'figure'}
      viewBox={box}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
      data-animating={animating ? 'true' : 'false'}
    >
      <g key={animationId(prepared)} transform={sceneTransform(viewBox, mirrored)}>
        {props.back.map((part) => (
          <PartNode key={part.id} part={part} />
        ))}
        <line className="fig-floor" x1={fixed(viewBox.x - 1)} y1={0} x2={fixed(viewBox.x + viewBox.width + 1)} y2={0} />
        {props.under.map((part) => (
          <PartNode key={part.id} part={part} />
        ))}
        <ellipse
          ref={shadowRef}
          className="fig-shadow"
          cx={fixed(stillShadow.cx)}
          cy={0.004}
          rx={fixed(stillShadow.rx)}
          ry={0.035}
          opacity={fixed(stillShadow.opacity * 0.4)}
        />
        {stillParts.map((part) => (
          <PartNode
            key={part.id}
            part={part}
            register={(node) => {
              if (node) {
                nodes.current.set(part.id, node)
              } else {
                nodes.current.delete(part.id)
              }
            }}
          />
        ))}
      </g>
    </svg>
  )
}
