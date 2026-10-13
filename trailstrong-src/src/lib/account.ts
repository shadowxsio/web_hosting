/**
 * Compte actif sur cet appareil (uid Firebase). Toutes les données propres à un
 * compte sont rangées sous des clés localStorage préfixées par cet uid, pour
 * que plusieurs personnes puissent utiliser le même appareil sans se mélanger.
 * Sans compte (mode local historique), les clés restent inchangées.
 */
const ACCOUNT_KEY = 'trailstrong:account'

export const ACCOUNT: string = (() => {
  try {
    return localStorage.getItem(ACCOUNT_KEY) ?? ''
  } catch {
    return ''
  }
})()

/** Clé localStorage du compte actif. */
export const scoped = (key: string) => (ACCOUNT ? `ts:${ACCOUNT}:${key}` : key)

/** Change de compte : les stores relisent leurs données au rechargement. */
export function switchAccount(uid: string | null) {
  if (uid) localStorage.setItem(ACCOUNT_KEY, uid)
  else localStorage.removeItem(ACCOUNT_KEY)
  location.reload()
}

/** Clés du mode local historique (avant les comptes) : source de la migration. */
export const LEGACY = { data: 'trailstrong:v1', custom: (sid: string) => `custom_exercises_${sid}`, program: 'trailstrong:program' }
