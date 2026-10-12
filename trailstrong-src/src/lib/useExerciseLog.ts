/**
 * Logique de suivi d'un exercice pour une date : séries, suggestions, validation,
 * chrono de repos auto. Partagée par la carte du catalogue et le tiroir de détail.
 */
import type { Exercise } from '../data/program'
import { asymmetry, previousBest, updateExercise, useData, type ExerciseLog, type SetLog, type Side, type SideLog } from './storage'
import { loadSuggestion } from './insights'
import { timer } from './timer'

export const num = (s: string) => {
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export const SIDE_LABEL: Record<Side, string> = { L: 'gauche', R: 'droite' }
const other = (s: Side): Side => (s === 'L' ? 'R' : 'L')
/** Délai pour changer de jambe entre G et D. */
export const SWITCH_SECONDS = 10

const emptySets = (n: number): SetLog[] => Array.from({ length: n }, () => ({ w: '', r: '', done: false }))

export function useExerciseLog(ex: Exercise, date: string) {
  const data = useData()
  const log: ExerciseLog = data.logs[date]?.[ex.id] ?? { sets: [] }
  const sets = log.sets.length >= ex.sets ? log.sets : [...log.sets, ...emptySets(ex.sets - log.sets.length)]
  const best = previousBest(data, ex.id, date)
  const suggestion = loadSuggestion(data, ex, date)
  const sugW = suggestion?.kind === 'up' ? String(suggestion.weight) : ''
  const done = !!log.done
  const unit = ex.mode === 'timed' ? 's' : 'reps'

  const write = (fn: (l: ExerciseLog) => ExerciseLog) => updateExercise(date, ex.id, fn)

  // Valeur suggérée : série précédente du jour, sinon même série la dernière fois, sinon poids de départ.
  const hintW = (i: number) => (i > 0 && sets[i - 1].w) || sugW || best.lastLog?.sets[i]?.w || ex.startWeight || ''
  const hintR = (i: number) => (i > 0 && sets[i - 1].r) || best.lastLog?.sets[i]?.r || String(ex.defaultReps ?? '')

  const setField = (i: number, field: 'w' | 'r', value: string) =>
    write((l) => {
      const next = l.sets.length >= sets.length ? [...l.sets] : [...sets]
      next[i] = { ...next[i], [field]: value }
      return { ...l, sets: next }
    })

  /** Valide / annule une série. Sans saisie, reprend la suggestion. Lance le repos. */
  const validate = (i: number) => {
    const s = sets[i]
    const willBeDone = !s.done
    write((l) => {
      const next = l.sets.length >= sets.length ? [...l.sets] : [...sets]
      const w = s.w || (willBeDone ? hintW(i) : s.w)
      const r = s.r || (willBeDone ? hintR(i) : s.r)
      next[i] = { w, r, done: willBeDone, at: willBeDone ? Date.now() : undefined }
      const allDone = next.every((x) => x.done)
      return { ...l, sets: next, done: allDone ? true : l.done && willBeDone }
    })
    if (willBeDone) {
      navigator.vibrate?.(30)
      const isLast = sets.filter((x) => x.done).length + 1 >= sets.length
      if (ex.rest > 0 && !isLast) timer.start(ex.rest)
    }
  }

  const addSet = () => write((l) => ({ ...l, sets: [...sets, { w: '', r: '', done: false }], done: false }))

  const toggleDone = () => {
    navigator.vibrate?.(done ? 10 : [20, 30, 40])
    write((l) => ({ ...l, sets: l.sets.length ? l.sets : sets, done: !done }))
  }

  // ── Unilatéral : G puis D (en commençant par le côté le plus faible) ──
  const asym = ex.perSide ? asymmetry(data, ex.id, date) : null
  const firstSide: Side = asym?.weak ?? 'L'
  const sideOrder: [Side, Side] = [firstSide, other(firstSide)]

  const sideOf = (i: number, side: Side): SideLog => sets[i]?.[side] ?? { w: '', r: '', done: false }
  const hintSideW = (i: number, side: Side) =>
    (i > 0 && sets[i - 1][side]?.w) || sugW || best.lastLog?.sets[i]?.[side]?.w || sideOf(i, other(side)).w || hintW(i)
  const hintSideR = (i: number, side: Side) =>
    (i > 0 && sets[i - 1][side]?.r) || best.lastLog?.sets[i]?.[side]?.r || hintR(i)

  const setSideField = (i: number, side: Side, field: 'w' | 'r', value: string) =>
    write((l) => {
      const next = l.sets.length >= sets.length ? [...l.sets] : [...sets]
      const cur = next[i][side] ?? { w: '', r: '', done: false }
      next[i] = { ...next[i], [side]: { ...cur, [field]: value } }
      return { ...l, sets: next }
    })

  /** Valide / annule un côté d'une série. G validée → décompte « change de jambe » ; les deux → repos. */
  const validateSide = (i: number, side: Side) => {
    const cur = sideOf(i, side)
    const willBeDone = !cur.done
    const otherDone = sideOf(i, other(side)).done
    write((l) => {
      const next = l.sets.length >= sets.length ? [...l.sets] : [...sets]
      const filled: SideLog = {
        w: cur.w || (willBeDone ? hintSideW(i, side) : cur.w),
        r: cur.r || (willBeDone ? hintSideR(i, side) : cur.r),
        done: willBeDone,
      }
      const set: SetLog = { ...next[i], [side]: filled }
      const L = side === 'L' ? filled : set.L
      const Rr = side === 'R' ? filled : set.R
      const both = !!(L?.done && Rr?.done)
      // Synthèse pour l'historique : charge max, reps du côté le plus faible.
      set.done = both
      set.at = both ? Date.now() : undefined
      if (both) {
        set.w = String(Math.max(num(L!.w), num(Rr!.w)) || '')
        set.r = String(Math.min(num(L!.r), num(Rr!.r)) || '')
      }
      next[i] = set
      const allDone = next.every((x) => x.done)
      return { ...l, sets: next, done: allDone ? true : l.done && both }
    })
    if (!willBeDone) return
    navigator.vibrate?.(30)
    if (!otherDone) {
      timer.start(SWITCH_SECONDS, `Change de jambe → ${SIDE_LABEL[other(side)]}`)
    } else {
      const isLast = sets.filter((x) => x.done).length + 1 >= sets.length
      if (ex.rest > 0 && !isLast) timer.start(ex.rest)
      else timer.reset()
    }
  }

  const doneSets = sets.filter((s) => s.done)
  const firstTodo = sets.findIndex((s) => !s.done)
  const maxToday = Math.max(0, ...doneSets.map((s) => num(s.w)))

  /** Dernière perf affichable : poids max, sinon séries × reps. */
  const prev =
    ex.mode === 'treadmill'
      ? null
      : best.last && best.last.maxW > 0
        ? { value: String(best.last.maxW), unit: 'lbs' }
        : best.last && best.lastLog
          ? {
              value: `${best.lastLog.sets.filter((x) => x.done).length}×${Math.max(...best.lastLog.sets.filter((x) => x.done).map((x) => num(x.r)))}`,
              unit,
            }
          : null

  return {
    log,
    sets,
    done,
    unit,
    write,
    hintW,
    hintR,
    setField,
    validate,
    addSet,
    toggleDone,
    doneSets,
    firstTodo,
    maxToday,
    prev,
    asym,
    suggestion,
    sideOrder,
    sideOf,
    hintSideW,
    hintSideR,
    setSideField,
    validateSide,
    ...best,
  }
}
