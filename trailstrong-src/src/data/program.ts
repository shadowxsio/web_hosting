import type { AnimationId } from '../components/diagram-base'
import type { Phase } from './cadence'

export type IconName =
  | 'Footprints'
  | 'ArrowUpFromLine'
  | 'MoveVertical'
  | 'MoveHorizontal'
  | 'Anchor'
  | 'Dumbbell'
  | 'Repeat'
  | 'ArrowDownToLine'
  | 'ArrowUpRight'
  | 'Activity'
  | 'Mountain'

export type Zone = 'hanche' | 'genou' | 'cheville' | 'tronc' | 'pied'
export type Direction = 'up' | 'down' | 'back' | 'forward' | 'out' | 'hold'
export interface AttentionPoint {
  zone: Zone
  dir: Direction
  text: string
}

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
  /** Icône Lucide de la fiche (voir components/ExerciseIcon). */
  icon?: IconName
  /** 3 points d'attention biomécaniques : zone, direction du mouvement, consigne. */
  points?: AttentionPoint[]
  mode: TrackMode
  /** Suffixe des IDs DOM de suivi : check-{trackId}, log-{trackId}-weight, log-{trackId}-note. */
  trackId?: string
  /** Badge libre (exercices personnalisés) à la place du badge de focus. */
  badge?: string
  /** Poids de départ suggéré (exercices personnalisés). */
  startWeight?: string
  custom?: boolean
  /** Poids optionnel (exercices au poids du corps). */
  bodyweight?: boolean
  /** Exercices perso (catalogue / IA) : schéma, tempo du coach, photos (data URL), requête vidéo. */
  diagram?: AnimationId
  cadence?: Phase[]
  photos?: string[]
  video?: string
  /** Consignes en anglais (catalogue non traduit). */
  stepsLang?: 'en'
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
        icon: 'Footprints',
        points: [
          { zone: 'cheville', dir: 'hold', text: "Le pied « agrippe » le sol, la cheville corrige seule" },
          { zone: 'genou', dir: 'hold', text: "Légèrement fléchi, aligné sur le 2e orteil" },
          { zone: 'hanche', dir: 'hold', text: "Bassin horizontal : le moyen fessier tient" },
        ],
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
        mode: 'timed',
        bodyweight: true,
      },
      {
        id: 'tibialis-raise',
        icon: 'ArrowUpFromLine',
        points: [
          { zone: 'tronc', dir: 'hold', text: "Dos et fessiers collés au mur" },
          { zone: 'cheville', dir: 'up', text: "Orteils tirés vers les tibias au maximum" },
          { zone: 'cheville', dir: 'down', text: "Retour en 2 s sans claquer les pieds" },
        ],
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
        mode: 'strength',
        bodyweight: true,
      },
      {
        id: 'calf-raise-warm',
        icon: 'MoveVertical',
        points: [
          { zone: 'pied', dir: 'up', text: "Monte droit sur le gros orteil" },
          { zone: 'cheville', dir: 'hold', text: "Pas d’inversion en haut : cheville dans l’axe" },
          { zone: 'genou', dir: 'hold', text: "Moitié tendu (jumeaux), moitié fléchi (soléaire)" },
        ],
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
        mode: 'strength',
        bodyweight: true,
      },
      {
        id: 'sl-glute-bridge',
        icon: 'ArrowUpFromLine',
        points: [
          { zone: 'pied', dir: 'down', text: "Pousse dans le talon, pied sous le genou" },
          { zone: 'hanche', dir: 'up', text: "Monte jusqu’à l’alignement épaule-hanche-genou" },
          { zone: 'tronc', dir: 'hold', text: "Bassin rentré : rien dans le bas du dos" },
        ],
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
        mode: 'strength',
        bodyweight: true,
      },
      {
        id: 'banded-walk',
        icon: 'MoveHorizontal',
        points: [
          { zone: 'genou', dir: 'out', text: "Genoux poussés vers l’extérieur contre l’élastique" },
          { zone: 'hanche', dir: 'hold', text: "Demi-squat constant, buste droit" },
          { zone: 'pied', dir: 'out', text: "Pas latéraux, les pieds ne se touchent jamais" },
        ],
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
        mode: 'strength',
        bodyweight: true,
      },
      {
        id: 'spanish-squat',
        icon: 'Anchor',
        points: [
          { zone: 'genou', dir: 'back', text: "Bande derrière le pli des genoux, en tension" },
          { zone: 'cheville', dir: 'hold', text: "Tibias rigoureusement verticaux" },
          { zone: 'hanche', dir: 'down', text: "Assis en arrière jusqu’à 70-80° de flexion" },
        ],
        trackId: 'w4',
        tags: ['knee'],
        equipment: 'Bande élastique épaisse + poteau',
        name: 'Spanish Squat isométrique',
        target: 'Tendon rotulien · vaste médial',
        sets: 3,
        reps: '30-45 s',
        defaultReps: 40,
        rest: 45,
        cue: 'Tibias rigoureusement verticaux, dos droit, descends à 70-80° de flexion et tiens.',
        kneeAnkle:
          'La tension de la bande derrière le pli des genoux décharge la rotule tout en recrutant le vaste médial en isométrie : effet antalgique sur le tendon rotulien et verrouillage du genou avant de charger.',
        steps: [
          'Bande épaisse attachée à un poteau / une cage, calée derrière le pli des deux genoux.',
          'Recule jusqu’à une bonne tension, pieds largeur de hanches.',
          'Assieds-toi en arrière, tibias verticaux, jusqu’à 70-80° de flexion ; maintiens 30-45 s.',
        ],
        mode: 'timed',
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
        icon: 'Dumbbell',
        points: [
          { zone: 'hanche', dir: 'back', text: "Fesses loin derrière, dos plat" },
          { zone: 'genou', dir: 'hold', text: "Souples mais fixes : ils n’avancent pas" },
          { zone: 'pied', dir: 'hold', text: "Poids sur le milieu du pied / talon" },
        ],
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
        mode: 'strength',
      },
      {
        id: 'bulgarian',
        icon: 'Dumbbell',
        points: [
          { zone: 'tronc', dir: 'forward', text: "Buste incliné ~20° pour charger le fessier" },
          { zone: 'genou', dir: 'hold', text: "Genou avant dans l’axe du 2e orteil" },
          { zone: 'pied', dir: 'down', text: "Pousse dans le talon avant pour remonter" },
        ],
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
        mode: 'strength',
      },
      {
        id: 'leg-curl',
        icon: 'Repeat',
        points: [
          { zone: 'genou', dir: 'hold', text: "Axe du genou aligné avec l’axe machine" },
          { zone: 'cheville', dir: 'up', text: "Pointe de pied tirée vers toi" },
          { zone: 'genou', dir: 'down', text: "Retour freiné en 3 s" },
        ],
        tags: ['knee'],
        equipment: 'Machine',
        name: 'Leg curl unilatéral (machine)',
        target: 'Ischio-jambiers',
        sets: 3,
        reps: '10-12 reps / jambe',
        perSide: true,
        defaultReps: 12,
        rest: 60,
        tempo: '1-0-3 (3 s excentrique)',
        cue: 'Freine le retour : 3 s pour revenir en position jambes tendues.',
        kneeAnkle:
          'Pointe de pied tirée vers toi (dorsiflexion) pour mieux recruter les ischios et protéger l’arrière du genou.',
        steps: [
          'Une jambe à la fois, axe du genou aligné avec l’axe de la machine.',
          'Fléchis rapidement en ramenant le boudin sous le siège.',
          'Reviens en 3 s, sans laisser retomber la charge.',
        ],
        mode: 'strength',
      },
      {
        id: 'nordic-curl',
        icon: 'ArrowDownToLine',
        points: [
          { zone: 'cheville', dir: 'hold', text: "Talons verrouillés sous le boudin" },
          { zone: 'hanche', dir: 'hold', text: "Genoux-bassin-épaules alignés, sans casser" },
          { zone: 'genou', dir: 'down', text: "Freine la chute 4-5 s avec les ischios" },
        ],
        trackId: 'a5',
        tags: ['knee'],
        equipment: 'Tapis + boudin / barre guidée chargée',
        name: 'Nordic Hamstring Curl',
        target: 'Ischios en excentrique pur',
        sets: 3,
        reps: '5-6 reps',
        defaultReps: 5,
        rest: 90,
        tempo: '4-5 s de descente',
        cue: 'Alignement strict genoux-bassin-épaules, sans casser les hanches. Freine la chute 4-5 s.',
        kneeAnkle:
          'L’excentrique pur des ischios prépare au freinage violent des descentes de trail et protège l’arrière du genou. Réceptionne-toi avec les mains, puis repousse le sol pour remonter.',
        steps: [
          'À genoux sur un tapis, talons verrouillés sous un boudin ou la barre guidée chargée.',
          'Corps gainé et droit des genoux aux épaules.',
          'Descends le plus lentement possible (4-5 s), réceptionne-toi sur les mains, repousse pour revenir.',
        ],
        mode: 'strength',
        bodyweight: true,
      },
      {
        id: 'hip-abduction',
        icon: 'MoveHorizontal',
        points: [
          { zone: 'hanche', dir: 'out', text: "Seule la jambe s’écarte, bassin verrouillé" },
          { zone: 'genou', dir: 'hold', text: "Genou d’appui souple, pied vissé au sol" },
          { zone: 'hanche', dir: 'hold', text: "Pause 1 s en haut, retour lent" },
        ],
        tags: ['knee', 'glutes'],
        equipment: 'Machine / poulie',
        name: 'Abductions de hanche (machine / poulie basse)',
        target: 'Moyen & petit fessier',
        sets: 3,
        reps: '15 reps / jambe',
        perSide: true,
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
        mode: 'strength',
      },
      {
        id: 'standing-calf',
        icon: 'MoveVertical',
        points: [
          { zone: 'cheville', dir: 'down', text: "Talons sous la marche : étirement complet" },
          { zone: 'pied', dir: 'up', text: "Monte au maximum sur le gros orteil" },
          { zone: 'cheville', dir: 'hold', text: "Pause 1 s en haut, charge centrée" },
        ],
        tags: ['ankle'],
        equipment: 'Haltère + marche',
        name: 'Mollets debout unilatéral (avec charge)',
        target: 'Gastrocnémiens · soléaire',
        sets: 3,
        reps: '12-15 reps / jambe',
        perSide: true,
        defaultReps: 15,
        rest: 60,
        cue: 'Amplitude complète : étirement en bas, pause 1 s en haut.',
        kneeAnkle:
          'Des mollets forts = propulsion en montée et freinage en descente. Garde la charge centrée sur le gros orteil.',
        steps: [
          'Sur une marche, haltère côté de la jambe qui travaille, main libre au mur.',
          'Descends talons sous la marche (étirement).',
          'Monte au maximum, pause 1 s.',
        ],
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
        icon: 'Footprints',
        points: [
          { zone: 'hanche', dir: 'hold', text: "Hanches parallèles au sol" },
          { zone: 'hanche', dir: 'back', text: "La jambe libre prolonge le dos" },
          { zone: 'cheville', dir: 'hold', text: "Appui talon / gros orteil / petit orteil" },
        ],
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
        mode: 'strength',
      },
      {
        id: 'hip-thrust',
        icon: 'ArrowUpFromLine',
        points: [
          { zone: 'pied', dir: 'down', text: "Presse le talon d’appui, tibia vertical en haut" },
          { zone: 'hanche', dir: 'up', text: "Rétroversion du bassin, 1 s en haut" },
          { zone: 'genou', dir: 'out', text: "Genou d’appui dans l’axe du pied, bassin à plat" },
        ],
        tags: ['glutes'],
        equipment: 'Banc + haltère',
        name: 'Hip Thrust unilatéral',
        target: 'Grand fessier',
        sets: 3,
        reps: '10-12 reps / jambe',
        perSide: true,
        defaultReps: 12,
        rest: 75,
        cue: 'Une jambe pousse, l’autre genou ramené à la poitrine : bassin bien horizontal, rétroversion en haut.',
        kneeAnkle:
          'Tibia d’appui vertical en haut : pied trop loin = ischios, trop près = quadriceps. Le genou d’appui reste dans l’axe du pied, sans rentrer.',
        steps: [
          'Omoplates sur le banc, haltère tenue sur la hanche de la jambe qui travaille.',
          'L’autre genou ramené vers la poitrine, pousse dans le talon d’appui.',
          'Monte jusqu’à l’alignement épaule-hanche-genou, rétroversion 1 s, redescends.',
        ],
        mode: 'strength',
      },
      {
        id: 'leg-press-high',
        icon: 'ArrowUpRight',
        points: [
          { zone: 'pied', dir: 'up', text: "Pied haut et centré sur la plateforme" },
          { zone: 'genou', dir: 'hold', text: "Jamais verrouillés, alignés sur les pieds" },
          { zone: 'tronc', dir: 'hold', text: "Bas du dos collé au dossier jusqu’à 90°" },
        ],
        tags: ['knee', 'glutes'],
        equipment: 'Presse 45°',
        name: 'Presse inclinée unilatérale (pied haut)',
        target: 'Fessiers · ischios',
        sets: 4,
        reps: '10 reps / jambe',
        perSide: true,
        defaultReps: 10,
        rest: 75,
        cue: 'Un pied haut et centré sur la plateforme, l’autre au repos au sol : charge ≈ 55-60 % de la version à deux jambes.',
        kneeAnkle:
          'Pieds hauts = moins d’angle au genou = rotule déchargée. Ne verrouille jamais les genoux en extension, et garde-les alignés sur les pieds.',
        steps: [
          'Pieds en haut de la plateforme, plus larges que les hanches.',
          'Descends jusqu’à ~90° sans décoller le bas du dos.',
          'Pousse dans les talons, sans verrouiller les genoux.',
        ],
        mode: 'strength',
      },
      {
        id: 'step-down',
        icon: 'ArrowDownToLine',
        points: [
          { zone: 'genou', dir: 'hold', text: "Au-dessus du 2e orteil, il ne rentre pas" },
          { zone: 'genou', dir: 'down', text: "Descente 4 s, le talon effleure le sol" },
          { zone: 'hanche', dir: 'hold', text: "Bassin horizontal pendant la descente" },
        ],
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
        mode: 'strength',
        bodyweight: true,
      },
      {
        id: 'copenhagen-plank',
        icon: 'Activity',
        points: [
          { zone: 'pied', dir: 'hold', text: "Pied (ou genou) du haut posé sur le banc" },
          { zone: 'hanche', dir: 'up', text: "Bassin décollé, aligné épaules-pieds" },
          { zone: 'genou', dir: 'hold', text: "Adducteurs : verrou contre la torsion" },
        ],
        trackId: 'b5',
        tags: ['knee'],
        equipment: 'Banc plat + tapis',
        name: 'Gainage Copenhague (Copenhagen Plank)',
        target: 'Adducteurs · stabilité latérale du genou',
        sets: 3,
        reps: '20-30 s / jambe',
        defaultReps: 25,
        perSide: true,
        rest: 60,
        cue: 'Planche latérale, pied du haut sur le banc : décolle le bassin et la jambe du bas.',
        kneeAnkle:
          'L’effort sur l’intérieur de la cuisse stabilise le genou face aux forces de torsion en sentier — un excellent complément anti-valgus du moyen fessier.',
        steps: [
          'En appui sur l’avant-bras, pied (ou genou, version facile) du haut posé sur le banc.',
          'Monte le bassin pour aligner épaules-hanches-pieds, décolle la jambe du bas.',
          'Tiens 20-30 s sans laisser le bassin tomber, puis change de côté.',
        ],
        mode: 'timed',
        bodyweight: true,
      },
      {
        id: 'soleus-raise',
        icon: 'MoveVertical',
        points: [
          { zone: 'genou', dir: 'hold', text: "Genoux à 90° : jumeaux désactivés" },
          { zone: 'pied', dir: 'up', text: "Pousse sur la base du gros orteil" },
          { zone: 'cheville', dir: 'hold', text: "Cheville droite, pas de vrille externe" },
        ],
        trackId: 'b6',
        tags: ['ankle'],
        equipment: 'Banc + cale + haltères',
        name: 'Élévations de mollet assis (Soleus Raises)',
        target: 'Soléaire · tendon d’Achille',
        sets: 3,
        reps: '12-15 reps',
        defaultReps: 15,
        rest: 60,
        tempo: '1 s d’arrêt en haut',
        cue: 'Genoux pliés à 90° : les jumeaux sont désactivés, le soléaire travaille seul.',
        kneeAnkle:
          'Pousse fermement sur la base du gros orteil pour garder la cheville dans l’axe, sans vriller vers l’extérieur. Le soléaire propulse et absorbe dans les montées raides.',
        steps: [
          'Assis sur un banc, avant des pieds sur une cale, haltères posés sur les cuisses.',
          'Monte les talons lentement, tiens 1 s en haut.',
          'Redescends sous l’horizontale pour étirer le tendon d’Achille.',
        ],
        mode: 'strength',
      },
      {
        id: 'sl-calf-raise',
        icon: 'MoveVertical',
        points: [
          { zone: 'cheville', dir: 'up', text: "Monte sur l’avant-pied, pause 1 s" },
          { zone: 'cheville', dir: 'down', text: "Descente 3 s sous l’horizontale" },
          { zone: 'pied', dir: 'hold', text: "Commence toujours par la cheville faible" },
        ],
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
        icon: 'Mountain',
        points: [
          { zone: 'pied', dir: 'down', text: "Pose tout le pied, pousse dans le talon" },
          { zone: 'hanche', dir: 'forward', text: "Buste légèrement penché, foulée courte" },
          { zone: 'genou', dir: 'hold', text: "Zéro impact : mains sur les cuisses si raide" },
        ],
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
        mode: 'treadmill',
      },
    ],
  },
]

export const ALL_EXERCISES = PROGRAM.flatMap((s) => s.exercises.map((e) => ({ ...e, sessionId: s.id })))
