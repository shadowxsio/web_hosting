import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const root = createRoot(document.getElementById('root')!)
if (import.meta.env.DEV && location.hash === '#figures') {
  void import('./components/FigureGallery').then(({ FigureGallery }) => root.render(<FigureGallery />))
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

// Service worker : uniquement en production (le dev server de Vite n'en veut pas).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
      /* hors-ligne indisponible : l'app fonctionne quand même */
    })
  })
}
