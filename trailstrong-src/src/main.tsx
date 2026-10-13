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
  // L'app s'ouvre depuis le cache : une nouvelle version s'installe en arrière-plan,
  // puis un bandeau propose de recharger.
  const hadController = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) showUpdateBanner()
  })
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
      /* hors-ligne indisponible : l'app fonctionne quand même */
    })
  })
}

// Un morceau de l'app (chargé à la demande) a disparu après une mise à jour : on recharge.
window.addEventListener('vite:preloadError', () => location.reload())

function showUpdateBanner() {
  if (document.getElementById('update-banner')) return
  const b = document.createElement('button')
  b.id = 'update-banner'
  b.type = 'button'
  b.textContent = '✨ Nouvelle version prête · toucher pour mettre à jour'
  b.className =
    'fade-up fixed left-1/2 top-[calc(10px+env(safe-area-inset-top))] z-[90] -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-ink bg-sun px-4 py-2 text-[13px] font-extrabold text-ink shadow-[0_4px_0_var(--color-shadow)]'
  b.onclick = () => location.reload()
  document.body.appendChild(b)
}
