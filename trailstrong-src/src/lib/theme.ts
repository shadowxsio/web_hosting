/** Thème sombre (défaut) / clair, mémorisé sur l'appareil. */
import { useState } from 'react'

export type Theme = 'dark' | 'light'
const KEY = 'trailstrong:theme'

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t === 'light' ? '#86c5f7' : '#16131c')
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* navigation privée */
  }
}

export function useTheme() {
  const [theme, set] = useState<Theme>(currentTheme)
  return [theme, (t: Theme) => (applyTheme(t), set(t))] as const
}
