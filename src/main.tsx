import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './app/App'
import { loadCatalog } from './exercises/content'
import { loadKorean } from './i18n/bundle'
import { preferredLanguage } from './i18n/language'
import './styles/tokens.css'
import './styles/base.css'

const container = document.getElementById('root')
if (container === null) {
  throw new Error('Root element #root was not found.')
}

const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

declare global {
  interface Window {
    __HT_CATALOGS__?: string[]
  }
}

const language = preferredLanguage() === 'ko' ? loadKorean().catch(() => undefined) : Promise.resolve()

if (container.firstElementChild) {
  const catalogs = window.__HT_CATALOGS__ ?? []
  Promise.all([...catalogs.map(loadCatalog), language])
    .catch(() => undefined)
    .finally(() => hydrateRoot(container, app))
} else {
  void language.finally(() => createRoot(container).render(app))
}

registerSW({ immediate: true })
