/**
 * Backup « cloud » optionnel vers un Gist SECRET de l'utilisateur.
 *
 * Le contenu est chiffré en AES-GCM 256 avec une clé dérivée du PIN
 * (PBKDF2-SHA256, 250 000 itérations, sel aléatoire) : le Gist ne contient
 * qu'un blob illisible. Désactivé par défaut ; le token (scope « gist »
 * uniquement) reste sur l'appareil.
 */
import { sessionPin } from './auth'
import { exportJson, getData, importJson, updateGist, useData } from './storage'
import { useEffect } from 'react'

const FILE = 'trailstrong-backup.json'
const API = 'https://api.github.com/gists'

const b64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function deriveKey(pin: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: 250_000 },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encrypt(plain: string, pin: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(pin, salt)
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain))
  return JSON.stringify({ app: 'TrailStrong 2026', v: 1, alg: 'PBKDF2-SHA256/AES-GCM-256', salt: b64(salt), iv: b64(iv), data: b64(data) })
}

export async function decrypt(blob: string, pin: string) {
  const p = JSON.parse(blob) as { salt: string; iv: string; data: string }
  const key = await deriveKey(pin, unb64(p.salt))
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(p.iv) as BufferSource }, key, unb64(p.data) as BufferSource)
  return new TextDecoder().decode(plain)
}

function headers(token: string) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
}

export async function backupNow(): Promise<void> {
  const { gist } = getData()
  const pin = sessionPin()
  if (!gist.token) throw new Error('Token GitHub manquant.')
  if (!pin) throw new Error('Session verrouillée : ressaisis ton PIN.')
  const content = await encrypt(exportJson(), pin)
  const body = JSON.stringify({
    description: 'TrailStrong 2026 — backup chiffré',
    public: false,
    files: { [FILE]: { content } },
  })
  const res = await fetch(gist.gistId ? `${API}/${gist.gistId}` : API, {
    method: gist.gistId ? 'PATCH' : 'POST',
    headers: headers(gist.token),
    body,
  })
  if (!res.ok) {
    const msg = `GitHub ${res.status} ${res.statusText}`
    updateGist({ lastError: msg })
    throw new Error(msg)
  }
  const json = (await res.json()) as { id: string }
  updateGist({ gistId: json.id, lastBackup: Date.now(), lastError: undefined })
}

export async function restoreFromGist(): Promise<number> {
  const { gist } = getData()
  const pin = sessionPin()
  if (!gist.token || !gist.gistId) throw new Error('Token et ID du Gist requis.')
  if (!pin) throw new Error('Session verrouillée : ressaisis ton PIN.')
  const res = await fetch(`${API}/${gist.gistId}`, { headers: headers(gist.token) })
  if (!res.ok) throw new Error(`GitHub ${res.status} ${res.statusText}`)
  const json = (await res.json()) as { files: Record<string, { content: string; truncated?: boolean; raw_url: string }> }
  const file = json.files[FILE]
  if (!file) throw new Error(`Fichier ${FILE} absent du Gist.`)
  const content = file.truncated ? await (await fetch(file.raw_url)).text() : file.content
  let plain: string
  try {
    plain = await decrypt(content, pin)
  } catch {
    throw new Error('Déchiffrement impossible : le backup a été créé avec un autre PIN.')
  }
  return importJson(plain)
}

/** Backup automatique asynchrone : 20 s après la dernière modification, si en ligne. */
export function useAutoBackup() {
  const data = useData()
  const { enabled, token, lastBackup } = data.gist
  const dirty = enabled && !!token && data.updatedAt > (lastBackup ?? 0)

  useEffect(() => {
    if (!dirty) return
    let timer: number | undefined
    const run = () => {
      if (!navigator.onLine) return
      backupNow().catch(() => {
        /* lastError est déjà enregistré ; nouvel essai à la prochaine modif / reconnexion */
      })
    }
    timer = window.setTimeout(run, 20_000)
    window.addEventListener('online', run)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('online', run)
    }
  }, [dirty, data.updatedAt])
}
