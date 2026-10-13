/**
 * Programme propre à chaque compte. Les séances gardent les 4 emplacements
 * fixes (activation, seanceA, seanceB, tapis) mais leur contenu, leurs titres
 * et leurs étirements viennent du plan du compte. Sans plan : programme de base.
 */
import { useSyncExternalStore } from 'react'
import { EXTRAS } from '../data/extras'
import { PROGRAM, type Exercise, type Session, type SessionId } from '../data/program'
import { scoped } from './account'

export interface PlanItem {
  id: string
  sets?: number
  reps?: string
  defaultReps?: number
  rest?: number
}

export interface SessionPlan {
  title: string
  short: string
  subtitle: string
  goal: string
  duration: string
  items: PlanItem[]
  cooldown: string[]
  runAdvice?: string
}

export interface UserProgram {
  version: 1
  createdAt: number
  sessions: Partial<Record<SessionId, SessionPlan>>
}

/** Tous les exercices connus (programme de base + bibliothèque). */
export const LIBRARY: Record<string, Exercise> = Object.fromEntries([...PROGRAM.flatMap((s) => s.exercises), ...EXTRAS].map((e) => [e.id, e]))

const KEY = scoped('trailstrong:program')
const read = (): UserProgram | null => {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null') as UserProgram | null
    return p && p.version === 1 && p.sessions ? p : null
  } catch {
    return null
  }
}
let plan = read()
const ls = new Set<() => void>()

export const getUserProgram = () => plan
export function setUserProgram(p: UserProgram | null) {
  plan = p
  try {
    if (p) localStorage.setItem(KEY, JSON.stringify(p))
    else localStorage.removeItem(KEY)
  } catch {
    /* quota */
  }
  ls.forEach((l) => l())
}
export function onProgramChange(l: () => void) {
  ls.add(l)
  return () => ls.delete(l)
}
export function useUserProgram() {
  return useSyncExternalStore(
    (l) => {
      ls.add(l)
      return () => ls.delete(l)
    },
    () => plan,
  )
}

/** Séances affichées : plan du compte appliqué aux 4 emplacements. */
export function buildProgram(p: UserProgram | null): Session[] {
  if (!p) return PROGRAM
  return PROGRAM.map((base) => {
    const sp = p.sessions[base.id]
    if (!sp) return { ...base, exercises: [] }
    const exercises = sp.items
      .filter((it) => LIBRARY[it.id])
      .map((it) => {
        const ex = LIBRARY[it.id]
        return {
          ...ex,
          sets: it.sets ?? ex.sets,
          reps: it.reps ?? ex.reps,
          defaultReps: it.defaultReps ?? ex.defaultReps,
          rest: it.rest ?? ex.rest,
        }
      })
    return { ...base, title: sp.title, short: sp.short, subtitle: sp.subtitle, goal: sp.goal, duration: sp.duration, exercises, cooldown: sp.cooldown, runAdvice: sp.runAdvice }
  })
}
