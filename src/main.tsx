import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './app/App'
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

if (container.firstElementChild) {
  hydrateRoot(container, app)
} else {
  createRoot(container).render(app)
}

registerSW({ immediate: true })
