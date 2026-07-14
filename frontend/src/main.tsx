import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initMonitoring } from './utils/monitoring'
// Entry-chunk import: captures the one-shot beforeinstallprompt before any
// lazy consumer mounts (Card Atlas v2.2.6 race fix).
import './installPromptStore'

initMonitoring()

// Eager service-worker registration (PWA install + push). Idempotent with the
// push opt-in flow's own register call; non-fatal if unsupported/blocked.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* non-fatal — push simply won't be available */
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
