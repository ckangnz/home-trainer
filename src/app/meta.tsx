import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { SITE } from './site'

export interface PageMeta {
  title: string
  description: string
}

const MetaContext = createContext<PageMeta | null>(null)

export function MetaCollector({ sink, children }: { sink: PageMeta; children: ReactNode }) {
  return <MetaContext.Provider value={sink}>{children}</MetaContext.Provider>
}

export function fullTitle(title: string): string {
  return title === SITE.name ? `${SITE.name} — ${SITE.tagline}` : `${title} · ${SITE.name}`
}

export function usePageMeta(title: string, description: string = SITE.description): void {
  const sink = useContext(MetaContext)
  if (sink) {
    sink.title = fullTitle(title)
    sink.description = description
  }
  useEffect(() => {
    document.title = fullTitle(title)
    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!tag) {
      tag = document.createElement('meta')
      tag.name = 'description'
      document.head.appendChild(tag)
    }
    tag.content = description
  }, [title, description])
}
