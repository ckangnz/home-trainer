import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { AppProviders } from './app/App'
import { AppRoutes } from './app/routes'
import { MetaCollector, fullTitle, type PageMeta } from './app/meta'
import { BASE_PATH, SITE } from './app/site'
import { EXERCISES } from './exercises'
import { loadAllExercises, trackCatalogs } from './exercises/content'
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

export function prepare(): Promise<void> {
  return loadAllExercises()
}

export function render(url: string): { html: string; meta: PageMeta; catalogs: string[] } {
  const meta: PageMeta = { title: fullTitle(SITE.name), description: SITE.description }
  const { result: html, catalogs } = trackCatalogs(() => renderToString(
    <StrictMode>
      <MetaCollector sink={meta}>
        <AppProviders>
          <StaticRouter basename={BASE_PATH || undefined} location={`${BASE_PATH}${url}`}>
            <AppRoutes />
          </StaticRouter>
        </AppProviders>
      </MetaCollector>
    </StrictMode>,
  ))
  return { html, meta, catalogs }
}
