/**
 * Bilan de fin de séance : chiffres du jour + repères de récupération
 * (repères sportifs généraux, pas un avis médical).
 */
import type { Session, SessionId } from '../data/program'
import { asymmetry, previousBest, type AppData, type ExerciseLog, type Profile } from './storage'

const n = (s?: string) => {
  const v = parseFloat((s ?? '').replace(',', '.'))
  return Number.isFinite(v) ? v : 0
}

function work(log: ExerciseLog) {
  let sets = 0
  let volume = 0
  const ats: number[] = []
  for (const s of log.sets) {
    const sides = s.L || s.R ? [s.L, s.R] : [s]
    for (const x of sides) {
      if (!x?.done) continue
      sets += s.L || s.R ? 0.5 : 1
      volume += n(x.w) * n(x.r)
    }
    if (s.at) ats.push(s.at)
  }
  return { sets: Math.round(sets), volume, ats }
}

export interface Recap {
  exercisesDone: number
  exercisesTotal: number
  sets: number
  volumeLbs: number
  minutes: number | null
  records: { name: string; weight: number }[]
  asym: { name: string; pct: number }[]
}

export function computeRecap(data: AppData, session: Session, date: string): Recap {
  const day = data.logs[date] ?? {}
  let sets = 0
  let volume = 0
  let done = 0
  const ats: number[] = []
  const records: Recap['records'] = []
  const asym: Recap['asym'] = []
  for (const ex of session.exercises) {
    const log = day[ex.id]
    if (!log) continue
    if (log.done) done++
    const w = work(log)
    sets += w.sets
    volume += w.volume
    ats.push(...w.ats)
    const best = previousBest(data, ex.id, date)
    if (best.newPr) records.push({ name: ex.name, weight: Math.max(...log.sets.filter((s) => s.done).map((s) => n(s.w))) })
    if (ex.perSide) {
      const a = asymmetry(data, ex.id, date, true)
      if (a && a.date === date && Math.abs(a.pct) >= 10) asym.push({ name: ex.name, pct: a.pct })
    }
  }
  const span = ats.length > 1 ? (Math.max(...ats) - Math.min(...ats)) / 60000 : null
  // + ~2 min pour la 1re série (son horodatage marque sa fin).
  return { exercisesDone: done, exercisesTotal: session.exercises.length, sets, volumeLbs: Math.round(volume), minutes: span === null ? null : Math.round(span + 2), records, asym }
}

// ── Récupération ─────────────────────────────────────────────────────────
const round5 = (x: number) => Math.round(x / 5) * 5

export interface RecoveryTip {
  icon: string
  title: string
  text: string
}

const RUN_ADVICE: Partial<Record<SessionId, string>> = {
  seanceA: 'Ischios et fessiers bien chargés (RDL, nordic) : pas de fractionné ni de descente rapide pendant 24-48 h. Un footing facile sur le plat est OK le lendemain.',
  seanceB: 'Mollets, adducteurs et quadriceps sollicités : évite les descentes techniques et les côtes intenses pendant 24-48 h. Footing facile OK.',
  tapis: 'Séance de côte : le lendemain, footing facile ou repos actif plutôt qu’une séance intense.',
  activation: 'Activation légère : aucune contrainte, tu peux courir juste après.',
}

export function recoveryTips(o: { profile: Profile; sessionId: SessionId; rpe?: number; runSoon?: boolean; maxPain?: number }): RecoveryTip[] {
  const kg = o.profile.weightKg
  const tips: RecoveryTip[] = []

  tips.push({
    icon: '🥩',
    title: 'Protéines',
    text: kg
      ? `${round5(kg * 0.3)} à ${round5(kg * 0.4)} g dans les 2 h (0,3-0,4 g/kg). Ex. : shake de whey ≈ 25 g, 200 g de skyr ≈ 20 g, 3 œufs ≈ 18 g, 100 g de poulet ≈ 30 g.`
      : '20 à 40 g dans les 2 h (shake, skyr, œufs, poulet…). Ajoute ton poids dans Menu → Profil pour une dose précise.',
  })

  tips.push(
    o.runSoon
      ? {
          icon: '🍝',
          title: 'Glucides',
          text: kg
            ? `Tu cours dans les 24 h : ≈ ${round5(kg * 1)} g de glucides au repas suivant (1 g/kg) pour refaire les réserves.`
            : 'Tu cours dans les 24 h : une bonne portion de glucides au repas suivant (≈ 1 g/kg) pour refaire les réserves.',
        }
      : { icon: '🍽️', title: 'Repas', text: 'Repas équilibré normal : protéines, légumes, féculents. Pas besoin d’en faire plus.' },
  )

  tips.push({
    icon: '💧',
    title: 'Hydratation',
    text: kg
      ? `≈ ${Math.round((kg * 7) / 50) * 50} ml d’eau dans l’heure (7 ml/kg), plus si tu as beaucoup transpiré.`
      : '500 ml à 1 L d’eau dans l’heure, plus si tu as beaucoup transpiré.',
  })

  const run = RUN_ADVICE[o.sessionId]
  if (run) tips.push({ icon: '🏃', title: 'Course', text: (o.rpe ?? 0) >= 8 ? `${run} Séance dure (${o.rpe}/10) : compte plutôt 48 h avant une séance intense.` : run })

  if ((o.maxPain ?? 0) >= 5)
    tips.push({
      icon: '🧊',
      title: 'Genou / cheville',
      text: 'Douleur notable : glace 10-15 min possible, garde les charges actuelles à la prochaine séance, et parles-en à un physio si ça persiste.',
    })
  return tips
}
