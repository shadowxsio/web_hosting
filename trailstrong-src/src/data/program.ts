import type { AnimationId } from '../components/figures'

export type TrackMode = 'strength' | 'timed' | 'treadmill'

/** Focus anatomique — sert aux filtres « Focus Genou / Cheville / Fessiers ». Le 1er tag est le focus principal. */
export type FocusTag = 'knee' | 'ankle' | 'glutes'

export interface Exercise {
  id: string
  name: string
  target: string
  tags: FocusTag[]
  equipment: string
  sets: number
  /** Texte affiché du protocole (ex. « 8-10 reps », « 45 s »). */
  reps: string
  /** Valeur pré-remplie dans le champ reps / secondes. */
  defaultReps?: number
  perSide?: boolean
  /** Repos entre séries, en secondes (lance le chrono à la validation). */
  rest: number
  tempo?: string
  cue: string
  /** Conseil spécial genou / cheville. */
  kneeAnkle: string
  steps: string[]
  animation: AnimationId
  mode: TrackMode
  /** Poids optionnel (exercices au poids du corps). */
  bodyweight?: boolean
}

export interface Session {
  id: SessionId
  short: string
  title: string
  subtitle: string
  duration: string
  goal: string
  exercises: Exercise[]
}

export type SessionId = 'activation' | 'seanceA' | 'seanceB' | 'tapis'

export const PROGRAM: Session[] = [
  {
    id: 'activation',
    short: 'Activation',
    title: 'Activation & Mobilité',
    subtitle: 'Échauffement · 10-15 min',
    duration: '10-15 min',
    goal: 'Réveiller chevilles et fessiers avant de charger, pour protéger les genoux.',
    exercises: [
      {
        id: 'sl-balance',
        tags: ['ankle', 'glutes'],
        equipment: 'Poids du corps',
        name: 'Proprioception sur une jambe',
        target: 'Stabilisateurs de cheville · moyen fessier',
        sets: 3,
        reps: '45 s / jambe',
        defaultReps: 45,
        perSide: true,
        rest: 30,
        cue: 'Yeux ouverts → yeux fermés → mouvements de bras. Le pied « agrippe » le sol.',
        kneeAnkle:
          'Genou d’appui légèrement fléchi et aligné sur le 2e orteil. Si la cheville vacille, c’est le but : laisse-la corriger, ne te rattrape pas avec la hanche.',
        steps: [
          'Pieds nus ou chaussures plates, debout sur une jambe.',
          '15 s yeux ouverts, 15 s yeux fermés, 15 s avec bras qui balaient.',
          'Bassin horizontal : le moyen fessier d’appui empêche la hanche de tomber.',
        ],
        animation: 'balance',
        mode: 'timed',
        bodyweight: true,
      },
      {
        id: 'tibialis-raise',
        tags: ['ankle', 'knee'],
        equipment: 'Mur',
        name: 'Tibialis Raises',
        target: 'Tibial antérieur (avant du tibia)',
        sets: 2,
        reps: '20 reps',
        defaultReps: 20,
        rest: 30,
        cue: 'Dos au mur, talons à ~30 cm. Remonte la pointe des pieds au maximum, redescends lentement.',
        kneeAnkle:
          'Un tibial fort absorbe les chocs en descente et réduit la charge sur la rotule. Plus les talons sont loin du mur, plus c’est dur.',
        steps: [
          'Dos et fessiers appuyés au mur, jambes tendues.',
          'Tire les orteils vers les tibias le plus haut possible.',
          'Redescends en 2 s sans claquer les pieds.',
        ],
        animation: 'tibialis',
        mode: 'strength',
        bodyweight: true,
      },
      {
        id: 'calf-raise-warm',
        tags: ['ankle'],
        equipment: 'Marche',
        name: 'Montées de mollets (soléaire & jumeaux)',
        target: 'Gastrocnémiens · soléaire',
        sets: 2,
        reps: '15 reps',
        defaultReps: 15,
        rest: 30,
        cue: 'Moitié jambes tendues (jumeaux), moitié genoux fléchis (soléaire). Pause 1 s en haut.',
        kneeAnkle:
          'Monte bien droit sur le gros orteil : la cheville ne doit pas partir vers l’extérieur (inversion) en haut du mouvement.',
        steps: [
          'Avant-pieds au bord d’une marche, talons dans le vide.',
          'Monte au maximum, tiens 1 s, descends sous l’horizontale.',
          '8 reps jambes tendues puis 7 reps genoux fléchis.',
        ],
        animation: 'calfRaise',
        mode: 'strength',
        bodyweight: true,
      },
      {
        id: 'sl-glute-bridge',
        tags: ['glutes', 'knee'],
        equipment: 'Tapis de sol',
        name: 'Pont fessier unilatéral',
        target: 'Grand fessier · ischio-jambiers',
        sets: 2,
        reps: '10 reps / jambe',
        defaultReps: 10,
        perSide: true,
        rest: 30,
        cue: 'Pousse dans le talon, serre le fessier en haut 2 s. Connexion cerveau-fessier.',
        kneeAnkle:
          'Talon d’appui sous le genou (pas trop loin) : si tu sens les ischios crampés, rapproche le pied ; si tu sens le bas du dos, rentre le bassin.',
        steps: [
          'Allongé sur le dos, un pied au sol, l’autre jambe tendue.',
          'Monte les hanches jusqu’à l’alignement épaule-hanche-genou.',
          'Pause 2 s, redescends sans toucher le sol entre les reps.',
        ],
        animation: 'gluteBridge',
        mode: 'strength',
        bodyweight: true,
      },
      {
        id: 'banded-walk',
        tags: ['glutes', 'knee'],
        equipment: 'Élastique',
        name: 'Banded walks / Clamshells',
        target: 'Moyen fessier (anti-valgus)',
        sets: 2,
        reps: '15 pas / côté',
        defaultReps: 15,
        rest: 30,
        cue: 'Élastique au-dessus des genoux, demi-squat, pas latéraux sans que les pieds se touchent.',
        kneeAnkle:
          'Pousse les genoux vers l’extérieur contre l’élastique : c’est exactement le réflexe qui stoppe l’affaissement du genou (valgus) en descente.',
        steps: [
          'Élastique au-dessus des genoux, pieds largeur de hanches.',
          'Demi-squat, buste droit, tension constante sur l’élastique.',
          'Pas latéraux contrôlés, 15 vers la droite puis 15 vers la gauche.',
        ],
        animation: 'bandedWalk',
        mode: 'strength',
        bodyweight: true,
      },
    ],
  },
  {
    id: 'seanceA',
    short: 'Séance A',
    title: 'Séance A — Force postérieure',
    subtitle: 'Ischio-jambiers & grand fessier',
    duration: '50-60 min',
    goal: 'Construire des ischios et des fessiers solides pour décharger le genou.',
    exercises: [
      {
        id: 'db-rdl',
        tags: ['glutes'],
        equipment: 'Haltères',
        name: 'RDL aux haltères',
        target: 'Ischio-jambiers · grand fessier',
        sets: 4,
        reps: '8-10 reps',
        defaultReps: 10,
        rest: 90,
        cue: 'Fesses loin derrière, ischios tendus, haltères qui frôlent les cuisses.',
        kneeAnkle:
          'Genoux souples mais FIXES : ils ne doivent pas avancer pendant la descente. Le poids reste sur le milieu du pied / talon.',
        steps: [
          'Debout, haltères devant les cuisses, genoux légèrement fléchis.',
          'Pousse les hanches vers l’arrière, dos plat, jusqu’à l’étirement des ischios.',
          'Remonte en poussant les hanches vers l’avant, serre les fessiers.',
        ],
        animation: 'rdl',
        mode: 'strength',
      },
      {
        id: 'bulgarian',
        tags: ['knee', 'glutes'],
        equipment: 'Haltères + banc',
        name: 'Fentes bulgares (buste incliné)',
        target: 'Grand fessier · quadriceps',
        sets: 3,
        reps: '8-10 reps / jambe',
        defaultReps: 10,
        perSide: true,
        rest: 60,
        cue: 'Buste à ~20° vers l’avant pour charger le fessier, genou avant dans l’axe.',
        kneeAnkle:
          'Le genou avant suit la direction du 2e orteil — jamais vers l’intérieur. Talon avant bien ancré, cheville stable.',
        steps: [
          'Pied arrière sur le banc, pied avant à ~2 pieds devant.',
          'Descends verticalement, buste incliné, jusqu’à la cuisse ≈ parallèle.',
          'Remonte en poussant dans le talon avant.',
        ],
        animation: 'bulgarian',
        mode: 'strength',
      },
      {
        id: 'leg-curl',
        tags: ['knee'],
        equipment: 'Machine',
        name: 'Leg curl assis / couché (machine)',
        target: 'Ischio-jambiers',
        sets: 3,
        reps: '10-12 reps',
        defaultReps: 12,
        rest: 60,
        tempo: '1-0-3 (3 s excentrique)',
        cue: 'Freine le retour : 3 s pour revenir en position jambes tendues.',
        kneeAnkle:
          'Pointe de pied tirée vers toi (dorsiflexion) pour mieux recruter les ischios et protéger l’arrière du genou.',
        steps: [
          'Axe du genou aligné avec l’axe de la machine.',
          'Fléchis rapidement en ramenant le boudin sous le siège.',
          'Reviens en 3 s, sans laisser retomber la charge.',
        ],
        animation: 'legCurl',
        mode: 'strength',
      },
      {
        id: 'hip-abduction',
        tags: ['knee', 'glutes'],
        equipment: 'Machine / poulie',
        name: 'Abductions de hanche (machine / poulie basse)',
        target: 'Moyen & petit fessier',
        sets: 3,
        reps: '15 reps',
        defaultReps: 15,
        rest: 45,
        tempo: '1 s de pause en haut',
        cue: 'Verrouille la hanche : le bassin ne bascule pas, seule la jambe s’écarte.',
        kneeAnkle:
          'Un moyen fessier fort maintient le genou dans l’axe à chaque appui en trail. Pied d’appui « vissé » au sol, genou d’appui souple.',
        steps: [
          'Cheville sanglée à la poulie basse (côté opposé) ou assis à la machine.',
          'Écarte la jambe sans pencher le buste.',
          'Tiens 1 s en haut, reviens lentement.',
        ],
        animation: 'abduction',
        mode: 'strength',
      },
      {
        id: 'standing-calf',
        tags: ['ankle'],
        equipment: 'Machine / haltère',
        name: 'Mollets debout (avec charge)',
        target: 'Gastrocnémiens · soléaire',
        sets: 3,
        reps: '12-15 reps',
        defaultReps: 15,
        rest: 60,
        cue: 'Amplitude complète : étirement en bas, pause 1 s en haut.',
        kneeAnkle:
          'Des mollets forts = propulsion en montée et freinage en descente. Garde la charge centrée sur le gros orteil.',
        steps: [
          'Machine mollets debout ou haltère + marche.',
          'Descends talons sous la marche (étirement).',
          'Monte au maximum, pause 1 s.',
        ],
        animation: 'calfRaise',
        mode: 'strength',
      },
    ],
  },
  {
    id: 'seanceB',
    short: 'Séance B',
    title: 'Séance B — Unilatéral & cheville',
    subtitle: 'Stabilité, freinage, déséquilibres',
    duration: '50-60 min',
    goal: 'Corriger les asymétries et apprendre au genou à freiner sans s’effondrer.',
    exercises: [
      {
        id: 'sl-rdl',
        tags: ['ankle', 'glutes'],
        equipment: 'Haltère',
        name: 'Single-leg RDL',
        target: 'Ischios · fessiers · cheville d’appui',
        sets: 3,
        reps: '8 reps / jambe',
        defaultReps: 8,
        perSide: true,
        rest: 60,
        cue: 'Hanches parallèles au sol, la jambe arrière prolonge le dos.',
        kneeAnkle:
          'La cheville d’appui travaille en proprioception à chaque rep : orteils détendus, poids réparti talon / gros orteil / petit orteil.',
        steps: [
          'Haltère dans la main opposée à la jambe d’appui.',
          'Bascule le buste en tendant la jambe libre vers l’arrière.',
          'Remonte en serrant le fessier d’appui.',
        ],
        animation: 'singleLegRdl',
        mode: 'strength',
      },
      {
        id: 'hip-thrust',
        tags: ['glutes'],
        equipment: 'Barre + banc',
        name: 'Hip Thrust (banc ou Smith)',
        target: 'Grand fessier',
        sets: 3,
        reps: '10-12 reps',
        defaultReps: 12,
        rest: 75,
        cue: 'Presse les talons, rétroversion du bassin en haut, menton rentré.',
        kneeAnkle:
          'Tibias verticaux en haut du mouvement : pieds trop loin = ischios, trop près = quadriceps. Genoux écartés dans l’axe des pieds.',
        steps: [
          'Omoplates sur le banc, barre (avec mousse) sur les hanches.',
          'Pousse dans les talons jusqu’à l’alignement épaules-hanches-genoux.',
          'Bascule le bassin (rétroversion), tiens 1 s, redescends.',
        ],
        animation: 'hipThrust',
        mode: 'strength',
      },
      {
        id: 'leg-press-high',
        tags: ['knee', 'glutes'],
        equipment: 'Presse 45°',
        name: 'Presse inclinée (pieds hauts & larges)',
        target: 'Fessiers · ischios',
        sets: 4,
        reps: '10 reps',
        defaultReps: 10,
        rest: 90,
        cue: 'Pieds hauts et larges sur la plateforme pour cibler la chaîne postérieure.',
        kneeAnkle:
          'Pieds hauts = moins d’angle au genou = rotule déchargée. Ne verrouille jamais les genoux en extension, et garde-les alignés sur les pieds.',
        steps: [
          'Pieds en haut de la plateforme, plus larges que les hanches.',
          'Descends jusqu’à ~90° sans décoller le bas du dos.',
          'Pousse dans les talons, sans verrouiller les genoux.',
        ],
        animation: 'legPress',
        mode: 'strength',
      },
      {
        id: 'step-down',
        tags: ['knee', 'glutes'],
        equipment: 'Marche',
        name: 'Step-downs excentriques',
        target: 'Quadriceps (freinage) · moyen fessier',
        sets: 3,
        reps: '10 reps / jambe',
        defaultReps: 10,
        perSide: true,
        rest: 60,
        tempo: '4 s de descente',
        cue: '4 s pour descendre le talon libre vers le sol, sans charge ou très léger.',
        kneeAnkle:
          'L’exercice roi du genou en descente : le genou d’appui reste au-dessus du 2e orteil. S’il rentre, réduis la hauteur de marche.',
        steps: [
          'Debout sur une marche (15-20 cm), jambe libre dans le vide devant.',
          'Fléchis la jambe d’appui en 4 s jusqu’à effleurer le sol du talon.',
          'Remonte sans pousser avec la jambe libre.',
        ],
        animation: 'stepDown',
        mode: 'strength',
        bodyweight: true,
      },
      {
        id: 'sl-calf-raise',
        tags: ['ankle'],
        equipment: 'Marche',
        name: 'Calf raises unilatéral (assis ou debout)',
        target: 'Mollet · force de cheville',
        sets: 3,
        reps: '12 reps / jambe',
        defaultReps: 12,
        perSide: true,
        rest: 45,
        cue: 'Une jambe à la fois, amplitude complète, contrôle total.',
        kneeAnkle:
          'L’unilatéral révèle la cheville faible : commence toujours par elle, et fais le même nombre de reps de l’autre côté.',
        steps: [
          'Sur une marche, une main au mur pour l’équilibre.',
          'Monte sur l’avant-pied, pause 1 s.',
          'Descends en 3 s sous l’horizontale.',
        ],
        animation: 'singleCalf',
        mode: 'strength',
      },
    ],
  },
  {
    id: 'tapis',
    short: 'Tapis D+',
    title: 'Tapis D+ — Power Hike',
    subtitle: 'Spécifique trail sans choc',
    duration: '30-45 min',
    goal: 'Accumuler du D+ et renforcer l’arrière de la jambe sans aucun impact ni décélération.',
    exercises: [
      {
        id: 'power-hike',
        tags: ['knee', 'ankle', 'glutes'],
        equipment: 'Tapis incliné',
        name: 'Power Hike sur tapis incliné',
        target: 'Mollets · ischios · fessiers · cardio',
        sets: 1,
        reps: '30-45 min',
        rest: 0,
        cue: 'Pente 12-15 % (max de l’ÉconoFitness), 4,5 à 5,5 km/h. Ne tiens pas les barres !',
        kneeAnkle:
          'Zéro impact, zéro freinage : le genou est préservé. Pose tout le pied et pousse dans le talon pour engager les fessiers ; mains sur les cuisses dans les blocs les plus raides.',
        steps: [
          '5 min d’échauffement à 8 % / 4,5 km/h.',
          'Bloc principal à 12-15 %, 4,5-5,5 km/h, foulée courte.',
          'Retour au calme 3-5 min à plat.',
        ],
        animation: 'powerHike',
        mode: 'treadmill',
      },
    ],
  },
]

export const ALL_EXERCISES = PROGRAM.flatMap((s) => s.exercises.map((e) => ({ ...e, sessionId: s.id })))
