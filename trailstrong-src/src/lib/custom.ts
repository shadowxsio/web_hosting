/**
 * Exercices personnalisés, ajoutés à la main depuis l'interface.
 *
 * Stockage : un tableau JSON par séance sous `custom_exercises_${sessionId}`.
 * Les saisies (séries, notes, complétion) passent par le store global
 * (storage.ts) avec l'id `custom-<timestamp>`, exactement comme un exercice natif.
 */
import { useMemo, useSyncExternalStore } from 'react'
import type { AnimationId } from '../components/diagram-base'
import type { Phase } from '../data/cadence'
import { PROGRAM, type AttentionPoint, type Exercise, type FocusTag, type Session, type SessionId } from '../data/program'

export interface CustomExerciseDef {
  id: string // "custom-" + Date.now()
  name: string
  target?: string
  protocol?: string // ex. « 3 × 10 reps »
  rest?: string // ex. « 60s », « 1m30 »
  startWeight?: string
  tip?: string
  createdAt: number
  // ── Fiche complète (catalogue / IA) : tous facultatifs, rétrocompatibles ──
  source?: 'manual' | 'catalog' | 'ai'
  catalogId?: string
  tags?: FocusTag[]
  equipment?: string
  sets?: number
  reps?: string
  defaultReps?: number
  perSide?: boolean
  restS?: number
  mode?: 'strength' | 'timed'
  cadence?: Phase[]
  steps?: string[]
  stepsLang?: 'en'
  points?: AttentionPoint[]
  kneeAnkle?: string
  diagram?: AnimationId
  /** 2 photos départ / fin, en data URL (dispo hors-ligne, incluses dans les sauvegardes). */
  photos?: string[]
  video?: string
}

/** Exercice prêt à être ajouté (avant attribution de l'id). */
export type CustomDraft = Omit<CustomExerciseDef, 'id' | 'createdAt'>

const SESSION_IDS = PROGRAM.map((s) => s.id)
const keyOf = (id: SessionId) => `custom_exercises_${id}`

function read(id: SessionId): CustomExerciseDef[] {
  try {
    const raw = localStorage.getItem(keyOf(id))
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(arr) ? arr.filter((x): x is CustomExerciseDef => !!x && typeof x.id === 'string' && typeof x.name === 'string') : []
  } catch {
    return []
  }
}

let cache: Record<SessionId, CustomExerciseDef[]> = Object.fromEntries(SESSION_IDS.map((id) => [id, read(id)])) as Record<
  SessionId,
  CustomExerciseDef[]
>
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function write(id: SessionId, list: CustomExerciseDef[]) {
  cache = { ...cache, [id]: list }
  try {
    localStorage.setItem(keyOf(id), JSON.stringify(list))
  } catch {
    /* quota : on garde en mémoire */
  }
  emit()
}

window.addEventListener('storage', (e) => {
  const id = SESSION_IDS.find((s) => keyOf(s) === e.key)
  if (id) {
    cache = { ...cache, [id]: read(id) }
    emit()
  }
})

export function getAllCustom() {
  return cache
}

export function addCustom(sessionId: SessionId, def: CustomDraft): string {
  const id = `custom-${Date.now()}`
  write(sessionId, [...cache[sessionId], { ...def, id, createdAt: Date.now() }])
  return id
}

export function removeCustom(sessionId: SessionId, id: string) {
  write(
    sessionId,
    cache[sessionId].filter((d) => d.id !== id),
  )
}

/** Fusion à l'import d'une sauvegarde : ajoute les exercices dont l'id est inconnu. */
export function mergeCustom(incoming: unknown) {
  if (!incoming || typeof incoming !== 'object') return
  for (const id of SESSION_IDS) {
    const list = (incoming as Record<string, unknown>)[id]
    if (!Array.isArray(list)) continue
    const known = new Set(cache[id].map((d) => d.id))
    const extra = list.filter((d): d is CustomExerciseDef => !!d && typeof d.id === 'string' && typeof d.name === 'string' && !known.has(d.id))
    if (extra.length) write(id, [...cache[id], ...extra])
  }
}

export function useCustom() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => cache,
  )
}

// ── Conversion vers le modèle d'exercice natif ──────────────────────────

/** « 60s » → 60, « 90 » → 90, « 1m30 » / « 1:30 » → 90, « 2 min » → 120. */
export function parseRest(text?: string): number {
  if (!text) return 0
  const t = text.toLowerCase().replace(/\s/g, '')
  const ms = t.match(/^(\d+)(?:m|min|:)(\d+)?/)
  if (ms) return Number(ms[1]) * 60 + Number(ms[2] ?? 0)
  const s = t.match(/(\d+)/)
  return s ? Number(s[1]) : 0
}

/** « 3 × 10 reps », « 4x8-10 », « 3 x 30s » → séries / reps / mode. */
export function parseProtocol(text?: string) {
  const t = (text ?? '').trim()
  const m = t.match(/(\d+)\s*[x×*]\s*(\d+)(?:\s*(?:-|à)\s*(\d+))?\s*(.*)$/i)
  if (!m) return { sets: 3, reps: t || 'reps libres', defaultReps: undefined as number | undefined, timed: /\d+\s*(s|sec)/i.test(t) }
  const unit = m[4].trim()
  const timed = /^(s|sec|secondes?)\b/i.test(unit)
  const range = m[3] ? `${m[2]}-${m[3]}` : m[2]
  return {
    sets: Math.min(10, Math.max(1, Number(m[1]))),
    reps: `${range} ${unit || 'reps'}`.trim(),
    defaultReps: Number(m[3] ?? m[2]),
    timed,
  }
}

export function tagsFromTarget(target?: string): FocusTag[] {
  const t = (target ?? '').toLowerCase()
  const tags: FocusTag[] = []
  if (t.includes('genou') || t.includes('ischio') || t.includes('quadri')) tags.push('knee')
  if (t.includes('cheville') || t.includes('mollet') || t.includes('tibia')) tags.push('ankle')
  if (t.includes('fess') || t.includes('glute')) tags.push('glutes')
  return tags
}

export function toExercise(d: CustomExerciseDef): Exercise {
  if (d.sets) return toFullExercise(d)
  const p = parseProtocol(d.protocol)
  return {
    id: d.id,
    trackId: d.id,
    custom: true,
    name: d.name,
    target: d.target || 'Exercice personnalisé',
    badge: d.target || 'Perso',
    tags: tagsFromTarget(d.target),
    equipment: '',
    sets: p.sets,
    reps: p.reps,
    defaultReps: p.defaultReps,
    rest: parseRest(d.rest),
    cue: d.tip ?? '',
    kneeAnkle: '',
    steps: [],
    mode: p.timed ? 'timed' : 'strength',
    startWeight: d.startWeight,
    diagram: d.diagram,
  }
}

function toFullExercise(d: CustomExerciseDef): Exercise {
  return {
    id: d.id,
    trackId: d.id,
    custom: true,
    name: d.name,
    target: d.target || 'Exercice personnalisé',
    badge: d.target?.split(',')[0] || 'Perso',
    tags: d.tags ?? tagsFromTarget(d.target),
    equipment: d.equipment ?? '',
    sets: d.sets ?? 3,
    reps: d.reps ?? '10 reps',
    defaultReps: d.defaultReps,
    perSide: d.perSide,
    rest: d.restS ?? 60,
    cue: d.tip ?? '',
    kneeAnkle: d.kneeAnkle ?? '',
    steps: d.steps ?? [],
    stepsLang: d.stepsLang,
    points: d.points,
    mode: d.mode ?? 'strength',
    startWeight: d.startWeight,
    bodyweight: /poids du corps/i.test(d.equipment ?? ''),
    diagram: d.diagram,
    cadence: d.cadence,
    photos: d.photos,
    video: d.video,
  }
}

/** Programme natif + exercices personnalisés en fin de chaque séance. */
export function useProgram(): Session[] {
  const custom = useCustom()
  return useMemo(() => PROGRAM.map((s) => ({ ...s, exercises: [...s.exercises, ...custom[s.id].map(toExercise)] })), [custom])
}
