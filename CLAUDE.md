# web_hosting — instructions pour les agents

Site GitHub Pages personnel : portail (`index.html`), CV (`cv/`), courses (`runs/`, `data/`, `scripts/`),
RunCoach (`coach/`, fichiers déjà construits) et maquettes (`maquettes/`).

- **TrailStrong n'est plus ici** : il vit dans `shadowxsio/trail-suite` (https://strong.trailsuite.app).
  `trailstrong/` ne contient que la page de nettoyage de l'ancienne copie (`index.html` + `sw.js`) :
  ne pas y remettre d'app. Attention, l'origine `shadowxsio.github.io` est partagée avec d'autres apps :
  ne jamais vider tous les caches ni désinscrire tous les service workers de l'origine.
- Déploiement : `.github/workflows/deploy.yml` sur push `main` (et après « Fetch Latest Runs ») publie tout le dépôt.
- Sécurité : CodeQL (`codeql.yml`) sur le code écrit à la main, Dependabot pour les actions.
- Messages de commit en `type(scope): description`, en français. Jamais de secret dans le dépôt.
