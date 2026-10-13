/**
 * Chrono de récupération global. Basé sur un horodatage de fin (et non un
 * décompte de ticks) : il reste juste même si l'écran se verrouille ou si
 * l'onglet passe en arrière-plan.
 */
import { useEffect, useState, useSyncExternalStore } from 'react'
import { say, sfx, unlockAudio } from './sound'
import { haptic } from './haptics'

interface TimerState {
  duration: number // s
  endAt: number | null // ms epoch quand ça tourne
  pausedLeft: number | null // s restantes en pause
  finishedAt: number | null
  /** Libellé contextuel (ex. « Change de jambe → D »). */
  label: string | null
}

let st: TimerState = { duration: 90, endAt: null, pausedLeft: null, finishedAt: null, label: null }
const ls = new Set<() => void>()
const set = (p: Partial<TimerState>) => {
  st = { ...st, ...p }
  ls.forEach((l) => l())
}

let wakeLock: WakeLockSentinel | null = null
export async function keepAwake(on: boolean) {
  try {
    if (on && !wakeLock && 'wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen')
      wakeLock.addEventListener('release', () => (wakeLock = null))
    } else if (!on && wakeLock) {
      await wakeLock.release()
      wakeLock = null
    }
  } catch {
    /* refusé : pas grave */
  }
}

export const timer = {
  start(seconds?: number, label: string | null = null) {
    unlockAudio()
    const d = seconds ?? st.duration
    set({ duration: d, endAt: Date.now() + d * 1000, pausedLeft: null, finishedAt: null, label })
    void keepAwake(true)
    // Signal de début (après la fanfare de fin de série du coach).
    if (label?.startsWith('Change')) window.setTimeout(sfx.switch, 900)
    else if (d >= 15) window.setTimeout(sfx.rest, 900)
  },
  toggle() {
    unlockAudio()
    if (st.endAt) {
      set({ pausedLeft: Math.max(0, (st.endAt - Date.now()) / 1000), endAt: null })
      void keepAwake(false)
    } else if (st.pausedLeft != null && st.pausedLeft > 0) {
      set({ endAt: Date.now() + st.pausedLeft * 1000, pausedLeft: null, finishedAt: null })
      void keepAwake(true)
    } else {
      timer.start()
    }
  },
  reset() {
    set({ endAt: null, pausedLeft: null, finishedAt: null, label: null })
    void keepAwake(false)
  },
  /** Ajustement rapide (+30 s / −10 s) sans relancer le chrono. */
  adjust(delta: number) {
    if (st.endAt) {
      const left = Math.max(1, (st.endAt - Date.now()) / 1000 + delta)
      set({ endAt: Date.now() + left * 1000, duration: Math.max(left, st.duration + delta) })
    } else if (st.pausedLeft != null) {
      const left = Math.max(1, st.pausedLeft + delta)
      set({ pausedLeft: left, duration: Math.max(left, st.duration + delta) })
    } else {
      set({ duration: Math.max(5, st.duration + delta), finishedAt: null })
    }
  },
  preset(seconds: number) {
    timer.start(seconds)
  },
  dismiss() {
    set({ finishedAt: null, label: null })
  },
}

function finish() {
  const label = st.label
  set({ endAt: null, pausedLeft: null, finishedAt: Date.now() })
  if (label?.startsWith('Change')) sfx.start()
  else sfx.restEnd()
  say(label?.startsWith('Change') ? 'Go' : 'C’est reparti')
  try {
    haptic([250, 120, 250, 120, 500])
  } catch {
    /* iOS : pas de vibrate */
  }
  void keepAwake(false)
}

export function useTimer() {
  const s = useSyncExternalStore(
    (l) => {
      ls.add(l)
      return () => ls.delete(l)
    },
    () => st,
  )
  // Affichage : un rendu par seconde seulement (la barre de progression est animée en CSS).
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!s.endAt) return
    let lastSec = Infinity
    const id = window.setInterval(() => {
      if (!st.endAt) return
      const left = (st.endAt - Date.now()) / 1000
      if (left <= 0) return finish()
      const sec = Math.ceil(left)
      if (sec === lastSec) return
      // Tic de plus en plus aigu sur les 5 dernières secondes (3 pour les chronos courts).
      if (sec <= (st.duration > 20 ? 5 : 3) && sec < lastSec && st.duration > 5) sfx.restTick(sec)
      lastSec = sec
      setTick((x) => x + 1)
    }, 100)
    return () => window.clearInterval(id)
  }, [s.endAt])
  const left = s.endAt ? Math.max(0, (s.endAt - Date.now()) / 1000) : (s.pausedLeft ?? (s.finishedAt ? 0 : s.duration))
  return { ...s, left, running: s.endAt != null }
}

/** Le chrono tourne-t-il (hors React) ? */
export const timerRunning = () => st.endAt != null
