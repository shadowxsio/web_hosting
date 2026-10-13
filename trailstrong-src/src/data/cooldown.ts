/**
 * Retour au calme : étirements et mobilité choisis selon la séance du jour,
 * enchaînés par le coach (mise en place → maintien → autre côté → suivant).
 */
import type { AnimationId } from '../components/diagram-base'
import type { SessionId } from './program'

export interface Stretch {
  id: string
  name: string
  target: string
  diagram: AnimationId
  /** Durée de maintien par côté (s). */
  hold: number
  perSide: boolean
  steps: string[]
  cue: string
  /** Photos départ / fin dans public/demos/stretch-{id}-0/1.webp. */
  photos?: boolean
}

export const STRETCHES: Record<string, Stretch> = {
  hamstring: {
    id: 'hamstring',
    photos: true,
    name: 'Ischios couché',
    target: 'Ischios-jambiers',
    diagram: 'hamstringStretch',
    hold: 45,
    perSide: true,
    steps: ['Allongé sur le dos, une jambe au sol.', 'Monte l’autre jambe tendue, sangle ou serviette sous le pied.', 'Tire doucement jusqu’à sentir l’arrière de la cuisse.'],
    cue: 'Genou presque tendu, bassin collé au sol. Tension modérée, jamais de douleur.',
  },
  hipFlexor: {
    id: 'hipFlexor',
    photos: true,
    name: 'Fléchisseurs de hanche',
    target: 'Psoas, quadriceps',
    diagram: 'kneelingStretch',
    hold: 40,
    perSide: true,
    steps: ['Fente basse, genou arrière au sol (sur un tapis).', 'Serre la fesse du côté du genou au sol.', 'Avance doucement le bassin, bras du même côté en l’air.'],
    cue: 'Bassin rentré (rétroversion) : l’étirement se sent devant la hanche, pas dans le bas du dos.',
  },
  figure4: {
    id: 'figure4',
    photos: true,
    name: 'Fessiers en figure 4',
    target: 'Fessiers, piriforme',
    diagram: 'figure4',
    hold: 40,
    perSide: true,
    steps: ['Allongé sur le dos, pose la cheville sur le genou opposé.', 'Attrape l’arrière de la cuisse d’appui.', 'Ramène-la vers la poitrine.'],
    cue: 'Pousse doucement le genou croisé vers l’extérieur. Tête et épaules relâchées au sol.',
  },
  calf: {
    id: 'calf',
    photos: true,
    name: 'Mollets au mur',
    target: 'Gastrocnémiens',
    diagram: 'calfStretch',
    hold: 30,
    perSide: true,
    steps: ['Mains au mur, une jambe reculée.', 'Jambe arrière tendue, talon au sol.', 'Avance le bassin vers le mur.'],
    cue: 'Pied arrière bien droit (orteils vers le mur), talon qui ne décolle pas.',
  },
  soleus: {
    id: 'soleus',
    photos: true,
    name: 'Soléaire au mur',
    target: 'Soléaire, tendon d’Achille',
    diagram: 'soleusStretch',
    hold: 30,
    perSide: true,
    steps: ['Même position que les mollets au mur.', 'Plie le genou arrière en gardant le talon au sol.', 'Descends doucement jusqu’à sentir le bas du mollet.'],
    cue: 'Le soléaire encaisse les descentes de trail : prends ton temps, respiration lente.',
  },
  quad: {
    id: 'quad',
    name: 'Quadriceps debout',
    target: 'Quadriceps',
    diagram: 'quadStretch',
    hold: 40,
    perSide: true,
    steps: ['Debout, une main au mur pour l’équilibre.', 'Attrape la cheville et ramène le talon vers la fesse.', 'Genoux côte à côte, bassin rentré.'],
    cue: 'Ne cambre pas : rentre le bassin et serre la fesse pour sentir l’avant de la cuisse.',
  },
  adductor: {
    id: 'adductor',
    name: 'Adducteurs en fente latérale',
    target: 'Adducteurs',
    diagram: 'lateralLunge',
    hold: 30,
    perSide: true,
    steps: ['Pieds très écartés, pointes légèrement ouvertes.', 'Fléchis une jambe, l’autre reste tendue.', 'Descends le bassin vers le côté fléchi.'],
    cue: 'Pied de la jambe tendue à plat, dos droit. Étirement à l’intérieur de la cuisse tendue.',
  },
  kneeToWall: {
    id: 'kneeToWall',
    name: 'Cheville genou au mur',
    target: 'Mobilité de cheville',
    diagram: 'kneeToWall',
    hold: 30,
    perSide: true,
    steps: ['Face au mur, en fente, genou arrière au sol.', 'Pousse le genou avant vers le mur, talon collé au sol.', 'Va-et-vient lent et contrôlé pendant tout le chrono.'],
    cue: 'Genou dans l’axe du 2e orteil. Le talon ne décolle jamais.',
  },
}

/** Routine par séance (Activation = échauffement : pas de retour au calme). */
export const COOLDOWN: Partial<Record<SessionId, string[]>> = {
  seanceA: ['hamstring', 'hipFlexor', 'figure4', 'calf'],
  seanceB: ['quad', 'adductor', 'figure4', 'soleus', 'kneeToWall'],
  tapis: ['calf', 'soleus', 'quad', 'hipFlexor', 'hamstring'],
}

/** Temps de mise en place avant chaque maintien (s). */
export const PREP = 6

export function routineOf(session: { id: SessionId; cooldown?: string[] }): Stretch[] {
  return (session.cooldown ?? COOLDOWN[session.id] ?? []).filter((s) => STRETCHES[s]).map((s) => STRETCHES[s])
}

export const routineSeconds = (r: Stretch[]) => r.reduce((a, s) => a + (s.hold + PREP) * (s.perSide ? 2 : 1), 0)
