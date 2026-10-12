/**
 * Connexion Google — réutilise le backend run-agent (Cloud Run) de l'app coach :
 *   GET  /api/auth/config  → { google_client_id }
 *   POST /api/verify-pin   (Authorization: Bearer <ID token Google>)
 *        → 200 si l'email est dans ALLOWED_GOOGLE_EMAIL, 401 sinon.
 *
 * Une fois validé, l'appareil reste autorisé 30 jours (utilisable hors-ligne
 * au sous-sol du gym). Aucune donnée d'entraînement n'est envoyée au serveur.
 */
export const AUTH_API = ((import.meta.env.VITE_AUTH_API_URL as string | undefined) || 'https://run-agent-jwcn6ptbgq-uc.a.run.app').replace(/\/$/, '')

const KEY = 'trailstrong:google-session'
const TTL = 30 * 24 * 3600 * 1000

export interface GoogleSession {
  email: string
  name?: string
  picture?: string
  exp: number // fin de validité de l'autorisation de l'appareil (ms)
}

interface GisWindow {
  google?: {
    accounts: {
      id: {
        initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; auto_select?: boolean; ux_mode?: string }) => void
        renderButton: (el: HTMLElement, o: Record<string, unknown>) => void
        disableAutoSelect: () => void
      }
    }
  }
}

export function getGoogleSession(): GoogleSession | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as GoogleSession | null
    return s && s.exp > Date.now() ? s : null
  } catch {
    return null
  }
}

export function signOut() {
  localStorage.removeItem(KEY)
  ;(window as GisWindow).google?.accounts.id.disableAutoSelect()
}

let clientIdPromise: Promise<string> | null = null
export function getClientId(): Promise<string> {
  clientIdPromise ??= fetch(`${AUTH_API}/api/auth/config`)
    .then((r) => {
      if (!r.ok) throw new Error(`Serveur d’authentification indisponible (${r.status}).`)
      return r.json() as Promise<{ google_client_id?: string }>
    })
    .then((c) => {
      if (!c.google_client_id) throw new Error('GOOGLE_CLIENT_ID non configuré sur le serveur.')
      return c.google_client_id
    })
    .catch((e) => {
      clientIdPromise = null
      throw e
    })
  return clientIdPromise
}

let gisPromise: Promise<void> | null = null
export function loadGis(): Promise<void> {
  if ((window as GisWindow).google?.accounts?.id) return Promise.resolve()
  gisPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      gisPromise = null
      reject(new Error('Impossible de charger Google (hors-ligne ?).'))
    }
    document.head.appendChild(s)
  })
  return gisPromise
}

function decodeJwt(token: string): Record<string, unknown> {
  const part = token.split('.')[1] ?? ''
  const json = decodeURIComponent(
    atob(part.replace(/-/g, '+').replace(/_/g, '/'))
      .split('')
      .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join(''),
  )
  return JSON.parse(json) as Record<string, unknown>
}

/** Vérifie le jeton auprès du backend ; enregistre la session de l'appareil si autorisé. */
export async function verifyCredential(idToken: string): Promise<GoogleSession> {
  const res = await fetch(`${AUTH_API}/api/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
  })
  if (!res.ok) {
    const detail = await res
      .json()
      .then((j: { detail?: string }) => j.detail)
      .catch(() => undefined)
    throw new Error(detail || (res.status === 401 ? 'Ce compte Google n’est pas autorisé.' : `Erreur serveur (${res.status}).`))
  }
  const body = (await res.json().catch(() => ({}))) as { email?: string }
  const claims = decodeJwt(idToken)
  const session: GoogleSession = {
    email: body.email ?? String(claims.email ?? ''),
    name: claims.name ? String(claims.name) : undefined,
    picture: claims.picture ? String(claims.picture) : undefined,
    exp: Date.now() + TTL,
  }
  localStorage.setItem(KEY, JSON.stringify(session))
  return session
}

/** Affiche le bouton officiel « Se connecter avec Google » dans `el`. */
export async function renderGoogleButton(el: HTMLElement, onCredential: (token: string) => void) {
  const [clientId] = await Promise.all([getClientId(), loadGis()])
  const g = (window as GisWindow).google!
  g.accounts.id.initialize({ client_id: clientId, callback: (r) => onCredential(r.credential), auto_select: true })
  el.replaceChildren()
  g.accounts.id.renderButton(el, { theme: 'filled_black', size: 'large', shape: 'rectangular', text: 'signin_with', width: Math.min(300, el.clientWidth || 300), locale: 'fr' })
}
