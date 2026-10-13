/** Thème sombre (défaut) / clair, propre au compte actif. */
import { useEffect, useState } from 'react'
import { scoped } from './account'

export type Theme = 'dark' | 'light'
const KEY = scoped('trailstrong:theme')
const listeners = new Set<(t: Theme) => void>()

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function applyTheme(t: Theme, notify = true) {
  document.documentElement.dataset.theme = t
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t === 'light' ? '#cfe7e3' : '#1d1830')
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* navigation privée */
  }
  if (notify) listeners.forEach((l) => l(t))
}

/** Changement de thème (synchro du compte). */
export function onThemeChange(l: (t: Theme) => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useTheme() {
  const [theme, set] = useState<Theme>(currentTheme)
  useEffect(() => {
    const l = (t: Theme) => set(t)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return [theme, (t: Theme) => applyTheme(t)] as const
}
