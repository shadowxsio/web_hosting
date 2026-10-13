/**
 * Résumé des tests e2e pour le commentaire de PR (Markdown).
 *   node e2e/report.mjs > comment.md
 * Variables : PREVIEW_URL (aperçu publié), RUN_URL (exécution Actions),
 * BASE_REF (branche cible : un test absent de cette branche est « nouveau »).
 * Les captures des tests sont copiées dans e2e-shots/ (publiées avec l'aperçu).
 */
import { execSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'

const { PREVIEW_URL = '', RUN_URL = '', BASE_REF = '' } = process.env
const results = JSON.parse(readFileSync('test-results/results.json', 'utf8'))

/** Tests (fichier, titre complet, statut, durée, captures). */
const tests = []
function walk(suite, path) {
  for (const s of suite.suites ?? []) walk(s, s.title && !s.title.endsWith('.ts') ? [...path, s.title] : path)
  for (const spec of suite.specs ?? []) {
    const last = spec.tests.at(-1)?.results.at(-1)
    tests.push({
      file: spec.file,
      title: spec.title,
      path: [...path, spec.title].join(' › '),
      ok: spec.ok,
      flaky: spec.ok && spec.tests.some((t) => t.results.length > 1),
      ms: last?.duration ?? 0,
      shots: (last?.attachments ?? []).filter((a) => a.contentType === 'image/png' && (a.path || a.body) && a.name !== 'screenshot'),
    })
  }
}
walk(results, [])

const git = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return null
  }
}
const titlesIn = (src) => new Set([...(src ?? '').matchAll(/test\(\s*'([^']+)'/g)].map((m) => m[1]))
const changed = new Set((BASE_REF ? git(`git diff --name-only origin/${BASE_REF}...HEAD -- e2e`) ?? '' : '').split('\n').map((f) => basename(f)).filter(Boolean))
const baseTitles = new Map()
const statusOf = (t) => {
  if (!BASE_REF) return ''
  if (!baseTitles.has(t.file)) baseTitles.set(t.file, titlesIn(git(`git show origin/${BASE_REF}:trailstrong-src/e2e/${t.file}`)))
  if (!baseTitles.get(t.file).has(t.title)) return '🆕'
  return changed.has(t.file) ? '✏️' : ''
}
for (const t of tests) t.status = statusOf(t)

// Captures : noms ASCII stables (n° du test + n° de la capture).
mkdirSync('e2e-shots', { recursive: true })
tests.forEach((t, i) => {
  t.shots = t.shots.map((a, j) => {
    const file = `t${String(i + 1).padStart(2, '0')}-${j + 1}.png`
    if (a.body) writeFileSync(`e2e-shots/${file}`, Buffer.from(a.body, 'base64'))
    else copyFileSync(a.path, `e2e-shots/${file}`)
    return { name: a.name, file }
  })
})

const failed = tests.filter((t) => !t.ok)
const sec = (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`
const url = (p) => (PREVIEW_URL ? new URL(p, PREVIEW_URL).href : '')
const out = ['<!-- trailstrong-e2e -->']
out.push(failed.length ? `## 🧪 Tests e2e — ❌ ${failed.length} échec${failed.length > 1 ? 's' : ''} sur ${tests.length}` : `## 🧪 Tests e2e — ✅ ${tests.length}/${tests.length} réussis`)
if (PREVIEW_URL) out.push('', `**Aperçu en ligne : ${PREVIEW_URL}** — PIN de test \`2026\`, données séparées du vrai site, remplacé au prochain déploiement.`)
out.push('', '| | Fonctionnalité testée | Résultat | Durée |', '|---|---|---|---|')
for (const t of [...tests].sort((a, b) => Number(a.ok) - Number(b.ok) || (b.status ? 1 : 0) - (a.status ? 1 : 0)))
  out.push(`| ${t.status} | ${t.path} | ${t.ok ? (t.flaky ? '⚠️ instable' : '✅') : '❌'} | ${sec(t.ms)} |`)
if (BASE_REF) out.push('', '🆕 nouveau test · ✏️ fichier de test modifié dans cette PR')

const showcase = tests.filter((t) => t.shots.length && (t.status || !t.ok))
if (PREVIEW_URL && showcase.length) {
  out.push('', '### Captures des nouveautés')
  for (const [i, t] of showcase.entries()) {
    out.push('', `<details${i < 6 ? ' open' : ''}><summary>${t.status} ${t.path}</summary>`, '')
    out.push(t.shots.map((s) => `<img src="${url(`e2e/${s.file}`)}" alt="${s.name}" title="${s.name}" width="220">`).join(' '))
    out.push('', '</details>')
  }
}
const links = [PREVIEW_URL && `[Rapport complet (traces, captures)](${url('rapport/')})`, RUN_URL && `[Exécution GitHub Actions](${RUN_URL})`].filter(Boolean)
if (links.length) out.push('', links.join(' · '))
console.log(out.join('\n'))
