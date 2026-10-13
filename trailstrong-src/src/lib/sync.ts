/**
 * Synchronisation du compte avec Firestore (local d'abord : l'app lit et écrit
 * toujours dans localStorage, la synchro suit en arrière-plan).
 *
 *   users/{uid}                 profil, réglages, programme, statut
 *   users/{uid}/days/{date}     séries, douleurs, tests, bilans du jour
 *   users/{uid}/custom/{id}     exercices ajoutés (avec leurs photos)
 *
 * Conflits : dernier écrit gagne, jour par jour (horodatage par date).
 * Hors-ligne : Firestore garde les écritures en file et les envoie au retour du réseau.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromCache,
  getDocs,
  onSnapshot,
  setDoc,
  type DocumentReference,
  type Unsubscribe,
} from 'firebase/firestore'
import type { SessionId } from '../data/program'
import { LEGACY, scoped } from './account'
import { getAllCustom, replaceAllCustom, subscribeCustom, type CustomExerciseDef } from './custom'
import { fb, type User } from './firebase'
import { getSoundPrefs, onSoundChange, setSoundPrefs, type SoundMode } from './sound'
import { getData, setData, subscribeData, type AppData, type Checkin, type ExerciseLog, type Profile, type SessionLog, type TestResult } from './storage'
import { applyTheme, currentTheme, onThemeChange, type Theme } from './theme'
import { getUserProgram, onProgramChange, setUserProgram, type UserProgram } from './userProgram'

export interface UserDoc {
  email: string
  name: string
  photo?: string
  profile?: Profile
  settings?: { sound?: { mode: SoundMode; speaker: boolean }; theme?: Theme }
  program?: UserProgram | null
  onboarded?: boolean
  createdAt: number
  updatedAt: number
}

interface DayDoc {
  logs?: Record<string, ExerciseLog>
  checkin?: Checkin | null
  tests?: Record<string, TestResult>
  sessions?: Record<string, SessionLog>
  updatedAt: number
}

const SESSION_IDS: SessionId[] = ['activation', 'seanceA', 'seanceB', 'tapis']
const STAMPS_KEY = scoped('trailstrong:stamps')
type Stamps = Record<string, number>
let stamps: Stamps = (() => {
  try {
    return JSON.parse(localStorage.getItem(STAMPS_KEY) ?? '{}') as Stamps
  } catch {
    return {}
  }
})()
const saveStamps = () => {
  try {
    localStorage.setItem(STAMPS_KEY, JSON.stringify(stamps))
  } catch {
    /* quota */
  }
}

/** Firestore refuse `undefined` dans les tableaux : on nettoie via JSON. */
const clean = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T

const userRef = (uid: string) => doc(fb().db, 'users', uid)

export async function loadUserDoc(uid: string): Promise<UserDoc | null> {
  const ref = userRef(uid)
  try {
    const snap = await getDoc(ref)
    return snap.exists() ? (snap.data() as UserDoc) : null
  } catch {
    // Hors-ligne : on se contente du cache local.
    try {
      const snap = await getDocFromCache(ref)
      return snap.exists() ? (snap.data() as UserDoc) : null
    } catch {
      return null
    }
  }
}

export async function saveUserDoc(uid: string, patch: Partial<UserDoc>) {
  stamps.user = Date.now()
  saveStamps()
  await setDoc(userRef(uid), clean({ ...patch, updatedAt: stamps.user }), { merge: true })
}

export function newUserDoc(user: User): UserDoc {
  return { email: user.email ?? '', name: user.displayName ?? '', photo: user.photoURL ?? undefined, createdAt: Date.now(), updatedAt: Date.now() }
}

// ── Migration des données du mode local historique ──────────────────────
export function hasLegacyData(): boolean {
  try {
    const d = JSON.parse(localStorage.getItem(LEGACY.data) ?? 'null') as Partial<AppData> | null
    if (d?.logs && Object.keys(d.logs).length) return true
    return SESSION_IDS.some((s) => (JSON.parse(localStorage.getItem(LEGACY.custom(s)) ?? '[]') as unknown[]).length > 0)
  } catch {
    return false
  }
}

/** Copie les données de l'appareil (mode local) dans le compte actif. */
export function importLegacy() {
  const d = JSON.parse(localStorage.getItem(LEGACY.data) ?? 'null') as Partial<AppData> | null
  if (d) {
    const cur = getData()
    setData({
      ...cur,
      logs: { ...cur.logs, ...(d.logs ?? {}) },
      checkins: { ...cur.checkins, ...(d.checkins ?? {}) },
      tests: { ...cur.tests, ...(d.tests ?? {}) },
      sessions: { ...cur.sessions, ...(d.sessions ?? {}) },
      profile: { ...(d.profile ?? {}), ...cur.profile },
    })
  }
  const custom = Object.fromEntries(
    SESSION_IDS.map((s) => [s, [...(getAllCustom()[s] ?? []), ...(JSON.parse(localStorage.getItem(LEGACY.custom(s)) ?? '[]') as CustomExerciseDef[])]]),
  ) as Record<SessionId, CustomExerciseDef[]>
  replaceAllCustom(custom)
}

// ── Synchro ─────────────────────────────────────────────────────────────
let applying = false
const unsubs: (Unsubscribe | (() => void))[] = []
let status: 'idle' | 'syncing' | 'ok' | 'offline' | 'error' = 'idle'
const statusListeners = new Set<() => void>()
const setStatus = (s: typeof status) => {
  status = s
  statusListeners.forEach((l) => l())
}
export const syncStatus = () => status
export function onSyncStatus(l: () => void) {
  statusListeners.add(l)
  return () => statusListeners.delete(l)
}

function dates(d: AppData) {
  return new Set([...Object.keys(d.logs), ...Object.keys(d.checkins), ...Object.keys(d.tests), ...Object.keys(d.sessions)])
}

function dayDoc(d: AppData, date: string): DayDoc {
  return {
    logs: d.logs[date] ?? {},
    checkin: d.checkins[date] ?? null,
    tests: d.tests[date] ?? {},
    sessions: d.sessions[date] ?? {},
    updatedAt: stamps[`d:${date}`] ?? Date.now(),
  }
}

function applyDay(date: string, r: DayDoc) {
  const d = getData()
  const put = <T>(rec: Record<string, T>, v: T | null | undefined, empty: boolean) => {
    const next = { ...rec }
    if (v == null || empty) delete next[date]
    else next[date] = v
    return next
  }
  applying = true
  try {
    setData(
      {
        ...d,
        logs: put(d.logs, r.logs, !r.logs || !Object.keys(r.logs).length),
        checkins: put(d.checkins, r.checkin, !r.checkin),
        tests: put(d.tests, r.tests, !r.tests || !Object.keys(r.tests).length),
        sessions: put(d.sessions, r.sessions, !r.sessions || !Object.keys(r.sessions).length),
      },
      { touch: false },
    )
  } finally {
    applying = false
  }
  stamps[`d:${date}`] = r.updatedAt
}

function applyUserDoc(u: UserDoc) {
  applying = true
  try {
    if (u.profile && JSON.stringify(u.profile) !== JSON.stringify(getData().profile)) setData({ ...getData(), profile: u.profile }, { touch: false })
    const s = u.settings
    if (s?.sound) {
      const cur = getSoundPrefs()
      if (cur.mode !== s.sound.mode || cur.speaker !== s.sound.speaker) setSoundPrefs(s.sound)
    }
    if (s?.theme && s.theme !== currentTheme()) applyTheme(s.theme, false)
    if (u.program !== undefined && JSON.stringify(u.program) !== JSON.stringify(getUserProgram())) setUserProgram(u.program ?? null)
  } finally {
    applying = false
  }
}

function customMap(list: (CustomExerciseDef & { sessionId: SessionId })[]) {
  const map = Object.fromEntries(SESSION_IDS.map((s) => [s, [] as CustomExerciseDef[]])) as Record<SessionId, CustomExerciseDef[]>
  for (const x of list) {
    const { sessionId, ...def } = x
    if (map[sessionId]) map[sessionId].push(def)
  }
  for (const s of SESSION_IDS) map[s].sort((a, b) => a.createdAt - b.createdAt)
  return map
}

/** Lance la synchro du compte. `fresh` : données locales à pousser intégralement (migration). */
export async function startSync(user: User, u: UserDoc, opts: { fresh?: boolean } = {}) {
  const uref = userRef(user.uid)
  const daysCol = collection(uref, 'days')
  const customCol = collection(uref, 'custom')
  setStatus('syncing')

  applyUserDoc(u)

  // 1. Jours : le plus récent gagne.
  const dirty = new Set<string>()
  try {
    const snap = await getDocs(daysCol)
    const remote = new Set<string>()
    snap.forEach((d) => {
      remote.add(d.id)
      const r = d.data() as DayDoc
      if (opts.fresh) return
      if ((r.updatedAt ?? 0) > (stamps[`d:${d.id}`] ?? 0)) applyDay(d.id, r)
      else if ((stamps[`d:${d.id}`] ?? 0) > (r.updatedAt ?? 0)) dirty.add(d.id)
    })
    for (const date of dates(getData())) if (!remote.has(date) || opts.fresh) dirty.add(date)
    saveStamps()
  } catch {
    setStatus('offline')
  }

  // 2. Exercices ajoutés : le cloud fait foi, sauf s'il est vide (première synchro).
  let lastCustom = JSON.stringify(getAllCustom())
  try {
    const snap = await getDocs(customCol)
    if (snap.empty || opts.fresh) {
      for (const s of SESSION_IDS) for (const def of getAllCustom()[s]) await setDoc(doc(customCol, def.id), clean({ ...def, sessionId: s }))
    } else {
      applying = true
      replaceAllCustom(customMap(snap.docs.map((d) => d.data() as CustomExerciseDef & { sessionId: SessionId })))
      applying = false
    }
    lastCustom = JSON.stringify(getAllCustom())
  } catch {
    setStatus('offline')
  }

  // 3. Envoi des changements locaux (regroupés, 1 s).
  let timer = 0
  const flush = async () => {
    window.clearTimeout(timer)
    const list = [...dirty]
    dirty.clear()
    if (!list.length) return
    setStatus('syncing')
    try {
      const d = getData()
      await Promise.all(list.map((date) => setDoc(doc(daysCol, date), clean(dayDoc(d, date)))))
      setStatus(navigator.onLine ? 'ok' : 'offline')
    } catch {
      list.forEach((x) => dirty.add(x))
      setStatus('error')
    }
  }
  const schedule = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => void flush(), 1000)
  }

  let last = getData()
  unsubs.push(
    subscribeData(() => {
      const cur = getData()
      const prev = last
      last = cur
      if (applying) return
      const now = Date.now()
      for (const date of new Set([...dates(prev), ...dates(cur)])) {
        if (prev.logs[date] !== cur.logs[date] || prev.checkins[date] !== cur.checkins[date] || prev.tests[date] !== cur.tests[date] || prev.sessions[date] !== cur.sessions[date]) {
          stamps[`d:${date}`] = now
          dirty.add(date)
        }
      }
      saveStamps()
      if (prev.profile !== cur.profile) void saveUserDoc(user.uid, { profile: cur.profile })
      if (dirty.size) schedule()
    }),
  )

  unsubs.push(
    subscribeCustom(() => {
      if (applying) return
      const cur = getAllCustom()
      const before = JSON.parse(lastCustom) as Record<SessionId, CustomExerciseDef[]>
      lastCustom = JSON.stringify(cur)
      const beforeIds = new Map(SESSION_IDS.flatMap((s) => before[s].map((d) => [d.id, JSON.stringify(d)] as const)))
      for (const s of SESSION_IDS)
        for (const def of cur[s]) {
          if (beforeIds.get(def.id) !== JSON.stringify(def)) void setDoc(doc(customCol, def.id), clean({ ...def, sessionId: s }))
          beforeIds.delete(def.id)
        }
      for (const id of beforeIds.keys()) void deleteDoc(doc(customCol, id))
    }),
  )

  const pushSettings = () => {
    if (!applying) void saveUserDoc(user.uid, { settings: { sound: getSoundPrefs(), theme: currentTheme() } })
  }
  unsubs.push(onSoundChange(pushSettings), onThemeChange(pushSettings))
  unsubs.push(
    onProgramChange(() => {
      if (!applying) void saveUserDoc(user.uid, { program: getUserProgram() })
    }),
  )

  // 4. Mises à jour venant des autres appareils.
  unsubs.push(
    onSnapshot(daysCol, (snap) => {
      for (const ch of snap.docChanges()) {
        if (ch.doc.metadata.hasPendingWrites || ch.type === 'removed') continue
        const r = ch.doc.data() as DayDoc
        if ((r.updatedAt ?? 0) > (stamps[`d:${ch.doc.id}`] ?? 0)) applyDay(ch.doc.id, r)
      }
      saveStamps()
    }),
    onSnapshot(customCol, (snap) => {
      if (snap.metadata.hasPendingWrites) return
      const remote = customMap(snap.docs.map((d) => d.data() as CustomExerciseDef & { sessionId: SessionId }))
      if (JSON.stringify(remote) === JSON.stringify(getAllCustom())) return
      applying = true
      replaceAllCustom(remote)
      lastCustom = JSON.stringify(getAllCustom())
      applying = false
    }),
    onSnapshot(uref as DocumentReference, (snap) => {
      if (snap.metadata.hasPendingWrites || !snap.exists()) return
      applyUserDoc(snap.data() as UserDoc)
    }),
  )

  const onHide = () => document.visibilityState === 'hidden' && void flush()
  document.addEventListener('visibilitychange', onHide)
  unsubs.push(() => document.removeEventListener('visibilitychange', onHide))
  const onOnline = () => setStatus(dirty.size ? 'syncing' : 'ok')
  window.addEventListener('online', onOnline)
  unsubs.push(() => window.removeEventListener('online', onOnline))

  if (dirty.size) await flush()
  else setStatus(navigator.onLine ? 'ok' : 'offline')
}

export function stopSync() {
  unsubs.splice(0).forEach((u) => u())
}
