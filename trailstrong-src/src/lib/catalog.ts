/**
 * Catalogue d'exercices intégré (free-exercise-db, domaine public — Unlicense) :
 * ~800 exercices avec 2 photos, muscles, matériel et consignes (en anglais).
 * public/catalog.json est précaché par le service worker (recherche hors-ligne) ;
 * les photos viennent de GitHub et sont copiées dans l'exercice à l'ajout.
 */
import type { AnimationId } from '../components/diagram-base'
import type { Phase } from '../data/cadence'
import type { FocusTag } from '../data/program'
import type { CustomDraft } from './custom'

export interface CatalogEntry {
  id: string
  n: string // nom (anglais)
  c: string // catégorie
  e: string // matériel
  m: string[] // muscles principaux
  s: string[] // muscles secondaires
  l: string // niveau
  f: string // force : push / pull / static
  x: string // compound / isolation
  t: string[] // consignes (anglais)
  img: string[]
}

const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'
export const imgUrl = (path: string) => IMG_BASE + path

let promise: Promise<CatalogEntry[]> | null = null
export function loadCatalog(): Promise<CatalogEntry[]> {
  promise ??= fetch(`${import.meta.env.BASE_URL}catalog.json`)
    .then((r) => {
      if (!r.ok) throw new Error('Catalogue indisponible.')
      return r.json() as Promise<CatalogEntry[]>
    })
    .catch((e) => {
      promise = null
      throw e
    })
  return promise
}

// ── Libellés français ────────────────────────────────────────────────────
export const MUSCLE_FR: Record<string, string> = {
  quadriceps: 'Quadriceps',
  hamstrings: 'Ischios',
  glutes: 'Fessiers',
  calves: 'Mollets',
  adductors: 'Adducteurs',
  abductors: 'Abducteurs',
  abdominals: 'Abdos',
  'lower back': 'Lombaires',
  shoulders: 'Épaules',
  chest: 'Pectoraux',
  triceps: 'Triceps',
  biceps: 'Biceps',
  lats: 'Dorsaux',
  'middle back': 'Milieu du dos',
  traps: 'Trapèzes',
  forearms: 'Avant-bras',
  neck: 'Cou',
}
export const EQUIP_FR: Record<string, string> = {
  barbell: 'Barre',
  dumbbell: 'Haltères',
  other: 'Divers',
  'body only': 'Poids du corps',
  cable: 'Poulie',
  machine: 'Machine',
  kettlebells: 'Kettlebell',
  bands: 'Élastique',
  'medicine ball': 'Médecine-ball',
  'exercise ball': 'Swiss ball',
  'foam roll': 'Rouleau',
  'e-z curl bar': 'Barre EZ',
  '': 'Poids du corps',
}
const CAT_FR: Record<string, string> = {
  strength: 'Force',
  stretching: 'Étirement',
  plyometrics: 'Pliométrie',
  powerlifting: 'Force',
  cardio: 'Cardio',
}
export const musclesFr = (e: CatalogEntry) => e.m.map((m) => MUSCLE_FR[m] ?? m)
export const equipFr = (e: CatalogEntry) => EQUIP_FR[e.e] ?? e.e
export const catFr = (e: CatalogEntry) => CAT_FR[e.c] ?? e.c

// ── Recherche (français ou anglais) ──────────────────────────────────────
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Mot français → termes anglais du catalogue. */
const SYNONYMS: Record<string, string[]> = {
  fente: ['lunge', 'split squat'],
  fentes: ['lunge', 'split squat'],
  bulgare: ['bulgarian', 'split squat'],
  mollet: ['calf', 'calves'],
  mollets: ['calf', 'calves'],
  soleaire: ['seated calf', 'soleus'],
  fessier: ['glute', 'hip thrust', 'bridge'],
  fessiers: ['glute', 'hip thrust', 'bridge'],
  ischio: ['hamstring', 'leg curl'],
  ischios: ['hamstring', 'leg curl'],
  quadri: ['quadriceps', 'leg extension'],
  quadriceps: ['quadriceps'],
  adducteur: ['adductor'],
  adducteurs: ['adductor'],
  abducteur: ['abductor', 'abduction'],
  abducteurs: ['abductor', 'abduction'],
  abduction: ['abduction', 'abductor'],
  gainage: ['plank'],
  planche: ['plank'],
  pont: ['bridge'],
  souleve: ['deadlift'],
  terre: ['deadlift'],
  presse: ['leg press'],
  tirage: ['row', 'pulldown'],
  rowing: ['row'],
  pompe: ['push up', 'pushup'],
  pompes: ['push up', 'pushup'],
  developpe: ['press'],
  epaule: ['shoulders'],
  epaules: ['shoulders'],
  dos: ['back', 'lats'],
  lombaires: ['lower back'],
  abdos: ['abdominals', 'crunch', 'sit up'],
  abdominaux: ['abdominals', 'crunch'],
  cheville: ['calf', 'ankle', 'tibialis'],
  chevilles: ['calf', 'ankle', 'tibialis'],
  genou: ['quadriceps', 'leg extension', 'squat'],
  genoux: ['quadriceps', 'leg extension', 'squat'],
  etirement: ['stretch'],
  etirements: ['stretch'],
  mobilite: ['stretch'],
  saut: ['jump', 'hop', 'bound'],
  sauts: ['jump', 'hop', 'bound'],
  pliometrie: ['jump', 'hop', 'bound'],
  marche: ['step', 'walk'],
  montee: ['step up', 'raise'],
  descente: ['step down'],
  haltere: ['dumbbell'],
  halteres: ['dumbbell'],
  barre: ['barbell'],
  elastique: ['band'],
  poulie: ['cable'],
  unilateral: ['single leg', 'one leg', 'single'],
  jambe: ['leg'],
  hanche: ['hip'],
  psoas: ['hip flexor'],
  flechisseur: ['hip flexor'],
  tibial: ['tibialis'],
  equilibre: ['balance', 'single leg'],
  accroupi: ['squat'],
  chaise: ['wall sit'],
  extension: ['extension'],
  curl: ['curl'],
  pectoraux: ['chest'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  gobelet: ['goblet'],
  kettlebell: ['kettlebell'],
}
const STOP = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'a', 'au', 'aux', 'en', 'et', 'pour', 'avec', 'sur', 'un', 'une'])

/** Expressions françaises → un seul mot-clé (avant découpage). */
const PHRASES: [RegExp, string][] = [
  [/\b(une|1|sur une) jambe\b/g, 'unilateral'],
  [/\bsouleve de terre\b/g, 'deadlift'],
  [/\bmontees? de (marche|banc|box)\b/g, 'stepup'],
  [/\bgainage lateral\b/g, 'sideplank'],
  [/\bhip thrust\b/g, 'hipthrust'],
  [/\bleg curl\b/g, 'legcurl'],
]
const PHRASE_SYN: Record<string, string[]> = {
  stepup: ['step up', 'step-up'],
  sideplank: ['side plank', 'side bridge'],
  hipthrust: ['hip thrust'],
  legcurl: ['leg curl'],
}

export function searchCatalog(list: CatalogEntry[], query: string, limit = 40): CatalogEntry[] {
  let q = norm(query)
  for (const [re, w] of PHRASES) q = q.replace(re, w)
  const words = q
    .split(' ')
    .filter((w) => w && !STOP.has(w))
  if (!words.length) return []
  const scored: [number, CatalogEntry][] = []
  for (const e of list) {
    const name = norm(e.n)
    const rest = norm(`${e.m.join(' ')} ${e.s.join(' ')} ${e.e} ${e.c} ${musclesFr(e).join(' ')} ${equipFr(e)}`)
    let score = 0
    let all = true
    for (const w of words) {
      const alts = [w, ...(SYNONYMS[w] ?? PHRASE_SYN[w] ?? [])].map(norm)
      if (alts.some((a) => name.includes(a))) score += 3
      else if (alts.some((a) => rest.includes(a))) score += 1
      else all = false
    }
    if (score > 0) scored.push([score + (all ? 4 : 0) - e.n.length / 100, e])
  }
  return scored
    .sort((a, b) => b[0] - a[0])
    .slice(0, limit)
    .map(([, e]) => e)
}

// ── Schéma auto ──────────────────────────────────────────────────────────
const RULES: [RegExp, AnimationId][] = [
  [/seated calf|soleus/, 'soleusRaise'],
  [/(single|one).?leg.*calf|calf.*(single|one).?leg/, 'singleCalf'],
  [/tibialis|toe raise|dorsi/, 'tibialis'],
  [/(calf|achilles|soleus).*stretch|stretch.*(calf|achilles)/, 'calfStretch'],
  [/calf|heel raise/, 'calfRaise'],
  [/stretch|mobility/, 'kneelingStretch'],
  [/nordic|glute ham/, 'nordic'],
  [/leg curl|hamstring curl/, 'legCurl'],
  [/leg extension/, 'legExtension'],
  [/leg press|hack squat|sled press/, 'legPress'],
  [/hip thrust/, 'hipThrust'],
  [/bridge/, 'gluteBridge'],
  [/(single|one).?leg.*(deadlift|rdl)|(deadlift|rdl).*(single|one).?leg/, 'singleLegRdl'],
  [/romanian|deadlift|good morning|stiff.?leg|hinge|swing|pull.?through|rdl/, 'rdl'],
  [/step.?down/, 'stepDown'],
  [/step.?up|box step/, 'stepUp'],
  [/bulgarian|split squat|rear.?foot/, 'bulgarian'],
  [/lateral lunge|side lunge|cossack/, 'lateralLunge'],
  [/lunge/, 'lunge'],
  [/wall sit/, 'wallSit'],
  [/spanish/, 'spanishSquat'],
  [/jump|hop|bound|skater|plyo/, 'jump'],
  [/bodyweight squat|air squat|freehand squat/, 'bodySquat'],
  [/squat|thruster/, 'squat'],
  [/copenhagen|adduct/, 'copenhagen'],
  [/side plank|side bridge/, 'sidePlank'],
  [/plank|hollow/, 'plank'],
  [/dead bug|leg raise|crunch|sit.?up|v.?up|flutter|toe touch|knee raise/, 'deadBug'],
  [/bird dog|superman|quadruped|hyperextension|back extension/, 'birdDog'],
  [/band.*walk|monster walk|lateral walk|side.?step/, 'bandedWalk'],
  [/abduct|clam|fire hydrant/, 'abduction'],
  [/push.?up|dip/, 'pushUp'],
  [/row|pull|chin|pulldown|shrug/, 'row'],
  [/press|raise|fly|curl|extension|kickback/, 'press'],
  [/balance|stability|proprio/, 'balance'],
  [/walk|march|hike|treadmill|stair|climb/, 'powerHike'],
]
const BY_MUSCLE: Record<string, AnimationId> = {
  calves: 'calfRaise',
  hamstrings: 'rdl',
  glutes: 'gluteBridge',
  quadriceps: 'squat',
  adductors: 'copenhagen',
  abductors: 'abduction',
  abdominals: 'plank',
  'lower back': 'birdDog',
  chest: 'pushUp',
  lats: 'row',
  'middle back': 'row',
  traps: 'row',
}

export function guessDiagram(name: string, muscles: string[] = [], category = ''): AnimationId {
  const n = name.toLowerCase()
  for (const [re, id] of RULES) if (re.test(n)) return id
  if (category === 'stretching') return 'kneelingStretch'
  if (category === 'plyometrics') return 'jump'
  for (const m of muscles) if (BY_MUSCLE[m]) return BY_MUSCLE[m]
  return muscles.length ? 'press' : 'squat'
}

/** Schémas où la rep commence par la descente (excentrique d'abord). */
const ECCENTRIC_FIRST = new Set<AnimationId>(['squat', 'lunge', 'lateralLunge', 'bulgarian', 'rdl', 'singleLegRdl', 'legPress', 'stepDown', 'pushUp', 'spanishSquat'])

export function defaultCadence(diagram: AnimationId, plyo = false): Phase[] {
  if (plyo) return [{ label: 'Saute', s: 1, kind: 'go' }, { label: 'Réception', s: 2, kind: 'hold' }]
  if (ECCENTRIC_FIRST.has(diagram)) return [{ label: 'Descends', s: 3, kind: 'back' }, { label: 'Monte', s: 1, kind: 'go' }]
  return [{ label: 'Effort', s: 1, kind: 'go' }, { label: 'Tiens', s: 1, kind: 'hold' }, { label: 'Retour', s: 2, kind: 'back' }]
}

export function tagsFromMuscles(muscles: string[]): FocusTag[] {
  const t = new Set<FocusTag>()
  for (const m of muscles) {
    if (m === 'quadriceps' || m === 'hamstrings') t.add('knee')
    if (m === 'calves') t.add('ankle')
    if (m === 'glutes' || m === 'abductors' || m === 'adductors') t.add('glutes')
  }
  return [...t]
}

/** Brouillon d'exercice perso prêt à ajouter, sans IA. */
export function draftFromCatalog(e: CatalogEntry): CustomDraft {
  const n = e.n.toLowerCase()
  const diagram = guessDiagram(e.n, e.m, e.c)
  const perSide = /single|one.?(leg|arm)|unilateral|lunge|split|step|bulgarian|pistol|side plank|lateral|alternat/.test(n)
  const timed = e.c === 'stretching' || e.f === 'static' || /plank|hold|wall sit|isometric/.test(n)
  const plyo = e.c === 'plyometrics'
  const iso = e.x === 'isolation'
  const sets = e.c === 'stretching' ? 2 : 3
  const reps = timed ? (e.c === 'stretching' ? 30 : 30) : plyo ? 6 : iso ? 12 : 10
  const side = perSide ? (timed ? ' / côté' : ' / jambe') : ''
  return {
    source: 'catalog',
    catalogId: e.id,
    name: e.n,
    target: musclesFr(e).join(', ') || catFr(e),
    tags: tagsFromMuscles([...e.m, ...e.s]),
    equipment: equipFr(e),
    sets,
    reps: timed ? `${reps} s${side}` : `${reps} reps${side}`,
    defaultReps: reps,
    perSide,
    restS: timed ? 45 : plyo ? 90 : iso ? 60 : 75,
    mode: timed ? 'timed' : 'strength',
    cadence: timed ? undefined : defaultCadence(diagram, plyo),
    steps: e.t,
    stepsLang: 'en',
    diagram,
    video: e.n,
  }
}

/** Télécharge les 2 photos et les réduit en JPEG (data URL) pour le hors-ligne. */
export async function fetchPhotos(paths: string[], width = 420): Promise<string[]> {
  const out: string[] = []
  for (const p of paths.slice(0, 2)) {
    const res = await fetch(imgUrl(p))
    if (!res.ok) throw new Error('Photo indisponible.')
    const bmp = await createImageBitmap(await res.blob())
    const h = Math.round((bmp.height / bmp.width) * width)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = h
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, width, h)
    out.push(canvas.toDataURL('image/jpeg', 0.72))
  }
  return out
}
