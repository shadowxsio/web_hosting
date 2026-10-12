/**
 * Logique de suivi d'un exercice pour une date : séries, suggestions, validation,
 * chrono de repos auto. Partagée par la carte du catalogue et le tiroir de détail.
 */
import type { Exercise } from '../data/program'
import { previousBest, updateExercise, useData, type ExerciseLog, type SetLog } from './storage'
import { timer } from './timer'

export const num = (s: string) => {
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

const emptySets = (n: number): SetLog[] => Array.from({ length: n }, () => ({ w: '', r: '', done: false }))

export function useExerciseLog(ex: Exercise, date: string) {
  const data = useData()
  const log: ExerciseLog = data.logs[date]?.[ex.id] ?? { sets: [] }
  const sets = log.sets.length >= ex.sets ? log.sets : [...log.sets, ...emptySets(ex.sets - log.sets.length)]
  const best = previousBest(data, ex.id, date)
  const done = !!log.done
  const unit = ex.mode === 'timed' ? 's' : 'reps'

  const write = (fn: (l: ExerciseLog) => ExerciseLog) => updateExercise(date, ex.id, fn)

  // Valeur suggérée : série précédente du jour, sinon même série la dernière fois, sinon poids de départ.
  const hintW = (i: number) => (i > 0 && sets[i - 1].w) || best.lastLog?.sets[i]?.w || ex.startWeight || ''
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

  return { log, sets, done, unit, write, hintW, hintR, setField, validate, addSet, toggleDone, doneSets, firstTodo, maxToday, prev, ...best }
}
