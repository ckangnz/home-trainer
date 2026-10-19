import { Fragment, type ReactNode } from 'react'

export function richText(template: string, parts: Record<string, ReactNode>): ReactNode[] {
  return template
    .split(/\{(\w+)\}/)
    .map((piece, index) => (index % 2 === 1 ? <Fragment key={index}>{piece in parts ? parts[piece] : `{${piece}}`}</Fragment> : piece))
    .filter((piece) => piece !== '')
}
