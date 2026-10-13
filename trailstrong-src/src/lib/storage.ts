/**
 * Persistance 100 % client : un seul document JSON versionné dans localStorage.
 *
 * logs[date][exerciseId] = { sets, note, done } — une entrée par jour, ce qui
 * donne gratuitement l'historique semaine après semaine pour les stats et
 * l'indice « Ton record précédent ».
 */
import { useSyncExternalStore } from 'react'
import { scoped } from './account'
import { getAllCustom, mergeCustom } from './custom'
import { getUserProgram, setUserProgram, type UserProgram } from './userProgram'

export type Side = 'L' | 'R'

export interface SideLog {
  w: string
  r: string
  done: boolean
}

export interface SetLog {
  w: string // poids (lbs) — string pour garder la saisie telle quelle
  r: string // reps ou secondes
  done: boolean
  at?: number
  /** Exercices unilatéraux : saisie par jambe (w/r ci-dessus = synthèse pour l'historique). */
  L?: SideLog
  R?: SideLog
}

export interface TreadmillLog {
  minutes: string
  incline: string
  speed: string
}

export interface ExerciseLog {
  sets: SetLog[]
  note?: string
  done?: boolean
  treadmill?: TreadmillLog
}

export interface GistSettings {
  enabled: boolean
  token: string
  gistId: string
  lastBackup?: number
  lastError?: string
}

/** Douleur ressentie (0 = aucune, 10 = maximale), avant / après la séance. */
export interface Checkin {
  kneeBefore?: number
  kneeAfter?: number
  ankleBefore?: number
  ankleAfter?: number
}

/** Résultat d'un test mensuel : valeur par jambe. */
export interface TestResult {
  L?: number
  R?: number
}

/** Profil sportif (sert aux repères de récupération). */
export interface Profile {
  name?: string
  weightKg?: number
  weightUnit?: 'kg' | 'lbs'
  /** Réponses du questionnaire (servent au bilan). */
  sport?: string
  goals?: string[]
  pains?: string[]
  equip?: string
  level?: string
  /** Visite guidée à montrer au prochain affichage (nouveau compte). */
  tourPending?: boolean
  tourDone?: boolean
}

/** Bilan d'une séance pour une date. */
export interface SessionLog {
  /** Difficulté ressentie 1-10. */
  rpe?: number
  /** Course prévue dans les 24 h. */
  runSoon?: boolean
  /** Bilan déjà affiché automatiquement. */
  recapAt?: number
  /** Retour au calme terminé. */
  cooldownAt?: number
}

export interface AppData {
  version: 1
  logs: Record<string, Record<string, ExerciseLog>>
  checkins: Record<string, Checkin>
  /** tests[date][testId] */
  tests: Record<string, Record<string, TestResult>>
  /** sessions[date][sessionId] */
  sessions: Record<string, Record<string, SessionLog>>
  profile: Profile
  gist: GistSettings
  updatedAt: number
}

const KEY = scoped('trailstrong:v1')

const empty = (): AppData => ({
  version: 1,
  logs: {},
  checkins: {},
  tests: {},
  sessions: {},
  profile: {},
  gist: { enabled: false, token: '', gistId: '' },
  updatedAt: 0,
})

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as Partial<AppData>
    return { ...empty(), ...parsed, gist: { ...empty().gist, ...parsed.gist } } as AppData
  } catch {
    return empty()
  }
}

let state: AppData = load()
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export function getData() {
  return state
}

/** Abonnement brut aux changements (synchro du compte). */
export function subscribeData(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function setData(next: AppData, opts: { touch?: boolean } = {}) {
  state = opts.touch === false ? next : { ...next, updatedAt: Date.now() }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* quota / navigation privée : on garde l'état en mémoire */
  }
  emit()
}

export function useData(): AppData {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

// Synchronisation entre onglets.
window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    state = load()
    emit()
  }
})

export function today(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function updateExercise(date: string, exId: string, fn: (prev: ExerciseLog) => ExerciseLog) {
  const day = state.logs[date] ?? {}
  const prev = day[exId] ?? { sets: [] }
  setData({ ...state, logs: { ...state.logs, [date]: { ...day, [exId]: fn(prev) } } })
}

export function updateGist(patch: Partial<GistSettings>, touch = false) {
  setData({ ...state, gist: { ...state.gist, ...patch } }, { touch })
}

const num = (s: string | undefined) => {
  const n = parseFloat((s ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

export interface DayStat {
  date: string
  maxW: number
  volume: number
  reps: number
}

/** Historique par jour d'un exercice (séries validées uniquement). */
export function exerciseHistory(data: AppData, exId: string): DayStat[] {
  return Object.keys(data.logs)
    .sort()
    .flatMap((date) => {
      const log = data.logs[date][exId]
      if (!log) return []
      const sets = log.sets.filter((s) => s.done)
      if (!sets.length) return []
      let maxW = 0
      let volume = 0
      let reps = 0
      for (const s of sets) {
        const w = num(s.w)
        const r = num(s.r)
        if (w > maxW) maxW = w
        if (w > 0 && r > 0) volume += w * r
        if (r > 0) reps += r
      }
      return [{ date, maxW, volume, reps }]
    })
}

/** Dernière séance AVANT `date` + record absolu. */
export function previousBest(data: AppData, exId: string, date: string) {
  const hist = exerciseHistory(data, exId)
  const before = hist.filter((h) => h.date < date)
  const last = before[before.length - 1]
  const pr = before.reduce((m, h) => Math.max(m, h.maxW), 0)
  const lastLog = last ? data.logs[last.date][exId] : undefined
  const current = hist.find((h) => h.date === date)
  return { last, pr, lastLog, newPr: pr > 0 && !!current && current.maxW > pr }
}

/** Travail d'un côté sur une séance : Σ poids×reps (ou Σ reps / secondes sans charge). */
function sideWork(log: ExerciseLog | undefined, side: Side): number {
  if (!log) return 0
  let work = 0
  for (const set of log.sets) {
    const x = set[side]
    if (!x?.done) continue
    const w = num(x.w)
    const r = num(x.r)
    if (r > 0) work += w > 0 ? w * r : r
  }
  return work
}

/**
 * Asymétrie de la dernière séance unilatérale avant `date` :
 * pct > 0 → la droite fait plus que la gauche. weak = côté à travailler en premier.
 */
export function asymmetry(data: AppData, exId: string, date: string, includeDate = false) {
  const dates = Object.keys(data.logs)
    .filter((d) => (includeDate ? d <= date : d < date))
    .sort()
    .reverse()
  for (const d of dates) {
    const log = data.logs[d][exId]
    const l = sideWork(log, 'L')
    const r = sideWork(log, 'R')
    if (l > 0 && r > 0) {
      const pct = Math.round(((r - l) / Math.max(l, r)) * 100)
      return { date: d, l, r, pct, weak: (l <= r ? 'L' : 'R') as Side }
    }
  }
  return null
}

export function treadmillStats(t?: TreadmillLog) {
  const min = num(t?.minutes)
  const inc = num(t?.incline)
  const spd = num(t?.speed)
  if (!(min > 0 && inc >= 0 && spd > 0)) return null
  const km = (spd * min) / 60
  // Pente en % = dénivelé / distance horizontale ≈ distance parcourue sur le tapis.
  const dplus = Math.round(km * 1000 * (inc / 100))
  return { km, dplus }
}

export function exportJson(): string {
  const { gist, ...rest } = state
  // Le token GitHub ne quitte jamais l'appareil via un export.
  return JSON.stringify({ ...rest, gist: { ...gist, token: '' }, customExercises: getAllCustom(), program: getUserProgram(), exportedAt: new Date().toISOString() }, null, 2)
}

export function importJson(text: string): number {
  const parsed = JSON.parse(text) as Partial<AppData> & { customExercises?: unknown; program?: UserProgram | null }
  if (!parsed || typeof parsed !== 'object' || typeof parsed.logs !== 'object' || parsed.logs === null) {
    throw new Error('Fichier invalide : champ « logs » manquant.')
  }
  // Fusion : les jours importés écrasent les jours locaux homonymes, rien n'est perdu sinon.
  const logs = { ...state.logs }
  for (const [date, day] of Object.entries(parsed.logs)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    logs[date] = { ...(logs[date] ?? {}), ...day }
  }
  mergeCustom(parsed.customExercises)
  // Programme modifié (exercices ajoutés / retirés) : repris tel quel s'il est valide.
  if (parsed.program && parsed.program.version === 1 && typeof parsed.program.sessions === 'object') setUserProgram(parsed.program)
  const checkins = { ...state.checkins, ...(parsed.checkins ?? {}) }
  const tests = { ...state.tests }
  for (const [date, day] of Object.entries(parsed.tests ?? {})) tests[date] = { ...(tests[date] ?? {}), ...day }
  const sessions = { ...state.sessions }
  for (const [date, day] of Object.entries(parsed.sessions ?? {})) sessions[date] = { ...(sessions[date] ?? {}), ...day }
  const profile = { ...(parsed.profile ?? {}), ...state.profile }
  setData({ ...state, logs, checkins, tests, sessions, profile })
  return Object.keys(parsed.logs).length
}

export function updateCheckin(date: string, patch: Partial<Checkin>) {
  setData({ ...state, checkins: { ...state.checkins, [date]: { ...(state.checkins[date] ?? {}), ...patch } } })
}

export function updateTest(date: string, testId: string, patch: TestResult) {
  const day = state.tests[date] ?? {}
  setData({ ...state, tests: { ...state.tests, [date]: { ...day, [testId]: { ...(day[testId] ?? {}), ...patch } } } })
}

export function updateSessionLog(date: string, sessionId: string, patch: Partial<SessionLog>) {
  const day = state.sessions[date] ?? {}
  setData({ ...state, sessions: { ...state.sessions, [date]: { ...day, [sessionId]: { ...(day[sessionId] ?? {}), ...patch } } } })
}

export function updateProfile(patch: Partial<Profile>) {
  setData({ ...state, profile: { ...state.profile, ...patch } })
}

/** Marque les données comme modifiées (déclenche le backup auto). */
export function touch() {
  setData(state)
}
