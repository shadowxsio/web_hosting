/**
 * Tempo guidé par le coach sonore : enchaînement des phases d'UNE répétition.
 *   go   = effort (concentrique)        → bip aigu
 *   back = retour contrôlé (excentrique) → bip grave + métronome chaque seconde
 *   hold = pause / contraction           → double bip
 * Les exercices « timed » (gainage, équilibre) n'ont pas de tempo : le coach
 * fait un chrono de maintien.
 */
import type { Exercise } from './program'

export type PhaseKind = 'go' | 'back' | 'hold'
export interface Phase {
  label: string
  s: number
  kind: PhaseKind
}

const P = (label: string, s: number, kind: PhaseKind): Phase => ({ label, s, kind })
const raise = (top = 1, down = 2) => [P('Monte', 1, 'go'), P('Tiens', top, 'hold'), P('Descends', down, 'back')]

export const CADENCE: Record<string, Phase[]> = {
  'tibialis-raise': [P('Lève', 1, 'go'), P('Tiens', 1, 'hold'), P('Descends', 2, 'back')],
  'calf-raise-warm': raise(),
  'sl-glute-bridge': [P('Monte', 1, 'go'), P('Serre', 2, 'hold'), P('Descends', 2, 'back')],
  'banded-walk': [P('Pas', 1, 'go'), P('Pose', 1, 'hold')],
  'db-rdl': [P('Descends', 3, 'back'), P('Monte', 1, 'go')],
  bulgarian: [P('Descends', 3, 'back'), P('Pause', 1, 'hold'), P('Pousse', 1, 'go')],
  'leg-curl': [P('Plie', 1, 'go'), P('Retiens', 3, 'back')],
  'nordic-curl': [P('Descends', 5, 'back'), P('Remonte', 2, 'go')],
  'hip-abduction': [P('Ouvre', 1, 'go'), P('Tiens', 1, 'hold'), P('Ferme', 2, 'back')],
  'standing-calf': raise(),
  'sl-rdl': [P('Descends', 3, 'back'), P('Monte', 1, 'go'), P('Équilibre', 1, 'hold')],
  'hip-thrust': [P('Monte', 1, 'go'), P('Serre', 1, 'hold'), P('Descends', 2, 'back')],
  'leg-press-high': [P('Descends', 3, 'back'), P('Pousse', 1, 'go')],
  'step-down': [P('Descends', 4, 'back'), P('Remonte', 1, 'go')],
  'soleus-raise': raise(1, 2),
  'sl-calf-raise': raise(),
}

/** Exercices ajoutés à la main : effort 1 s, retour contrôlé 2 s. */
const DEFAULT: Phase[] = [P('Effort', 1, 'go'), P('Retour', 2, 'back')]

export function cadenceOf(ex: Exercise): Phase[] | null {
  if (ex.mode !== 'strength') return null
  return ex.cadence?.length ? ex.cadence : (CADENCE[ex.id] ?? DEFAULT)
}

export const repSeconds = (c: Phase[]) => c.reduce((a, p) => a + p.s, 0)
