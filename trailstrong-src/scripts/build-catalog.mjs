/**
 * Génère public/catalog.json à partir de free-exercise-db (domaine public, Unlicense).
 *   node scripts/build-catalog.mjs [chemin/vers/exercises.json]
 * Sans argument, télécharge la dernière version depuis GitHub.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const SRC = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const KEEP = new Set(['strength', 'stretching', 'plyometrics', 'powerlifting', 'cardio'])

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
    t: x.instructions,
    img: x.images.slice(0, 2),
  }))
writeFileSync(new URL('../public/catalog.json', import.meta.url), JSON.stringify(out))
console.log(`${out.length} exercices → public/catalog.json`)
