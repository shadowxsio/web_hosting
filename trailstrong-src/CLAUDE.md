# TrailStrong — instructions pour les agents

PWA de renforcement pour coureurs (React 19 + Vite + TypeScript + Tailwind v4), publiée sur
https://shadowxsio.github.io/web_hosting/trailstrong/. Interface **en français, tutoiement**.
Le `README.md` à la racine du dépôt décrit les fonctionnalités en détail.

## Commandes (depuis `trailstrong-src/`)

```bash
npm ci
npm run dev              # http://localhost:5173 (PIN local : 2026 ; /#schemas = planche des schémas)
npm run typecheck        # tsc -b
npm run build            # build de production → ../trailstrong (ignoré par git)
npm run build:preview    # build d'aperçu → dist-preview (stockage isolé, sans service worker)
npm run test:e2e         # tests Playwright sur dist-preview (lance vite preview tout seul)
```

En local, si Chromium est déjà installé ailleurs : `PW_CHROMIUM=/chemin/chrome npm run test:e2e`.

## Pipeline de PR (automatique, ne rien faire à la main)

1. `.github/workflows/trailstrong-pr.yml` (sur chaque PR qui touche `trailstrong-src/**`) :
   build d'aperçu **sans secrets**, tests e2e, résumé Markdown (`e2e/report.mjs`) → artefact `pr-preview`.
   Le check « e2e » échoue si un test échoue.
2. `.github/workflows/deploy.yml` (déclenché par `workflow_run`, toujours exécuté depuis `main`) :
   rebuild du vrai site + ajout de l'aperçu sous `/web_hosting/preview/pr-N/` (avec le rapport
   Playwright `rapport/` et les captures `e2e/`), puis commentaire dans la PR
   (marqueur `<!-- trailstrong-e2e -->`, mis à jour à chaque push).
3. Le déploiement suivant (push sur `main`) remplace l'aperçu. Forks et Dependabot : tests oui, aperçu non.
4. Les autres checks : `audit` (npm audit), `CodeQL`. Tous doivent être verts avant de fusionner.

Une modification de `deploy.yml` ne prend effet qu'**après fusion** (workflow_run lit la version de `main`).

## Ajouter une fonctionnalité : checklist

1. Code dans `src/` (composants `src/components`, logique `src/lib`, données `src/data`).
2. **Ajouter ou adapter un test e2e** dans `e2e/*.spec.ts` (un fichier par grand domaine :
   `accueil`, `seance`, `ajout`, `menu`, … ou un nouveau fichier). Un test absent de `main`
   apparaît en 🆕 dans le commentaire de PR, avec ses captures.
   - Utiliser les fixtures de `e2e/fixtures.ts` :
     `await app({ view: 'seanceA' })` ouvre l'app connectée (options `logged`, `tourDone`),
     `await shot('Légende')` ajoute une capture au rapport et au commentaire.
   - Titre du test = la fonctionnalité en français, lisible par l'utilisateur (il apparaît dans la PR).
   - Sélecteurs par rôle / libellé accessible (`getByRole`, `getByLabel`), pas par classes CSS.
   - La fixture fait échouer le test s'il y a une erreur JavaScript dans la console.
3. Vérifier en local : `npm run typecheck && npm run build:preview && npm run test:e2e`.
4. Mettre à jour le `README.md` (racine) si la fonctionnalité est visible.
5. Commit `type(trailstrong): description`, push, PR ; le reste est automatique.

## Règles importantes

- **Aperçu = même domaine que le vrai site.** Le build d'aperçu (`TS_PREVIEW=n° de PR`,
  plugin `preview()` de `vite.config.ts`) préfixe `localStorage`/`sessionStorage` par `preview:`
  et n'enregistre pas le service worker (il effacerait les caches du vrai site). Ne pas
  contourner ce mécanisme (pas d'IndexedDB, de cookies ni de caches non isolés sans adapter
  `preview()`), et ne jamais mettre de secrets dans `trailstrong-pr.yml`.
- **Stockage par compte** : toute nouvelle clé `localStorage` propre à l'utilisateur passe par
  `scoped()` (`src/lib/account.ts`). En mode comptes, les données synchronisées sont décrites dans
  `src/lib/sync.ts` et contrôlées par `firestore.rules` (à mettre à jour si le format change).
- **Exercices** : fiches complètes dans `src/data/program.ts` (programme de base) et
  `src/data/extras.ts` (bibliothèque). Chaque exercice de la bibliothèque doit avoir un schéma
  dédié (`src/components/diagram-base.tsx`), une entrée `DEMOS` (`src/data/demos.ts`, photos dans
  `public/demos/{id}-0/1.webp`) et une entrée `META` dans `src/data/generator.ts` (rôle, matériel,
  objectifs, douleurs, étirements). Catalogue : `public/catalog.json` généré par
  `scripts/build-catalog.mjs` (traductions dans `scripts/catalog-fr.json`).
- **Sécurité** : CSP stricte injectée au build (`csp()` dans `vite.config.ts`) ; ajouter tout
  nouveau domaine externe à la politique. Jamais de `.env` ni de secret dans le dépôt.
- Pas d'IA intégrée à l'app (retirée volontairement).
- Le programme généré est un repère, pas un avis médical : garder les mentions « voir un physio ».
