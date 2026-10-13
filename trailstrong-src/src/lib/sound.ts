/**
 * Sons de l'app (Web Audio) + voix optionnelle (synthèse vocale).
 *
 * Deux sorties possibles sur iPhone :
 *   - « Par-dessus YouTube / musique » (défaut) : session audio `ambient`, les bips
 *     se mélangent à l'autre app. Le bouton silencieux les coupe sur le
 *     haut-parleur (pas dans les écouteurs).
 *   - « Haut-parleur forcé » : session `playback` (`navigator.audioSession`,
 *     iOS 17+, sinon boucle de silence via un <audio>) → bips même en mode
 *     silencieux, mais iOS met en pause la vidéo / musique de l'autre app.
 */
import { useSyncExternalStore } from 'react'
import { scoped } from './account'

export type SoundMode = 'voice' | 'beep' | 'off'
interface SoundPrefs {
  mode: SoundMode
  /** true = haut-parleur forcé (coupe l'autre app) ; false = mélange avec YouTube / musique. */
  speaker: boolean
}

const KEY = scoped('trailstrong:sound')
const read = (): SoundPrefs => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<SoundPrefs> & { v?: number }
    // v2 : la voix coupait les bips sur iPhone → bips par défaut (la voix reste au choix).
    if (!raw.v || raw.v < 2) raw.mode = 'beep'
    // v3 : mélange avec YouTube / musique par défaut.
    if (!raw.v || raw.v < 3) raw.speaker = false
    return { mode: 'beep', speaker: false, ...raw }
  } catch {
    return { mode: 'beep', speaker: false }
  }
}

let prefs = read()
const ls = new Set<() => void>()
export const getSoundPrefs = () => prefs
/** Abonnement aux changements (synchro du compte). */
export function onSoundChange(l: () => void) {
  ls.add(l)
  return () => ls.delete(l)
}
export function setSoundPrefs(p: Partial<SoundPrefs>) {
  prefs = { ...prefs, ...p }
  localStorage.setItem(KEY, JSON.stringify({ ...prefs, v: 3 }))
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
      const want = prefs.speaker ? 'playback' : 'ambient'
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

// ── Relance auto ─────────────────────────────────────────────────────────
// iOS suspend / « interrompt » le contexte audio (voix, appel, autre app…) :
// on le relance avant chaque son et dès qu'il change d'état.
function ensureRunning() {
  if (!ctx) return
  if (ctx.state !== 'running') void ctx.resume().catch(() => {})
  if (silentLoop && prefs.speaker && silentLoop.paused) void silentLoop.play().catch(() => {})
}
let watched = false
function watch() {
  if (!ctx || watched) return
  watched = true
  ctx.addEventListener('statechange', () => {
    if (ctx && ctx.state !== 'running' && document.visibilityState === 'visible') window.setTimeout(ensureRunning, 120)
  })
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && ensureRunning())
}

// ── Synthé ───────────────────────────────────────────────────────────────
interface Note {
  type?: OscillatorType
  vol?: number
  /** Glissando vers cette fréquence. */
  to?: number
}
function note(freq: number, at: number, dur: number, { type = 'triangle', vol = 0.5, to }: Note = {}) {
  if (!ctx || prefs.mode === 'off') return
  watch()
  ensureRunning()
  const t0 = ctx.currentTime + 0.03 + at
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.03)
}
const chord = (freqs: number[], at: number, dur: number, o?: Note) => freqs.forEach((f) => note(f, at, dur, { vol: 0.28, ...o }))

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
  // La voix peut couper le contexte audio : on le relance après.
  u.onend = ensureRunning
  u.onerror = ensureRunning
  speechSynthesis.speak(u)
}

/**
 * Palette sonore — chaque moment a un timbre reconnaissable sans regarder l'écran.
 * `p` = avancement de la série (0 → 1) : les sons montent dans l'aigu en approchant de la fin.
 */
export const sfx = {
  /** Décompte 3-2-1 : bloc de bois, de plus en plus aigu. */
  count: (n: number) => note(n >= 3 ? 523 : n === 2 ? 659 : 784, 0, 0.09, { type: 'square', vol: 0.35 }),
  /** Départ : arpège montant. */
  start: () => {
    ;[523, 659, 784].forEach((f, i) => note(f, i * 0.07, 0.12, { type: 'sawtooth', vol: 0.3 }))
    note(1046, 0.21, 0.4, { type: 'sawtooth', vol: 0.32 })
  },
  /** Début de phase : effort = « pling » aigu, retour = glissando descendant, pause = double tic. */
  phase: (kind: 'go' | 'back' | 'hold', p = 0) => {
    const up = 1 + p * 0.6
    if (kind === 'go') note(784 * up, 0, 0.16, { type: 'triangle', vol: 0.55 })
    else if (kind === 'back') note(660 * up, 0, 0.45, { type: 'sine', vol: 0.6, to: 392 * up })
    else {
      note(988 * up, 0, 0.05, { type: 'square', vol: 0.25 })
      note(988 * up, 0.09, 0.05, { type: 'square', vol: 0.25 })
    }
  },
  /** Métronome (1 / s) : clic de plus en plus aigu et fort vers la fin de la série. */
  beat: (p = 0) => note(1200 + 900 * p, 0, 0.035, { type: 'sine', vol: 0.18 + 0.2 * p }),
  /** Début de la dernière rep / des 5 dernières secondes. */
  last: () => {
    note(1568, 0, 0.08, { type: 'square', vol: 0.3 })
    note(1760, 0.1, 0.12, { type: 'square', vol: 0.3 })
  },
  /** Fin de série : fanfare. */
  end: () => {
    ;[523, 659, 784, 1046].forEach((f, i) => note(f, i * 0.09, 0.14, { type: 'triangle', vol: 0.5 }))
    chord([523, 659, 784, 1046], 0.36, 0.7, { type: 'triangle' })
  },
  /** Changement de jambe : « swoosh » aller-retour. */
  switch: () => {
    note(392, 0, 0.25, { type: 'sine', vol: 0.55, to: 988 })
    note(988, 0.27, 0.25, { type: 'sine', vol: 0.55, to: 392 })
  },
  /** Début du repos : descente douce. */
  rest: () => {
    note(784, 0, 0.5, { type: 'sine', vol: 0.5, to: 523 })
    note(392, 0.45, 0.6, { type: 'sine', vol: 0.4 })
  },
  /** Fin du repos qui approche (5 → 1 s restantes) : tic de plus en plus aigu. */
  restTick: (left: number) => note(587 + (5 - left) * 110, 0, 0.08, { type: 'square', vol: 0.3 + (5 - left) * 0.04 }),
  /** Fin du repos : c'est reparti. */
  restEnd: () => {
    ;[880, 1175, 1568].forEach((f, i) => note(f, i * 0.11, 0.14, { type: 'square', vol: 0.35 }))
  },
  /** Compat : petit tic. */
  tick: () => note(880, 0, 0.08, { type: 'square', vol: 0.3 }),
  /** Bouton « Tester le son » : tous les sons à la suite. */
  test: () => {
    const seq: [number, () => void][] = [
      [0, () => sfx.count(3)],
      [600, () => sfx.count(2)],
      [1200, () => sfx.count(1)],
      [1800, sfx.start],
      [2700, () => sfx.phase('back', 0)],
      [3500, () => sfx.phase('go', 0.5)],
      [4100, sfx.last],
      [4700, sfx.end],
      [6000, sfx.rest],
      [7400, sfx.restEnd],
    ]
    for (const [ms, fn] of seq) window.setTimeout(fn, ms)
    window.setTimeout(() => say('Son activé'), 8200)
  },
}
