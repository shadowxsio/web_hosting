/**
 * Générateur de programme (sans IA) : à partir des réponses du questionnaire,
 * choisit dans la bibliothèque (programme de base + extras) les exercices les
 * plus adaptés et compose 2 ou 3 séances + échauffement + retour au calme.
 */
import { LIBRARY, type PlanItem, type SessionPlan, type UserProgram } from '../lib/userProgram'
import type { SessionId } from './program'

export type Goal = 'knee' | 'ankle' | 'glutes' | 'hamstrings' | 'calves' | 'core' | 'upper' | 'power'
export type Pain = 'knee' | 'ankle' | 'hip' | 'back'
export type Sport = 'trail' | 'road' | 'bike' | 'ski' | 'team' | 'general'
export type Equip = 'gym' | 'dumbbells' | 'bodyweight'
export type Level = 'beginner' | 'intermediate' | 'advanced'

export interface Answers {
  name: string
  weightKg?: number
  sport: Sport
  goals: Goal[]
  pains: Pain[]
  equip: Equip
  level: Level
  perWeek: 2 | 3
  minutes: 30 | 45 | 60
}

export const GOAL_LABEL: Record<Goal, string> = {
  knee: '🩹 Genoux solides',
  ankle: '⚓ Chevilles stables',
  glutes: '🍑 Fessiers & hanches',
  hamstrings: '🦵 Ischios',
  calves: '🦶 Mollets & Achille',
  core: '🧱 Gainage & dos',
  upper: '💪 Haut du corps',
  power: '⚡ Explosivité',
}
export const PAIN_LABEL: Record<Pain, string> = { knee: 'Genou', ankle: 'Cheville', hip: 'Hanche', back: 'Bas du dos' }
export const SPORT_LABEL: Record<Sport, string> = {
  trail: '⛰️ Trail',
  road: '🏃 Course sur route',
  bike: '🚴 Vélo',
  ski: '🎿 Ski / rando',
  team: '⚽ Sports collectifs',
  general: '✨ Forme générale',
}
export const EQUIP_LABEL: Record<Equip, string> = { gym: '🏋️ Salle de sport', dumbbells: '🏠 Maison avec haltères', bodyweight: '🤸 Poids du corps' }
export const LEVEL_LABEL: Record<Level, string> = { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Confirmé' }

type Role = 'hinge' | 'hamstring' | 'glute' | 'single' | 'hip' | 'knee' | 'calf' | 'adductor' | 'core' | 'push' | 'pull' | 'plyo' | 'hike'

interface Meta {
  roles: Role[]
  equip: Equip // matériel minimum (gym > dumbbells > bodyweight)
  goals: Goal[]
  warmup?: boolean
  protects?: Pain[]
  avoid?: Pain[]
  minLevel?: Level
  stretches: string[]
}

const META: Record<string, Meta> = {
  // Échauffement
  'sl-balance': { roles: [], equip: 'bodyweight', goals: ['ankle'], warmup: true, protects: ['ankle', 'knee'], stretches: [] },
  'tibialis-raise': { roles: [], equip: 'bodyweight', goals: ['ankle', 'calves'], warmup: true, protects: ['ankle', 'knee'], stretches: [] },
  'calf-raise-warm': { roles: [], equip: 'bodyweight', goals: ['calves', 'ankle'], warmup: true, protects: ['ankle'], stretches: [] },
  'sl-glute-bridge': { roles: [], equip: 'bodyweight', goals: ['glutes', 'hamstrings'], warmup: true, protects: ['back', 'hip', 'knee'], stretches: [] },
  'banded-walk': { roles: [], equip: 'dumbbells', goals: ['glutes', 'knee'], warmup: true, protects: ['knee', 'hip'], stretches: [] },
  'spanish-squat': { roles: [], equip: 'gym', goals: ['knee'], warmup: true, protects: ['knee'], stretches: [] },
  // Séances
  'db-rdl': { roles: ['hinge', 'hamstring'], equip: 'dumbbells', goals: ['hamstrings', 'glutes'], avoid: ['back'], stretches: ['hamstring', 'figure4'] },
  'sl-rdl': { roles: ['hinge', 'single'], equip: 'dumbbells', goals: ['hamstrings', 'glutes', 'ankle'], stretches: ['hamstring', 'figure4'] },
  bulgarian: { roles: ['single', 'knee', 'glute'], equip: 'dumbbells', goals: ['glutes', 'knee'], stretches: ['hipFlexor', 'quad'] },
  'leg-curl': { roles: ['hamstring'], equip: 'gym', goals: ['hamstrings', 'knee'], protects: ['knee'], stretches: ['hamstring'] },
  'nordic-curl': { roles: ['hamstring'], equip: 'gym', goals: ['hamstrings'], minLevel: 'intermediate', stretches: ['hamstring'] },
  'hip-abduction': { roles: ['hip'], equip: 'gym', goals: ['glutes', 'knee'], protects: ['knee', 'hip'], stretches: ['figure4'] },
  'standing-calf': { roles: ['calf'], equip: 'dumbbells', goals: ['calves', 'ankle'], protects: ['ankle'], stretches: ['calf'] },
  'hip-thrust': { roles: ['glute'], equip: 'dumbbells', goals: ['glutes'], protects: ['back', 'knee'], stretches: ['hipFlexor', 'figure4'] },
  'leg-press-high': { roles: ['knee'], equip: 'gym', goals: ['knee', 'glutes'], stretches: ['quad', 'figure4'] },
  'step-down': { roles: ['single', 'knee'], equip: 'bodyweight', goals: ['knee'], protects: ['knee'], stretches: ['quad'] },
  'copenhagen-plank': { roles: ['adductor', 'core'], equip: 'dumbbells', goals: ['knee', 'core'], minLevel: 'intermediate', stretches: ['adductor'] },
  'soleus-raise': { roles: ['calf'], equip: 'dumbbells', goals: ['calves', 'ankle'], protects: ['ankle'], stretches: ['soleus'] },
  'sl-calf-raise': { roles: ['calf'], equip: 'bodyweight', goals: ['calves', 'ankle'], protects: ['ankle'], stretches: ['calf', 'soleus'] },
  'power-hike': { roles: ['hike'], equip: 'gym', goals: ['calves', 'glutes'], stretches: ['calf', 'hipFlexor'] },
  // Bibliothèque
  'goblet-squat': { roles: ['knee'], equip: 'dumbbells', goals: ['knee', 'glutes'], stretches: ['quad', 'figure4'] },
  'bw-squat': { roles: ['knee'], equip: 'bodyweight', goals: ['knee', 'glutes'], stretches: ['quad'] },
  'reverse-lunge': { roles: ['single', 'knee'], equip: 'bodyweight', goals: ['knee', 'glutes'], protects: ['knee'], stretches: ['hipFlexor', 'quad'] },
  'step-up': { roles: ['single', 'knee'], equip: 'bodyweight', goals: ['knee', 'glutes'], stretches: ['quad', 'hipFlexor'] },
  'leg-extension': { roles: ['knee'], equip: 'gym', goals: ['knee'], protects: ['knee'], stretches: ['quad'] },
  'wall-sit': { roles: ['knee'], equip: 'bodyweight', goals: ['knee'], protects: ['knee'], stretches: ['quad'] },
  'jump-squat': { roles: ['plyo'], equip: 'bodyweight', goals: ['power'], avoid: ['knee', 'ankle', 'back'], minLevel: 'intermediate', stretches: ['quad', 'calf'] },
  plank: { roles: ['core'], equip: 'bodyweight', goals: ['core'], protects: ['back'], stretches: [] },
  'side-plank': { roles: ['core', 'hip'], equip: 'bodyweight', goals: ['core', 'glutes'], protects: ['back', 'knee'], stretches: ['figure4'] },
  'dead-bug': { roles: ['core'], equip: 'bodyweight', goals: ['core'], protects: ['back'], stretches: [] },
  'bird-dog': { roles: ['core'], equip: 'bodyweight', goals: ['core', 'glutes'], protects: ['back'], stretches: ['figure4'] },
  'push-up': { roles: ['push'], equip: 'bodyweight', goals: ['upper'], stretches: [] },
  'db-row': { roles: ['pull'], equip: 'dumbbells', goals: ['upper', 'core'], avoid: ['back'], stretches: [] },
  'db-press': { roles: ['push'], equip: 'dumbbells', goals: ['upper'], stretches: [] },
}

const EQUIP_RANK: Record<Equip, number> = { bodyweight: 0, dumbbells: 1, gym: 2 }
const LEVEL_RANK: Record<Level, number> = { beginner: 0, intermediate: 1, advanced: 2 }
const RUNNER: Sport[] = ['trail', 'road', 'ski']

function allowed(id: string, a: Answers) {
  const m = META[id]
  if (!m || !LIBRARY[id]) return false
  if (EQUIP_RANK[m.equip] > EQUIP_RANK[a.equip]) return false
  if (m.minLevel && LEVEL_RANK[m.minLevel] > LEVEL_RANK[a.level]) return false
  if (m.avoid?.some((p) => a.pains.includes(p))) return false
  return true
}

function score(id: string, a: Answers) {
  const m = META[id]
  let s = 0
  for (const g of a.goals) if (m.goals.includes(g)) s += 3
  for (const p of a.pains) if (m.protects?.includes(p)) s += 2
  if (RUNNER.includes(a.sport) && (m.roles.includes('single') || m.roles.includes('calf') || id === 'step-down')) s += 1.5
  if (a.sport === 'bike' && (m.roles.includes('knee') || m.roles.includes('hamstring'))) s += 1.5
  if (a.sport === 'team' && (m.roles.includes('plyo') || m.roles.includes('adductor'))) s += 1.5
  if (a.sport === 'ski' && (id === 'wall-sit' || m.roles.includes('knee'))) s += 1
  // Le programme de base (exercices éprouvés) passe légèrement devant à score égal.
  if (!['goblet-squat', 'bw-squat', 'reverse-lunge', 'step-up', 'leg-extension', 'wall-sit', 'jump-squat', 'plank', 'side-plank', 'dead-bug', 'bird-dog', 'push-up', 'db-row', 'db-press'].includes(id)) s += 0.3
  return s
}

/** Variantes trop proches : une seule par séance. */
const FAMILY: Record<string, string> = {
  'goblet-squat': 'squat',
  'bw-squat': 'squat',
  'db-rdl': 'rdl',
  'sl-rdl': 'rdl',
  'standing-calf': 'calf',
  'sl-calf-raise': 'calf',
  'soleus-raise': 'calf',
  'reverse-lunge': 'lunge',
  bulgarian: 'lunge',
}

const pick = (cands: string[], used: Set<string>, a: Answers, role?: Role, session: string[] = []) =>
  cands
    .filter((id) => !used.has(id) && (!role || META[id].roles.includes(role)) && !(FAMILY[id] && session.some((x) => FAMILY[x] === FAMILY[id])))
    .sort((x, y) => score(y, a) - score(x, a))[0]

function item(id: string, a: Answers): PlanItem {
  const ex = LIBRARY[id]
  if (ex.mode !== 'strength') return { id }
  if (a.level === 'beginner') return { id, sets: Math.max(2, ex.sets - 1) }
  if (a.level === 'advanced' && ex.sets < 5 && !META[id].warmup) return { id, sets: ex.sets + 1 }
  return { id }
}

function cooldownFor(ids: string[], a: Answers): string[] {
  const out: string[] = []
  for (const id of ids) for (const s of META[id]?.stretches ?? []) if (!out.includes(s)) out.push(s)
  if (a.goals.includes('ankle') && !out.includes('kneeToWall')) out.push('kneeToWall')
  for (const s of ['hipFlexor', 'calf', 'hamstring']) if (out.length < 4 && !out.includes(s)) out.push(s)
  return out.slice(0, 5)
}

const DURATION: Record<Answers['minutes'], string> = { 30: '30 min', 45: '40-45 min', 60: '50-60 min' }

function runAdvice(a: Answers, legs: boolean) {
  const sport = a.sport === 'bike' ? 'sortie vélo' : RUNNER.includes(a.sport) ? 'séance de course' : 'séance de sport'
  return legs
    ? `Jambes bien sollicitées : évite une ${sport} intense dans les 24 h. Une sortie facile le lendemain est OK.`
    : `Séance légère pour les jambes : tu peux enchaîner ta ${sport} normalement.`
}

/** Compose le programme complet. */
export function generateProgram(a: Answers): UserProgram {
  const ids = Object.keys(META).filter((id) => allowed(id, a))
  const main = ids.filter((id) => !META[id].warmup && id !== 'power-hike')
  const n = a.minutes === 30 ? 4 : a.minutes === 45 ? 5 : 6
  const used = new Set<string>()

  const build = (roles: Role[], fill: Role[]) => {
    const chosen: string[] = []
    for (const r of roles) {
      if (chosen.length >= n) break
      const id = pick(main, used, a, r, chosen)
      if (id) {
        chosen.push(id)
        used.add(id)
      }
    }
    while (chosen.length < n) {
      const id = pick(
        main.filter((x) => META[x].roles.some((r) => fill.includes(r))),
        used,
        a,
        undefined,
        chosen,
      )
      if (!id) break
      chosen.push(id)
      used.add(id)
    }
    return chosen
  }

  const coreRole: Role[] = a.goals.includes('core') ? ['core'] : []
  const upper = a.goals.includes('upper')
  const A = build(['hinge', 'hamstring', ...(upper ? (['pull'] as Role[]) : []), 'glute', 'single', 'hip', ...coreRole], ['hinge', 'hamstring', 'glute', 'hip', 'single', 'core'])
  const B = build(['knee', 'single', ...(upper ? (['push'] as Role[]) : []), 'calf', 'adductor', ...coreRole], ['knee', 'single', 'calf', 'adductor', 'core'])

  const warm = ids
    .filter((id) => META[id].warmup)
    .sort((x, y) => score(y, a) - score(x, a))
    .slice(0, a.minutes === 30 ? 3 : a.minutes === 45 ? 4 : 5)

  const goalText = a.goals.length ? a.goals.map((g) => GOAL_LABEL[g].replace(/^\S+\s/, '').toLowerCase()).join(', ') : 'renforcement général'
  const sessions: Partial<Record<SessionId, SessionPlan>> = {
    activation: {
      title: 'Activation',
      short: 'Activation',
      subtitle: 'Échauffement',
      goal: 'Réveiller chevilles, genoux et fessiers avant la séance.',
      duration: '8-12 min',
      items: warm.map((id) => item(id, a)),
      cooldown: [],
    },
    seanceA: {
      title: 'Séance A — Chaîne postérieure',
      short: 'Séance A',
      subtitle: 'Ischios, fessiers & hanches',
      goal: `Construire l’arrière des jambes et les hanches. Objectifs : ${goalText}.`,
      duration: DURATION[a.minutes],
      items: A.map((id) => item(id, a)),
      cooldown: cooldownFor(A, a),
      runAdvice: runAdvice(a, true),
    },
    seanceB: {
      title: 'Séance B — Genoux & chevilles',
      short: 'Séance B',
      subtitle: 'Quadriceps, mollets & stabilité',
      goal: `Des genoux et des chevilles qui encaissent. Objectifs : ${goalText}.`,
      duration: DURATION[a.minutes],
      items: B.map((id) => item(id, a)),
      cooldown: cooldownFor(B, a),
      runAdvice: runAdvice(a, true),
    },
  }

  if (a.perWeek === 3) {
    if (a.sport === 'trail' && a.equip === 'gym' && allowed('power-hike', a)) {
      const extra = build([...coreRole, 'core'], ['core']).slice(0, 2)
      sessions.tapis = {
        title: 'Tapis D+ — Marche en côte',
        short: 'Tapis',
        subtitle: 'Endurance de montée',
        goal: 'Accumuler du dénivelé en marche rapide, comme en trail.',
        duration: '35-45 min',
        items: [{ id: 'power-hike' }, ...extra.map((id) => item(id, a))],
        cooldown: ['calf', 'soleus', 'quad', 'hipFlexor'],
        runAdvice: 'Séance de côte : le lendemain, footing facile ou repos actif.',
      }
    } else {
      const C = build(['core', 'push', 'pull', 'plyo', 'core', 'calf', 'hip'], ['core', 'push', 'pull', 'plyo', 'calf', 'hip', 'single'])
      sessions.tapis = {
        title: 'Séance C — Gainage & complément',
        short: 'Séance C',
        subtitle: upper ? 'Tronc, haut du corps & explosivité' : 'Tronc, stabilité & explosivité',
        goal: 'Un tronc solide et un corps équilibré pour encaisser les heures d’effort.',
        duration: DURATION[a.minutes],
        items: C.map((id) => item(id, a)),
        cooldown: cooldownFor(C, a),
        runAdvice: runAdvice(a, C.some((id) => META[id].roles.some((r) => ['knee', 'single', 'plyo', 'calf'].includes(r)))),
      }
    }
  }
  return { version: 1, createdAt: Date.now(), sessions }
}
