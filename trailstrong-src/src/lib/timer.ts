/**
 * Chrono de récupération global. Basé sur un horodatage de fin (et non un
 * décompte de ticks) : il reste juste même si l'écran se verrouille ou si
 * l'onglet passe en arrière-plan.
 */
import { useEffect, useState, useSyncExternalStore } from 'react'

interface TimerState {
  duration: number // s
  endAt: number | null // ms epoch quand ça tourne
  pausedLeft: number | null // s restantes en pause
  finishedAt: number | null
}

let st: TimerState = { duration: 90, endAt: null, pausedLeft: null, finishedAt: null }
const ls = new Set<() => void>()
const set = (p: Partial<TimerState>) => {
  st = { ...st, ...p }
  ls.forEach((l) => l())
}

let ctx: AudioContext | null = null
/** À appeler dans un geste utilisateur (iOS exige un déverrouillage audio). */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    /* pas d'audio */
  }
}

export function beep(pattern: number[] = [0, 0.28, 0.56], freq = 880) {
  if (!ctx) return
  const t0 = ctx.currentTime + 0.02
  pattern.forEach((offset, i) => {
    const osc = ctx!.createOscillator()
    const gain = ctx!.createGain()
    osc.type = 'square'
    osc.frequency.value = i === pattern.length - 1 ? freq * 1.5 : freq
    gain.gain.setValueAtTime(0.0001, t0 + offset)
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + offset + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.2)
    osc.connect(gain).connect(ctx!.destination)
    osc.start(t0 + offset)
    osc.stop(t0 + offset + 0.22)
  })
}

let wakeLock: WakeLockSentinel | null = null
async function keepAwake(on: boolean) {
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
  start(seconds?: number) {
    unlockAudio()
    const d = seconds ?? st.duration
    set({ duration: d, endAt: Date.now() + d * 1000, pausedLeft: null, finishedAt: null })
    void keepAwake(true)
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
    set({ endAt: null, pausedLeft: null, finishedAt: null })
    void keepAwake(false)
  },
  preset(seconds: number) {
    timer.start(seconds)
  },
  dismiss() {
    set({ finishedAt: null })
  },
}

function finish() {
  set({ endAt: null, pausedLeft: null, finishedAt: Date.now() })
  beep()
  try {
    navigator.vibrate?.([250, 120, 250, 120, 500])
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
  // Tick d'affichage (5 Hz) uniquement quand le chrono tourne.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!s.endAt) return
    const id = window.setInterval(() => {
      if (st.endAt && Date.now() >= st.endAt) finish()
      else setTick((x) => x + 1)
    }, 200)
    return () => window.clearInterval(id)
  }, [s.endAt])
  const left = s.endAt ? Math.max(0, (s.endAt - Date.now()) / 1000) : (s.pausedLeft ?? (s.finishedAt ? 0 : s.duration))
  return { ...s, left, running: s.endAt != null }
}
