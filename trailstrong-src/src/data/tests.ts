/**
 * Batterie de tests mensuels (toutes les 4 semaines), chaque jambe séparément.
 * Les repères sont indicatifs (populations actives) et servent à suivre ta
 * propre progression, pas à poser un diagnostic.
 */
export type TestJoint = 'ankle' | 'knee'

export interface MonthlyTest {
  id: string
  name: string
  joint: TestJoint
  unit: string
  /** Repère « bon niveau » pour le score (valeur atteinte = 100 %). */
  target: number
  step: number
  protocol: string[]
  why: string
}

export const MONTHLY_TESTS: MonthlyTest[] = [
  {
    id: 'balance-eyes-closed',
    name: 'Équilibre yeux fermés',
    joint: 'ankle',
    unit: 's',
    target: 30,
    step: 1,
    protocol: [
      'Pieds nus, debout sur une jambe, mains sur les hanches.',
      'Ferme les yeux et lance le chrono.',
      'Arrête dès que le pied bouge, que l’autre pied touche ou que tu ouvres les yeux (max 60 s).',
    ],
    why: 'Proprioception de la cheville : la clé contre les entorses en sentier.',
  },
  {
    id: 'knee-to-wall',
    name: 'Knee-to-wall (mobilité cheville)',
    joint: 'ankle',
    unit: 'cm',
    target: 10,
    step: 0.5,
    protocol: [
      'Face au mur, pied à plat, talon au sol.',
      'Avance le genou pour toucher le mur sans décoller le talon.',
      'Recule le pied au maximum où c’est encore possible : mesure gros orteil → mur.',
    ],
    why: 'Dorsiflexion : une cheville raide fait compenser le genou en descente.',
  },
  {
    id: 'sl-calf-max',
    name: 'Mollet unilatéral max',
    joint: 'ankle',
    unit: 'reps',
    target: 25,
    step: 1,
    protocol: [
      'Sur une marche, une jambe, un doigt au mur pour l’équilibre.',
      'Rythme 1 rep / seconde, amplitude complète (talon sous la marche → max en haut).',
      'Compte jusqu’à l’échec technique (amplitude qui diminue).',
    ],
    why: 'Endurance de force du mollet et du tendon d’Achille pour les montées.',
  },
  {
    id: 'step-down-30s',
    name: 'Step-downs contrôlés 30 s',
    joint: 'knee',
    unit: 'reps',
    target: 15,
    step: 1,
    protocol: [
      'Sur une marche de ~20 cm, jambe libre dans le vide devant.',
      'Touche le sol du talon et remonte, pendant 30 s.',
      'Ne compte que les reps propres : genou au-dessus du 2e orteil, bassin horizontal.',
    ],
    why: 'Contrôle du genou en freinage : le geste des descentes de trail.',
  },
]

export const TEST_INTERVAL_DAYS = 28
