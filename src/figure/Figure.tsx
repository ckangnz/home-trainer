import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { useSettings } from '@/settings/settings'
import { prepareAnimation, sampleSkeleton, thumbSkeleton, type PreparedAnimation } from './animate'
import { subscribeClock } from './clock'
import { animationBounds, viewBoxFor, type ViewBox } from './framing'
import type { Look } from './look'
import { propParts, shadowFor, skeletonParts, type Shadow } from './parts'
import { SecondaryMotion } from './secondary'
import { paletteFor, polyPoints, sceneTransform } from './svg'
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
  look?: Look
  fps?: number
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
    case 'path':
      node.setAttribute('d', part.d)
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
    case 'path':
      return (
        <path
          ref={register}
          className={[part.tone ? `fig-f-${part.tone}` : 'fig-nofill', part.outline ? `fig-s-${part.outline}` : ''].join(' ').trim()}
          d={part.d}
          strokeWidth={part.outlineWidth}
          strokeLinejoin={part.outline ? 'round' : undefined}
          strokeLinecap={part.outline ? 'round' : undefined}
        />
      )
  }
}

function lookStyle(look: Look): CSSProperties {
  const palette = paletteFor(look)
  const style: Record<string, string> = {}
  for (const [tone, color] of Object.entries(palette)) {
    style[`--fig-${tone}`] = color
  }
  return style as CSSProperties
}

interface Scene {
  key: string
  viewBox: ViewBox
  mirrored: boolean
  back: Part[]
  under: Part[]
  parts: Part[]
  shadow: Shadow
}

const LEAVE_MS = 320

function SceneLayers({
  scene,
  shadowRef,
  register,
}: {
  scene: Scene
  shadowRef?: RefObject<SVGEllipseElement | null>
  register?: (id: string) => (node: SVGElement | null) => void
}): ReactNode {
  const { viewBox, shadow } = scene
  return (
    <g transform={sceneTransform(viewBox, scene.mirrored)}>
      {scene.back.map((part) => (
        <PartNode key={part.id} part={part} />
      ))}
      <line className="fig-floor" x1={fixed(viewBox.x - 1)} y1={0} x2={fixed(viewBox.x + viewBox.width + 1)} y2={0} />
      {scene.under.map((part) => (
        <PartNode key={part.id} part={part} />
      ))}
      <ellipse
        ref={shadowRef}
        className="fig-shadow"
        cx={fixed(shadow.cx)}
        cy={0.004}
        rx={fixed(shadow.rx)}
        ry={0.035}
        opacity={fixed(shadow.opacity * 0.4)}
      />
      {scene.parts.map((part) => (
        <PartNode key={part.id} part={part} register={register?.(part.id)} />
      ))}
    </g>
  )
}

function boxOf(viewBox: ViewBox): string {
  return `${fixed(viewBox.x)} ${fixed(viewBox.y)} ${fixed(viewBox.width)} ${fixed(viewBox.height)}`
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
  look: lookOverride,
  fps = 30,
}: FigureProps) {
  const settings = useSettings()
  const look = lookOverride ?? { trainer: settings.trainer, skin: settings.skin }
  const lookKey = `${look.trainer}-${look.skin}`
  const style = useMemo(() => lookStyle({ trainer: look.trainer, skin: look.skin }), [look.trainer, look.skin])
  const prepared = useMemo(() => prepareAnimation(animation), [animation])
  const viewBox = useMemo(() => viewBoxFor(animationBounds(prepared), aspect), [prepared, aspect])
  const props = useMemo(() => propParts(prepared.props), [prepared])
  const still = useMemo(() => thumbSkeleton(prepared), [prepared])
  const stillParts = useMemo(
    () => skeletonParts(still, { trainer: look.trainer, skin: look.skin }, prepared.props),
    [still, look.trainer, look.skin, prepared],
  )
  const stillShadow = useMemo(() => shadowFor(still), [still])
  const svgRef = useRef<SVGSVGElement>(null)
  const shadowRef = useRef<SVGEllipseElement>(null)
  const nodes = useRef(new Map<string, SVGElement>())
  const elapsed = useRef(0)
  const visible = useInView(svgRef)
  const reducedMotion = useReducedMotion()
  const animating = playing && visible && !reducedMotion && prepared.cycleMs > 0
  const id = animationId(prepared)
  const sceneKey = `${id}-${restartKey ?? ''}-${mirrored ? 'm' : 'n'}`
  const motion = useRef<SecondaryMotion | null>(null)
  if (motion.current === null) {
    motion.current = new SecondaryMotion(id)
  }
  const scene: Scene = { key: sceneKey, viewBox, mirrored, back: props.back, under: props.under, parts: stillParts, shadow: stillShadow }
  const shown = useRef<Scene>(scene)
  const [outgoing, setOutgoing] = useState<Scene | null>(null)

  useEffect(() => {
    const previous = shown.current
    shown.current = { key: sceneKey, viewBox, mirrored, back: props.back, under: props.under, parts: stillParts, shadow: stillShadow }
    if (previous.key === sceneKey || reducedMotion) {
      return
    }
    setOutgoing(previous)
    const timer = setTimeout(() => setOutgoing(null), LEAVE_MS)
    return () => clearTimeout(timer)
  }, [sceneKey, viewBox, mirrored, props, stillParts, stillShadow, reducedMotion])

  useEffect(() => {
    elapsed.current = 0
    motion.current?.reset()
  }, [restartKey, prepared])

  useEffect(() => {
    if (!animating) {
      return
    }
    let last: number | null = null
    let drawn = -Infinity
    let drawnElapsed = elapsed.current
    let startedAt: number | null = null
    const frameGap = 1000 / Math.max(1, fps)
    const current: Look = { trainer: look.trainer, skin: look.skin }
    const secondary = motion.current
    secondary?.reset()
    return subscribeClock((now) => {
      if (last !== null) {
        elapsed.current += Math.min(MAX_FRAME_STEP_MS, Math.max(0, now - last)) * speed
      }
      last = now
      startedAt ??= now
      if (now - drawn < frameGap - 2) {
        return
      }
      drawn = now
      const skeleton = sampleSkeleton(prepared, elapsed.current)
      const step = elapsed.current - drawnElapsed
      drawnElapsed = elapsed.current
      const extra = secondary?.step(skeleton, step, now - startedAt)
      const parts = skeletonParts(skeleton, current, prepared.props, extra)
      for (const part of parts) {
        const node = nodes.current.get(part.id)
        if (node) {
          applyPart(node, part)
        }
      }
      const shadow = shadowFor(skeleton)
      applyShadow(shadowRef.current, shadow)
      if (shown.current.key === sceneKey) {
        shown.current = { ...shown.current, parts, shadow }
      }
    })
  }, [animating, prepared, speed, restartKey, fps, look.trainer, look.skin, sceneKey])

  const register = useMemo(() => {
    const map = nodes.current
    return (partId: string) => (node: SVGElement | null) => {
      if (node) {
        map.set(partId, node)
      } else {
        map.delete(partId)
      }
    }
  }, [])

  return (
    <svg
      ref={svgRef}
      className={className ? `figure ${className}` : 'figure'}
      viewBox={boxOf(viewBox)}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
      data-animating={animating ? 'true' : 'false'}
      style={style}
    >
      <g key={`${sceneKey}-${lookKey}`} className="fig-enter">
        <SceneLayers scene={scene} shadowRef={shadowRef} register={register} />
      </g>
      {outgoing ? (
        <svg
          key={`leave-${outgoing.key}`}
          className="fig-leave"
          aria-hidden="true"
          x={fixed(viewBox.x)}
          y={fixed(viewBox.y)}
          width={fixed(viewBox.width)}
          height={fixed(viewBox.height)}
          viewBox={boxOf(outgoing.viewBox)}
          preserveAspectRatio="xMidYMid meet"
        >
          <SceneLayers scene={outgoing} />
        </svg>
      ) : null}
    </svg>
  )
}
