/**
 * Assistant IA (Google Gemini) pour créer un exercice complet à partir d'une
 * demande en français. Appel direct depuis le navigateur avec la clé API de
 * l'utilisateur, stockée uniquement sur cet appareil (jamais exportée).
 */
import { useSyncExternalStore } from 'react'
import type { AnimationId } from '../components/diagram-base'
import type { FocusTag } from '../data/program'
import { draftFromCatalog, fetchPhotos, loadCatalog, type CatalogEntry } from './catalog'
import type { CustomDraft } from './custom'
import { getData } from './storage'

const KEY = 'trailstrong:gemini'
export const DEFAULT_MODEL = 'gemini-flash-latest'

interface AiConfig {
  key: string
  model: string
}
const read = (): AiConfig => {
  try {
    return { key: '', model: DEFAULT_MODEL, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<AiConfig>) }
  } catch {
    return { key: '', model: DEFAULT_MODEL }
  }
}
let cfg = read()
const ls = new Set<() => void>()
export function setAiConfig(p: Partial<AiConfig>) {
  cfg = { ...cfg, ...p }
  if (cfg.key || cfg.model !== DEFAULT_MODEL) localStorage.setItem(KEY, JSON.stringify(cfg))
  else localStorage.removeItem(KEY)
  ls.forEach((l) => l())
}
export function useAiConfig(): AiConfig {
  return useSyncExternalStore(
    (l) => {
      ls.add(l)
      return () => ls.delete(l)
    },
    () => cfg,
  )
}
export const aiReady = () => !!cfg.key

/** Schémas disponibles, décrits pour le modèle. */
export const DIAGRAMS: Record<AnimationId, string> = {
  balance: 'équilibre sur une jambe, debout',
  tibialis: 'relevé de pointes de pieds (tibial), dos au mur',
  calfRaise: 'montée sur pointes deux jambes, sur une marche',
  singleCalf: 'montée sur pointe une jambe, main au mur',
  soleusRaise: 'mollets assis (soléaire), charge sur les genoux',
  gluteBridge: 'pont fessier au sol',
  hipThrust: 'hip thrust, dos sur un banc',
  bandedWalk: 'marche latérale avec élastique (vue de face)',
  abduction: 'abduction de hanche debout à la poulie (vue de face)',
  rdl: 'soulevé de terre jambes tendues / charnière de hanche, deux jambes',
  singleLegRdl: 'soulevé de terre une jambe',
  bulgarian: 'fente bulgare, pied arrière sur banc',
  lunge: 'fente avant / arrière',
  lateralLunge: 'fente latérale (vue de face)',
  squat: 'squat (gobelet, barre, poids du corps)',
  spanishSquat: 'squat espagnol isométrique avec sangle',
  wallSit: 'chaise contre le mur (isométrique)',
  stepUp: 'montée sur box / marche',
  stepDown: 'descente contrôlée d’une marche',
  legPress: 'presse à cuisses',
  legExtension: 'leg extension (machine, quadriceps)',
  legCurl: 'leg curl (machine, ischios)',
  nordic: 'nordic hamstring curl, à genoux',
  copenhagen: 'gainage Copenhague (adducteurs, pied sur un banc)',
  sidePlank: 'gainage latéral',
  plank: 'gainage ventral sur les avant-bras',
  deadBug: 'dead bug / exercices d’abdos sur le dos',
  birdDog: 'bird dog / quadrupédie, extension de dos',
  pushUp: 'pompes',
  row: 'tirage / rowing buste penché',
  press: 'développé / exercice du haut du corps',
  jump: 'saut / pliométrie',
  kneelingStretch: 'étirement fente basse à genou (fléchisseurs de hanche, quadriceps)',
  calfStretch: 'étirement des mollets contre un mur',
  powerHike: 'marche en côte sur tapis',
  hamstringStretch: 'étirement des ischios couché, jambe tendue levée (sangle)',
  quadStretch: 'étirement des quadriceps debout, talon à la fesse',
  figure4: 'étirement des fessiers couché en « figure 4 » (cheville sur le genou)',
  kneeToWall: 'mobilité de cheville genou au mur, en fente',
  soleusStretch: 'étirement du soléaire contre un mur, genou arrière fléchi',
}

/** Profil de l'utilisateur pour le prompt (questionnaire), sinon profil du programme de base. */
function profileText() {
  const p = getData().profile
  const who = p.sport
    ? `Profil : ${p.name || 'l’utilisateur'}, sport principal ${p.sport}, objectifs ${(p.goals ?? []).join(', ') || 'renforcement général'}, zones sensibles ${(p.pains ?? []).join(', ') || 'aucune'}, matériel ${p.equip ?? 'salle'}, niveau ${p.level ?? 'intermédiaire'}.`
    : `Profil : ${p.name || 'l’utilisateur'}, traileur, renforcement en salle pour protéger genoux et chevilles et gagner en force en côte.`
  return `${who}
Charges en livres (lbs). Privilégie les exercices unilatéraux (une jambe à la fois) quand c'est pertinent.
Tout le texte doit être en FRANÇAIS, concis et concret (tutoiement).`
}

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    catalogId: { type: 'STRING', description: 'id exact du catalogue le plus proche, ou "" si aucun ne correspond' },
    name: { type: 'STRING', description: 'nom français court' },
    target: { type: 'STRING', description: 'muscles ciblés en français, ex. "Fessiers, Ischios"' },
    tags: { type: 'ARRAY', items: { type: 'STRING', enum: ['knee', 'ankle', 'glutes'] } },
    equipment: { type: 'STRING', description: 'matériel en français' },
    sets: { type: 'INTEGER' },
    reps: { type: 'STRING', description: 'texte affiché, ex. "8-10 reps / jambe" ou "30 s"' },
    defaultReps: { type: 'INTEGER', description: 'reps (ou secondes si timed) par série' },
    perSide: { type: 'BOOLEAN', description: 'true si unilatéral (G puis D)' },
    restS: { type: 'INTEGER', description: 'repos entre séries en secondes' },
    mode: { type: 'STRING', enum: ['strength', 'timed'] },
    cadence: {
      type: 'ARRAY',
      description: 'tempo d’UNE rep (vide si timed) : 2-3 phases, verbes à l’impératif',
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING', description: 'ex. Descends, Monte, Tiens, Pousse' },
          s: { type: 'INTEGER' },
          kind: { type: 'STRING', enum: ['go', 'back', 'hold'], description: 'go = effort, back = retour contrôlé, hold = pause' },
        },
        required: ['label', 's', 'kind'],
      },
    },
    tip: { type: 'STRING', description: 'consigne clé en une phrase' },
    kneeAnkle: { type: 'STRING', description: 'conseil de protection genou ou cheville' },
    steps: { type: 'ARRAY', items: { type: 'STRING' }, description: '3 à 5 étapes d’exécution' },
    points: {
      type: 'ARRAY',
      description: '3 points d’attention',
      items: {
        type: 'OBJECT',
        properties: {
          zone: { type: 'STRING', enum: ['hanche', 'genou', 'cheville', 'tronc', 'pied'] },
          dir: { type: 'STRING', enum: ['up', 'down', 'back', 'forward', 'out', 'hold'] },
          text: { type: 'STRING' },
        },
        required: ['zone', 'dir', 'text'],
      },
    },
    diagram: { type: 'STRING', enum: Object.keys(DIAGRAMS) },
    startWeight: { type: 'STRING', description: 'charge de départ suggérée en lbs, "" si poids du corps' },
    video: { type: 'STRING', description: 'requête YouTube en anglais pour une démo' },
  },
  required: ['catalogId', 'name', 'target', 'tags', 'equipment', 'sets', 'reps', 'defaultReps', 'perSide', 'restS', 'mode', 'cadence', 'tip', 'kneeAnkle', 'steps', 'points', 'diagram', 'video'],
}

interface AiResult {
  catalogId: string
  name: string
  target: string
  tags: FocusTag[]
  equipment: string
  sets: number
  reps: string
  defaultReps: number
  perSide: boolean
  restS: number
  mode: 'strength' | 'timed'
  cadence: CustomDraft['cadence']
  tip: string
  kneeAnkle: string
  steps: string[]
  points: CustomDraft['points']
  diagram: AnimationId
  startWeight?: string
  video: string
}

async function callGemini(prompt: string): Promise<AiResult> {
  if (!cfg.key) throw new Error('Ajoute ta clé Gemini dans Menu → Réglages (mode admin).')
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, responseMimeType: 'application/json', responseSchema: SCHEMA },
    }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: { message?: string; status?: string } } | null
    if (res.status === 400 && /API key/i.test(err?.error?.message ?? '')) throw new Error('Clé Gemini invalide.')
    if (res.status === 403) throw new Error('Clé Gemini refusée (API non activée ?).')
    if (res.status === 404) throw new Error(`Modèle « ${cfg.model} » introuvable : change-le dans Réglages.`)
    if (res.status === 429) throw new Error('Quota Gemini atteint, réessaie dans une minute.')
    throw new Error(`Gemini : ${err?.error?.message ?? res.statusText}`)
  }
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Réponse vide de Gemini, reformule ta demande.')
  return JSON.parse(text) as AiResult
}

const clampInt = (n: unknown, lo: number, hi: number, dflt: number) => {
  const v = Math.round(Number(n))
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt
}

function toDraft(r: AiResult, entry: CatalogEntry | undefined): CustomDraft {
  const timed = r.mode === 'timed'
  return {
    source: 'ai',
    catalogId: entry?.id,
    name: r.name.trim().slice(0, 80) || entry?.n || 'Exercice',
    target: r.target.slice(0, 60),
    tags: r.tags.filter((t) => t === 'knee' || t === 'ankle' || t === 'glutes'),
    equipment: r.equipment.slice(0, 60),
    sets: clampInt(r.sets, 1, 8, 3),
    reps: r.reps.slice(0, 40),
    defaultReps: clampInt(r.defaultReps, 1, 300, timed ? 30 : 10),
    perSide: !!r.perSide,
    restS: clampInt(r.restS, 0, 600, 60),
    mode: timed ? 'timed' : 'strength',
    cadence: timed ? undefined : (r.cadence ?? []).filter((p) => p.label && p.s > 0).slice(0, 4).map((p) => ({ ...p, s: clampInt(p.s, 1, 8, 1) })),
    tip: r.tip,
    kneeAnkle: r.kneeAnkle,
    steps: r.steps.slice(0, 6),
    points: r.points?.slice(0, 3),
    diagram: r.diagram in DIAGRAMS ? r.diagram : 'squat',
    startWeight: r.startWeight || undefined,
    video: r.video || entry?.n,
  }
}

/** Demande libre (« un exo pour les adducteurs sans machine ») → fiche complète. */
export async function aiCreate(request: string): Promise<CustomDraft> {
  const catalog = await loadCatalog()
  const list = catalog.map((e) => `${e.id}|${e.e || 'body'}`).join('\n')
  const r = await callGemini(`${profileText()}

Demande : « ${request.slice(0, 500)} »

Crée UN exercice qui répond à la demande. Choisis dans ce catalogue (format id|matériel) l'id de l'exercice
correspondant le mieux (il fournit les photos) — ou "" si rien ne correspond vraiment :
${list}

Choisis aussi le schéma (diagram) le plus proche du mouvement parmi : ${Object.entries(DIAGRAMS)
    .map(([k, v]) => `${k} = ${v}`)
    .join(' ; ')}.`)
  const entry = catalog.find((e) => e.id === r.catalogId)
  return toDraft(r, entry)
}

/** Exercice choisi dans le catalogue → fiche traduite et adaptée. */
export async function aiAdapt(entry: CatalogEntry): Promise<CustomDraft> {
  const base = draftFromCatalog(entry)
  const r = await callGemini(`${profileText()}

Adapte et traduis cet exercice du catalogue (id ${entry.id}) :
Nom : ${entry.n} · catégorie ${entry.c} · matériel ${entry.e || 'poids du corps'} · muscles ${[...entry.m, ...entry.s].join(', ')}
Consignes (anglais) : ${entry.t.join(' ')}

Garde catalogId = "${entry.id}". Schéma proposé : ${base.diagram} (change-le si un autre de cette liste colle mieux : ${Object.keys(DIAGRAMS).join(', ')}).`)
  return toDraft({ ...r, catalogId: entry.id }, entry)
}

/** Ajoute les photos du catalogue au brouillon (si dispo). */
export async function withPhotos(d: CustomDraft): Promise<CustomDraft> {
  if (!d.catalogId) return d
  const entry = (await loadCatalog()).find((e) => e.id === d.catalogId)
  if (!entry) return d
  try {
    return { ...d, photos: await fetchPhotos(entry.img) }
  } catch {
    return d
  }
}
