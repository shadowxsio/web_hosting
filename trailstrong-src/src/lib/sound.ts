/**
 * Sons de l'app (Web Audio) + voix optionnelle (synthèse vocale).
 *
 * iPhone : le bouton « silencieux » coupe le son Web Audio sur le haut-parleur
 * (les écouteurs, eux, jouent toujours). Avec « Haut-parleur forcé », on passe
 * la session audio en mode lecture (`navigator.audioSession`, iOS 17+) — ou, à
 * défaut, on joue une boucle de silence via un <audio> — pour que les bips
 * sortent même en mode silencieux. Contrepartie : ça peut mettre en pause la
 * musique d'une autre app.
 */
import { useSyncExternalStore } from 'react'

export type SoundMode = 'voice' | 'beep' | 'off'
interface SoundPrefs {
  mode: SoundMode
  speaker: boolean
}

const KEY = 'trailstrong:sound'
const read = (): SoundPrefs => {
  try {
    return { mode: 'voice', speaker: true, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<SoundPrefs>) }
  } catch {
    return { mode: 'voice', speaker: true }
  }
}

let prefs = read()
const ls = new Set<() => void>()
export function setSoundPrefs(p: Partial<SoundPrefs>) {
  prefs = { ...prefs, ...p }
  localStorage.setItem(KEY, JSON.stringify(prefs))
  ls.forEach((l) => l())
  unlockAudio()
}
export function useSoundPrefs(): SoundPrefs {
  return useSyncExternalStore(
    (l) => {
      ls.add(l)
      return () => ls.delete(l)
    },
    () => prefs,
  )
}

// ── Déverrouillage (à appeler dans un geste utilisateur) ──────────────────
type AudioSessionNav = Navigator & { audioSession?: { type: string } }
let ctx: AudioContext | null = null
let silentLoop: HTMLAudioElement | null = null
let speechPrimed = false

export function unlockAudio() {
  try {
    const nav = navigator as AudioSessionNav
    if (nav.audioSession) {
      const want = prefs.speaker ? 'playback' : 'auto'
      if (nav.audioSession.type !== want) nav.audioSession.type = want
    } else if (prefs.speaker && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
      silentLoop ??= Object.assign(new Audio('./silence.wav'), { loop: true, preload: 'auto' })
      silentLoop.setAttribute('playsinline', '')
      if (silentLoop.paused) void silentLoop.play().catch(() => {})
    }
    if (!prefs.speaker && silentLoop && !silentLoop.paused) silentLoop.pause()
  } catch {
    /* API absente */
  }
  try {
    ctx ??= new AudioContext()
    if (ctx.state !== 'running') void ctx.resume()
  } catch {
    /* pas d'audio */
  }
  if (!speechPrimed && prefs.mode === 'voice' && 'speechSynthesis' in window) {
    // iOS n'autorise la voix qu'après un premier appel dans un geste.
    speechPrimed = true
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    speechSynthesis.speak(u)
  }
}

// ── Sons ─────────────────────────────────────────────────────────────────
function tone(freq: number, at: number, dur: number, vol = 0.45, type: OscillatorType = 'square') {
  if (!ctx || prefs.mode === 'off') return
  const t0 = ctx.currentTime + 0.02 + at
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

let frVoice: SpeechSynthesisVoice | null | undefined
/** Annonce vocale courte (mode « voix » uniquement). */
export function say(text: string) {
  if (prefs.mode !== 'voice' || !('speechSynthesis' in window)) return
  frVoice ??= speechSynthesis.getVoices().find((v) => v.lang.startsWith('fr')) ?? null
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'fr-FR'
  if (frVoice) u.voice = frVoice
  u.rate = 1.15
  speechSynthesis.speak(u)
}

export const sfx = {
  /** Décompte 3-2-1. */
  tick: () => tone(880, 0, 0.09),
  /** Départ de la série. */
  go: () => {
    tone(880, 0, 0.1)
    tone(1320, 0.12, 0.28)
  },
  /** Métronome discret pendant une phase lente (1 par seconde). */
  beat: () => tone(1600, 0, 0.035, 0.18, 'sine'),
  /** Début de phase : effort (aigu), retour contrôlé (grave), pause (double). */
  phase: (kind: 'go' | 'back' | 'hold') => {
    if (kind === 'go') tone(1046, 0, 0.14)
    else if (kind === 'back') tone(523, 0, 0.2)
    else {
      tone(784, 0, 0.06)
      tone(784, 0.1, 0.06)
    }
  },
  /** Fin de série. */
  stop: () => {
    tone(1320, 0, 0.12)
    tone(990, 0.15, 0.12)
    tone(660, 0.3, 0.35)
  },
  /** Début du repos. */
  rest: () => {
    tone(660, 0, 0.12, 0.35, 'triangle')
    tone(523, 0.16, 0.3, 0.35, 'triangle')
  },
  /** Fin du repos / du chrono. */
  done: () => {
    for (const at of [0, 0.28]) tone(880, at, 0.2)
    tone(1320, 0.56, 0.3)
  },
  /** Bouton « Tester le son ». */
  test: () => {
    sfx.go()
    window.setTimeout(() => say('Son activé'), 450)
  },
}
