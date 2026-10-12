/**
 * Accès à l'app :
 *   - Connexion Google (compte autorisé côté backend run-agent) → accès normal ;
 *   - PIN → « mode admin » : déverrouille les Réglages (sauvegardes, PIN, token)
 *     pendant 10 min, et sert d'accès de secours si Google est indisponible.
 *
 * Le hash attendu du PIN (SHA-256 hex) vient, par ordre de priorité :
 *   1. d'un PIN local choisi dans Réglages (localStorage) ;
 *   2. du secret GitHub Actions APP_PASSWORD_HASH injecté au build ;
 *   3. du PIN par défaut « 2026 » (à remplacer !).
 *
 * Après 5 PIN faux : blocage 30 s, puis 2 min, puis 10 min (persistant).
 */
import { useSyncExternalStore } from 'react'
import { getGoogleSession, signOut } from './googleAuth'

const DEFAULT_HASH = '158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab' // "2026"
const LOCAL_KEY = 'trailstrong:pin-hash'
const SESSION_KEY = 'trailstrong:session'
const ADMIN_KEY = 'trailstrong:admin-until'
const THROTTLE_KEY = 'trailstrong:pin-throttle'
const ADMIN_TTL = 10 * 60 * 1000

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function buildHash(): string | undefined {
  const h = (import.meta.env.VITE_APP_PASSWORD_HASH as string | undefined)?.trim().toLowerCase()
  return h && /^[0-9a-f]{64}$/.test(h) ? h : undefined
}

export function expectedHash(): string {
  return localStorage.getItem(LOCAL_KEY) ?? buildHash() ?? DEFAULT_HASH
}

export function usingDefaultPin() {
  return expectedHash() === DEFAULT_HASH
}

export async function checkPin(pin: string): Promise<boolean> {
  return (await sha256Hex(pin)) === expectedHash()
}

// ── Anti force brute ─────────────────────────────────────────────────────
interface Throttle {
  fails: number
  until: number
}
const readThrottle = (): Throttle => {
  try {
    return { fails: 0, until: 0, ...(JSON.parse(localStorage.getItem(THROTTLE_KEY) ?? '{}') as Partial<Throttle>) }
  } catch {
    return { fails: 0, until: 0 }
  }
}

/** Secondes de blocage restantes (0 si libre). */
export function lockedFor(): number {
  return Math.max(0, Math.ceil((readThrottle().until - Date.now()) / 1000))
}

export type PinResult = { ok: true } | { ok: false; lockedFor: number; remaining: number }

/** Vérifie un PIN en appliquant le blocage progressif. */
export async function attemptPin(pin: string, countFailure = true): Promise<PinResult> {
  const wait = lockedFor()
  if (wait > 0) return { ok: false, lockedFor: wait, remaining: 0 }
  if (await checkPin(pin)) {
    localStorage.removeItem(THROTTLE_KEY)
    return { ok: true }
  }
  if (!countFailure) return { ok: false, lockedFor: 0, remaining: 5 }
  const t = readThrottle()
  t.fails += 1
  if (t.fails % 5 === 0) {
    const step = t.fails / 5 // 1 → 30 s, 2 → 2 min, ≥3 → 10 min
    t.until = Date.now() + (step === 1 ? 30 : step === 2 ? 120 : 600) * 1000
  }
  localStorage.setItem(THROTTLE_KEY, JSON.stringify(t))
  return { ok: false, lockedFor: lockedFor(), remaining: 5 - (t.fails % 5) }
}

// ── Sessions ─────────────────────────────────────────────────────────────
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export async function setLocalPin(pin: string) {
  localStorage.setItem(LOCAL_KEY, await sha256Hex(pin))
  startSession(pin)
}

export function resetLocalPin() {
  localStorage.removeItem(LOCAL_KEY)
}

/** PIN validé : session de l'onglet + mode admin pour 10 min. */
export function startSession(pin: string) {
  sessionStorage.setItem(SESSION_KEY, pin)
  sessionStorage.setItem(ADMIN_KEY, String(Date.now() + ADMIN_TTL))
  emit()
}

export function sessionPin(): string | null {
  return sessionStorage.getItem(SESSION_KEY)
}

export function isAdmin(): boolean {
  return Number(sessionStorage.getItem(ADMIN_KEY) ?? 0) > Date.now()
}

export function exitAdmin() {
  sessionStorage.removeItem(ADMIN_KEY)
  emit()
}

/** Hook réactif : true tant que le mode admin est actif (expire tout seul). */
export function useAdmin(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      const id = window.setInterval(l, 15_000)
      return () => {
        listeners.delete(l)
        window.clearInterval(id)
      }
    },
    isAdmin,
  )
}

/** Accès à l'app : compte Google autorisé sur cet appareil, ou PIN saisi dans l'onglet. */
export async function hasValidSession(): Promise<boolean> {
  if (getGoogleSession()) return true
  const pin = sessionPin()
  return pin !== null && (await checkPin(pin))
}

/** Déconnexion complète (Google + PIN + admin). */
export function lock() {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(ADMIN_KEY)
  signOut()
  emit()
}
