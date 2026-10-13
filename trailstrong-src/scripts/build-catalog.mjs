/**
 * Génère public/catalog.json à partir de free-exercise-db (domaine public, Unlicense).
 *   node scripts/build-catalog.mjs [chemin/vers/exercises.json]
 * Sans argument, télécharge la dernière version depuis GitHub.
 * Les fiches traduites (scripts/catalog-fr.json : nom + consignes en français)
 * remplacent les consignes anglaises et ajoutent le nom français (`fr`).
 */
import { readFileSync, writeFileSync } from 'node:fs'

const SRC = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const KEEP = new Set(['strength', 'stretching', 'plyometrics', 'powerlifting', 'cardio'])

const FR = JSON.parse(readFileSync(new URL('./catalog-fr.json', import.meta.url), 'utf8'))
const raw = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], 'utf8')) : await (await fetch(SRC)).json()
const out = raw
  .filter((x) => KEEP.has(x.category) && x.images?.length >= 2)
  .map((x) => ({
    id: x.id,
    n: x.name,
    c: x.category,
    e: x.equipment ?? '',
    m: x.primaryMuscles,
    s: x.secondaryMuscles,
    l: x.level,
    f: x.force ?? '',
    x: x.mechanic ?? '',
    t: FR[x.id]?.tf ?? x.instructions,
    img: x.images.slice(0, 2),
    ...(FR[x.id] ? { fr: FR[x.id].fr } : {}),
  }))
writeFileSync(new URL('../public/catalog.json', import.meta.url), JSON.stringify(out))
console.log(`${out.length} exercices → public/catalog.json`)
