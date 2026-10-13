import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// L'assistant IA a été retiré : on efface une éventuelle clé Gemini restée sur l'appareil.
try {
  localStorage.removeItem('trailstrong:gemini')
} catch {
  /* stockage indisponible */
}

const root = createRoot(document.getElementById('root')!)
if (__PREVIEW__ && (window as { __tsPreviewOk?: boolean }).__tsPreviewOk !== true) {
  // Aperçu de PR : sans stockage isolé, on n'affiche rien plutôt que de risquer les vraies données.
  root.render(<p style={{ padding: 24, font: '600 15px system-ui' }}>Aperçu indisponible sur ce navigateur (stockage non isolé).</p>)
} else if (import.meta.env.DEV && location.hash === '#schemas') {
  void import('./components/DiagramGallery').then(({ DiagramGallery }) => root.render(<DiagramGallery />))
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

// Service worker : uniquement en production (le dev server de Vite n'en veut pas).
// Pas en aperçu de PR : il partage le domaine du vrai site et effacerait ses caches.
if (import.meta.env.PROD && !__PREVIEW__ && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
      /* hors-ligne indisponible : l'app fonctionne quand même */
    })
  })
}
