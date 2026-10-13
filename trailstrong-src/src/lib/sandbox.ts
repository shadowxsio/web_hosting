/**
 * Profil de test (bac à sable) : un compte temporaire, uniquement local, pour
 * essayer le questionnaire, la génération de programme, le coach… sans toucher
 * aux vraies données ni au cloud. Tout est effacé en entrant et en sortant.
 */
import { ACCOUNT, switchAccount } from './account'

export const SANDBOX = 'sandbox'
export const inSandbox = ACCOUNT === SANDBOX
const RETURN_KEY = 'trailstrong:sandbox-return'

function clearSandbox() {
  for (const k of Object.keys(localStorage)) if (k.startsWith(`ts:${SANDBOX}:`)) localStorage.removeItem(k)
}

export function enterSandbox() {
  clearSandbox()
  localStorage.setItem(RETURN_KEY, ACCOUNT)
  switchAccount(SANDBOX)
}

export function exitSandbox() {
  clearSandbox()
  const back = localStorage.getItem(RETURN_KEY) ?? ''
  localStorage.removeItem(RETURN_KEY)
  switchAccount(back || null)
}
