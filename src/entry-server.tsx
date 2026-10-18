import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { AppProviders } from './app/App'
import { AppRoutes } from './app/routes'
import { MetaCollector, fullTitle, type PageMeta } from './app/meta'
import { BASE_PATH, SITE } from './app/site'
import { EXERCISES } from './exercises'
import { CURATED_WORKOUTS } from './workouts/curated'

export const PRERENDER_ROUTES: string[] = [
  '/',
  '/exercises',
  ...EXERCISES.map((exercise) => `/exercises/${exercise.id}`),
  '/workouts',
  ...CURATED_WORKOUTS.map((workout) => `/workouts/${workout.id}`),
  '/privacy',
  '/terms',
]

export function render(url: string): { html: string; meta: PageMeta } {
  const meta: PageMeta = { title: fullTitle(SITE.name), description: SITE.description }
  const html = renderToString(
    <StrictMode>
      <MetaCollector sink={meta}>
        <AppProviders>
          <StaticRouter basename={BASE_PATH || undefined} location={`${BASE_PATH}${url}`}>
            <AppRoutes />
          </StaticRouter>
        </AppProviders>
      </MetaCollector>
    </StrictMode>,
  )
  return { html, meta }
}
