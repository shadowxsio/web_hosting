/**
 * Connexion Google SANS serveur.
 *
 * Le bouton Google Identity Services renvoie un jeton d'identité (JWT RS256)
 * que l'app vérifie elle-même :
 *   1. signature contrôlée avec les clés publiques de Google (JWKS, WebCrypto) ;
 *   2. émetteur Google, audience = notre client ID, jeton non expiré, email vérifié ;
 *   3. empreinte SHA-256 de l'email ∈ liste autorisée (fixée au build : l'email
 *      n'apparaît jamais en clair dans le code publié).
 *
 * Configuration au build (variables / secrets du dépôt GitHub) :
 *   VITE_GOOGLE_CLIENT_ID  — client OAuth Web (origine https://shadowxsio.github.io autorisée)
 *   ALLOWED_GOOGLE_EMAIL   — email(s) autorisé(s), séparés par des virgules
 *
 * Une fois validé, l'appareil reste autorisé 30 jours (utilisable hors-ligne).
 */
export const CLIENT_ID = ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '').trim()
const ALLOWED_HASHES: string[] = __ALLOWED_EMAIL_HASHES__
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs'
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com']

const KEY = 'trailstrong:google-session'
const TTL = 30 * 24 * 3600 * 1000

export interface GoogleSession {
  email: string
  name?: string
  exp: number // fin de validité de l'autorisation de l'appareil (ms)
}

interface GisWindow {
  google?: {
    accounts: {
      id: {
        initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; auto_select?: boolean }) => void
        renderButton: (el: HTMLElement, o: Record<string, unknown>) => void
        disableAutoSelect: () => void
      }
    }
  }
}

/** La connexion Google est-elle configurée dans ce build ? */
export const googleConfigured = () => !!CLIENT_ID && ALLOWED_HASHES.length > 0

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

const b64urlBytes = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0))
const b64urlJson = (s: string) => JSON.parse(new TextDecoder().decode(b64urlBytes(s))) as Record<string, unknown>

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Vérifie le jeton Google localement ; enregistre la session de l'appareil si autorisé. */
export async function verifyCredential(idToken: string): Promise<GoogleSession> {
  const parts = idToken.split('.')
  if (parts.length !== 3) throw new Error('Jeton Google invalide.')
  const [h, p, sig] = parts
  const header = b64urlJson(h)
  const claims = b64urlJson(p)
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('Jeton Google invalide (algorithme).')

  // 1. Signature
  const res = await fetch(JWKS_URL)
  if (!res.ok) throw new Error('Clés Google indisponibles, réessaie.')
  const { keys } = (await res.json()) as { keys: (JsonWebKey & { kid: string })[] }
  const jwk = keys.find((k) => k.kid === header.kid)
  if (!jwk) throw new Error('Jeton Google invalide (clé inconnue).')
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(sig) as BufferSource, new TextEncoder().encode(`${h}.${p}`))
  if (!ok) throw new Error('Signature du jeton Google invalide.')

  // 2. Claims
  if (!ISSUERS.includes(String(claims.iss))) throw new Error('Jeton non émis par Google.')
  if (claims.aud !== CLIENT_ID) throw new Error('Jeton destiné à une autre application.')
  if (Number(claims.exp) * 1000 < Date.now()) throw new Error('Jeton Google expiré, reconnecte-toi.')
  if (claims.email_verified !== true) throw new Error('Email Google non vérifié.')

  // 3. Email autorisé
  const email = String(claims.email ?? '').trim().toLowerCase()
  if (!ALLOWED_HASHES.includes(await sha256Hex(email))) throw new Error('Ce compte Google n’est pas autorisé.')

  const session: GoogleSession = { email, name: claims.name ? String(claims.name) : undefined, exp: Date.now() + TTL }
  localStorage.setItem(KEY, JSON.stringify(session))
  return session
}

/** Affiche le bouton officiel « Se connecter avec Google » dans `el`. */
export async function renderGoogleButton(el: HTMLElement, onCredential: (token: string) => void) {
  if (!CLIENT_ID) throw new Error('Connexion Google non configurée dans ce build.')
  await loadGis()
  const g = (window as GisWindow).google!
  g.accounts.id.initialize({ client_id: CLIENT_ID, callback: (r) => onCredential(r.credential), auto_select: true })
  el.replaceChildren()
  g.accounts.id.renderButton(el, { theme: 'filled_black', size: 'large', shape: 'rectangular', text: 'signin_with', width: Math.min(300, el.clientWidth || 300), locale: 'fr' })
}
