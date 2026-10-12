/**
 * Verrou PIN côté client.
 *
 * Le hash attendu (SHA-256 hex du PIN) vient, par ordre de priorité :
 *   1. d'un PIN local choisi dans Réglages (localStorage) ;
 *   2. du secret GitHub Actions APP_PASSWORD_HASH injecté au build (VITE_APP_PASSWORD_HASH) ;
 *   3. du PIN par défaut « 2026 » (à remplacer !).
 *
 * ⚠️ C'est un rideau anti-curieux, pas un coffre-fort : sur GitHub Pages le
 * bundle JS est public. Les données personnelles, elles, restent dans le
 * navigateur (localStorage) et ne sont jamais publiées.
 */
const DEFAULT_HASH = '158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab' // "2026"
const LOCAL_KEY = 'trailstrong:pin-hash'
const SESSION_KEY = 'trailstrong:session'

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

export async function setLocalPin(pin: string) {
  localStorage.setItem(LOCAL_KEY, await sha256Hex(pin))
  sessionStorage.setItem(SESSION_KEY, pin)
}

export function resetLocalPin() {
  localStorage.removeItem(LOCAL_KEY)
}

/** Le PIN reste en sessionStorage (onglet courant) : il sert aussi de clé de chiffrement des backups. */
export function startSession(pin: string) {
  sessionStorage.setItem(SESSION_KEY, pin)
}

export function sessionPin(): string | null {
  return sessionStorage.getItem(SESSION_KEY)
}

export async function hasValidSession(): Promise<boolean> {
  const pin = sessionPin()
  return pin !== null && (await checkPin(pin))
}

export function lock() {
  sessionStorage.removeItem(SESSION_KEY)
}
