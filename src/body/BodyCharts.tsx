import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { linear, nearestIndex, segments, timeTicks, type Point, type Ticks, type WeekBucket } from './series'

export const PAD = { left: 40, right: 52, top: 14, bottom: 26 }

const MARKER_SPACING = 10

export function useElementWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const element = ref.current
    if (!element) {
      return
    }
    const measure = () => {
      const next = Math.round(element.getBoundingClientRect().width)
      if (next > 0) {
        setWidth(next)
      }
    }
    measure()
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

export interface Band {
  from: number
  to: number
  label: string
  emphasis?: boolean
}

interface AxisProps {
  width: number
  height: number
  domain: [number, number]
  y: Ticks
  formatTick: (value: number) => string
  formatDay: (day: number) => string
}

function Axes({ width, height, domain, y, formatTick, formatDay }: AxisProps) {
  const x = linear(domain, [PAD.left, width - PAD.right])
  const yScale = linear(y.domain, [height - PAD.bottom, PAD.top])
  const dayTicks = timeTicks(domain, Math.max(2, Math.floor((width - PAD.left - PAD.right) / 64)))
  return (
    <g className="body-chart__axes">
      {y.ticks.map((tick) => (
        <g key={tick}>
          <line className="body-chart__grid" x1={PAD.left} x2={width - PAD.right} y1={yScale(tick)} y2={yScale(tick)} />
          <text className="body-chart__tick" x={PAD.left - 8} y={yScale(tick)} dy="0.32em" textAnchor="end">
            {formatTick(tick)}
          </text>
        </g>
      ))}
      <line className="body-chart__baseline" x1={PAD.left} x2={width - PAD.right} y1={height - PAD.bottom} y2={height - PAD.bottom} />
      {dayTicks.map((day) => (
        <text key={day} className="body-chart__tick" x={x(day)} y={height - PAD.bottom + 17} textAnchor="middle">
          {formatDay(day)}
        </text>
      ))}
    </g>
  )
}

interface TooltipProps {
  x: number
  width: number
  children: ReactNode
}

function Tooltip({ x, width, children }: TooltipProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(120)
  useEffect(() => {
    if (ref.current) {
      setSize(ref.current.offsetWidth || 120)
    }
  })
  const right = x + 12
  const left = right + size <= width ? right : Math.max(0, x - 12 - size)
  return (
    <div ref={ref} className="body-chart__tooltip" style={{ left, top: PAD.top }} role="status">
      {children}
    </div>
  )
}

function keyHandler(count: number, active: number | null, setActive: (index: number | null) => void) {
  return (event: KeyboardEvent) => {
    if (count === 0) {
      return
    }
    const current = active ?? count - 1
    const next =
      event.key === 'ArrowLeft' ? current - 1 : event.key === 'ArrowRight' ? current + 1 : event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : null
    if (next !== null) {
      event.preventDefault()
      setActive(Math.min(count - 1, Math.max(0, next)))
    }
  }
}

export interface LineChartProps {
  label: string
  points: Point[]
  domain: [number, number]
  y: Ticks
  height: number
  color: string
  bands?: Band[]
  formatValue: (value: number) => string
  formatTick: (value: number) => string
  formatDay: (day: number) => string
  formatDate: (day: number) => string
}

export function LineChart({ label, points, domain, y, height, color, bands = [], formatValue, formatTick, formatDay, formatDate }: LineChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const x = linear(domain, [PAD.left, width - PAD.right])
  const yScale = linear(y.domain, [height - PAD.bottom, PAD.top])
  const plotWidth = width - PAD.left - PAD.right
  const showMarkers = points.length <= plotWidth / MARKER_SPACING
  const last = points[points.length - 1]
  const focused = active !== null ? points[active] : null
  const lines = segments(points)
  const isolated = new Set(lines.filter((segment) => segment.length === 1).map((segment) => segment[0].day))

  const onPointer = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - box.left
    const day = domain[0] + ((px - PAD.left) / Math.max(1, plotWidth)) * (domain[1] - domain[0])
    setActive(nearestIndex(points, day))
  }

  const clampY = (value: number) => Math.min(Math.max(value, y.domain[0]), y.domain[1])

  return (
    <div ref={ref} className="body-chart">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={label}
        tabIndex={0}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive(points.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={keyHandler(points.length, active, setActive)}
      >
        {bands.map((band) => {
          const top = yScale(clampY(band.to))
          const bottom = yScale(clampY(band.from))
          if (bottom - top <= 0) {
            return null
          }
          return (
            <g key={band.label}>
              {band.emphasis ? <rect className="body-chart__band" x={PAD.left} y={top} width={plotWidth} height={bottom - top} /> : null}
              {bottom - top >= 16 ? (
                <text className="body-chart__band-label" x={PAD.left + 4} y={top + 12}>
                  {band.label}
                </text>
              ) : null}
            </g>
          )
        })}
        <Axes width={width} height={height} domain={domain} y={y} formatTick={formatTick} formatDay={formatDay} />
        {lines.map((segment) =>
          segment.length > 1 ? (
            <polyline
              key={segment[0].day}
              className="body-chart__line"
              stroke={color}
              points={segment.map((point) => `${x(point.day)},${yScale(point.value)}`).join(' ')}
            />
          ) : null,
        )}
        {points.map((point, index) =>
          showMarkers || index === points.length - 1 || isolated.has(point.day) ? (
            <circle key={point.day} className="body-chart__marker" cx={x(point.day)} cy={yScale(point.value)} r={4} fill={color} />
          ) : null,
        )}
        {last ? (
          <text className="body-chart__end-label" x={x(last.day) + 8} y={yScale(last.value)} dy="0.32em">
            {formatValue(last.value)}
          </text>
        ) : null}
        {focused ? (
          <g>
            <line className="body-chart__crosshair" x1={x(focused.day)} x2={x(focused.day)} y1={PAD.top} y2={height - PAD.bottom} />
            <circle className="body-chart__marker body-chart__marker--active" cx={x(focused.day)} cy={yScale(focused.value)} r={5} fill={color} />
          </g>
        ) : null}
      </svg>
      {focused ? (
        <Tooltip x={x(focused.day)} width={width}>
          <span className="body-chart__tooltip-row">
            <span className="body-chart__key body-chart__key--line" style={{ background: color }} />
            <strong>{formatValue(focused.value)}</strong>
          </span>
          <span className="body-chart__tooltip-meta">{formatDate(focused.day)}</span>
        </Tooltip>
      ) : null}
    </div>
  )
}

export interface BarChartProps {
  label: string
  buckets: WeekBucket[]
  domain: [number, number]
  y: Ticks
  height: number
  color: string
  dimmed?: boolean
  formatTick: (value: number) => string
  formatDay: (day: number) => string
  describe: (bucket: WeekBucket) => { value: string; meta: string }
}

function barPath(x: number, top: number, width: number, bottom: number): string {
  const radius = Math.min(4, width / 2, bottom - top)
  return `M${x},${bottom}V${top + radius}Q${x},${top} ${x + radius},${top}H${x + width - radius}Q${x + width},${top} ${x + width},${top + radius}V${bottom}Z`
}

export function BarChart({ label, buckets, domain, y, height, color, dimmed, formatTick, formatDay, describe }: BarChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const x = linear(domain, [PAD.left, width - PAD.right])
  const yScale = linear(y.domain, [height - PAD.bottom, PAD.top])
  const weekPx = Math.abs(x(domain[0] + 7) - x(domain[0]))
  const barWidth = Math.max(2, Math.min(24, weekPx - 2))
  const left = PAD.left
  const right = width - PAD.right
  const bottom = height - PAD.bottom

  const slot = (bucket: WeekBucket) => {
    const center = x(bucket.start + 3.5)
    const start = Math.max(left, center - barWidth / 2)
    const end = Math.min(right, center + barWidth / 2)
    return { center: Math.min(Math.max(center, left), right), start, width: Math.max(0, end - start) }
  }

  const focused = active !== null ? buckets[active] : null
  const focusedText = focused ? describe(focused) : null

  return (
    <div ref={ref} className={`body-chart${dimmed ? ' is-dimmed' : ''}`}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={label}
        tabIndex={0}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive(buckets.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={keyHandler(buckets.length, active, setActive)}
      >
        <Axes width={width} height={height} domain={domain} y={y} formatTick={formatTick} formatDay={formatDay} />
        {buckets.map((bucket, index) => {
          const geometry = slot(bucket)
          const top = yScale(bucket.count)
          const hitStart = Math.max(left, x(bucket.start))
          const hitEnd = Math.min(right, x(bucket.start + 7))
          return (
            <g key={bucket.start}>
              {bucket.count > 0 && geometry.width > 0 ? (
                <path className={`body-chart__bar${active === index ? ' is-active' : ''}`} fill={color} d={barPath(geometry.start, top, geometry.width, bottom)} />
              ) : null}
              <rect
                className="body-chart__hit"
                x={hitStart}
                y={PAD.top}
                width={Math.max(0, hitEnd - hitStart)}
                height={bottom - PAD.top}
                onPointerEnter={() => setActive(index)}
                onPointerDown={() => setActive(index)}
              />
            </g>
          )
        })}
      </svg>
      {focused && focusedText ? (
        <Tooltip x={slot(focused).center} width={width}>
          <span className="body-chart__tooltip-row">
            <span className="body-chart__key body-chart__key--bar" style={{ background: color }} />
            <strong>{focusedText.value}</strong>
          </span>
          <span className="body-chart__tooltip-meta">{focusedText.meta}</span>
        </Tooltip>
      ) : null}
    </div>
  )
}
