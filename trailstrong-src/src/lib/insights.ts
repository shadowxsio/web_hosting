/**
 * Analyses locales : tendance de la douleur genou / cheville et suggestion
 * de charge (surcharge progressive prudente).
 */
import type { Exercise } from '../data/program'
import { exerciseHistory, type AppData, type Checkin } from './storage'
import { num } from './useExerciseLog'

export type Joint = 'knee' | 'ankle'
export const JOINT_LABEL: Record<Joint, string> = { knee: 'genou', ankle: 'cheville' }

/** Douleur max du jour pour une articulation (avant / après), ou undefined. */
export function dayPain(c: Checkin | undefined, j: Joint): number | undefined {
  if (!c) return undefined
  const v = j === 'knee' ? [c.kneeBefore, c.kneeAfter] : [c.ankleBefore, c.ankleAfter]
  const vals = v.filter((x): x is number => typeof x === 'number')
  return vals.length ? Math.max(...vals) : undefined
}

/** Série temporelle de douleur (dates triées). */
export function painSeries(data: AppData, j: Joint) {
  return Object.keys(data.checkins)
    .sort()
    .map((date) => ({ date, value: dayPain(data.checkins[date], j) }))
    .filter((x): x is { date: string; value: number } => x.value !== undefined)
}

/**
 * Alerte si la douleur monte 2 check-ins de suite (et atteint ≥ 3),
 * ou si le dernier relevé est ≥ 6.
 */
export function painAlert(data: AppData, upTo: string): { joint: Joint; value: number; reason: string }[] {
  const out: { joint: Joint; value: number; reason: string }[] = []
  for (const j of ['knee', 'ankle'] as Joint[]) {
    const s = painSeries(data, j).filter((x) => x.date <= upTo)
    const n = s.length
    if (!n) continue
    const last = s[n - 1].value
    if (last >= 6) out.push({ joint: j, value: last, reason: `douleur ${JOINT_LABEL[j]} à ${last}/10` })
    else if (n >= 3 && s[n - 1].value > s[n - 2].value && s[n - 2].value > s[n - 3].value && last >= 3)
      out.push({ joint: j, value: last, reason: `douleur ${JOINT_LABEL[j]} en hausse 2 fois de suite (${s[n - 3].value} → ${s[n - 2].value} → ${last})` })
  }
  return out
}

/** Haut de la fourchette de reps : « 8-10 reps » → 10 ; « 12 reps / jambe » → 12. */
export function topReps(ex: Exercise): number | undefined {
  const m = ex.reps.match(/(\d+)\s*(?:-\s*(\d+))?/)
  return m ? Number(m[2] ?? m[1]) : ex.defaultReps
}

export interface Suggestion {
  kind: 'up' | 'hold'
  weight: number
  from: number
  text: string
}

/**
 * Surcharge progressive : si les 2 dernières séances ont toutes leurs séries au
 * haut de la fourchette à la même charge → +5 lbs (+2,5 sous 20 lbs).
 * Si une douleur liée est élevée/en hausse → maintien.
 */
export function loadSuggestion(data: AppData, ex: Exercise, date: string): Suggestion | null {
  if (ex.mode !== 'strength' || ex.bodyweight) return null
  const top = topReps(ex)
  if (!top) return null
  const hist = exerciseHistory(data, ex.id).filter((h) => h.date < date && h.maxW > 0)
  const last2 = hist.slice(-2)
  if (last2.length < 2) return null
  const w = last2[1].maxW
  const atTop = last2.every((h) => {
    const log = data.logs[h.date][ex.id]
    const done = log.sets.filter((s) => s.done)
    return h.maxW === w && done.length >= ex.sets && done.every((s) => num(s.r) >= top && num(s.w) >= w)
  })
  if (!atTop) return null
  const joints: Joint[] = ex.tags.includes('ankle') && !ex.tags.includes('knee') ? ['ankle'] : ['knee', 'ankle']
  const alert = painAlert(data, date).find((a) => joints.includes(a.joint))
  if (alert) return { kind: 'hold', weight: w, from: w, text: `Garde ${w} lbs : ${alert.reason}.` }
  const step = w < 20 ? 2.5 : 5
  return { kind: 'up', weight: w + step, from: w, text: `Passe à ${w + step} lbs : 2 séances à ${top} reps sur toutes les séries à ${w} lbs.` }
}
